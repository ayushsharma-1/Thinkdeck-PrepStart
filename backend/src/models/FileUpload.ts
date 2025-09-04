import mongoose, { Schema } from 'mongoose';
import { IFileUpload } from '@/types';

const fileUploadSchema = new Schema<IFileUpload>({
  filename: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  path: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String
  },
  isTemporary: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from upload
    expires: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
fileUploadSchema.index({ filename: 1 });
fileUploadSchema.index({ isTemporary: 1 });
fileUploadSchema.index({ expiresAt: 1 });

export const FileUpload = mongoose.model<IFileUpload>('FileUpload', fileUploadSchema);
