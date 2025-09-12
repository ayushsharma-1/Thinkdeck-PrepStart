const amqp = require('amqplib');

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnectedStatus = false;
    this.messageHandler = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL;
      if (!url) {
        throw new Error('RABBITMQ_URL environment variable is required');
      }

      console.log('[RABBITMQ] Connecting to RabbitMQ...');
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Set up exchange and queue
      const exchangeName = process.env.RABBITMQ_EXCHANGE_NAME || 'interview_logs_exchange';
      const queueName = process.env.RABBITMQ_QUEUE_NAME || 'interview_logs';
      const routingKey = process.env.RABBITMQ_ROUTING_KEY || 'logs.all';

      await this.channel.assertExchange(exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, exchangeName, routingKey);

      // Set up consumer
      await this.channel.consume(queueName, (msg) => {
        if (msg !== null) {
          try {
            const logData = JSON.parse(msg.content.toString());
            if (this.messageHandler) {
              this.messageHandler(logData);
            }
            this.channel.ack(msg);
          } catch (error) {
            console.error('[RABBITMQ] Error processing message:', error);
            this.channel.nack(msg, false, false); // Reject and don't requeue
          }
        }
      });

      this.isConnectedStatus = true;
      this.reconnectAttempts = 0;

      // Set up connection error handlers
      this.connection.on('error', (err) => {
        console.error('[RABBITMQ] Connection error:', err);
        this.isConnectedStatus = false;
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        console.warn('[RABBITMQ] Connection closed');
        this.isConnectedStatus = false;
        this.scheduleReconnect();
      });

      console.log('[RABBITMQ] Connected and consuming messages');
      return true;

    } catch (error) {
      console.error('[RABBITMQ] Connection failed:', error);
      this.isConnectedStatus = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RABBITMQ] Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[RABBITMQ] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[RABBITMQ] Reconnection failed:', error);
      }
    }, this.reconnectDelay);
  }

  async publishLog(logData) {
    if (!this.channel || !this.isConnectedStatus) {
      console.warn('[RABBITMQ] Cannot publish log - not connected');
      return false;
    }

    try {
      const exchangeName = process.env.RABBITMQ_EXCHANGE_NAME || 'interview_logs_exchange';
      const routingKey = process.env.RABBITMQ_ROUTING_KEY || 'logs.all';

      const message = Buffer.from(JSON.stringify({
        ...logData,
        timestamp: new Date().toISOString(),
        id: require('uuid').v4()
      }));

      const published = this.channel.publish(exchangeName, routingKey, message, {
        persistent: true,
        timestamp: Date.now()
      });

      return published;
    } catch (error) {
      console.error('[RABBITMQ] Error publishing log:', error);
      return false;
    }
  }

  onMessage(handler) {
    this.messageHandler = handler;
  }

  isConnected() {
    return this.isConnectedStatus;
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnectedStatus = false;
      console.log('[RABBITMQ] Disconnected successfully');
    } catch (error) {
      console.error('[RABBITMQ] Error during disconnect:', error);
    }
  }

  // Utility method for other services to publish logs
  static async publishLogMessage(serviceType, which, state, dependency, file, message, level = 'info', metadata = {}) {
    const logData = {
      service_type: serviceType,
      which: which,
      state: state,
      dependency: dependency,
      file: file,
      message: message,
      level: level,
      metadata: metadata,
      timestamp: new Date().toISOString()
    };

    // This would be used by other services to send logs to this service
    return logData;
  }
}

module.exports = RabbitMQService;