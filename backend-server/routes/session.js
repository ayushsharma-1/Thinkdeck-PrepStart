const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { Session } = require('../models/Session');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const { processResumeFile } = require('../utils/resumeProcessor');
const { validateGenerateNextQuestion } = require('../utils/validation');

const router = express.Router();

// Confidence evaluation function with partial answer detection
async function evaluateResponseConfidence(question, response, roleName, topic) {
  try {
    // Call FastAPI backend for AI-based confidence evaluation
    const evaluationPayload = {
      question: question,
      response: response,
      role_name: roleName,
      topic: topic
    };
    
    console.log(`[CONFIDENCE] Evaluating response confidence with partial answer detection...`);
    const aiResponse = await axios.post('http://localhost:8000/api/evaluate-response-confidence', evaluationPayload, { 
      timeout: 10000 
    });
    
    if (aiResponse.data.success && aiResponse.data.confidence_score !== undefined) {
      // Return full evaluation result for partial answer handling
      return {
        confidence_score: Math.round(aiResponse.data.confidence_score),
        is_multipart: aiResponse.data.is_multipart || false,
        parts_identified: aiResponse.data.parts_identified || [],
        answered_parts: aiResponse.data.answered_parts || [],
        missing_parts: aiResponse.data.missing_parts || [],
        reasoning: aiResponse.data.reasoning || '',
        evaluation_method: aiResponse.data.evaluation_method || 'ai_based'
      };
    }
  } catch (aiError) {
    console.log(`[CONFIDENCE] AI evaluation failed, using fallback:`, aiError.message);
  }
  
  // Fallback confidence scoring based on response characteristics
  const fallbackScore = calculateBasicConfidenceScore(question, response, topic);
  return {
    confidence_score: fallbackScore,
    is_multipart: false,
    parts_identified: [],
    answered_parts: [],
    missing_parts: [],
    reasoning: 'Fallback rule-based evaluation used',
    evaluation_method: 'rule_based'
  };
}

function calculateBasicConfidenceScore(question, response, topic) {
  let score = 50; // Base score
  
  // Length-based scoring
  const wordCount = response.trim().split(/\s+/).length;
  if (wordCount < 5) score -= 30;
  else if (wordCount < 10) score -= 10;
  else if (wordCount > 20) score += 10;
  else if (wordCount > 50) score += 20;
  
  // Content quality indicators
  const lowerResponse = response.toLowerCase();
  
  // Positive indicators
  if (lowerResponse.includes('experience')) score += 10;
  if (lowerResponse.includes('project')) score += 10;
  if (lowerResponse.includes('skill')) score += 10;
  if (lowerResponse.includes('learn')) score += 5;
  if (lowerResponse.includes('challenge')) score += 5;
  
  // Topic-specific scoring
  if (topic.toLowerCase() === 'general') {
    if (lowerResponse.includes('myself') || lowerResponse.includes('background')) score += 15;
    if (lowerResponse.includes('interested') || lowerResponse.includes('passion')) score += 10;
  }
  
  // Negative indicators
  if (lowerResponse.length < 20) score -= 20;
  if (lowerResponse === response) score -= 5; // No capitalization
  if (!lowerResponse.includes('.') && !lowerResponse.includes('!') && !lowerResponse.includes('?')) score -= 5;
  
  // Generic responses
  const genericPhrases = ['i like', 'it is good', 'yes', 'no', 'ok', 'fine'];
  if (genericPhrases.some(phrase => lowerResponse.includes(phrase) && wordCount < 10)) {
    score -= 25;
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

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
    
    // Process resume locally using our resume processor
    const result = await processResumeFile(req.file);
    
    if (result.success) {
      logger.info('Resume processed successfully', {
        filename: result.filename,
        size: result.size,
        extractedLength: result.extractedLength
      });
      
      res.json({
        success: true,
        resumeText: result.text,
        filename: result.filename,
        message: 'Resume processed successfully'
      });
    } else {
      logger.error('Resume processing failed', {
        filename: result.filename,
        error: result.error
      });
      
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to process resume file'
      });
    }
    
  } catch (error) {
    logger.error('Resume upload error:', error);
    
    // Handle general file processing errors
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the resume. Please try again.'
    });
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
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`GET_SESSION_CALLED [${requestId}] get-session API called`);
  
  try {
    const { userData, action } = req.body;
    console.log(`REQUEST_DATA [${requestId}] Processing session request`);
    
    if (!userData) {
      console.log(`❌ [${requestId}] No user data provided`);
      return res.status(400).json({
        success: false,
        message: 'User data is required'
      });
    }
    
    let session;
    
    if (action === 'start') {
      console.log(`🔄 [${requestId}] Starting new session for:`, userData.email);
      
      // Check for recent sessions from the same user (within last 5 minutes)
      const recentThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      console.log(`🔍 [${requestId}] Checking for recent sessions after:`, recentThreshold);
      
      const existingRecentSession = await Session.findOne({
        'userDetails.email': userData.email || 'candidate@example.com',
        startedAt: { $gte: recentThreshold },
        status: { $in: ['created', 'in_progress'] }
      }).sort({ startedAt: -1 });
      
      if (existingRecentSession) {
        console.log(`⚠️ [${requestId}] Found recent session:`, existingRecentSession.sessionId);
        logger.info(`Returning existing recent session: ${existingRecentSession.sessionId}`);
        
        // Get the first question from existing session
        const firstQuestion = existingRecentSession.questions.length > 0 
          ? existingRecentSession.questions[0].question
          : `Hello ${existingRecentSession.userDetails.name}! I'm excited to interview you today for the ${existingRecentSession.roleName} position. Let's start with a simple question: Can you tell me about yourself and why you're interested in this position?`;
        
        console.log(`♻️ [${requestId}] Returning existing session with first question`);
        return res.json({
          success: true,
          sessionId: existingRecentSession.sessionId,
          firstQuestion,
          message: 'Resuming existing session'
        });
      }
      
      console.log(`🆕 [${requestId}] Creating new session...`);
      
      // Generate a unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🆔 [${requestId}] Generated session ID:`, newSessionId);
      
      // Check if session already exists (prevent duplicates)
      const existingSession = await Session.findOne({ sessionId: newSessionId });
      if (existingSession) {
        console.log(`⚠️ [${requestId}] Duplicate session ID detected:`, newSessionId);
        logger.warn(`Duplicate session ID detected: ${newSessionId}`);
        return res.status(409).json({
          success: false,
          message: 'Session conflict, please try again'
        });
      }
      
      console.log(`💾 [${requestId}] Creating session document...`);
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
      console.log(`💾 [${requestId}] New session saved:`, newSessionId);
      logger.info(`New session created: ${newSessionId}`);
      
      // Generate first question using FastAPI AI service
      let firstQuestion = `Hello ${session.userDetails.name}! I'm excited to interview you today for the ${session.roleName} position. Let's start with a simple question: Can you tell me about yourself and why you're interested in this position?`;
      console.log(`📝 [${requestId}] Default question prepared`);
      
      try {
        console.log(`🤖 [${requestId}] Calling FastAPI for AI question...`);
        console.log(`🤖 [${requestId}] Session data: sessionId=${session.sessionId}, resumeLength=${session.resumeText ? session.resumeText.length : 0}, jobDescLength=${session.jobDescription ? session.jobDescription.length : 0}`);
        
        // Call FastAPI backend to generate AI question
        const axios = require('axios');
        const requestPayload = {
          session_id: session.sessionId,
          resume_text: session.resumeText,
          job_description: session.jobDescription,
          role_name: session.roleName,
          question_number: 1,
          previous_responses: [],
          covered_topics: []
        };
        
        console.log(`🤖 [${requestId}] Sending request to FastAPI AI service`);
        
        const aiResponse = await axios.post('http://localhost:8000/api/generate-question', requestPayload, { timeout: 10000 });
        
        console.log(`🤖 [${requestId}] FastAPI response received:`, aiResponse.data.success ? 'Success' : 'Failed');
        
        if (aiResponse.data.success && aiResponse.data.question) {
          firstQuestion = aiResponse.data.question;
          console.log(`✅ [${requestId}] AI question generated successfully`);
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
        console.log(`⚠️ [${requestId}] AI question generation failed:`, aiError.message);
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
        console.log(`💾 [${requestId}] Session saved with fallback question`);
      }
      
      console.log(`📤 [${requestId}] Sending response with question:`, firstQuestion.substring(0, 50) + '...');
      res.json({
        success: true,
        sessionId: session.sessionId,
        firstQuestion,
        message: 'Session initialized successfully'
      });
      
    } else {
      console.log(`❌ [${requestId}] Invalid action:`, action);
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
    
  } catch (error) {
    console.log(`💥 [${requestId}] Error in get-session:`, error);
    logger.error('Error in get-session:', error);
    next(error);
  }
});

// Generate next question
router.post('/generate-next-question', validateGenerateNextQuestion, async (req, res, next) => {
  const requestStartTime = Date.now();
  const requestId = `req_${requestStartTime}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[BACKEND] ${requestId} - /generate-next-question endpoint called at ${requestStartTime}`);
  console.log(`[BACKEND] ${requestId} - Request body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const { sessionId, responseText } = req.body;
    
    console.log(`[BACKEND] ${requestId} - Processing sessionId: ${sessionId}, responseText length: ${responseText?.length || 0}`);
    
    if (!sessionId) {
      console.log(`[BACKEND] ${requestId} - Missing sessionId, returning 400`);
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Find the session
    console.log(`[BACKEND] ${requestId} - Looking up session: ${sessionId}`);
    const session = await Session.findOne({ sessionId });
    if (!session) {
      console.log(`[BACKEND] ${requestId} - Session not found: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    console.log(`[BACKEND] ${requestId} - Found session. Current question number: ${session.currentQuestionNumber}, responses count: ${session.responses.length}`);
    
    // Save the response if provided
    if (responseText) {
      const responseData = {
        questionNumber: session.currentQuestionNumber,
        response: responseText,
        timestamp: new Date()
      };
      
      console.log(`[BACKEND] ${requestId} - Saving response for question ${session.currentQuestionNumber}`);
      session.responses.push(responseData);
      
      // Store complete question-response pair in Redis
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          // Find the current question details
          const currentQuestion = session.questions.find(q => q.questionNumber === session.currentQuestionNumber);
          
          // Create complete question-response pair
          const completeData = {
            session_id: sessionId,
            question_number: session.currentQuestionNumber,
            question_text: currentQuestion ? currentQuestion.question : 'Question not found',
            topic: currentQuestion ? currentQuestion.topic : 'General',
            difficulty: currentQuestion ? currentQuestion.difficulty : 'medium',
            is_ai_generated: currentQuestion ? currentQuestion.isAiGenerated : false,
            generated_at: currentQuestion ? currentQuestion.createdAt || new Date().toISOString() : new Date().toISOString(),
            role_name: session.roleName,
            user_response: responseText,
            response_timestamp: new Date().toISOString()
          };
          
          const redisKey = `interview:${sessionId}:qa_pairs`;
          await redisClient.rPush(redisKey, JSON.stringify(completeData));
          await redisClient.expire(redisKey, parseInt(process.env.REDIS_TTL) || 3600);
          console.log(`[BACKEND] ${requestId} - Complete Q&A pair stored in Redis for session: ${sessionId}`);
          logger.info(`Complete Q&A pair stored in Redis for session: ${sessionId}, question: ${session.currentQuestionNumber}`);
          
          // Evaluate response confidence/quality with partial answer detection
          const evaluationResult = await evaluateResponseConfidence(
            currentQuestion ? currentQuestion.question : 'Unknown question',
            responseText,
            session.roleName,
            currentQuestion ? currentQuestion.topic : 'General'
          );
          
          const confidenceScore = typeof evaluationResult === 'number' ? evaluationResult : evaluationResult.confidence_score || 0;
          
          console.log(`[BACKEND] ${requestId} - Response confidence score: ${confidenceScore}% for session: ${sessionId}`);
          logger.info(`Response confidence score: ${confidenceScore}% for session: ${sessionId}, question: ${session.currentQuestionNumber}`);
          
          // Update the stored data with confidence score and partial answer info
          completeData.confidence_score = confidenceScore;
          completeData.needs_clarification = confidenceScore < 60; // Threshold for re-asking
          
          // Add partial answer detection data if available
          if (typeof evaluationResult === 'object' && evaluationResult) {
            completeData.is_multipart = evaluationResult.is_multipart || false;
            completeData.parts_identified = evaluationResult.parts_identified || [];
            completeData.answered_parts = evaluationResult.answered_parts || [];
            completeData.missing_parts = evaluationResult.missing_parts || [];
            completeData.evaluation_reasoning = evaluationResult.reasoning || '';
          }
          
          // Re-store with confidence data
          await redisClient.lPop(redisKey); // Remove the last stored item
          await redisClient.rPush(redisKey, JSON.stringify(completeData));
        }
      } catch (redisError) {
        console.log(`[BACKEND] ${requestId} - Failed to store Q&A pair in Redis:`, redisError.message);
        logger.warn('Failed to store Q&A pair in Redis:', redisError.message);
      }
    }
    
    // Check confidence score and partial answer status to decide next action
    let shouldRepeatQuestion = false;
    let nextQuestionNumber = session.currentQuestionNumber + 1;
    let partialAnswerData = null;
    
    if (responseText) {
      // Get the confidence score and partial answer data from the stored data
      const redisClient = getRedisClient();
      try {
        const redisKey = `interview:${sessionId}:qa_pairs`;
        const latestData = await redisClient.lIndex(redisKey, -1); // Get the last stored item
        if (latestData) {
          const parsedData = JSON.parse(latestData);
          const confidenceScore = parsedData.confidence_score || 0;
          
          if (confidenceScore < 60) { // Low confidence threshold
            shouldRepeatQuestion = true;
            nextQuestionNumber = session.currentQuestionNumber; // Same question number
            
            // Store partial answer data for targeted clarification
            partialAnswerData = {
              is_multipart: parsedData.is_multipart || false,
              parts_identified: parsedData.parts_identified || [],
              answered_parts: parsedData.answered_parts || [],
              missing_parts: parsedData.missing_parts || [],
              original_response: responseText
            };
            
            console.log(`[BACKEND] ${requestId} - Low confidence score (${confidenceScore}%), will re-ask question ${nextQuestionNumber} with ${partialAnswerData.is_multipart ? 'targeted partial' : 'general'} clarification`);
            logger.info(`Low confidence response for session: ${sessionId}, question: ${session.currentQuestionNumber}, score: ${confidenceScore}%, multipart: ${partialAnswerData.is_multipart}`);
          } else {
            console.log(`[BACKEND] ${requestId} - Good confidence score (${confidenceScore}%), proceeding to next question`);
          }
        }
      } catch (redisError) {
        console.log(`[BACKEND] ${requestId} - Failed to retrieve confidence score, proceeding normally`);
      }
    }
    
    // Check if we should end the interview
    if (!shouldRepeatQuestion && session.currentQuestionNumber >= 10) {
      console.log(`[BACKEND] ${requestId} - Interview completed (question ${session.currentQuestionNumber} >= 10)`);
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();
      
      return res.json({
        success: true,
        interview_completed: true,
        message: 'Interview completed'
      });
    }
    
    console.log(`[BACKEND] ${requestId} - Next question number will be: ${nextQuestionNumber}`);
    
    // Generate next question using AI
    let nextQuestion = `Question ${nextQuestionNumber}: Tell me about a challenging project you worked on.`;
    console.log(`[BACKEND] ${requestId} - Default fallback question prepared`);
    
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
          console.log(`[BACKEND] ${requestId} - Retrieved ${redisResponses.length} responses from Redis for session: ${sessionId}`);
          logger.info(`Retrieved ${redisResponses.length} responses from Redis for session: ${sessionId}`);
        }
      } catch (redisError) {
        console.log(`[BACKEND] ${requestId} - Failed to retrieve responses from Redis:`, redisError.message);
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
      
      console.log(`[BACKEND] ${requestId} - === AI QUESTION GENERATION DEBUG START ===`);
      console.log(`[BACKEND] ${requestId} - Calling FastAPI for AI question generation...`);
      console.log(`[BACKEND] ${requestId} - Session data:`);
      console.log(`[BACKEND] ${requestId} - sessionId: ${session.sessionId}`);
      console.log(`[BACKEND] ${requestId} - resumeText length: ${session.resumeText ? session.resumeText.length : 0}`);
      console.log(`[BACKEND] ${requestId} - jobDescription length: ${session.jobDescription ? session.jobDescription.length : 0}`);
      console.log(`[BACKEND] ${requestId} - roleName: ${session.roleName}`);
      console.log(`[BACKEND] ${requestId} - nextQuestionNumber: ${nextQuestionNumber}`);
      console.log(`[BACKEND] ${requestId} - sortedResponses count: ${sortedResponses.length}`);
      console.log(`[BACKEND] ${requestId} - resumeLength: ${session.resumeText ? session.resumeText.length : 0}, jobDescLength: ${session.jobDescription ? session.jobDescription.length : 0}`);
      
      const requestPayload = {
        session_id: session.sessionId,
        resume_text: session.resumeText,
        job_description: session.jobDescription,
        role_name: session.roleName,
        question_number: nextQuestionNumber,
        previous_responses: sortedResponses,
        covered_topics: session.questions.map(q => q.topic).filter(Boolean),
        is_clarification_request: shouldRepeatQuestion,
        original_question: shouldRepeatQuestion ? (session.questions.find(q => q.questionNumber === nextQuestionNumber)?.question || '') : null,
        partial_answer_data: partialAnswerData // Include partial answer information
      };
      
      console.log(`[BACKEND] ${requestId} - Sending request to FastAPI AI service`);
      
      const aiResponse = await axios.post('http://localhost:8000/api/generate-question', requestPayload, { timeout: 10000 });
      
      console.log(`[BACKEND] ${requestId} - FastAPI response: ${aiResponse.data.success ? 'Success' : 'Failed'}`);
      
      if (aiResponse.data.success && aiResponse.data.question) {
        nextQuestion = aiResponse.data.question;
        
        console.log(`[BACKEND] ${requestId} - Using AI-generated question`);
        
        // Save the AI-generated question (only if not a repeat)
        if (!shouldRepeatQuestion) {
          session.questions.push({
            questionNumber: nextQuestionNumber,
            question: nextQuestion,
            isAiGenerated: true,
            topic: aiResponse.data.topic || 'Technical',
            difficulty: aiResponse.data.difficulty || 'medium'
          });
        } else {
          // For repeat questions, update the existing question with clarification
          const existingQuestionIndex = session.questions.findIndex(q => q.questionNumber === nextQuestionNumber);
          if (existingQuestionIndex !== -1) {
            session.questions[existingQuestionIndex].question = nextQuestion;
            session.questions[existingQuestionIndex].clarification_count = (session.questions[existingQuestionIndex].clarification_count || 0) + 1;
            session.questions[existingQuestionIndex].is_clarification = true;
          }
        }
      }
    } catch (aiError) {
      console.log(`[BACKEND] ${requestId} - AI question generation failed:`, aiError.message);
      logger.warn('Failed to generate AI question, using fallback:', aiError.message);
      // Save fallback question (only if not a repeat)
      if (!shouldRepeatQuestion) {
        session.questions.push({
          questionNumber: nextQuestionNumber,
          question: nextQuestion,
          isAiGenerated: false,
          topic: 'General',
          difficulty: 'medium'
        });
      } else {
        // For repeat questions, use targeted clarification for partial answers
        const existingQuestionIndex = session.questions.findIndex(q => q.questionNumber === nextQuestionNumber);
        if (existingQuestionIndex !== -1) {
          const originalQuestion = session.questions[existingQuestionIndex].question;
          if (partialAnswerData && partialAnswerData.is_multipart && partialAnswerData.missing_parts.length > 0) {
            // Build a targeted follow-up for missing parts
            const missingPartsText = partialAnswerData.missing_parts.map((part, idx) => `Part ${idx + 1}: ${part}`).join('\n');
            nextQuestion = `Let's focus on the parts you missed:\n${missingPartsText}\nPlease answer these specifically.`;
          } else {
            nextQuestion = `${originalQuestion}\n\nLet me clarify: Please provide more details about your experience and background. I'm looking for specific examples and more comprehensive information about your skills and interests.`;
          }
          session.questions[existingQuestionIndex].question = nextQuestion;
          session.questions[existingQuestionIndex].clarification_count = (session.questions[existingQuestionIndex].clarification_count || 0) + 1;
          session.questions[existingQuestionIndex].is_clarification = true;
        }
      }
    }
    
    console.log(`[BACKEND] ${requestId} - Updating session with question ${nextQuestionNumber}${shouldRepeatQuestion ? ' (clarification)' : ''}`);
    
    // Only update currentQuestionNumber if we're not repeating
    if (!shouldRepeatQuestion) {
      session.currentQuestionNumber = nextQuestionNumber;
    }
    
    await session.save();
    
    const responseData = {
      success: true,
      question: nextQuestion,
      question_number: nextQuestionNumber,
      interview_completed: false
    };
    
    console.log(`[BACKEND] ${requestId} - Sending response:`, responseData);
    console.log(`[BACKEND] ${requestId} - Request completed in ${Date.now() - requestStartTime}ms`);
    
    res.json(responseData);
    
  } catch (error) {
    console.log(`[BACKEND] ${requestId} - Error in generate-next-question:`, error);
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
