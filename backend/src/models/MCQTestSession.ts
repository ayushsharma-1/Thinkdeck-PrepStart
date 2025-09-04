import mongoose, { Schema } from 'mongoose';
import { IMCQTestSession, QuestionCategory, QuestionDifficulty } from '@/types';

const mcqTestSessionSchema = new Schema<IMCQTestSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  categories: [{
    type: String,
    enum: Object.values(QuestionCategory),
    required: true
  }],
  difficulty: {
    type: String,
    enum: Object.values(QuestionDifficulty)
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  questions: [{
    type: Schema.Types.ObjectId,
    ref: 'MCQQuestion'
  }],
  answers: {
    type: Map,
    of: [Number],
    default: new Map()
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 60 // minimum 1 minute
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['created', 'started', 'completed', 'expired'],
    default: 'created'
  },
  score: {
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    incorrectAnswers: {
      type: Number,
      default: 0
    },
    unanswered: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    categoryScores: {
      type: Map,
      of: {
        total: {
          type: Number,
          default: 0
        },
        correct: {
          type: Number,
          default: 0
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        }
      },
      default: new Map()
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
    expires: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
mcqTestSessionSchema.index({ sessionId: 1 });
mcqTestSessionSchema.index({ status: 1 });
mcqTestSessionSchema.index({ expiresAt: 1 });
mcqTestSessionSchema.index({ categories: 1 });
mcqTestSessionSchema.index({ company: 1 });

export const MCQTestSession = mongoose.model<IMCQTestSession>('MCQTestSession', mcqTestSessionSchema);
