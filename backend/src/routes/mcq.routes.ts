import express from 'express';

const router = express.Router();

// MCQ placeholder routes
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'Technical', count: 150 },
      { name: 'Aptitude', count: 100 },
      { name: 'Verbal', count: 80 },
      { name: 'Reasoning', count: 90 }
    ]
  });
});

router.post('/sessions', (req, res) => {
  res.json({
    success: true,
    data: {
      sessionId: 'mcq-session-123',
      questions: [],
      timeLimit: 1800
    }
  });
});

export default router;
