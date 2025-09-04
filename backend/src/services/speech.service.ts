import { AssemblyAI } from 'assemblyai';
import { logger } from './logger.service';
import { createError } from '@/middleware/error.middleware';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
});

export class SpeechService {
  // Transcribe audio from file buffer
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      logger.info(`Starting transcription for file: ${filename}`);

      // Upload audio file
      const uploadUrl = await client.files.upload(audioBuffer);
      
      // Create transcription request
      const transcript = await client.transcripts.transcribe({
        audio_url: uploadUrl,
        language_code: 'en', // English language
        punctuate: true,
        format_text: true,
        speaker_labels: false, // Single speaker for interviews
        auto_highlights: true,
        sentiment_analysis: false,
        entity_detection: false,
        speech_model: 'best' // Use the best available model for highest accuracy
      });

      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Transcription failed');
      }

      logger.info(`Transcription completed successfully for: ${filename}`);
      return transcript.text || '';

    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw createError('Failed to transcribe audio', 500);
    }
  }

  // Transcribe audio from URL
  async transcribeFromUrl(audioUrl: string): Promise<string> {
    try {
      logger.info(`Starting transcription from URL: ${audioUrl}`);

      const transcript = await client.transcripts.transcribe({
        audio_url: audioUrl,
        language_code: 'en',
        punctuate: true,
        format_text: true,
        speaker_labels: false,
        auto_highlights: true,
        sentiment_analysis: false,
        entity_detection: false,
        speech_model: 'best'
      });

      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Transcription failed');
      }

      logger.info('Transcription completed successfully from URL');
      return transcript.text || '';

    } catch (error) {
      logger.error('Error transcribing audio from URL:', error);
      throw createError('Failed to transcribe audio', 500);
    }
  }

  // Check transcription status (for async operations)
  async getTranscriptionStatus(transcriptId: string): Promise<{
    status: string;
    text?: string;
    error?: string;
  }> {
    try {
      const transcript = await client.transcripts.get(transcriptId);
      
      return {
        status: transcript.status,
        text: transcript.text,
        error: transcript.error
      };

    } catch (error) {
      logger.error('Error checking transcription status:', error);
      throw createError('Failed to check transcription status', 500);
    }
  }

  // Start async transcription
  async startAsyncTranscription(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      logger.info(`Starting async transcription for file: ${filename}`);

      // Upload audio file
      const uploadUrl = await client.files.upload(audioBuffer);
      
      // Create transcription request
      const transcript = await client.transcripts.submit({
        audio_url: uploadUrl,
        language_code: 'en',
        punctuate: true,
        format_text: true,
        speaker_labels: false,
        auto_highlights: true,
        sentiment_analysis: false,
        entity_detection: false,
        speech_model: 'best'
      });

      logger.info(`Async transcription started with ID: ${transcript.id}`);
      return transcript.id;

    } catch (error) {
      logger.error('Error starting async transcription:', error);
      throw createError('Failed to start transcription', 500);
    }
  }

  // Get supported audio formats
  getSupportedFormats(): string[] {
    return [
      'mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac', 
      'aac', '3gp', 'amr', 'wma', 'opus', 'aiff', 'au'
    ];
  }

  // Validate audio file
  validateAudioFile(filename: string, fileSize: number): { valid: boolean; error?: string } {
    const supportedFormats = this.getSupportedFormats();
    const fileExtension = filename.toLowerCase().split('.').pop();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `Unsupported audio format. Supported formats: ${supportedFormats.join(', ')}`
      };
    }

    // Maximum file size: 100MB
    const maxSize = 100 * 1024 * 1024;
    if (fileSize > maxSize) {
      return {
        valid: false,
        error: 'Audio file is too large. Maximum size: 100MB'
      };
    }

    return { valid: true };
  }
}

export const speechService = new SpeechService();
