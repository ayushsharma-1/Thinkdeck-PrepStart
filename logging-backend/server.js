const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const RabbitMQService = require('./services/rabbitmq-service');
const LogAggregator = require('./services/log-aggregator');
const LogWebSocketService = require('./services/websocket-service');

const app = express();
const server = http.createServer(app);

// Security and middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Services
const rabbitmqService = new RabbitMQService();
const logAggregator = new LogAggregator();
const websocketService = new LogWebSocketService(server);

// Initialize services
async function initializeServices() {
  try {
    console.log('[LOGGING_BACKEND] Initializing services...');
    
    // Initialize RabbitMQ
    await rabbitmqService.connect();
    console.log('[LOGGING_BACKEND] RabbitMQ connected successfully');
    
    // Initialize log aggregator
    await logAggregator.initialize();
    console.log('[LOGGING_BACKEND] Log aggregator initialized');
    
    // Initialize WebSocket service
    websocketService.initialize(logAggregator);
    console.log('[LOGGING_BACKEND] WebSocket service initialized');
    
    // Set up log message handling
    rabbitmqService.onMessage((logData) => {
      const processedLog = logAggregator.processLog(logData);
      websocketService.broadcastLog(processedLog);
    });
    
    console.log('[LOGGING_BACKEND] All services initialized successfully');
    
  } catch (error) {
    console.error('[LOGGING_BACKEND] Failed to initialize services:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      rabbitmq: rabbitmqService.isConnected(),
      websocket: websocketService.isActive(),
      aggregator: logAggregator.isReady()
    }
  });
});

// Get logs endpoint (REST API)
app.get('/api/logs', (req, res) => {
  try {
    const {
      service,
      level,
      limit = 100,
      offset = 0,
      startTime,
      endTime,
      search
    } = req.query;
    
    const logs = logAggregator.getLogs({
      service,
      level,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startTime,
      endTime,
      search
    });
    
    res.json({
      success: true,
      logs,
      total: logAggregator.getTotalLogCount(),
      filters: {
        service,
        level,
        limit,
        offset,
        startTime,
        endTime,
        search
      }
    });
  } catch (error) {
    console.error('[LOGGING_BACKEND] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get log statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = logAggregator.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[LOGGING_BACKEND] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear logs endpoint
app.delete('/api/logs', (req, res) => {
  try {
    const cleared = logAggregator.clearLogs();
    res.json({
      success: true,
      message: `Cleared ${cleared} log entries`
    });
  } catch (error) {
    console.error('[LOGGING_BACKEND] Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard endpoint
if (process.env.DASHBOARD_ENABLED === 'true') {
  app.use(express.static('public'));
  
  app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[LOGGING_BACKEND] Express error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[LOGGING_BACKEND] SIGTERM received, shutting down gracefully');
  await rabbitmqService.disconnect();
  websocketService.close();
  server.close(() => {
    console.log('[LOGGING_BACKEND] Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[LOGGING_BACKEND] SIGINT received, shutting down gracefully');
  await rabbitmqService.disconnect();
  websocketService.close();
  server.close(() => {
    console.log('[LOGGING_BACKEND] Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5002;

initializeServices().then(() => {
  server.listen(PORT, () => {
    console.log(`[LOGGING_BACKEND] Server running on port ${PORT}`);
    console.log(`[LOGGING_BACKEND] Dashboard available at http://localhost:${PORT}/dashboard`);
    console.log(`[LOGGING_BACKEND] WebSocket available at ws://localhost:${PORT}`);
    console.log(`[LOGGING_BACKEND] Environment: ${process.env.NODE_ENV}`);
  });
}).catch((error) => {
  console.error('[LOGGING_BACKEND] Failed to start server:', error);
  process.exit(1);
});

module.exports = app;