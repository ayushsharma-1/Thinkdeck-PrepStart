import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileUpload } from '@/models';
import { asyncHandler, createError } from '@/middleware/error.middleware';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'audio/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const fileRecord = await FileUpload.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  });

  res.json({
    success: true,
    data: {
      id: fileRecord._id,
      filename: fileRecord.filename,
      originalName: fileRecord.originalName,
      size: fileRecord.size,
      url: `/uploads/${fileRecord.filename}`
    }
  });
}));

export default router;
