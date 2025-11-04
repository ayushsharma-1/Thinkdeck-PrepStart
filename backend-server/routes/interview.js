const express = require('express');
const InterviewController = require('../controllers/InterviewController');
const { validateInterviewSetup, validateResponse, validateGenerateQuestion } = require('../utils/validation');

const router = express.Router();

// Setup interview session
router.post('/setup-interview', validateInterviewSetup, InterviewController.setupInterview);

// Generate next question
router.post('/generate-question', validateGenerateQuestion, InterviewController.generateQuestion);

// Submit interview response
router.post('/submit-response', validateResponse, InterviewController.submitResponse);

// Get session details
router.get('/session/:sessionId', InterviewController.getSession);

// Complete interview and send for evaluation
router.post('/complete-interview', InterviewController.completeInterview);

module.exports = router;
