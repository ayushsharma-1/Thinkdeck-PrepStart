import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';

// Import routes
import healthRoutes from '@/routes/health.routes';
import assessmentRoutes from '@/routes/assessment.routes';
import companyRoutes from '@/routes/company.routes';
import interviewRoutes from '@/routes/interview.routes';
import codingRoutes from '@/routes/coding.routes';
import mcqRoutes from '@/routes/mcq.routes';
import uploadRoutes from '@/routes/upload.routes';
import adminRoutes from '@/routes/admin.routes';

// Import middleware
import { errorHandler } from '@/middleware/error.middleware';
import { requestLogger } from '@/middleware/logger.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

// Import services
import { logger } from '@/services/logger.service';
import { initializeDatabase } from '@/services/database.service';
import { setupSocketHandlers } from '@/services/socket.service';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.use('/api/health', healthRoutes);

// Public routes
app.use('/api/assessments', assessmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/upload', uploadRoutes);

// Session-based routes (no auth required)
app.use('/api/interview', interviewRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/mcq', mcqRoutes);

// Admin routes (authentication required)
app.use('/api/admin', authMiddleware, adminRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`CORS origins: ${process.env.CORS_ORIGIN}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io };
