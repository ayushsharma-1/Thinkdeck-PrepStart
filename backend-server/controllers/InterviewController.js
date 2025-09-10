const { Session } = require('../models/Session');
const { sendToQueue } = require('../config/rabbitmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const { v4: uuidv4 } = require('uuid');

class InterviewController {
  
  // Setup interview session
  static async setupInterview(req, res, next) {
    try {
      const { userDetails, resume, jobDescription, roleName } = req.body;
      
      // Validate required fields
      if (!userDetails || !userDetails.name || !userDetails.email || !userDetails.experience) {
        return next(new AppError('User details (name, email, experience) are required', 400));
      }
      
      if (!resume || !jobDescription || !roleName) {
        return next(new AppError('Resume, job description, and role name are required', 400));
      }

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send resume for parsing to FastAPI via RabbitMQ
      const resumeParsingMessage = {
        session_id: sessionId,
        file_data: resume.data, // Assuming resume is base64 encoded
        file_name: resume.filename,
        file_type: resume.filetype
      };
      
      await sendToQueue(
        process.env.RABBITMQ_QUESTION_QUEUE || 'question_generation',
        {
          message_type: 'resume_parsing',
          ...resumeParsingMessage
        }
      );

      // Create session in database
      const session = new Session({
        sessionId,
        userDetails,
        resumeText: '', // Will be populated after resume parsing
        jobDescription,
        roleName,
        status: 'created',
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          platform: req.get('sec-ch-ua-platform')
        }
      });

      await session.save();

      // Initialize chat in Redis
      const redisClient = getRedisClient();
      const chatKey = `session:${sessionId}:chat`;
      const initialMessage = {
        id: uuidv4(),
        sender: 'system',
        content: 'Welcome to your AI interview! We are processing your resume and will start with the first question shortly.',
        timestamp: new Date().toISOString(),
        isProcessing: true
      };

      await redisClient.setEx(
        chatKey,
        parseInt(process.env.REDIS_TTL) || 2100, // 35 minutes
        JSON.stringify([initialMessage])
      );

      logger.info(`Interview session created: ${sessionId}`);

      res.status(201).json({
        success: true,
        sessionId,
        message: 'Interview session created successfully'
      });

    } catch (error) {
      logger.error('Error in setupInterview:', error);
      next(error);
    }
  }

  // Generate question
  static async generateQuestion(req, res, next) {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return next(new AppError('Session ID is required', 400));
      }

      // Get session from database
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return next(new AppError('Session not found', 404));
      }

      // Check if interview is completed
      if (session.status === 'completed') {
        return res.json({
          success: true,
          completed: true,
          message: 'Interview has been completed'
        });
      }

      // Prepare question generation request
      const questionRequest = {
        session_id: sessionId,
        resume_text: session.resumeText,
        job_description: session.jobDescription,
        role_name: session.roleName,
        question_number: session.currentQuestionNumber + 1,
        previous_responses: session.responses.map(r => ({
          question_number: r.questionNumber,
          response: r.response
        })),
        covered_topics: session.questions.map(q => q.topic).filter(Boolean)
      };

      // Send to FastAPI via RabbitMQ
      await sendToQueue(
        process.env.RABBITMQ_QUESTION_QUEUE || 'question_generation',
        {
          message_type: 'question_generation',
          ...questionRequest
        }
      );

      logger.info(`Question generation requested for session: ${sessionId}`);

      res.json({
        success: true,
        message: 'Question generation in progress',
        questionNumber: questionRequest.question_number
      });

    } catch (error) {
      logger.error('Error in generateQuestion:', error);
      next(error);
    }
  }

  // Submit response
  static async submitResponse(req, res, next) {
    try {
      const { sessionId, questionNumber, response } = req.body;
      
      if (!sessionId || questionNumber === undefined || !response) {
        return next(new AppError('Session ID, question number, and response are required', 400));
      }

      // Get session from database
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return next(new AppError('Session not found', 404));
      }

      // Add response to session
      session.responses.push({
        questionNumber,
        response,
        timestamp: new Date()
      });

      // Update session status
      if (session.responses.length >= session.totalQuestions) {
        session.status = 'completed';
        session.completedAt = new Date();
      } else {
        session.status = 'in_progress';
        session.currentQuestionNumber = questionNumber;
      }

      await session.save();

      // Update chat in Redis
      const redisClient = getRedisClient();
      const chatKey = `session:${sessionId}:chat`;
      const existingChat = await redisClient.get(chatKey);
      
      if (existingChat) {
        const chatMessages = JSON.parse(existingChat);
        chatMessages.push({
          id: uuidv4(),
          sender: 'user',
          content: response,
          timestamp: new Date().toISOString(),
          isProcessing: false
        });

        await redisClient.setEx(
          chatKey,
          parseInt(process.env.REDIS_TTL) || 2100,
          JSON.stringify(chatMessages)
        );
      }

      // Emit to connected clients via Socket.IO
      const io = req.app.get('io');
      io.to(sessionId).emit('response-submitted', {
        sessionId,
        questionNumber,
        response,
        completed: session.status === 'completed'
      });

      logger.info(`Response submitted for session: ${sessionId}, question: ${questionNumber}`);

      res.json({
        success: true,
        message: 'Response submitted successfully',
        completed: session.status === 'completed',
        nextQuestionNumber: session.status === 'completed' ? null : questionNumber + 1
      });

    } catch (error) {
      logger.error('Error in submitResponse:', error);
      next(error);
    }
  }

  // Get session details
  static async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return next(new AppError('Session not found', 404));
      }

      // Get chat from Redis
      const redisClient = getRedisClient();
      const chatKey = `session:${sessionId}:chat`;
      const chatData = await redisClient.get(chatKey);
      const chat = chatData ? JSON.parse(chatData) : [];

      res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          userDetails: session.userDetails,
          roleName: session.roleName,
          status: session.status,
          questions: session.questions,
          responses: session.responses,
          currentQuestionNumber: session.currentQuestionNumber,
          totalQuestions: session.totalQuestions,
          completedAt: session.completedAt,
          createdAt: session.createdAt,
          chat
        }
      });

    } catch (error) {
      logger.error('Error in getSession:', error);
      next(error);
    }
  }
}

module.exports = InterviewController;
