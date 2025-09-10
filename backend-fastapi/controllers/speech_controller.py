from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import base64
import tempfile
import os
from models.schemas import (
    SpeechToTextRequest, 
    SpeechToTextResponse,
    ErrorResponse
)
from services.speech_service import SpeechService
from utils.logger import setup_logger
from utils.error_handler import handle_exceptions

router = APIRouter()
logger = setup_logger(__name__)

# Initialize speech service
speech_service = SpeechService()

@router.post("/speech-to-text", response_model=SpeechToTextResponse)
@handle_exceptions
async def speech_to_text(request: SpeechToTextRequest):
    """Convert speech audio to text using AssemblyAI"""
    
    logger.info(f"Processing speech-to-text for session: {request.session_id}")
    
    try:
        # Decode base64 audio data
        audio_data = base64.b64decode(request.audio_data)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(
            delete=False, 
            suffix=f".{request.format}"
        ) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Process speech to text
            result = await speech_service.transcribe_audio(
                temp_file_path,
                session_id=request.session_id
            )
            
            logger.info(f"Speech-to-text completed for session: {request.session_id}")
            
            return SpeechToTextResponse(
                success=True,
                transcript=result.get("transcript", ""),
                confidence=result.get("confidence"),
                processing_time=result.get("processing_time")
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
    except Exception as e:
        logger.error(f"Speech-to-text failed for session {request.session_id}: {str(e)}")
        return SpeechToTextResponse(
            success=False,
            error=str(e)
        )

@router.post("/speech-to-text/upload")
@handle_exceptions
async def speech_to_text_upload(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """Convert uploaded audio file to text"""
    
    logger.info(f"Processing uploaded audio for session: {session_id or 'None'}")
    
    if not session_id:
        # Return error in JSON format instead of raising exception
        return {
            "success": False,
            "error": "Session ID is required",
            "transcript": ""
        }
    
    # Validate file type
    allowed_types = ["audio/wav", "audio/mp3", "audio/ogg", "audio/webm"]
    if file.content_type not in allowed_types:
        return {
            "success": False,
            "error": f"Unsupported file type: {file.content_type}",
            "transcript": ""
        }
    
    try:
        # Get file extension safely
        file_extension = "wav"  # default
        if file.filename:
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else "wav"
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(
            delete=False, 
            suffix=f".{file_extension}"
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process speech to text
            result = await speech_service.transcribe_audio(
                temp_file_path,
                session_id=session_id
            )
            
            logger.info(f"Uploaded audio processed for session: {session_id}")
            
            return {
                "success": True,
                "transcript": result.get("transcript", ""),
                "confidence": result.get("confidence"),
                "processing_time": result.get("processing_time")
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
    except Exception as e:
        logger.error(f"Uploaded audio processing failed for session {session_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "transcript": ""
        }

@router.get("/speech/supported-formats")
async def get_supported_formats():
    """Get supported audio formats for speech-to-text"""
    
    return {
        "supported_formats": [
            {
                "format": "wav",
                "mime_type": "audio/wav",
                "description": "WAV audio format"
            },
            {
                "format": "mp3", 
                "mime_type": "audio/mp3",
                "description": "MP3 audio format"
            },
            {
                "format": "ogg",
                "mime_type": "audio/ogg", 
                "description": "OGG audio format"
            },
            {
                "format": "webm",
                "mime_type": "audio/webm",
                "description": "WebM audio format"
            }
        ]
    }
