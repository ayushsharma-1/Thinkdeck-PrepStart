const socketIo = require('socket.io');
const cors = require('cors');

class LogWebSocketService {
  constructor(server) {
    this.server = server;
    this.io = null;
    this.logAggregator = null;
    this.activeConnections = 0;
    this.isActiveStatus = false;
    this.connectedClients = new Map();
  }

  initialize(logAggregator) {
    this.logAggregator = logAggregator;

    // Initialize Socket.IO with CORS
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.isActiveStatus = true;

    console.log('[WEBSOCKET] WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.activeConnections++;
      const clientId = socket.id;
      const clientInfo = {
        id: clientId,
        connectedAt: new Date().toISOString(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        filters: {},
        isStreaming: false
      };
      
      this.connectedClients.set(clientId, clientInfo);
      
      console.log(`[WEBSOCKET] Client connected: ${clientId} (Total: ${this.activeConnections})`);

      // Send initial connection acknowledgment
      socket.emit('connected', {
        clientId: clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to logging backend'
      });

      // Handle log streaming subscription
      socket.on('subscribe_logs', (filters = {}) => {
        console.log(`[WEBSOCKET] Client ${clientId} subscribed to log streaming with filters:`, filters);
        
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.filters = filters;
          client.isStreaming = true;
          this.connectedClients.set(clientId, client);
        }

        // Send initial logs based on filters
        const initialLogs = this.logAggregator.getLogsStream(filters);
        socket.emit('initial_logs', {
          logs: initialLogs.slice(0, 50), // Send last 50 logs
          total: this.logAggregator.getTotalLogCount(),
          filters: filters
        });

        socket.join('log_subscribers');
      });

      // Handle log streaming unsubscription
      socket.on('unsubscribe_logs', () => {
        console.log(`[WEBSOCKET] Client ${clientId} unsubscribed from log streaming`);
        
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.isStreaming = false;
          this.connectedClients.set(clientId, client);
        }

        socket.leave('log_subscribers');
      });

      // Handle filter updates
      socket.on('update_filters', (newFilters) => {
        console.log(`[WEBSOCKET] Client ${clientId} updated filters:`, newFilters);
        
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.filters = newFilters;
          this.connectedClients.set(clientId, client);

          // Send filtered logs
          const filteredLogs = this.logAggregator.getLogsStream(newFilters);
          socket.emit('filtered_logs', {
            logs: filteredLogs.slice(0, 100),
            filters: newFilters
          });
        }
      });

      // Handle stats request
      socket.on('get_stats', () => {
        const stats = this.logAggregator.getStats();
        const summary = this.logAggregator.getSummary();
        
        socket.emit('stats_update', {
          stats,
          summary,
          connections: this.activeConnections,
          timestamp: new Date().toISOString()
        });
      });

      // Handle manual log request
      socket.on('get_logs', (params) => {
        const logs = this.logAggregator.getLogs(params);
        socket.emit('logs_response', {
          logs,
          total: this.logAggregator.getTotalLogCount(),
          params
        });
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', {
          timestamp: new Date().toISOString(),
          clientId: clientId
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.activeConnections--;
        this.connectedClients.delete(clientId);
        
        console.log(`[WEBSOCKET] Client disconnected: ${clientId} (Reason: ${reason}, Remaining: ${this.activeConnections})`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`[WEBSOCKET] Socket error for client ${clientId}:`, error);
      });
    });

    // Setup periodic stats broadcast
    this.statsInterval = setInterval(() => {
      this.broadcastStats();
    }, 30000); // Every 30 seconds

    console.log('[WEBSOCKET] Event handlers setup complete');
  }

  broadcastLog(logData) {
    if (!this.io || !logData) {
      return;
    }

    // Format log for broadcasting
    const broadcastLog = {
      id: logData.id,
      timestamp: logData.timestamp,
      service: logData.service_type,
      component: logData.which,
      state: logData.state,
      dependency: logData.dependency,
      file: logData.file,
      level: logData.level,
      message: logData.message,
      metadata: logData.metadata
    };

    // Broadcast to all connected clients who are subscribed to logs
    this.io.to('log_subscribers').emit('new_log', broadcastLog);

    // Also check individual client filters
    this.connectedClients.forEach((clientInfo, clientId) => {
      if (clientInfo.isStreaming && this.logMatchesFilters(logData, clientInfo.filters)) {
        this.io.to(clientId).emit('filtered_log', broadcastLog);
      }
    });

    console.log(`[WEBSOCKET] Broadcasted log to ${this.activeConnections} connections: ${logData.service_type}/${logData.which}`);
  }

  broadcastStats() {
    if (!this.io || !this.logAggregator) {
      return;
    }

    const stats = this.logAggregator.getStats();
    const summary = this.logAggregator.getSummary();

    this.io.emit('stats_broadcast', {
      stats,
      summary,
      connections: this.activeConnections,
      timestamp: new Date().toISOString()
    });
  }

  logMatchesFilters(logData, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    // Service filter
    if (filters.service && !logData.service_type.toLowerCase().includes(filters.service.toLowerCase())) {
      return false;
    }

    // Level filter
    if (filters.level && logData.level !== filters.level) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = [
        logData.message,
        logData.service_type,
        logData.which,
        logData.state,
        logData.file
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  isActive() {
    return this.isActiveStatus;
  }

  getConnectionCount() {
    return this.activeConnections;
  }

  close() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    if (this.io) {
      this.io.close();
    }

    this.isActiveStatus = false;
    this.activeConnections = 0;
    this.connectedClients.clear();

    console.log('[WEBSOCKET] WebSocket service closed');
  }

  // Send message to specific client
  sendToClient(clientId, event, data) {
    if (this.io && this.connectedClients.has(clientId)) {
      this.io.to(clientId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send message to all clients
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      return true;
    }
    return false;
  }
}

module.exports = LogWebSocketService;