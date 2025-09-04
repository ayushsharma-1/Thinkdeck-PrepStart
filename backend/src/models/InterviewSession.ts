import mongoose, { Schema } from 'mongoose';
import { IInterviewSession } from '@/types';

const interviewSessionSchema = new Schema<IInterviewSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  resumeText: {
    type: String,
    trim: true
  },
  jobDescription: {
    type: String,
    trim: true
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  questions: [{
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      trim: true
    },
    transcription: {
      type: String,
      trim: true
    },
    aiEvaluation: {
      score: {
        type: Number,
        min: 0,
        max: 10
      },
      feedback: {
        type: String,
        trim: true
      },
      keywords: [{
        type: String,
        trim: true
      }]
    },
    duration: {
      type: Number,
      default: 0,
      min: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  finalEvaluation: {
    overallScore: {
      type: Number,
      min: 0,
      max: 10
    },
    categoryScores: {
      communication: {
        type: Number,
        min: 0,
        max: 10
      },
      technical: {
        type: Number,
        min: 0,
        max: 10
      },
      confidence: {
        type: Number,
        min: 0,
        max: 10
      },
      relevance: {
        type: Number,
        min: 0,
        max: 10
      }
    },
    strengths: [{
      type: String,
      trim: true
    }],
    improvements: [{
      type: String,
      trim: true
    }],
    detailedFeedback: {
      type: String,
      trim: true
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from creation
    expires: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
interviewSessionSchema.index({ sessionId: 1 });
interviewSessionSchema.index({ status: 1 });
interviewSessionSchema.index({ expiresAt: 1 });
interviewSessionSchema.index({ company: 1 });

export const InterviewSession = mongoose.model<IInterviewSession>('InterviewSession', interviewSessionSchema);
