const moment = require('moment');

class LogAggregator {
  constructor() {
    this.logs = [];
    this.maxHistory = parseInt(process.env.MAX_LOG_HISTORY) || 10000;
    this.retentionHours = parseInt(process.env.LOG_RETENTION_HOURS) || 24;
    this.stats = {
      totalLogs: 0,
      logsByService: {},
      logsByLevel: {},
      logsByHour: {},
      errors: 0,
      warnings: 0
    };
    this.isReady = false;
  }

  async initialize() {
    console.log('[LOG_AGGREGATOR] Initializing log aggregator...');
    
    // Set up cleanup interval (every hour)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000); // 1 hour

    // Set up stats update interval (every 5 minutes)
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 5 * 60 * 1000); // 5 minutes

    this.isReady = true;
    console.log('[LOG_AGGREGATOR] Log aggregator initialized successfully');
  }

  processLog(logData) {
    try {
      const processedLog = {
        id: logData.id || require('uuid').v4(),
        timestamp: logData.timestamp || new Date().toISOString(),
        service_type: logData.service_type || 'unknown',
        which: logData.which || 'unknown',
        state: logData.state || 'unknown',
        dependency: logData.dependency || 'none',
        file: logData.file || 'unknown',
        message: logData.message || '',
        level: logData.level || 'info',
        metadata: logData.metadata || {},
        processed_at: new Date().toISOString()
      };

      // Add to logs array
      this.logs.unshift(processedLog);

      // Maintain max history limit
      if (this.logs.length > this.maxHistory) {
        this.logs = this.logs.slice(0, this.maxHistory);
      }

      // Update stats
      this.updateStatsForLog(processedLog);

      console.log(`[LOG_AGGREGATOR] Processed log from ${processedLog.service_type}/${processedLog.which}: ${processedLog.message.substring(0, 100)}...`);
      
      return processedLog;
    } catch (error) {
      console.error('[LOG_AGGREGATOR] Error processing log:', error);
      return null;
    }
  }

  getLogs(filters = {}) {
    let filteredLogs = this.logs;

    // Filter by service
    if (filters.service) {
      filteredLogs = filteredLogs.filter(log => 
        log.service_type.toLowerCase().includes(filters.service.toLowerCase())
      );
    }

    // Filter by level
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    // Filter by time range
    if (filters.startTime) {
      const startTime = moment(filters.startTime);
      filteredLogs = filteredLogs.filter(log => 
        moment(log.timestamp).isAfter(startTime)
      );
    }

    if (filters.endTime) {
      const endTime = moment(filters.endTime);
      filteredLogs = filteredLogs.filter(log => 
        moment(log.timestamp).isBefore(endTime)
      );
    }

    // Search in message content
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        log.service_type.toLowerCase().includes(searchTerm) ||
        log.which.toLowerCase().includes(searchTerm) ||
        log.state.toLowerCase().includes(searchTerm) ||
        log.file.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  getTotalLogCount() {
    return this.logs.length;
  }

  getStats() {
    return {
      ...this.stats,
      current_log_count: this.logs.length,
      oldest_log: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      newest_log: this.logs.length > 0 ? this.logs[0].timestamp : null,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }

  updateStatsForLog(log) {
    this.stats.totalLogs++;

    // Count by service
    if (!this.stats.logsByService[log.service_type]) {
      this.stats.logsByService[log.service_type] = 0;
    }
    this.stats.logsByService[log.service_type]++;

    // Count by level
    if (!this.stats.logsByLevel[log.level]) {
      this.stats.logsByLevel[log.level] = 0;
    }
    this.stats.logsByLevel[log.level]++;

    // Count by hour
    const hour = moment(log.timestamp).format('YYYY-MM-DD HH:00');
    if (!this.stats.logsByHour[hour]) {
      this.stats.logsByHour[hour] = 0;
    }
    this.stats.logsByHour[hour]++;

    // Count errors and warnings
    if (log.level === 'error') {
      this.stats.errors++;
    } else if (log.level === 'warn') {
      this.stats.warnings++;
    }
  }

  updateStats() {
    // Clean up old hourly stats (keep only last 48 hours)
    const cutoffTime = moment().subtract(48, 'hours').format('YYYY-MM-DD HH:00');
    
    Object.keys(this.stats.logsByHour).forEach(hour => {
      if (hour < cutoffTime) {
        delete this.stats.logsByHour[hour];
      }
    });

    console.log(`[LOG_AGGREGATOR] Stats updated - Total logs: ${this.stats.totalLogs}, Current: ${this.logs.length}`);
  }

  cleanupOldLogs() {
    const cutoffTime = moment().subtract(this.retentionHours, 'hours');
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => 
      moment(log.timestamp).isAfter(cutoffTime)
    );

    const cleanedCount = initialCount - this.logs.length;
    if (cleanedCount > 0) {
      console.log(`[LOG_AGGREGATOR] Cleaned up ${cleanedCount} old logs (older than ${this.retentionHours} hours)`);
    }
  }

  clearLogs() {
    const count = this.logs.length;
    this.logs = [];
    
    // Reset stats
    this.stats = {
      totalLogs: 0,
      logsByService: {},
      logsByLevel: {},
      logsByHour: {},
      errors: 0,
      warnings: 0
    };

    console.log(`[LOG_AGGREGATOR] Cleared ${count} logs`);
    return count;
  }

  isReadyStatus() {
    return this.isReady;
  }

  // Get logs in real-time streaming format
  getLogsStream(filters = {}) {
    // Return logs formatted for streaming
    return this.getLogs(filters).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      service: log.service_type,
      component: log.which,
      state: log.state,
      dependency: log.dependency,
      file: log.file,
      level: log.level,
      message: log.message,
      metadata: log.metadata
    }));
  }

  // Get summary for dashboard
  getSummary() {
    const last24Hours = moment().subtract(24, 'hours');
    const recentLogs = this.logs.filter(log => 
      moment(log.timestamp).isAfter(last24Hours)
    );

    const recentByLevel = recentLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    const recentByService = recentLogs.reduce((acc, log) => {
      acc[log.service_type] = (acc[log.service_type] || 0) + 1;
      return acc;
    }, {});

    return {
      total_logs: this.logs.length,
      recent_logs_24h: recentLogs.length,
      levels: recentByLevel,
      services: recentByService,
      oldest_log_age: this.logs.length > 0 ? 
        moment().diff(moment(this.logs[this.logs.length - 1].timestamp), 'hours') + ' hours' : 'N/A',
      newest_log_age: this.logs.length > 0 ? 
        moment().diff(moment(this.logs[0].timestamp), 'seconds') + ' seconds ago' : 'N/A'
    };
  }
}

module.exports = LogAggregator;