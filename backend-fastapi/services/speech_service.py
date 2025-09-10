import os
import time
import asyncio
from typing import Dict, Optional, Any
import assemblyai as aai
from dotenv import load_dotenv
from utils.logger import setup_logger
from utils.error_handler import async_retry_with_timeout, RetryableError, handle_exceptions

# Load environment variables
load_dotenv()

logger = setup_logger(__name__)

class SpeechService:
    """Service for speech-to-text operations using AssemblyAI"""
    
    def __init__(self):
        # Initialize AssemblyAI
        aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not aai.settings.api_key:
            raise ValueError("ASSEMBLYAI_API_KEY environment variable is required")
        
        self.transcriber = aai.Transcriber()
        logger.info("Speech Service initialized with AssemblyAI")

    @async_retry_with_timeout(max_retries=3, timeout=30)
    @handle_exceptions
    async def transcribe_audio(
        self, 
        audio_file_path: str,
        session_id: str,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """Transcribe audio file to text using AssemblyAI"""
        
        start_time = time.time()
        logger.info(f"Starting transcription for session: {session_id}")
        
        try:
            # Configure transcription settings
            config = aai.TranscriptionConfig(
                language_code=language_code,
                punctuate=True,
                format_text=True,
                speaker_labels=False,
                auto_highlights=False,
                sentiment_analysis=False,
                entity_detection=False
            )
            
            # Submit transcription job
            transcript = await asyncio.create_task(
                self._transcribe_async(audio_file_path, config)
            )
            
            processing_time = time.time() - start_time
            
            if transcript.status == aai.TranscriptStatus.error:
                error_msg = f"Transcription failed: {transcript.error}"
                logger.error(f"AssemblyAI error for session {session_id}: {error_msg}")
                raise RetryableError(error_msg)
            
            result = {
                "transcript": transcript.text or "",
                "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None,
                "processing_time": processing_time,
                "language": language_code,
                "word_count": len(transcript.text.split()) if transcript.text else 0
            }
            
            logger.info(f"Transcription completed for session {session_id} in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Transcription failed for session {session_id}: {str(e)} (after {processing_time:.2f}s)")
            
            if "rate limit" in str(e).lower() or "quota" in str(e).lower():
                raise RetryableError(f"Rate limit or quota exceeded: {str(e)}")
            else:
                raise RetryableError(f"Transcription error: {str(e)}")

    async def _transcribe_async(self, audio_file_path: str, config: aai.TranscriptionConfig):
        """Async wrapper for AssemblyAI transcription"""
        
        # Run the synchronous transcription in a thread pool
        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(
            None,
            lambda: self.transcriber.transcribe(audio_file_path, config)
        )
        
        return transcript

    @handle_exceptions
    async def get_transcription_status(self, transcript_id: str) -> Dict[str, Any]:
        """Get the status of a transcription job"""
        
        try:
            transcript = await asyncio.create_task(
                self._get_transcript_async(transcript_id)
            )
            
            return {
                "id": transcript_id,
                "status": transcript.status.value,
                "text": transcript.text if transcript.status == aai.TranscriptStatus.completed else None,
                "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None,
                "error": transcript.error if transcript.status == aai.TranscriptStatus.error else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get transcription status for {transcript_id}: {str(e)}")
            raise RetryableError(f"Status check failed: {str(e)}")

    async def _get_transcript_async(self, transcript_id: str):
        """Async wrapper for getting transcript by ID"""
        
        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(
            None,
            lambda: aai.Transcript.get_by_id(transcript_id)
        )
        
        return transcript

    def validate_audio_file(self, file_path: str) -> bool:
        """Validate audio file format and size"""
        
        try:
            if not os.path.exists(file_path):
                logger.error(f"Audio file does not exist: {file_path}")
                return False
            
            file_size = os.path.getsize(file_path)
            max_size = 100 * 1024 * 1024  # 100MB limit
            
            if file_size > max_size:
                logger.error(f"Audio file too large: {file_size} bytes (max: {max_size})")
                return False
            
            if file_size == 0:
                logger.error(f"Audio file is empty: {file_path}")
                return False
            
            # Check file extension
            allowed_extensions = ['.wav', '.mp3', '.ogg', '.webm', '.m4a', '.flac']
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension not in allowed_extensions:
                logger.error(f"Unsupported audio format: {file_extension}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating audio file {file_path}: {str(e)}")
            return False

    def get_supported_formats(self) -> list:
        """Get list of supported audio formats"""
        
        return [
            {'extension': 'wav', 'mime_type': 'audio/wav', 'description': 'WAV audio'},
            {'extension': 'mp3', 'mime_type': 'audio/mpeg', 'description': 'MP3 audio'},
            {'extension': 'ogg', 'mime_type': 'audio/ogg', 'description': 'OGG audio'},
            {'extension': 'webm', 'mime_type': 'audio/webm', 'description': 'WebM audio'},
            {'extension': 'm4a', 'mime_type': 'audio/m4a', 'description': 'M4A audio'},
            {'extension': 'flac', 'mime_type': 'audio/flac', 'description': 'FLAC audio'}
        ]
