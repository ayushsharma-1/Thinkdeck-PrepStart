import { Document, Types } from 'mongoose';

// Common interfaces
export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
}

// Company interface
export interface ICompany extends Document, ITimestamps {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isActive: boolean;
  questionCount: number;
}

// Question category
export enum QuestionCategory {
  TECHNICAL = 'technical',
  APTITUDE = 'aptitude',
  VERBAL = 'verbal',
  REASONING = 'reasoning',
  BEHAVIORAL = 'behavioral'
}

// Question difficulty
export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Programming languages
export enum ProgrammingLanguage {
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  TYPESCRIPT = 'typescript',
  GO = 'go',
  RUST = 'rust'
}

// MCQ Question interface
export interface IMCQQuestion extends Document, ITimestamps {
  title: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation?: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  companies: Types.ObjectId[];
  tags: string[];
  isMultiSelect: boolean;
  points: number;
  timeLimit?: number; // in seconds
  isActive: boolean;
}

// Coding Problem interface
export interface ICodingProblem extends Document, ITimestamps {
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  category: string;
  companies: Types.ObjectId[];
  tags: string[];
  constraints?: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
  supportedLanguages: ProgrammingLanguage[];
  timeLimit: number; // in milliseconds
  memoryLimit: number; // in MB
  starterCode: {
    [key in ProgrammingLanguage]?: string;
  };
  solution?: {
    [key in ProgrammingLanguage]?: string;
  };
  hints?: string[];
  isActive: boolean;
}

// Interview Session interface
export interface IInterviewSession extends Document, ITimestamps {
  sessionId: string;
  resumeText?: string;
  jobDescription?: string;
  company?: Types.ObjectId;
  questions: {
    question: string;
    answer?: string;
    transcription?: string;
    aiEvaluation?: {
      score: number;
      feedback: string;
      keywords: string[];
    };
    duration: number; // in seconds
    timestamp: Date;
  }[];
  status: 'active' | 'completed' | 'expired';
  duration: number; // total duration in seconds
  finalEvaluation?: {
    overallScore: number;
    categoryScores: {
      communication: number;
      technical: number;
      confidence: number;
      relevance: number;
    };
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
  };
  expiresAt: Date;
}

// MCQ Test Session interface
export interface IMCQTestSession extends Document, ITimestamps {
  sessionId: string;
  categories: QuestionCategory[];
  difficulty?: QuestionDifficulty;
  company?: Types.ObjectId;
  questions: Types.ObjectId[];
  answers: {
    [questionId: string]: number[];
  };
  timeLimit: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  status: 'created' | 'started' | 'completed' | 'expired';
  score?: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    percentage: number;
    categoryScores: {
      [category: string]: {
        total: number;
        correct: number;
        percentage: number;
      };
    };
  };
  expiresAt: Date;
}

// Code Execution interface
export interface ICodeExecution {
  problemId: Types.ObjectId;
  language: ProgrammingLanguage;
  code: string;
  input?: string;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout';
  testResults?: {
    passed: number;
    total: number;
    details: {
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      error?: string;
    }[];
  };
}

// File Upload interface
export interface IFileUpload extends Document, ITimestamps {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy?: string;
  isTemporary: boolean;
  expiresAt?: Date;
}

// Assessment Statistics
export interface IAssessmentStats {
  totalQuestions: number;
  totalUsers: number;
  averageScore: number;
  popularCategories: {
    category: string;
    count: number;
  }[];
  popularCompanies: {
    company: string;
    count: number;
  }[];
}

// Socket Events
export interface SocketEvents {
  // Interview events
  'interview:join': (sessionId: string) => void;
  'interview:answer': (data: { sessionId: string; answer: string; questionIndex: number }) => void;
  'interview:next-question': (data: { sessionId: string; question: string }) => void;
  'interview:complete': (sessionId: string) => void;
  
  // Coding events
  'coding:execute': (data: { problemId: string; language: string; code: string }) => void;
  'coding:result': (data: ICodeExecution) => void;
  
  // General events
  'error': (error: string) => void;
  'disconnect': () => void;
}
