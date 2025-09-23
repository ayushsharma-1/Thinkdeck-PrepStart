import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import (
    QuestionGenerationRequest, 
    QuestionGenerationResponse,
    UserResponseRequest,
    UserResponseResponse,
)
from services.ai_service import AIService
from services.question_service import QuestionService
from services.rabbitmq_service import rabbitmq_publisher
from utils.logger import setup_logger
from utils.error_handler import handle_exceptions, async_retry_with_timeout

router = APIRouter()
logger = setup_logger(__name__)

# Initialize services
ai_service = AIService()
question_service = QuestionService()

@router.get("/debug-ai-status")
async def debug_ai_status():
    """Debug endpoint to check AI service status"""
    return {
        "groq_available": ai_service.has_groq,
        "google_available": ai_service.has_google,
        "groq_model": getattr(ai_service, 'groq_model', None),
        "google_model_type": str(type(getattr(ai_service, 'google_model', None))),
        "environment_keys": {
            "GROQ_API_KEY": bool(os.getenv("GROQ_API_KEY")),
            "GOOGLE_API_KEY": bool(os.getenv("GOOGLE_API_KEY"))
        }
    }

@router.post("/debug-generate-question")
async def debug_generate_question():
    """Debug endpoint to test question generation with hardcoded data"""
    
    logger.info("Testing question generation with direct call")
    
    try:
        result = await ai_service.generate_question(
            resume_text="Software Engineer with 5 years experience in React and Node.js",
            job_description="Looking for Senior Developer with React expertise",
            role_name="Senior Developer",
            question_number=1,
            previous_responses=[],
            covered_topics=[]
        )
        
        return {
            "success": True,
            "result": result,
            "message": "AI generation test completed successfully"
        }
        
    except Exception as e:
        logger.error(f"AI generation test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "AI generation test failed"
        }

@router.post("/generate-question", response_model=QuestionGenerationResponse)
@handle_exceptions
async def generate_question(request: QuestionGenerationRequest):
    """Generate a new interview question using AI providers"""
    
    logger.info(f"CONTROLLER: ===== QUESTION GENERATION REQUEST DEBUG START =====")
    logger.info(f"CONTROLLER: Generating question for session: {request.session_id}, question number: {request.question_number}")
    logger.info(f"CONTROLLER: Role name: {request.role_name}")
    logger.info(f"CONTROLLER: Resume text length: {len(request.resume_text)} chars")
    logger.info(f"CONTROLLER: Job description length: {len(request.job_description)} chars")
    logger.info(f"CONTROLLER: Previous responses count: {len(request.previous_responses)}")
    logger.info(f"CONTROLLER: Covered topics: {request.covered_topics}")
    
    # Log resume content preview
    if request.resume_text:
        logger.info(f"CONTROLLER: Resume preview: {request.resume_text[:200]}...")
    else:
        logger.warning("CONTROLLER: RESUME TEXT IS EMPTY!")
    
    # Log job description preview  
    if request.job_description:
        logger.info(f"CONTROLLER: Job description preview: {request.job_description[:200]}...")
    else:
        logger.warning("CONTROLLER: JOB DESCRIPTION IS EMPTY!")
    
    # Log previous responses
    for i, resp in enumerate(request.previous_responses):
        logger.info(f"CONTROLLER: Previous response {i+1}: {str(resp)[:100]}...")
    
    try:
        logger.info("CONTROLLER: Calling question service...")
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
        
        # Send AI question to RabbitMQ queue for backend server processing
        ai_question = question_response.get("question") if isinstance(question_response, dict) else getattr(question_response, "question", None)
        user_response = request.previous_responses[-1] if request.previous_responses else None
        
        rabbitmq_publisher.publish_response(
            session_id=request.session_id,
            ai_question=ai_question,
            user_response=user_response,
            question_number=request.question_number,
            candidate_name=getattr(request, 'candidate_name', ''),
            role_name=request.role_name
        )
        logger.info(f"CONTROLLER: Question generated successfully for session: {request.session_id}")
        logger.info(f"CONTROLLER: Response: {question_response}")
        logger.info(f"CONTROLLER: ===== QUESTION GENERATION REQUEST DEBUG END =====")
        return question_response
        
    except Exception as e:
        logger.error(f"Failed to generate question for session {request.session_id}: {str(e)}")
        # Return fallback question
        fallback_question = await question_service.get_fallback_question(
            request.role_name, 
            request.question_number
        )
        # Send fallback question to RabbitMQ queue for backend server processing
        user_response = request.previous_responses[-1] if request.previous_responses else None
        
        rabbitmq_publisher.publish_response(
            session_id=request.session_id,
            ai_question=fallback_question,
            user_response=user_response,
            question_number=request.question_number,
            candidate_name=getattr(request, 'candidate_name', ''),
            role_name=request.role_name
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
            if 'topic' in question_response and question_response['topic']:
                request.covered_topics.append(question_response['topic'])
        
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

@router.post("/submit-response", response_model=UserResponseResponse)
@handle_exceptions
async def submit_user_response(request: UserResponseRequest):
    """Submit user response and send to RabbitMQ queue for processing"""
    
    logger.info(f"CONTROLLER: ===== USER RESPONSE SUBMISSION START =====")
    logger.info(f"CONTROLLER: Submitting response for session: {request.session_id}, question: {request.question_number}")
    logger.info(f"CONTROLLER: AI Question: {request.ai_question}")
    logger.info(f"CONTROLLER: User Response: {request.user_response}")
    logger.info(f"CONTROLLER: Candidate: {request.candidate_name}, Role: {request.role_name}")
    
    try:
        # Send both AI question and user response to RabbitMQ queue
        success = rabbitmq_publisher.publish_response(
            session_id=request.session_id,
            ai_question=request.ai_question,
            user_response=request.user_response,
            question_number=request.question_number,
            candidate_name=request.candidate_name,
            role_name=request.role_name
        )
        
        if success:
            logger.info(f"CONTROLLER: ✅ Successfully submitted response to RabbitMQ for session: {request.session_id}")
            logger.info(f"CONTROLLER: ===== USER RESPONSE SUBMISSION END =====")
            
            return UserResponseResponse(
                success=True,
                message="Response submitted successfully",
                session_id=request.session_id,
                question_number=request.question_number
            )
        else:
            logger.error(f"CONTROLLER: ❌ Failed to submit response to RabbitMQ for session: {request.session_id}")
            raise HTTPException(status_code=500, detail="Failed to submit response to message queue")
            
    except Exception as e:
        logger.error(f"CONTROLLER: Exception submitting response for session {request.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting response: {str(e)}")
