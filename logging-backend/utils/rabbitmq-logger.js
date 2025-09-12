const amqp = require('amqplib');

class RabbitMQLogger {
  constructor(serviceType) {
    this.serviceType = serviceType;
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.connecting = false;
  }

  async connect() {
    if (this.connecting || this.isConnected) {
      return;
    }

    this.connecting = true;

    try {
      const url = process.env.RABBITMQ_URL;
      if (!url) {
        console.warn('[RABBITMQ_LOGGER] RABBITMQ_URL not provided, logging disabled');
        this.connecting = false;
        return;
      }

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      const exchangeName = process.env.RABBITMQ_EXCHANGE_NAME || 'interview_logs_exchange';
      await this.channel.assertExchange(exchangeName, 'topic', { durable: true });

      this.isConnected = true;
      this.connecting = false;

      console.log(`[RABBITMQ_LOGGER] Connected for service: ${this.serviceType}`);

      // Process any queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        await this._publishMessage(message);
      }

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('[RABBITMQ_LOGGER] Connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.warn('[RABBITMQ_LOGGER] Connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('[RABBITMQ_LOGGER] Failed to connect:', error);
      this.isConnected = false;
      this.connecting = false;
    }
  }

  async log(which, state, dependency, file, message, level = 'info', metadata = {}) {
    const logData = {
      service_type: this.serviceType,
      which: which,
      state: state,
      dependency: dependency,
      file: file,
      message: message,
      level: level,
      metadata: metadata,
      timestamp: new Date().toISOString(),
      id: require('uuid').v4()
    };

    if (!this.isConnected && !this.connecting) {
      await this.connect();
    }

    if (this.isConnected) {
      await this._publishMessage(logData);
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(logData);
      if (this.messageQueue.length > 100) {
        // Prevent memory leaks by limiting queue size
        this.messageQueue.shift();
      }
    }
  }

  async _publishMessage(logData) {
    try {
      if (!this.channel || !this.isConnected) {
        return;
      }

      const exchangeName = process.env.RABBITMQ_EXCHANGE_NAME || 'interview_logs_exchange';
      const routingKey = process.env.RABBITMQ_ROUTING_KEY || 'logs.all';

      const message = Buffer.from(JSON.stringify(logData));

      this.channel.publish(exchangeName, routingKey, message, {
        persistent: true,
        timestamp: Date.now()
      });

      console.log(`[RABBITMQ_LOGGER] Published log: ${logData.service_type}/${logData.which} - ${logData.message.substring(0, 50)}...`);

    } catch (error) {
      console.error('[RABBITMQ_LOGGER] Error publishing message:', error);
      this.isConnected = false;
    }
  }

  // Convenience methods for different log levels
  async info(which, state, dependency, file, message, metadata = {}) {
    return this.log(which, state, dependency, file, message, 'info', metadata);
  }

  async warn(which, state, dependency, file, message, metadata = {}) {
    return this.log(which, state, dependency, file, message, 'warn', metadata);
  }

  async error(which, state, dependency, file, message, metadata = {}) {
    return this.log(which, state, dependency, file, message, 'error', metadata);
  }

  async debug(which, state, dependency, file, message, metadata = {}) {
    return this.log(which, state, dependency, file, message, 'debug', metadata);
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('[RABBITMQ_LOGGER] Disconnected successfully');
    } catch (error) {
      console.error('[RABBITMQ_LOGGER] Error during disconnect:', error);
    }
  }
}

module.exports = RabbitMQLogger;