import express from 'express';
import { healthCheck, getSystemStats } from '@/controllers/health.controller';

const router = express.Router();

// GET /api/health
router.get('/', healthCheck);

// GET /api/health/stats
router.get('/stats', getSystemStats);

export default router;
