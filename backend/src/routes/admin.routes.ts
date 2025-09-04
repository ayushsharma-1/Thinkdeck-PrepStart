import express from 'express';

const router = express.Router();

// Admin placeholder routes
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 0,
      totalSessions: 0,
      totalQuestions: 0,
      systemHealth: 'OK'
    }
  });
});

export default router;
