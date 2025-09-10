const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { Session } = require('../models/Session');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process resume
router.post('/upload-resume', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file provided'
      });
    }
    
    // Create FormData to send to FastAPI backend for text extraction
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    
    // Send to FastAPI backend for text extraction
    const response = await axios.post('http://localhost:8000/upload-resume', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000 // 30 second timeout for file processing
    });
    
    if (response.data && response.data.text) {
      res.json({
        success: true,
        resumeText: response.data.text,
        filename: response.data.filename || req.file.originalname,
        message: 'Resume processed successfully'
      });
    } else {
      throw new Error('Failed to extract text from resume');
    }
    
  } catch (error) {
    logger.error('Resume upload error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Resume processing service is unavailable. Please try again later.'
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.response.data?.detail || 'Invalid file format'
      });
    }
    
    next(new AppError('Failed to process resume', 500));
  }
});

// Get all sessions (admin endpoint)
router.get('/sessions', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const sessions = await Session.find(filter)
      .select('sessionId userDetails.name userDetails.email roleName status createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Session.countDocuments(filter);
    
    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Delete session (admin endpoint)
router.delete('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOneAndDelete({ sessionId });
    
    if (!session) {
      return next(new AppError('Session not found', 404));
    }
    
    // Also remove from Redis
    try {
      const redisClient = getRedisClient();
      await redisClient.del(`session:${sessionId}:chat`);
    } catch (redisError) {
      logger.warn(`Failed to delete Redis data for session ${sessionId}: ${redisError.message}`);
    }
    
    logger.info(`Session deleted: ${sessionId}`);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Get session statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Session.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const avgQuestionsAnswered = await Session.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avg: { $avg: { $size: '$responses' } } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        completion_rate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        average_questions_answered: avgQuestionsAnswered[0]?.avg || 0,
        status_breakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Initialize session and get first question
router.post('/get-session', async (req, res, next) => {
  try {
    const { userData, action } = req.body;
    
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'User data is required'
      });
    }
    
    let session;
    
    if (action === 'start') {
      // Check for recent sessions from the same user (within last 5 minutes)
      const recentThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const existingRecentSession = await Session.findOne({
        'userDetails.email': userData.email || 'candidate@example.com',
        startedAt: { $gte: recentThreshold },
        status: { $in: ['created', 'in_progress'] }
      }).sort({ startedAt: -1 });
      
      if (existingRecentSession) {
        logger.info(`Returning existing recent session: ${existingRecentSession.sessionId}`);
        
        // Get the first question from existing session
        const firstQuestion = existingRecentSession.questions.length > 0 
          ? existingRecentSession.questions[0].question
          : `Hello ${existingRecentSession.userDetails.name}! I'm excited to interview you today for the ${existingRecentSession.roleName} position. Let's start with a simple question: Can you tell me about yourself and why you're interested in this position?`;
        
        return res.json({
          success: true,
          sessionId: existingRecentSession.sessionId,
          firstQuestion,
          message: 'Resuming existing session'
        });
      }
      
      // Generate a unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if session already exists (prevent duplicates)
      const existingSession = await Session.findOne({ sessionId: newSessionId });
      if (existingSession) {
        logger.warn(`Duplicate session ID detected: ${newSessionId}`);
        return res.status(409).json({
          success: false,
          message: 'Session conflict, please try again'
        });
      }
      
      // Create new session
      session = new Session({
        sessionId: newSessionId,
        userDetails: {
          name: userData.name || userData.fullName || 'Candidate',
          email: userData.email || 'candidate@example.com',
          phone: userData.phone || '',
          experience: userData.experience || '0-2 years' // Provide default experience
        },
        resumeText: userData.resumeText || 'Resume text not provided', // Provide default
        jobDescription: userData.jobDescription || 'Job description not provided',
        roleName: userData.jobTitle || 'Developer',
        companyName: userData.company || 'Company',
        status: 'in_progress', // Use valid enum value
        startedAt: new Date()
      });
      
      await session.save();
      logger.info(`New session created: ${newSessionId}`);
      
      // Generate first question using FastAPI AI service
      let firstQuestion = `Hello ${session.userDetails.name}! I'm excited to interview you today for the ${session.roleName} position. Let's start with a simple question: Can you tell me about yourself and why you're interested in this position?`;
      
      try {
        // Call FastAPI backend to generate AI question
        const axios = require('axios');
        const aiResponse = await axios.post('http://localhost:8000/api/generate-question', {
          session_id: session.sessionId,
          resume_text: session.resumeText,
          job_description: session.jobDescription,
          role_name: session.roleName,
          question_number: 1,
          previous_responses: [],
          covered_topics: []
        }, { timeout: 10000 });
        
        if (aiResponse.data.success && aiResponse.data.question) {
          firstQuestion = aiResponse.data.question;
          logger.info(`AI question generated for session: ${session.sessionId}`);
          
          // Save the AI-generated question to the session
          session.questions.push({
            questionNumber: 1,
            question: firstQuestion,
            isAiGenerated: true,
            topic: aiResponse.data.category || 'General',
            difficulty: aiResponse.data.difficulty || 'medium'
          });
          
          session.currentQuestionNumber = 1;
          await session.save();
        }
      } catch (aiError) {
        logger.warn('Failed to generate AI question, using fallback:', aiError.message);
        // Use fallback question but still save it
        session.questions.push({
          questionNumber: 1,
          question: firstQuestion,
          isAiGenerated: false,
          topic: 'General',
          difficulty: 'easy'
        });
        
        session.currentQuestionNumber = 1;
        await session.save();
      }
      
      res.json({
        success: true,
        sessionId: session.sessionId,
        firstQuestion,
        message: 'Session initialized successfully'
      });
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
    
  } catch (error) {
    logger.error('Error in get-session:', error);
    next(error);
  }
});

// Generate next question
router.post('/generate-next-question', async (req, res, next) => {
  try {
    const { sessionId, responseText } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Find the session
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Save the response if provided
    if (responseText) {
      const responseData = {
        questionNumber: session.currentQuestionNumber,
        response: responseText,
        timestamp: new Date()
      };
      
      session.responses.push(responseData);
      
      // Store response in Redis for scoring
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          const redisKey = `interview:${sessionId}:responses`;
          await redisClient.rPush(redisKey, JSON.stringify(responseData));
          await redisClient.expire(redisKey, parseInt(process.env.REDIS_TTL) || 3600);
          logger.info(`Response stored in Redis for session: ${sessionId}`);
        }
      } catch (redisError) {
        logger.warn('Failed to store response in Redis:', redisError.message);
      }
    }
    
    // Check if we should end the interview
    if (session.currentQuestionNumber >= 10) {
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
      
      return res.json({
        success: true,
        interview_completed: true,
        message: 'Interview completed'
      });
    }
    
    const nextQuestionNumber = session.currentQuestionNumber + 1;
    
    // Generate next question using AI
    let nextQuestion = `Question ${nextQuestionNumber}: Tell me about a challenging project you worked on.`;
    
    try {
      const axios = require('axios');
      
      // Get additional responses from Redis
      let redisResponses = [];
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          const redisKey = `interview:${sessionId}:responses`;
          const redisData = await redisClient.lRange(redisKey, 0, -1);
          redisResponses = redisData.map(data => JSON.parse(data));
          logger.info(`Retrieved ${redisResponses.length} responses from Redis for session: ${sessionId}`);
        }
      } catch (redisError) {
        logger.warn('Failed to retrieve responses from Redis:', redisError.message);
      }
      
      // Combine MongoDB and Redis responses
      const allResponses = [...session.responses.map(r => ({
        question_number: r.questionNumber,
        response: r.response,
        timestamp: r.timestamp
      })), ...redisResponses];
      
      // Sort by question number and get latest responses
      const sortedResponses = allResponses.sort((a, b) => a.question_number - b.question_number);
      
      const aiResponse = await axios.post('http://localhost:8000/api/generate-question', {
        session_id: session.sessionId,
        resume_text: session.resumeText,
        job_description: session.jobDescription,
        role_name: session.roleName,
        question_number: nextQuestionNumber,
        previous_responses: sortedResponses,
        covered_topics: session.questions.map(q => q.topic).filter(Boolean)
      }, { timeout: 10000 });
      
      if (aiResponse.data.success && aiResponse.data.question) {
        nextQuestion = aiResponse.data.question;
        
        // Save the AI-generated question
        session.questions.push({
          questionNumber: nextQuestionNumber,
          question: nextQuestion,
          isAiGenerated: true,
          topic: aiResponse.data.topic || 'Technical',
          difficulty: aiResponse.data.difficulty || 'medium'
        });
      }
    } catch (aiError) {
      logger.warn('Failed to generate AI question, using fallback:', aiError.message);
      // Save fallback question
      session.questions.push({
        questionNumber: nextQuestionNumber,
        question: nextQuestion,
        isAiGenerated: false,
        topic: 'General',
        difficulty: 'medium'
      });
    }
    
    session.currentQuestionNumber = nextQuestionNumber;
    await session.save();
    
    res.json({
      success: true,
      question: nextQuestion,
      question_number: nextQuestionNumber,
      interview_completed: false
    });
    
  } catch (error) {
    logger.error('Error generating next question:', error);
    next(error);
  }
});

// Complete interview and get evaluation
router.post('/complete-interview', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Find the session
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Mark interview as completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();
    
    // Call FastAPI for evaluation
    try {
      const axios = require('axios');
      const evaluationResponse = await axios.post('http://localhost:8000/api/evaluate-interview', {
        session_id: session.sessionId,
        candidate_name: session.userDetails.name,
        role_name: session.roleName,
        resume_text: session.resumeText,
        job_description: session.jobDescription,
        questions: session.questions,
        responses: session.responses
      }, { timeout: 30000 });
      
      if (evaluationResponse.data.success) {
        logger.info(`Interview evaluation completed for session: ${sessionId}`);
        
        res.json({
          success: true,
          sessionId: session.sessionId,
          evaluation: evaluationResponse.data,
          message: 'Interview completed and evaluated successfully'
        });
      } else {
        throw new Error(evaluationResponse.data.error || 'Evaluation failed');
      }
      
    } catch (evaluationError) {
      logger.error('Failed to get AI evaluation:', evaluationError.message);
      
      // Return basic completion without evaluation
      res.json({
        success: true,
        sessionId: session.sessionId,
        evaluation: {
          success: false,
          error: 'AI evaluation temporarily unavailable',
          overall_score: 7.0,
          feedback: 'Thank you for completing the interview. Your responses have been recorded.'
        },
        message: 'Interview completed successfully'
      });
    }
    
  } catch (error) {
    logger.error('Error completing interview:', error);
    next(error);
  }
});

module.exports = router;
