from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import (
    QuestionGenerationRequest, 
    QuestionGenerationResponse,
    ErrorResponse
)
from services.ai_service import AIService
from services.question_service import QuestionService
from utils.logger import setup_logger
from utils.error_handler import handle_exceptions, async_retry_with_timeout

router = APIRouter()
logger = setup_logger(__name__)

# Initialize services
ai_service = AIService()
question_service = QuestionService()

@router.post("/generate-question", response_model=QuestionGenerationResponse)
@handle_exceptions
async def generate_question(request: QuestionGenerationRequest):
    """Generate a new interview question using AI providers"""
    
    logger.info(f"Generating question for session: {request.session_id}, question number: {request.question_number}")
    
    try:
        # Generate question using AI service
        question_response = await question_service.generate_question(
            session_id=request.session_id,
            resume_text=request.resume_text,
            job_description=request.job_description,
            role_name=request.role_name,
            question_number=request.question_number,
            previous_responses=request.previous_responses,
            covered_topics=request.covered_topics
        )
        
        logger.info(f"Question generated successfully for session: {request.session_id}")
        return question_response
        
    except Exception as e:
        logger.error(f"Failed to generate question for session {request.session_id}: {str(e)}")
        # Return fallback question
        fallback_question = await question_service.get_fallback_question(
            request.role_name, 
            request.question_number
        )
        
        return QuestionGenerationResponse(
            success=True,
            question=fallback_question,
            question_number=request.question_number,
            is_ai_generated=False,
            fallback_used=True,
            error=f"AI generation failed: {str(e)}"
        )

@router.post("/bulk-generate-questions")
@handle_exceptions
async def bulk_generate_questions(
    request: QuestionGenerationRequest,
    background_tasks: BackgroundTasks,
    count: int = 5
):
    """Generate multiple questions for a session"""
    
    logger.info(f"Bulk generating {count} questions for session: {request.session_id}")
    
    try:
        questions = []
        for i in range(count):
            question_request = QuestionGenerationRequest(
                session_id=request.session_id,
                resume_text=request.resume_text,
                job_description=request.job_description,
                role_name=request.role_name,
                question_number=request.question_number + i,
                previous_responses=request.previous_responses,
                covered_topics=request.covered_topics
            )
            
            question_response = await question_service.generate_question(
                session_id=question_request.session_id,
                resume_text=question_request.resume_text,
                job_description=question_request.job_description,
                role_name=question_request.role_name,
                question_number=question_request.question_number,
                previous_responses=question_request.previous_responses,
                covered_topics=question_request.covered_topics
            )
            
            questions.append(question_response)
            
            # Update covered topics to avoid repetition
            if question_response.topic:
                request.covered_topics.append(question_response.topic)
        
        logger.info(f"Bulk generated {len(questions)} questions for session: {request.session_id}")
        
        return {
            "success": True,
            "questions": questions,
            "session_id": request.session_id
        }
        
    except Exception as e:
        logger.error(f"Failed to bulk generate questions for session {request.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/question-topics/{role_name}")
@handle_exceptions
async def get_question_topics(role_name: str):
    """Get available question topics for a specific role"""
    
    try:
        topics = await question_service.get_topics_for_role(role_name)
        
        return {
            "success": True,
            "role_name": role_name,
            "topics": topics
        }
        
    except Exception as e:
        logger.error(f"Failed to get topics for role {role_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
