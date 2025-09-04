import express from 'express';
import {
  getCodingProblems,
  getCodingProblem,
  executeCode,
  submitCode,
  getProblemCategories,
  getProblemTags,
  getSupportedLanguages,
  getExecutionStats,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem
} from '@/controllers/coding.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/problems', getCodingProblems);
router.get('/problems/:id', getCodingProblem);
router.post('/execute', executeCode);
router.post('/submit', submitCode);
router.get('/categories', getProblemCategories);
router.get('/tags', getProblemTags);
router.get('/languages', getSupportedLanguages);
router.get('/stats/execution', getExecutionStats);

// Protected routes (admin only)
router.post('/problems', authMiddleware, createCodingProblem);
router.put('/problems/:id', authMiddleware, updateCodingProblem);
router.delete('/problems/:id', authMiddleware, deleteCodingProblem);

export default router;
