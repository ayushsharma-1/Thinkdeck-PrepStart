const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Interview setup validation schema
const interviewSetupSchema = Joi.object({
  userDetails: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[\+]?[\d\s\-\(\)]{10,20}$/).optional(),
    experience: Joi.string().min(1).max(50).required()
  }).required(),
  resume: Joi.object({
    data: Joi.string().required(),
    filename: Joi.string().required(),
    filetype: Joi.string().valid('pdf', 'docx', 'doc').required()
  }).required(),
  jobDescription: Joi.string().min(50).max(5000).required(),
  roleName: Joi.string().min(2).max(100).required()
});

// Generate question validation schema
const generateQuestionSchema = Joi.object({
  sessionId: Joi.string().pattern(/^session_\d+_[a-z0-9]+$/).required()
});

// Submit response validation schema
const submitResponseSchema = Joi.object({
  sessionId: Joi.string().pattern(/^session_\d+_[a-z0-9]+$/).required(),
  questionNumber: Joi.number().integer().min(1).max(20).required(),
  response: Joi.string().min(10).max(2000).required(),
  responseText: Joi.string().min(10).max(2000).optional(), // Backward compatibility
  question_text: Joi.string().min(1).max(5000).optional(),
  timestamp: Joi.string().isoDate().optional()
});

// Generate next question validation schema (for session.js route)
const generateNextQuestionSchema = Joi.object({
  sessionId: Joi.string().pattern(/^session_\d+_[a-z0-9]+$/).required(),
  responseText: Joi.string().min(10).max(2000).optional(),
  questionNumber: Joi.number().integer().min(1).max(20).optional(),
  timestamp: Joi.string().isoDate().optional()
});

// Validation middleware functions
const validateInterviewSetup = (req, res, next) => {
  const { error } = interviewSetupSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return next(new AppError(`Validation error: ${errorMessages.join(', ')}`, 400));
  }
  

  // Additional custom validations
  const { resume, jobDescription } = req.body;
  console.log(resume.data);
  // Validate resume file size (base64 check)
  if (resume.data.length > 50 * 1024 * 1024) { // ~37MB actual file size
    return next(new AppError('Resume file is too large (max 10MB)', 400));
  }
  
  // Check if base64 data is valid
  try {
    const buffer = Buffer.from(resume.data, 'base64');
    if (buffer.length === 0) {
      return next(new AppError('Resume file is empty', 400));
    }
  } catch (err) {
    return next(new AppError('Invalid resume file format', 400));
  }
  
  next();
};

const validateGenerateQuestion = (req, res, next) => {
  const { error } = generateQuestionSchema.validate(req.body);
  
  if (error) {
    const errorMessage = error.details[0].message;
    return next(new AppError(`Validation error: ${errorMessage}`, 400));
  }
  
  next();
};

const validateResponse = (req, res, next) => {
  const { error } = submitResponseSchema.validate(req.body);
  
  if (error) {
    const errorMessage = error.details[0].message;
    return next(new AppError(`Validation error: ${errorMessage}`, 400));
  }
  
  // Additional validation for response content
  const { response } = req.body;
  
  // Check for potentially harmful content (basic check)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(response))) {
    return next(new AppError('Response contains invalid content', 400));
  }
  
  next();
};

const validateGenerateNextQuestion = (req, res, next) => {
  const { error } = generateNextQuestionSchema.validate(req.body);
  
  if (error) {
    const errorMessage = error.details[0].message;
    return next(new AppError(`Validation error: ${errorMessage}`, 400));
  }
  
  next();
};

// Session ID validation middleware
const validateSessionId = (req, res, next) => {
  const sessionId = req.params.sessionId || req.body.sessionId;
  
  if (!sessionId) {
    return next(new AppError('Session ID is required', 400));
  }
  
  // UUID v4 validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(sessionId)) {
    return next(new AppError('Invalid session ID format', 400));
  }
  
  next();
};

// Generic validation helper
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation error: ${errorMessages.join(', ')}`, 400));
    }
    
    next();
  };
};

// Custom validation rules
const customValidationRules = {
  // Validate file type by magic numbers/headers
  validateFileType: (base64Data, expectedType) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const header = buffer.toString('hex', 0, 4).toUpperCase();
      
      const signatures = {
        pdf: ['25504446'],
        docx: ['504B0304', '504B0506', '504B0708'],
        doc: ['D0CF11E0']
      };
      
      const validSignatures = signatures[expectedType.toLowerCase()] || [];
      return validSignatures.some(sig => header.startsWith(sig));
      
    } catch (error) {
      return false;
    }
  },
  
  // Validate email domain (optional)
  validateEmailDomain: (email) => {
    const blockedDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return !blockedDomains.includes(domain);
  },
  
  // Validate text content for basic quality
  validateTextContent: (text, minWords = 10) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length >= minWords;
  }
};

module.exports = {
  validateInterviewSetup,
  validateGenerateQuestion,
  validateGenerateNextQuestion,
  validateResponse,
  validateSessionId,
  validate,
  customValidationRules,
  
  // Export schemas for testing
  schemas: {
    interviewSetupSchema,
    generateQuestionSchema,
    generateNextQuestionSchema,
    submitResponseSchema
  }
};
