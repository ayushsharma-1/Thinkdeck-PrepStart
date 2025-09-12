const amqp = require('amqplib');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class RabbitMQLogger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.setupRabbitMQ();
  }

  async setupRabbitMQ() {
    try {
      if (process.env.ENABLE_RABBITMQ_LOGGING !== 'true') {
        console.log('RabbitMQ logging disabled');
        return;
      }

      const RABBITMQ_URL = process.env.RABBITMQ_URL;
      const EXCHANGE = process.env.RABBITMQ_LOGS_EXCHANGE || 'interview_logs_exchange';

      if (!RABBITMQ_URL) {
        console.log('RabbitMQ URL not configured, skipping log streaming');
        return;
      }

      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      
      this.isConnected = true;
      console.log(`[${this.serviceName}] RabbitMQ Logger connected successfully`);
      
      // Handle connection close
      this.connection.on('close', () => {
        console.log(`[${this.serviceName}] RabbitMQ connection closed`);
        this.isConnected = false;
        setTimeout(() => this.setupRabbitMQ(), 5000);
      });

    } catch (error) {
      console.error(`[${this.serviceName}] RabbitMQ Logger setup failed:`, error.message);
      setTimeout(() => this.setupRabbitMQ(), 5000);
    }
  }

  async publishLog(level, message, context = {}) {
    if (!this.isConnected || !this.channel) {
      return;
    }

    try {
      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        level: level.toUpperCase(),
        message,
        context,
        hostname: require('os').hostname(),
        pid: process.pid,
        version: process.env.npm_package_version || '1.0.0'
      };

      const routingKey = process.env.RABBITMQ_LOGS_ROUTING_KEY || `logs.backend.${this.serviceName}`;
      const exchange = process.env.RABBITMQ_LOGS_EXCHANGE || 'interview_logs_exchange';

      await this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(logEntry)),
        { persistent: true }
      );

    } catch (error) {
      console.error(`[${this.serviceName}] Failed to publish log to RabbitMQ:`, error.message);
    }
  }

  // Logging methods
  error(message, context) {
    this.publishLog('error', message, context);
  }

  warn(message, context) {
    this.publishLog('warn', message, context);
  }

  info(message, context) {
    this.publishLog('info', message, context);
  }

  debug(message, context) {
    this.publishLog('debug', message, context);
  }

  http(message, context) {
    this.publishLog('http', message, context);
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log(`[${this.serviceName}] RabbitMQ Logger closed`);
    } catch (error) {
      console.error(`[${this.serviceName}] Error closing RabbitMQ Logger:`, error.message);
    }
  }
}

module.exports = RabbitMQLogger;