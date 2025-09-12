import tempfile
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import PyPDF2
from docx import Document
import io

from utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)

# Supported file types
SUPPORTED_TYPES = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
}

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_stream = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_stream)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=400, detail="Failed to process PDF file")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc_stream = io.BytesIO(file_content)
        doc = Document(doc_stream)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {e}")
        raise HTTPException(status_code=400, detail="Failed to process DOCX file")

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8').strip()
    except Exception as e:
        logger.error(f"Error extracting text from TXT: {e}")
        raise HTTPException(status_code=400, detail="Failed to process text file")

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload and extract text from resume file
    Supports PDF, DOCX, DOC, and TXT formats
    """
    try:
        # Validate file type
        if file.content_type not in SUPPORTED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported types: {', '.join(SUPPORTED_TYPES.keys())}"
            )
        
        # Validate file size (5MB limit)
        max_size = 5 * 1024 * 1024  # 5MB
        file_content = await file.read()
        
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 5MB."
            )
        
        if len(file_content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file provided"
            )
        
        # Extract text based on file type
        file_type = SUPPORTED_TYPES[file.content_type]
        
        if file_type == 'pdf':
            text = extract_text_from_pdf(file_content)
        elif file_type == 'docx':
            text = extract_text_from_docx(file_content)
        elif file_type == 'doc':
            # For DOC files, we'll try to process as DOCX (limited support)
            text = extract_text_from_docx(file_content)
        elif file_type == 'txt':
            text = extract_text_from_txt(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Validate extracted text
        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Unable to extract meaningful text from the file. Please check if the file contains readable text."
            )
        
        logger.info(f"Successfully processed resume: {file.filename}, extracted {len(text)} characters")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "text": text,
                "filename": file.filename,
                "file_type": file_type,
                "character_count": len(text),
                "message": "Resume processed successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing resume {file.filename if file else 'unknown'}: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the resume"
        )

@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported resume file formats"""
    return {
        "supported_formats": list(SUPPORTED_TYPES.keys()),
        "max_file_size": "5MB",
        "message": "Supported resume file formats"
    }