import express from 'express';

const router = express.Router();

// Placeholder for assessment types
router.get('/types', (req, res) => {
  const assessmentTypes = [
    {
      id: 'interview',
      name: 'AI Mock Interview',
      description: 'Practice with AI-powered interviews',
      duration: '30 min',
      difficulty: 'Adaptive'
    },
    {
      id: 'coding',
      name: 'Coding Challenges',
      description: 'Solve algorithmic problems',
      duration: '45-90 min',
      difficulty: 'Easy to Hard'
    },
    {
      id: 'mcq',
      name: 'Technical MCQs',
      description: 'Test your knowledge across technical domains',
      duration: '20-45 min',
      difficulty: 'Mixed'
    }
  ];

  res.json({
    success: true,
    data: assessmentTypes
  });
});

export default router;
