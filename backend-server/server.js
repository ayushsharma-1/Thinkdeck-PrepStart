const { app, server } = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Starting server initialization...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB();
    logger.info('Connected to MongoDB Atlas');

    // Connect to Redis
    console.log('Connecting to Redis...');
    await connectRedis();
    logger.info('Connected to Redis Cloud');

    // Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...');
    await connectRabbitMQ();
    logger.info('Connected to RabbitMQ Cloud');

    // Start the server
    console.log(`Starting server on port ${PORT}...`);
    server.listen(PORT, () => {
      console.log(`✅ PrepStart Backend Server running on port ${PORT}`);
      logger.info(`PrepStart Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      logger.error('Server error:', error);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

startServer();
