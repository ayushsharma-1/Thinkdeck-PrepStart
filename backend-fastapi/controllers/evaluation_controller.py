from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from models.schemas import (
    EvaluationRequest,
    EvaluationResponse
)
from services.ai_service import AIService
from services.redis_service import RedisService
from utils.logger import setup_logger
from utils.error_handler import handle_exceptions

router = APIRouter()
logger = setup_logger(__name__)

# Initialize services
ai_service = AIService()
redis_service = RedisService()

@router.post("/evaluate-interview", response_model=EvaluationResponse)
@handle_exceptions
async def evaluate_interview(request: EvaluationRequest):
    """Evaluate complete interview and provide feedback"""
    
    logger.info(f"Evaluating interview for session: {request.session_id}")
    
    try:
        # Get all responses from Redis
        responses = await redis_service.get_all_responses(request.session_id)
        
        if not responses:
            logger.warning(f"No responses found for session: {request.session_id}")
            responses = request.responses  # Use provided responses as fallback
        
        # Generate comprehensive evaluation
        evaluation = await ai_service.evaluate_interview(
            session_id=request.session_id,
            candidate_name=request.candidate_name,
            role_name=request.role_name,
            resume_text=request.resume_text,
            job_description=request.job_description,
            questions=request.questions,
            responses=responses
        )
        
        # Clean up Redis data after evaluation
        try:
            await redis_service.cleanup_session_data(request.session_id)
            logger.info(f"Cleaned up Redis data for session: {request.session_id}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to cleanup Redis data: {str(cleanup_error)}")
        
        logger.info(f"Interview evaluation completed for session: {request.session_id}")
        
        return EvaluationResponse(
            success=True,
            session_id=request.session_id,
            overall_score=evaluation.get("overall_score", 0),
            technical_score=evaluation.get("technical_score", 0),
            communication_score=evaluation.get("communication_score", 0),
            problem_solving_score=evaluation.get("problem_solving_score", 0),
            cultural_fit_score=evaluation.get("cultural_fit_score", 0),
            strengths=evaluation.get("strengths", []),
            weaknesses=evaluation.get("weaknesses", []),
            feedback=evaluation.get("feedback", ""),
            recommendations=evaluation.get("recommendations", []),
            detailed_analysis=evaluation.get("detailed_analysis", {}),
            processing_time=evaluation.get("processing_time", 0)
        )
        
    except Exception as e:
        logger.error(f"Interview evaluation failed for session {request.session_id}: {str(e)}")
        return EvaluationResponse(
            success=False,
            error=str(e)
        )

@router.delete("/cleanup-session/{session_id}")
@handle_exceptions
async def cleanup_session_data(session_id: str):
    """Cleanup session data from Redis"""
    
    logger.info(f"Cleaning up session data: {session_id}")
    
    try:
        await redis_service.cleanup_session_data(session_id)
        
        return {
            "success": True,
            "message": f"Session data cleaned up for: {session_id}"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup session data {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
