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
            # Core scores
            overall_score=evaluation.get("overall_score", 0),
            technical_score=evaluation.get("technical_score", 0),
            communication_score=evaluation.get("communication_score", 0),
            problem_solving_score=evaluation.get("problem_solving_score", 0),
            cultural_fit_score=evaluation.get("cultural_fit_score", 0),
            
            # Additional detailed scores
            job_based_skills_score=evaluation.get("job_based_skills_score", 0),
            leadership_score=evaluation.get("leadership_score", 0),
            adaptability_score=evaluation.get("adaptability_score", 0),
            creativity_score=evaluation.get("creativity_score", 0),
            time_management_score=evaluation.get("time_management_score", 0),
            domain_knowledge_score=evaluation.get("domain_knowledge_score", 0),
            
            # Qualitative assessment
            strengths=evaluation.get("strengths", []),
            weaknesses=evaluation.get("weaknesses", []),
            feedback=evaluation.get("feedback", ""),
            recommendations=evaluation.get("recommendations", []),
            
            # Detailed analysis
            detailed_analysis=evaluation.get("detailed_analysis", {}),
            technical_skills_breakdown=evaluation.get("technical_skills_breakdown", {}),
            soft_skills_breakdown=evaluation.get("soft_skills_breakdown", {}),
            job_specific_evaluation={
                "role_alignment": evaluation.get("overall_score", 0),
                "requirements_match": evaluation.get("job_based_skills_score", 0),
                "growth_potential": evaluation.get("adaptability_score", 0)
            },
            
            # Metadata
            processing_time=evaluation.get("processing_time", 0),
            total_questions=evaluation.get("total_questions", 0),
            questions_answered=evaluation.get("questions_answered", 0),
            interview_duration=evaluation.get("interview_duration", 0),
            confidence_level=evaluation.get("confidence_level", "Medium")
        )
        
    except Exception as e:
        logger.error(f"Interview evaluation failed for session {request.session_id}: {str(e)}")
        return EvaluationResponse(
            success=False,
            error=str(e)
        )

@router.post("/evaluate-response-confidence")
@handle_exceptions
async def evaluate_response_confidence(request: Dict[str, Any]):
    """Evaluate confidence/quality of a single response"""
    
    question = request.get("question", "")
    response = request.get("response", "")
    role_name = request.get("role_name", "")
    topic = request.get("topic", "General")
    
    logger.info(f"Evaluating response confidence for role: {role_name}, topic: {topic}")
    
    try:
        # Create evaluation prompt for AI
        evaluation_prompt = f"""
        Evaluate the quality and confidence of this interview response on a scale of 0-100.
        
        Question: {question}
        Response: {response}
        Role: {role_name}
        Topic: {topic}
        
        Consider these factors:
        1. Relevance to the question (0-30 points)
        2. Depth and detail (0-25 points)
        3. Clarity and communication (0-20 points)
        4. Professionalism and structure (0-15 points)
        5. Role-specific knowledge demonstration (0-10 points)
        
        Provide only a numerical score (0-100) and brief reasoning.
        If the response is too short, generic, or irrelevant, score below 60.
        If the response shows good understanding and detail, score 60-85.
        If the response is excellent with specific examples and insights, score 85-100.
        """
        
        # Call AI service for evaluation
        ai_response = await ai_service.get_completion(evaluation_prompt)
        
        if ai_response and ai_response.get('success'):
            content = ai_response.get('content', '').strip()
            
            # Extract numerical score from response
            import re
            score_match = re.search(r'\b(\d+)\b', content)
            confidence_score = int(score_match.group(1)) if score_match else 50
            
            # Ensure score is within bounds
            confidence_score = max(0, min(100, confidence_score))
            
            logger.info(f"AI confidence evaluation: {confidence_score}% for response length: {len(response)}")
            
            return {
                "success": True,
                "confidence_score": confidence_score,
                "reasoning": content,
                "evaluation_method": "ai_based"
            }
        else:
            raise Exception("AI evaluation failed")
            
    except Exception as e:
        logger.warning(f"AI confidence evaluation failed: {str(e)}")
        
        # Fallback to rule-based evaluation
        confidence_score = calculate_basic_confidence_score(question, response, topic, role_name)
        
        return {
            "success": True,
            "confidence_score": confidence_score,
            "reasoning": "Fallback rule-based evaluation used",
            "evaluation_method": "rule_based"
        }

def calculate_basic_confidence_score(question: str, response: str, topic: str, role_name: str) -> int:
    """Fallback confidence scoring based on response characteristics"""
    score = 50  # Base score
    
    # Length-based scoring
    word_count = len(response.strip().split())
    if word_count < 5:
        score -= 30
    elif word_count < 10:
        score -= 10
    elif word_count > 20:
        score += 10
    elif word_count > 50:
        score += 20
    
    # Content quality indicators
    lower_response = response.lower()
    
    # Positive indicators
    if 'experience' in lower_response:
        score += 10
    if 'project' in lower_response:
        score += 10
    if 'skill' in lower_response:
        score += 10
    if 'learn' in lower_response:
        score += 5
    if 'challenge' in lower_response:
        score += 5
    
    # Topic-specific scoring
    if topic.lower() == 'general':
        if 'myself' in lower_response or 'background' in lower_response:
            score += 15
        if 'interested' in lower_response or 'passion' in lower_response:
            score += 10
    
    # Role-specific keywords for AI/ML
    if 'ai' in role_name.lower() or 'ml' in role_name.lower():
        if any(keyword in lower_response for keyword in ['machine learning', 'ai', 'data', 'algorithm', 'model']):
            score += 15
    
    # Negative indicators
    if len(response) < 20:
        score -= 20
    if response == response.lower():  # No capitalization
        score -= 5
    if not any(punct in response for punct in '.!?'):
        score -= 5
    
    # Generic responses
    generic_phrases = ['i like', 'it is good', 'yes', 'no', 'ok', 'fine']
    if any(phrase in lower_response for phrase in generic_phrases) and word_count < 10:
        score -= 25
    
    # Ensure score is within bounds
    return max(0, min(100, score))

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
