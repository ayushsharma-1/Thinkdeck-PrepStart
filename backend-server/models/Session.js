const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  isAiGenerated: {
    type: Boolean,
    default: true
  },
  topic: {
    type: String,
    required: false
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, { _id: false });

const ResponseSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // in seconds
    required: false
  },
  score: {
    type: Number,
    min: 0,
    max: 10,
    required: false
  }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userDetails: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    experience: {
      type: String,
      required: true,
      trim: true
    }
  },
  resumeText: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  roleName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['created', 'in_progress', 'completed', 'cancelled'],
    default: 'created'
  },
  questions: [QuestionSchema],
  responses: [ResponseSchema],
  completedAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  totalQuestions: {
    type: Number,
    default: 10
  },
  currentQuestionNumber: {
    type: Number,
    default: 0
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String
  }
});

// Update the updatedAt field before saving
SessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
SessionSchema.index({ createdAt: 1 });
SessionSchema.index({ 'userDetails.email': 1 });
SessionSchema.index({ status: 1 });

const Session = mongoose.model('Session', SessionSchema);

module.exports = { Session, SessionSchema, QuestionSchema, ResponseSchema };
