import mongoose, { Schema } from 'mongoose';
import { IMCQQuestion, QuestionCategory, QuestionDifficulty } from '@/types';

const mcqQuestionSchema = new Schema<IMCQQuestion>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswers: [{
    type: Number,
    required: true,
    min: 0
  }],
  explanation: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: Object.values(QuestionCategory),
    required: true
  },
  difficulty: {
    type: String,
    enum: Object.values(QuestionDifficulty),
    required: true
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
  isMultiSelect: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 1,
    min: 1
  },
  timeLimit: {
    type: Number,
    min: 10 // minimum 10 seconds
  },
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
mcqQuestionSchema.index({ category: 1, difficulty: 1 });
mcqQuestionSchema.index({ companies: 1 });
mcqQuestionSchema.index({ tags: 1 });
mcqQuestionSchema.index({ isActive: 1 });

// Validation
mcqQuestionSchema.pre('save', function(next) {
  // Validate correct answers
  const maxOptionIndex = this.options.length - 1;
  const invalidAnswers = this.correctAnswers.filter(ans => ans > maxOptionIndex);
  
  if (invalidAnswers.length > 0) {
    return next(new Error('Correct answers contain invalid option indices'));
  }

  // For single select questions, only one correct answer allowed
  if (!this.isMultiSelect && this.correctAnswers.length > 1) {
    return next(new Error('Single select questions can only have one correct answer'));
  }

  next();
});

export const MCQQuestion = mongoose.model<IMCQQuestion>('MCQQuestion', mcqQuestionSchema);
