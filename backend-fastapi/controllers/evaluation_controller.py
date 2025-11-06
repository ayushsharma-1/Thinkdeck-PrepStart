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
    """Evaluate confidence/quality of a single response with partial answer detection"""
    
    question = request.get("question", "")
    response = request.get("response", "")
    role_name = request.get("role_name", "")
    topic = request.get("topic", "General")
    
    logger.info(f"Evaluating response confidence for role: {role_name}, topic: {topic}")
    
    try:
        # Enhanced evaluation prompt with multi-part question analysis
        evaluation_prompt = f"""
        Analyze this interview response and provide a detailed evaluation.
        
        Question: {question}
        Response: {response}
        Role: {role_name}
        Topic: {topic}
        
        ANALYSIS TASKS:
        1. Identify if this question has multiple parts (e.g., "Tell me about X and Y", "What is A and how does B work?", "Describe both C and D")
        2. If multi-part, determine which parts were answered and which were missed
        3. Evaluate overall response quality on a scale of 0-100
        
        FORMAT YOUR RESPONSE AS:
        SCORE: [0-100]
        IS_MULTIPART: [true/false]
        PARTS_IDENTIFIED: [list the question parts if multipart, or "single" if not]
        ANSWERED_PARTS: [which parts were addressed in the response]
        MISSING_PARTS: [which parts were not addressed, or "none" if all covered]
        REASONING: [brief explanation]
        
        SCORING CRITERIA:
        - Complete answers to all parts: 60-100 based on quality
        - Partial answers (missing significant parts): 30-59
        - Poor/irrelevant answers: 0-29
        
        If the response only addresses some parts of a multi-part question, the score should be 30-59 to trigger clarification.
        """
        
        # Call AI service for evaluation
        ai_response = await ai_service.get_completion(evaluation_prompt)
        
        if ai_response and ai_response.get('success'):
            content = ai_response.get('content', '').strip()
            
            # Parse the structured response
            import re
            parsed_evaluation = parse_multipart_evaluation(content)
            
            # Ensure score is within bounds
            confidence_score = max(0, min(100, parsed_evaluation.get('score', 50)))
            
            logger.info(f"AI confidence evaluation: {confidence_score}% for response length: {len(response)}")
            
            return {
                "success": True,
                "confidence_score": confidence_score,
                "reasoning": parsed_evaluation.get('reasoning', content),
                "evaluation_method": "ai_based",
                "is_multipart": parsed_evaluation.get('is_multipart', False),
                "parts_identified": parsed_evaluation.get('parts_identified', []),
                "answered_parts": parsed_evaluation.get('answered_parts', []),
                "missing_parts": parsed_evaluation.get('missing_parts', [])
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
            "evaluation_method": "rule_based",
            "is_multipart": False,
            "parts_identified": [],
            "answered_parts": [],
            "missing_parts": []
        }

def parse_multipart_evaluation(content: str) -> Dict[str, Any]:
    """Parse the structured AI evaluation response"""
    import re
    
    result = {
        'score': 50,
        'is_multipart': False,
        'parts_identified': [],
        'answered_parts': [],
        'missing_parts': [],
        'reasoning': content
    }
    
    try:
        # Extract score
        score_match = re.search(r'SCORE:\s*(\d+)', content, re.IGNORECASE)
        if score_match:
            result['score'] = int(score_match.group(1))
        
        # Extract multipart flag
        multipart_match = re.search(r'IS_MULTIPART:\s*(true|false)', content, re.IGNORECASE)
        if multipart_match:
            result['is_multipart'] = multipart_match.group(1).lower() == 'true'
        
        # Extract parts identified
        parts_match = re.search(r'PARTS_IDENTIFIED:\s*\[(.*?)\]', content, re.IGNORECASE | re.DOTALL)
        if parts_match:
            parts_text = parts_match.group(1).strip()
            if parts_text and parts_text.lower() != 'single':
                result['parts_identified'] = [p.strip().strip('"\'') for p in parts_text.split(',') if p.strip()]
        
        # Extract answered parts
        answered_match = re.search(r'ANSWERED_PARTS:\s*\[(.*?)\]', content, re.IGNORECASE | re.DOTALL)
        if answered_match:
            answered_text = answered_match.group(1).strip()
            if answered_text and answered_text.lower() != 'none':
                result['answered_parts'] = [p.strip().strip('"\'') for p in answered_text.split(',') if p.strip()]
        
        # Extract missing parts
        missing_match = re.search(r'MISSING_PARTS:\s*\[(.*?)\]', content, re.IGNORECASE | re.DOTALL)
        if missing_match:
            missing_text = missing_match.group(1).strip()
            if missing_text and missing_text.lower() != 'none':
                result['missing_parts'] = [p.strip().strip('"\'') for p in missing_text.split(',') if p.strip()]
        
        # Extract reasoning
        reasoning_match = re.search(r'REASONING:\s*(.*?)(?=\n\S|\Z)', content, re.IGNORECASE | re.DOTALL)
        if reasoning_match:
            result['reasoning'] = reasoning_match.group(1).strip()
            
    except Exception as e:
        logger.warning(f"Failed to parse multipart evaluation: {str(e)}")
    
    return result

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
