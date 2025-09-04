import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger.service';
import { SocketEvents } from '@/types';

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Interview session events
    socket.on('interview:join', (sessionId: string) => {
      logger.info(`Socket ${socket.id} joined interview session: ${sessionId}`);
      socket.join(sessionId);
      
      // Acknowledge join
      socket.emit('interview:joined', { sessionId });
    });

    socket.on('interview:answer', (data: { sessionId: string; answer: string; questionIndex: number }) => {
      logger.info(`Received answer for session ${data.sessionId}, question ${data.questionIndex}`);
      
      // Broadcast to room (for potential observers or logging)
      socket.to(data.sessionId).emit('interview:answer-received', {
        questionIndex: data.questionIndex,
        timestamp: new Date()
      });
    });

    socket.on('interview:next-question', (data: { sessionId: string; question: string }) => {
      logger.info(`Next question for session ${data.sessionId}`);
      
      // Send next question to the specific session
      socket.to(data.sessionId).emit('interview:question', {
        question: data.question,
        timestamp: new Date()
      });
    });

    socket.on('interview:complete', (sessionId: string) => {
      logger.info(`Interview session ${sessionId} completed`);
      
      // Notify session completion
      socket.to(sessionId).emit('interview:completed', {
        sessionId,
        timestamp: new Date()
      });
      
      // Leave the room
      socket.leave(sessionId);
    });

    // Coding challenge events
    socket.on('coding:execute', (data: { problemId: string; language: string; code: string }) => {
      logger.info(`Code execution request for problem ${data.problemId} in ${data.language}`);
      
      // Acknowledge execution start
      socket.emit('coding:execution-started', {
        problemId: data.problemId,
        timestamp: new Date()
      });
    });

    socket.on('coding:join-problem', (problemId: string) => {
      socket.join(`problem-${problemId}`);
      logger.info(`Socket ${socket.id} joined problem room: problem-${problemId}`);
    });

    socket.on('coding:leave-problem', (problemId: string) => {
      socket.leave(`problem-${problemId}`);
      logger.info(`Socket ${socket.id} left problem room: problem-${problemId}`);
    });

    // MCQ test events
    socket.on('mcq:join-test', (sessionId: string) => {
      socket.join(`mcq-${sessionId}`);
      logger.info(`Socket ${socket.id} joined MCQ test: mcq-${sessionId}`);
    });

    socket.on('mcq:submit-answer', (data: { sessionId: string; questionId: string; answer: number[] }) => {
      logger.info(`MCQ answer submitted for session ${data.sessionId}, question ${data.questionId}`);
      
      // Broadcast answer submission (for progress tracking)
      socket.to(`mcq-${data.sessionId}`).emit('mcq:answer-submitted', {
        questionId: data.questionId,
        timestamp: new Date()
      });
    });

    socket.on('mcq:leave-test', (sessionId: string) => {
      socket.leave(`mcq-${sessionId}`);
      logger.info(`Socket ${socket.id} left MCQ test: mcq-${sessionId}`);
    });

    // General events
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Broadcast system notifications
  const broadcastSystemUpdate = (message: string, data?: any) => {
    io.emit('system:update', {
      message,
      data,
      timestamp: new Date()
    });
  };

  // Export for use in other services
  (global as any).socketBroadcast = broadcastSystemUpdate;
};
