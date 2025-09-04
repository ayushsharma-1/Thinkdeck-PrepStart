import express from 'express';
import {
  getAllCompanies,
  getCompanyBySlug,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
} from '@/controllers/company.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/', getAllCompanies);
router.get('/stats', getCompanyStats);
router.get('/:slug', getCompanyBySlug);

// Protected routes (admin only)
router.post('/', authMiddleware, createCompany);
router.put('/:id', authMiddleware, updateCompany);
router.delete('/:id', authMiddleware, deleteCompany);

export default router;
