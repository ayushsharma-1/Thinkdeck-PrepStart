import { Request, Response } from 'express';
import { Company } from '@/models';
import { asyncHandler, createError } from '@/middleware/error.middleware';
import { logger } from '@/services/logger.service';

export const getAllCompanies = asyncHandler(async (req: Request, res: Response) => {
  const { active = 'true' } = req.query;

  const filter: any = {};
  if (active === 'true') {
    filter.isActive = true;
  }

  const companies = await Company.find(filter)
    .sort({ name: 1 })
    .select('name slug logo description website questionCount');

  res.status(200).json({
    success: true,
    count: companies.length,
    data: companies
  });
});

export const getCompanyBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const company = await Company.findOne({ slug, isActive: true });

  if (!company) {
    throw createError('Company not found', 404);
  }

  res.status(200).json({
    success: true,
    data: company
  });
});

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, website, logo } = req.body;

  // Check if company already exists
  const existingCompany = await Company.findOne({ name });
  if (existingCompany) {
    throw createError('Company already exists', 400);
  }

  const company = await Company.create({
    name,
    description,
    website,
    logo
  });

  logger.info(`Company created: ${company.name} (${company.slug})`);

  res.status(201).json({
    success: true,
    data: company
  });
});

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const company = await Company.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });

  if (!company) {
    throw createError('Company not found', 404);
  }

  logger.info(`Company updated: ${company.name} (${company.slug})`);

  res.status(200).json({
    success: true,
    data: company
  });
});

export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const company = await Company.findById(id);
  if (!company) {
    throw createError('Company not found', 404);
  }

  // Soft delete - just mark as inactive
  company.isActive = false;
  await company.save();

  logger.info(`Company deactivated: ${company.name} (${company.slug})`);

  res.status(200).json({
    success: true,
    message: 'Company deactivated successfully'
  });
});

export const getCompanyStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await Company.aggregate([
    {
      $group: {
        _id: null,
        totalCompanies: { $sum: 1 },
        activeCompanies: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        totalQuestions: { $sum: '$questionCount' },
        averageQuestions: { $avg: '$questionCount' }
      }
    }
  ]);

  const popularCompanies = await Company.find({ isActive: true })
    .sort({ questionCount: -1 })
    .limit(10)
    .select('name slug questionCount');

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {
        totalCompanies: 0,
        activeCompanies: 0,
        totalQuestions: 0,
        averageQuestions: 0
      },
      popularCompanies
    }
  });
});
