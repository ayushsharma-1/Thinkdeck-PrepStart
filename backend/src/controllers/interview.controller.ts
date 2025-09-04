import { Request, Response } from 'express';
import { InterviewSession } from '@/models';
import { asyncHandler, createError } from '@/middleware/error.middleware';
import { aiService } from '@/services/ai.service';
import { speechService } from '@/services/speech.service';
import { logger } from '@/services/logger.service';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const createInterviewSession = asyncHandler(async (req: Request, res: Response) => {
  const { resumeText, jobDescription, company } = req.body;

  if (!resumeText || !jobDescription) {
    throw createError('Resume text and job description are required', 400);
  }

  const sessionId = uuidv4();

  // Generate interview questions using AI
  const questions = await aiService.generateInterviewQuestions(
    resumeText,
    jobDescription,
    company
  );

  const session = await InterviewSession.create({
    sessionId,
    resumeText,
    jobDescription,
    company,
    questions: questions.map(question => ({
      question,
      timestamp: new Date()
    })),
    status: 'active'
  });

  logger.info(`Interview session created: ${sessionId}`);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.sessionId,
      firstQuestion: questions[0],
      totalQuestions: questions.length,
      expiresAt: session.expiresAt
    }
  });
});

export const getInterviewSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ sessionId });

  if (!session) {
    throw createError('Interview session not found', 404);
  }

  if (session.status === 'expired') {
    throw createError('Interview session has expired', 410);
  }

  res.status(200).json({
    success: true,
    data: session
  });
});

export const transcribeAudio = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const audioFile = req.file;

  if (!audioFile) {
    throw createError('Audio file is required', 400);
  }

  const session = await InterviewSession.findOne({ sessionId });
  if (!session) {
    throw createError('Interview session not found', 404);
  }

  if (session.status !== 'active') {
    throw createError('Interview session is not active', 400);
  }

  // Validate audio file
  const validation = speechService.validateAudioFile(audioFile.originalname, audioFile.size);
  if (!validation.valid) {
    throw createError(validation.error!, 400);
  }

  // Transcribe audio
  const transcription = await speechService.transcribeAudio(
    audioFile.buffer,
    audioFile.originalname
  );

  res.status(200).json({
    success: true,
    data: {
      transcription,
      sessionId
    }
  });
});

export const evaluateAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { transcription, questionIndex } = req.body;

  if (!transcription || questionIndex === undefined) {
    throw createError('Transcription and question index are required', 400);
  }

  const session = await InterviewSession.findOne({ sessionId });
  if (!session) {
    throw createError('Interview session not found', 404);
  }

  if (questionIndex >= session.questions.length || questionIndex < 0) {
    throw createError('Invalid question index', 400);
  }

  const question = session.questions[questionIndex].question;

  // Evaluate answer using AI
  const evaluation = await aiService.evaluateAnswer(
    question,
    transcription,
    session.resumeText,
    session.jobDescription
  );

  // Update session with answer and evaluation
  session.questions[questionIndex].answer = transcription;
  session.questions[questionIndex].transcription = transcription;
  session.questions[questionIndex].aiEvaluation = evaluation;
  session.questions[questionIndex].duration = 
    (Date.now() - session.questions[questionIndex].timestamp.getTime()) / 1000;

  await session.save();

  // Determine next question
  let nextQuestion = null;
  let isCompleted = false;

  if (questionIndex + 1 < session.questions.length) {
    nextQuestion = session.questions[questionIndex + 1].question;
  } else {
    // Interview is complete, generate final evaluation
    isCompleted = true;
    await generateFinalEvaluation(session);
  }

  res.status(200).json({
    success: true,
    data: {
      evaluation,
      nextQuestion,
      isCompleted,
      currentQuestionIndex: questionIndex,
      totalQuestions: session.questions.length
    }
  });
});

export const completeInterview = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ sessionId });
  if (!session) {
    throw createError('Interview session not found', 404);
  }

  if (session.status === 'completed') {
    return res.status(200).json({
      success: true,
      data: session.finalEvaluation
    });
  }

  // Generate final evaluation if not already done
  const finalEvaluation = await generateFinalEvaluation(session);

  res.status(200).json({
    success: true,
    data: finalEvaluation
  });
});

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw createError('Resume file is required', 400);
  }

  let resumeText = '';

  try {
    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      resumeText = pdfData.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docData = await mammoth.extractRawText({ buffer: file.buffer });
      resumeText = docData.value;
    } else if (file.mimetype === 'text/plain') {
      resumeText = file.buffer.toString('utf-8');
    } else {
      throw createError('Unsupported file format. Please upload PDF, DOCX, or TXT file', 400);
    }

    if (!resumeText.trim()) {
      throw createError('Could not extract text from the resume file', 400);
    }

    res.status(200).json({
      success: true,
      data: {
        resumeText: resumeText.trim(),
        filename: file.originalname,
        wordCount: resumeText.trim().split(/\s+/).length
      }
    });

  } catch (error) {
    logger.error('Error processing resume file:', error);
    throw createError('Failed to process resume file', 500);
  }
});

// Helper function to generate final evaluation
async function generateFinalEvaluation(session: any) {
  try {
    const questions = session.questions.map((q: any) => q.question);
    const answers = session.questions.map((q: any) => q.answer || '');

    const finalEvaluation = await aiService.generateFinalEvaluation(
      questions,
      answers,
      session.resumeText,
      session.jobDescription
    );

    // Calculate total duration
    const totalDuration = session.questions.reduce((total: number, q: any) => {
      return total + (q.duration || 0);
    }, 0);

    // Update session with final evaluation
    session.finalEvaluation = finalEvaluation;
    session.status = 'completed';
    session.duration = totalDuration;
    await session.save();

    logger.info(`Interview session completed: ${session.sessionId}`);

    return finalEvaluation;
  } catch (error) {
    logger.error('Error generating final evaluation:', error);
    throw createError('Failed to generate final evaluation', 500);
  }
}
