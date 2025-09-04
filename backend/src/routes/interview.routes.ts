import express from 'express';
import multer from 'multer';
import {
  createInterviewSession,
  getInterviewSession,
  transcribeAudio,
  evaluateAnswer,
  completeInterview,
  uploadResume
} from '@/controllers/interview.controller';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow audio files for transcription
    const audioTypes = [
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
      'audio/ogg', 'audio/flac', 'audio/aac', 'audio/x-m4a'
    ];
    
    // Allow document files for resume upload
    const docTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (audioTypes.includes(file.mimetype) || docTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'), false);
    }
  }
});

// POST /api/interview/sessions - Create new interview session
router.post('/sessions', createInterviewSession);

// GET /api/interview/sessions/:sessionId - Get interview session
router.get('/sessions/:sessionId', getInterviewSession);

// POST /api/interview/sessions/:sessionId/transcribe - Transcribe audio
router.post('/sessions/:sessionId/transcribe', upload.single('audio'), transcribeAudio);

// POST /api/interview/sessions/:sessionId/evaluate - Evaluate answer
router.post('/sessions/:sessionId/evaluate', evaluateAnswer);

// POST /api/interview/sessions/:sessionId/complete - Complete interview
router.post('/sessions/:sessionId/complete', completeInterview);

// POST /api/interview/upload-resume - Upload and parse resume
router.post('/upload-resume', upload.single('resume'), uploadResume);

export default router;
