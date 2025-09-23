from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class QuestionGenerationRequest(BaseModel):
    session_id: str
    resume_text: str
    job_description: str
    role_name: str
    question_number: int
    previous_responses: List[Dict[str, Any]] = []
    covered_topics: List[str] = []
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Session ID cannot be empty')
        return v.strip()
    
    @validator('question_number')
    def validate_question_number(cls, v):
        if v < 1:
            raise ValueError('Question number must be greater than 0')
        return v

class UserResponseRequest(BaseModel):
    session_id: str
    question_number: int
    ai_question: str
    user_response: str
    candidate_name: Optional[str] = ""
    role_name: str
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Session ID cannot be empty')
        return v.strip()

class UserResponseResponse(BaseModel):
    success: bool
    message: str
    session_id: str
    question_number: int

class QuestionGenerationResponse(BaseModel):
    success: bool
    question: Optional[str] = None
    question_number: int
    is_ai_generated: bool = True
    topic: Optional[str] = None
    difficulty: Optional[str] = "medium"
    error: Optional[str] = None
    fallback_used: bool = False

class SpeechToTextRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    session_id: str
    format: str = "wav"
    
    @validator('audio_data')
    def validate_audio_data(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Audio data cannot be empty')
        return v
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Session ID cannot be empty')
        return v.strip()

class SpeechToTextResponse(BaseModel):
    success: bool
    transcript: Optional[str] = None
    confidence: Optional[float] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None

class ResumeParsingRequest(BaseModel):
    file_data: str  # Base64 encoded file
    file_name: str
    file_type: str  # pdf, docx
    session_id: str
    
    @validator('file_type')
    def validate_file_type(cls, v):
        allowed_types = ['pdf', 'docx', 'doc']
        if v.lower() not in allowed_types:
            raise ValueError(f'File type must be one of: {allowed_types}')
        return v.lower()

class ResumeParsingResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None
    file_info: Optional[Dict[str, Any]] = None

class AIProvider(str, Enum):
    GROQ = "groq"
    GOOGLE = "google"
    FALLBACK = "fallback"

class QuestionDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class InterviewStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RabbitMQMessage(BaseModel):
    message_id: str
    session_id: str
    message_type: str  # 'question_generation', 'speech_processing', 'resume_parsing'
    payload: Dict[str, Any]
    timestamp: datetime = datetime.now()
    retry_count: int = 0
    max_retries: int = 3

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now()

class EvaluationRequest(BaseModel):
    session_id: str
    candidate_name: str
    role_name: str
    resume_text: str
    job_description: str
    questions: List[Dict[str, Any]]
    responses: List[Dict[str, Any]]
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Session ID cannot be empty')
        return v.strip()

class EvaluationResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    # Core Scores (0-10 scale)
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    problem_solving_score: Optional[float] = None
    cultural_fit_score: Optional[float] = None
    
    # Additional Detailed Scores
    job_based_skills_score: Optional[float] = None
    leadership_score: Optional[float] = None
    adaptability_score: Optional[float] = None
    creativity_score: Optional[float] = None
    time_management_score: Optional[float] = None
    domain_knowledge_score: Optional[float] = None
    
    # Qualitative Assessment
    strengths: List[str] = []
    weaknesses: List[str] = []
    feedback: Optional[str] = None
    recommendations: List[str] = []
    
    # Detailed Analysis
    detailed_analysis: Dict[str, Any] = {}
    technical_skills_breakdown: Dict[str, float] = {}
    soft_skills_breakdown: Dict[str, float] = {}
    job_specific_evaluation: Dict[str, Any] = {}
    
    # Metadata
    processing_time: Optional[float] = None
    total_questions: Optional[int] = None
    questions_answered: Optional[int] = None
    average_response_time: Optional[float] = None
    interview_duration: Optional[float] = None
    confidence_level: Optional[str] = None
    
    error: Optional[str] = None
