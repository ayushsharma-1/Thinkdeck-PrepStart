const amqp = require('amqplib');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class ResponseConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.redisClient = null;
    this.isRunning = false;
  }

  async connect() {
    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Assert the response queue
      const responseQueue = process.env.RABBITMQ_RESPONSE_QUEUE || 'interview_response_queue';
      await this.channel.assertQueue(responseQueue, { durable: true });
      
      // Get Redis client
      this.redisClient = getRedisClient();
      
      logger.info(`[ResponseConsumer] Connected to RabbitMQ and ready to consume from ${responseQueue}`);
      return true;
    } catch (error) {
      logger.error('[ResponseConsumer] Failed to connect:', error);
      return false;
    }
  }

  async processMessage(message) {
    try {
      const data = JSON.parse(message.content.toString());
      const { session_id, ai_question, user_response, question_number, candidate_name, role_name } = data;
      
      logger.info(`[ResponseConsumer] Processing message for session: ${session_id}, question: ${question_number}`);
      
      // Store in Redis
      const redisKey = `interview:${session_id}:responses`;
      const responseData = {
        session_id,
        ai_question,
        user_response,
        question_number,
        candidate_name,
        role_name,
        timestamp: new Date().toISOString()
      };
      
      // Push to Redis list (using correct Node.js Redis v4+ syntax)
      await this.redisClient.rPush(redisKey, JSON.stringify(responseData));
      
      // Set expiration (1 hour)
      await this.redisClient.expire(redisKey, 3600);
      
      logger.info(`[ResponseConsumer] ✅ Stored AI response with user response in Redis for session: ${session_id}`);
      logger.info(`[ResponseConsumer] AI Question: ${ai_question}`);
      if (user_response) {
        logger.info(`[ResponseConsumer] User Response: ${user_response}`);
      }
      
      return true;
    } catch (error) {
      logger.error('[ResponseConsumer] Error processing message:', error);
      return false;
    }
  }

  async startConsuming() {
    if (this.isRunning) {
      logger.warn('[ResponseConsumer] Already running');
      return;
    }

    try {
      const responseQueue = process.env.RABBITMQ_RESPONSE_QUEUE || 'interview_response_queue';
      
      // Set up message consumer
      await this.channel.consume(responseQueue, async (message) => {
        if (message) {
          const success = await this.processMessage(message);
          if (success) {
            this.channel.ack(message);
          } else {
            this.channel.nack(message, false, true); // Requeue failed messages
          }
        }
      });

      this.isRunning = true;
      logger.info(`[ResponseConsumer] Started consuming from ${responseQueue}`);
    } catch (error) {
      logger.error('[ResponseConsumer] Error starting consumer:', error);
      throw error;
    }
  }

  async stop() {
    try {
      this.isRunning = false;
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('[ResponseConsumer] Stopped consuming');
    } catch (error) {
      logger.error('[ResponseConsumer] Error stopping consumer:', error);
    }
  }
}

module.exports = ResponseConsumer;