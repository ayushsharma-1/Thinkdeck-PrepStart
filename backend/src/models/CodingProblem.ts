import mongoose, { Schema } from 'mongoose';
import { ICodingProblem, QuestionDifficulty, ProgrammingLanguage } from '@/types';

const codingProblemSchema = new Schema<ICodingProblem>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: Object.values(QuestionDifficulty),
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  companies: [{
    type: Schema.Types.ObjectId,
    ref: 'Company'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  constraints: {
    type: String,
    trim: true
  },
  examples: [{
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    },
    explanation: String
  }],
  testCases: [{
    input: {
      type: String,
      required: true
    },
    expectedOutput: {
      type: String,
      required: true
    },
    isHidden: {
      type: Boolean,
      default: false
    }
  }],
  supportedLanguages: [{
    type: String,
    enum: Object.values(ProgrammingLanguage),
    required: true
  }],
  timeLimit: {
    type: Number,
    required: true,
    min: 1000, // minimum 1 second
    default: 5000 // 5 seconds default
  },
  memoryLimit: {
    type: Number,
    required: true,
    min: 32, // minimum 32 MB
    default: 256 // 256 MB default
  },
  starterCode: {
    type: Map,
    of: String,
    default: new Map()
  },
  solution: {
    type: Map,
    of: String,
    default: new Map()
  },
  hints: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
codingProblemSchema.index({ difficulty: 1, category: 1 });
codingProblemSchema.index({ companies: 1 });
codingProblemSchema.index({ tags: 1 });
codingProblemSchema.index({ isActive: 1 });
codingProblemSchema.index({ supportedLanguages: 1 });

// Validation
codingProblemSchema.pre('save', function(next) {
  // Ensure at least one example exists
  if (this.examples.length === 0) {
    return next(new Error('At least one example is required'));
  }

  // Ensure at least one test case exists
  if (this.testCases.length === 0) {
    return next(new Error('At least one test case is required'));
  }

  // Ensure at least one supported language
  if (this.supportedLanguages.length === 0) {
    return next(new Error('At least one supported language is required'));
  }

  next();
});

export const CodingProblem = mongoose.model<ICodingProblem>('CodingProblem', codingProblemSchema);
