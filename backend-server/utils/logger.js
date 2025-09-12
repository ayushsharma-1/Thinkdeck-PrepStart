const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const axios = require('axios');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Custom transport for real-time logging backend
class LoggingBackendTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.name = 'LoggingBackendTransport';
    this.backendUrl = options.url || 'http://localhost:5002/api/logs';
    this.serviceName = options.serviceName || 'backend-server';
    this.enabled = true;
  }

  async log(info, callback) {
    if (!this.enabled) {
      callback();
      return;
    }

    try {
      const logData = {
        timestamp: info.timestamp || new Date().toISOString(),
        level: info.level,
        message: info.message,
        service: this.serviceName,
        metadata: {
          ...info,
          level: undefined,
          message: undefined,
          timestamp: undefined
        }
      };

      // Send to logging backend asynchronously (don't block)
      axios.post(this.backendUrl, logData, { 
        timeout: 500,
        headers: { 'Content-Type': 'application/json' }
      }).catch(error => {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.enabled = false; // Disable temporarily
          setTimeout(() => { this.enabled = true; }, 10000); // Re-enable after 10s
        }
      });
      
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

// Custom format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: format
  }),
  
  // Error log file
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    handleExceptions: true,
    json: false,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d'
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    handleExceptions: true,
    json: false,
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d'
  }),

  // Real-time logging backend transport
  new LoggingBackendTransport({
    url: 'http://localhost:5002/api/logs',
    serviceName: 'backend-server'
  })
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
