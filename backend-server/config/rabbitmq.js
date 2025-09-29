const amqp = require('amqplib');
const logger = require('../utils/logger');

let connection = null;
let channel = null;
let isConnected = false;

const connectRabbitMQ = async () => {
  if (isConnected && connection && channel) {
    logger.info('RabbitMQ already connected');
    return { connection, channel };
  }

  try {
    // Create connection
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    // Create channel
    channel = await connection.createChannel();
    
    // Assert queues
    await channel.assertQueue(process.env.RABBITMQ_QUESTION_QUEUE || 'question_generation', {
      durable: true
    });
    
    await channel.assertQueue(process.env.RABBITMQ_SPEECH_QUEUE || 'speech_processing', {
      durable: true
    });

    isConnected = true;
    logger.info('RabbitMQ connected successfully');

    // Handle connection events
    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error);
      isConnected = false;
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      isConnected = false;
    });

    return { connection, channel };

  } catch (error) {
    logger.error('RabbitMQ connection failed:', error);
    throw error;
  }
};

const getRabbitMQChannel = () => {
  if (!channel || !isConnected) {
    throw new Error('RabbitMQ channel not available');
  }
  return channel;
};

const sendToQueue = async (queueName, message, options = {}) => {
  try {
    if (!channel || !isConnected) {
      throw new Error('RabbitMQ channel not available');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const result = await channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
      ...options
    });

    if (result) {
      logger.info(`Message sent to queue ${queueName}`);
    } else {
      logger.warn(`Failed to send message to queue ${queueName}`);
    }

    return result;
  } catch (error) {
    logger.error(`Error sending message to queue ${queueName}:`, error);
    throw error;
  }
};

const disconnectRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    isConnected = false;
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

module.exports = { 
  connectRabbitMQ, 
  getRabbitMQChannel, 
  sendToQueue, 
  disconnectRabbitMQ 
};
