import { Request, Response } from 'express';
import { CodingProblem } from '@/models';
import { asyncHandler, createError } from '@/middleware/error.middleware';
import { codeExecutionService } from '@/services/codeExecution.service';
import { ProgrammingLanguage } from '@/types';
import { logger } from '@/services/logger.service';

export const getCodingProblems = asyncHandler(async (req: Request, res: Response) => {
  const {
    company,
    difficulty,
    category,
    tags,
    limit = '20',
    offset = '0',
    search
  } = req.query;

  const filter: any = { isActive: true };

  if (company) {
    filter.companies = company;
  }

  if (difficulty) {
    filter.difficulty = difficulty;
  }

  if (category) {
    filter.category = new RegExp(category as string, 'i');
  }

  if (tags) {
    const tagArray = (tags as string).split(',').map(tag => tag.trim());
    filter.tags = { $in: tagArray };
  }

  if (search) {
    filter.$or = [
      { title: new RegExp(search as string, 'i') },
      { description: new RegExp(search as string, 'i') }
    ];
  }

  const problems = await CodingProblem.find(filter)
    .populate('companies', 'name slug')
    .select('-solution -testCases')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit as string))
    .skip(parseInt(offset as string));

  const total = await CodingProblem.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: problems.length,
    total,
    data: problems
  });
});

export const getCodingProblem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const problem = await CodingProblem.findById(id)
    .populate('companies', 'name slug')
    .select('-solution');

  if (!problem) {
    throw createError('Coding problem not found', 404);
  }

  if (!problem.isActive) {
    throw createError('This problem is currently unavailable', 403);
  }

  // Only return non-hidden test cases
  const visibleTestCases = problem.testCases.filter(tc => !tc.isHidden);
  const problemData = problem.toObject();
  problemData.testCases = visibleTestCases;

  res.status(200).json({
    success: true,
    data: problemData
  });
});

export const executeCode = asyncHandler(async (req: Request, res: Response) => {
  const { problemId, language, code, input } = req.body;

  if (!language || !code) {
    throw createError('Language and code are required', 400);
  }

  if (!codeExecutionService.isLanguageSupported(language)) {
    throw createError(`Unsupported language: ${language}`, 400);
  }

  // If problemId is provided, check if it exists
  if (problemId) {
    const problem = await CodingProblem.findById(problemId);
    if (!problem) {
      throw createError('Coding problem not found', 404);
    }

    if (!problem.supportedLanguages.includes(language as ProgrammingLanguage)) {
      throw createError(`Language ${language} is not supported for this problem`, 400);
    }
  }

  const execution = await codeExecutionService.executeCode(
    language as ProgrammingLanguage,
    code,
    input,
    problemId
  );

  res.status(200).json({
    success: true,
    data: execution
  });
});

export const submitCode = asyncHandler(async (req: Request, res: Response) => {
  const { problemId, language, code } = req.body;

  if (!problemId || !language || !code) {
    throw createError('Problem ID, language, and code are required', 400);
  }

  if (!codeExecutionService.isLanguageSupported(language)) {
    throw createError(`Unsupported language: ${language}`, 400);
  }

  const problem = await CodingProblem.findById(problemId);
  if (!problem) {
    throw createError('Coding problem not found', 404);
  }

  if (!problem.isActive) {
    throw createError('This problem is currently unavailable', 403);
  }

  if (!problem.supportedLanguages.includes(language as ProgrammingLanguage)) {
    throw createError(`Language ${language} is not supported for this problem`, 400);
  }

  // Run all test cases (including hidden ones)
  const submission = await codeExecutionService.runTests(
    language as ProgrammingLanguage,
    code,
    problem.testCases,
    problemId
  );

  const result = {
    ...submission,
    problemTitle: problem.title,
    difficulty: problem.difficulty,
    passed: submission.testResults!.passed === submission.testResults!.total,
    score: Math.round((submission.testResults!.passed / submission.testResults!.total) * 100)
  };

  logger.info(`Code submission for problem ${problemId}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.score}%)`);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const getProblemCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await CodingProblem.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: categories.map(cat => ({
      name: cat._id,
      count: cat.count
    }))
  });
});

export const getProblemTags = asyncHandler(async (req: Request, res: Response) => {
  const tags = await CodingProblem.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);

  res.status(200).json({
    success: true,
    data: tags.map(tag => ({
      name: tag._id,
      count: tag.count
    }))
  });
});

export const getSupportedLanguages = asyncHandler(async (req: Request, res: Response) => {
  const languages = codeExecutionService.getSupportedLanguages();

  res.status(200).json({
    success: true,
    data: languages
  });
});

export const getExecutionStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = codeExecutionService.getExecutionStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});

export const createCodingProblem = asyncHandler(async (req: Request, res: Response) => {
  const problemData = req.body;

  const problem = await CodingProblem.create(problemData);

  logger.info(`Coding problem created: ${problem.title} (${problem._id})`);

  res.status(201).json({
    success: true,
    data: problem
  });
});

export const updateCodingProblem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const problem = await CodingProblem.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });

  if (!problem) {
    throw createError('Coding problem not found', 404);
  }

  logger.info(`Coding problem updated: ${problem.title} (${problem._id})`);

  res.status(200).json({
    success: true,
    data: problem
  });
});

export const deleteCodingProblem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const problem = await CodingProblem.findById(id);
  if (!problem) {
    throw createError('Coding problem not found', 404);
  }

  // Soft delete - just mark as inactive
  problem.isActive = false;
  await problem.save();

  logger.info(`Coding problem deactivated: ${problem.title} (${problem._id})`);

  res.status(200).json({
    success: true,
    message: 'Coding problem deactivated successfully'
  });
});
