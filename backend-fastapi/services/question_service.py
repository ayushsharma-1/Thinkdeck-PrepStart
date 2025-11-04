import random
from typing import Dict, List, Any, Optional
from services.ai_service import AIService
from services.redis_service import RedisService
from services.rabbitmq_service import RabbitMQService
from utils.logger import setup_logger
from utils.error_handler import handle_exceptions, AIServiceError

logger = setup_logger(__name__)

class QuestionService:
    """Service for managing interview questions"""
    
    def __init__(self):
        self.ai_service = AIService()
        self.redis_service = RedisService()
        self.rabbitmq_service = RabbitMQService()
        self.fallback_questions = self._load_fallback_questions()
        self.role_topics = self._load_role_topics()
        
    @handle_exceptions
    async def generate_question(
        self,
        session_id: str,
        resume_text: str,
        job_description: str,
        role_name: str,
        question_number: int,
        previous_responses: Optional[List[Dict]] = None,
        covered_topics: Optional[List[str]] = None,
        is_clarification_request: bool = False,
        original_question: Optional[str] = None,
        partial_answer_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate a question using AI providers with fallback"""
        
        previous_responses = previous_responses or []
        covered_topics = covered_topics or []
        
        if is_clarification_request:
            logger.info(f"Generating clarification for question {question_number} for session {session_id}")
        else:
            logger.info(f"Generating question {question_number} for session {session_id}")
        
        # Try AI service (handles Groq/Google fallback internally)
        try:
            question_data = await self.ai_service.generate_question(
                resume_text=resume_text,
                job_description=job_description,
                role_name=role_name,
                question_number=question_number,
                previous_responses=previous_responses,
                covered_topics=covered_topics,
                is_clarification_request=is_clarification_request,
                original_question=original_question,
                partial_answer_data=partial_answer_data
            )
            
            logger.info(f"Question generated using AI service for session {session_id}")
            
            # Store the AI-generated question in Redis
            question_storage_data = {
                "session_id": session_id,
                "question_number": question_number,
                "question_text": question_data.get("question", ""),
                "topic": question_data.get("topic", "General"),
                "difficulty": question_data.get("difficulty", "medium"),
                "is_ai_generated": True,
                "generated_at": __import__('datetime').datetime.now().isoformat(),
                "role_name": role_name
            }
            
            # Store question in Redis
            try:
                await self.redis_service.store_question(session_id, question_storage_data)
                logger.info(f"AI-generated question stored in Redis for session {session_id}")
            except Exception as redis_error:
                logger.warning(f"Failed to store question in Redis: {str(redis_error)}")
            
            # Publish question to unified RabbitMQ queue for processing
            try:
                await self.rabbitmq_service.publish_interview_data(
                    session_id=session_id,
                    data_type="question",
                    data_content=question_storage_data
                )
                logger.info(f"AI-generated question published to unified queue for session {session_id}")
            except Exception as rabbitmq_error:
                logger.warning(f"Failed to publish question to unified queue: {str(rabbitmq_error)}")
            
            return self._format_question_response(question_data, question_number)
            
        except Exception as ai_error:
            logger.warning(f"AI service failed for session {session_id}: {str(ai_error)}")
            
            # Use predefined fallback questions
            fallback_question = await self.get_fallback_question(role_name, question_number)
            logger.info(f"Using predefined fallback question for session {session_id}")
            
            # Store the fallback question in Redis too
            fallback_storage_data = {
                "session_id": session_id,
                "question_number": question_number,
                "question_text": fallback_question,
                "topic": self._get_topic_for_question_number(role_name, question_number),
                "difficulty": "medium",
                "is_ai_generated": False,
                "fallback_used": True,
                "generated_at": __import__('datetime').datetime.now().isoformat(),
                "role_name": role_name,
                "error": f"AI service failed: {str(ai_error)}"
            }
            
            # Store fallback question in Redis
            try:
                await self.redis_service.store_question(session_id, fallback_storage_data)
                logger.info(f"Fallback question stored in Redis for session {session_id}")
            except Exception as redis_error:
                logger.warning(f"Failed to store fallback question in Redis: {str(redis_error)}")
            
            # Publish fallback question to unified RabbitMQ queue for processing
            try:
                await self.rabbitmq_service.publish_interview_data(
                    session_id=session_id,
                    data_type="question",
                    data_content=fallback_storage_data
                )
                logger.info(f"Fallback question published to unified queue for session {session_id}")
            except Exception as rabbitmq_error:
                logger.warning(f"Failed to publish fallback question to unified queue: {str(rabbitmq_error)}")
            
            return {
                "success": True,
                "question": fallback_question,
                "question_number": question_number,
                "is_ai_generated": False,
                "topic": self._get_topic_for_question_number(role_name, question_number),
                "difficulty": "medium",
                "fallback_used": True,
                "error": f"AI service failed: {str(ai_error)}"
            }

    async def get_fallback_question(self, role_name: str, question_number: int) -> str:
        """Get a fallback question for the specified role and question number"""
        
        role_key = role_name.lower().replace(' ', '_')
        
        # Get role-specific questions or use general questions
        if role_key in self.fallback_questions:
            questions = self.fallback_questions[role_key]
        else:
            questions = self.fallback_questions['general']
        
        # Get question by number or random if out of range
        if question_number <= len(questions):
            return questions[question_number - 1]
        else:
            return random.choice(questions)

    async def get_topics_for_role(self, role_name: str) -> List[str]:
        """Get available topics for a specific role"""
        
        role_key = role_name.lower().replace(' ', '_')
        return self.role_topics.get(role_key, self.role_topics['general'])

    def _format_question_response(self, question_data: Dict, question_number: int) -> Dict[str, Any]:
        """Format question data into standardized response"""
        
        return {
            "success": True,
            "question": question_data.get("question", ""),
            "question_number": question_number,
            "is_ai_generated": question_data.get("is_ai_generated", True),
            "topic": question_data.get("topic", "General"),
            "difficulty": question_data.get("difficulty", "medium"),
            "fallback_used": False,
            "error": None,
            "provider": question_data.get("provider", "unknown")
        }

    def _get_topic_for_question_number(self, role_name: str, question_number: int) -> str:
        """Get topic based on question number and role"""
        
        role_key = role_name.lower().replace(' ', '_')
        topics = self.role_topics.get(role_key, self.role_topics['general'])
        
        # Cycle through topics based on question number
        topic_index = (question_number - 1) % len(topics)
        return topics[topic_index]

    def _load_fallback_questions(self) -> Dict[str, List[str]]:
        """Load predefined fallback questions for different roles"""
        
        return {
            "software_engineer": [
                "Tell me about your experience with software development and the technologies you've worked with.",
                "Describe a challenging technical problem you've solved recently. How did you approach it?",
                "How do you ensure code quality and maintainability in your projects?",
                "Explain your experience with version control systems and collaborative development.",
                "Describe your approach to debugging and troubleshooting complex issues.",
                "How do you stay updated with the latest technologies and industry trends?",
                "Tell me about a time when you had to learn a new technology quickly for a project.",
                "Describe your experience with testing methodologies and frameworks.",
                "How do you handle code reviews and feedback from peers?",
                "Explain your understanding of software architecture and design patterns."
            ],
            "data_scientist": [
                "Tell me about your experience with data analysis and the tools you've used.",
                "Describe a data science project you've worked on from start to finish.",
                "How do you approach data cleaning and preprocessing?",
                "Explain your experience with machine learning algorithms and when to use them.",
                "Describe how you validate and evaluate your models.",
                "Tell me about your experience with data visualization and reporting.",
                "How do you handle missing or inconsistent data?",
                "Describe your experience with statistical analysis and hypothesis testing.",
                "How do you communicate complex findings to non-technical stakeholders?",
                "Tell me about a time when your analysis led to important business decisions."
            ],
            "product_manager": [
                "Tell me about your experience in product management and the products you've managed.",
                "Describe how you prioritize features and make product decisions.",
                "How do you gather and analyze customer feedback?",
                "Explain your approach to working with cross-functional teams.",
                "Describe a successful product launch you were involved in.",
                "How do you measure product success and key metrics?",
                "Tell me about a time when you had to pivot a product strategy.",
                "Describe your experience with agile development methodologies.",
                "How do you handle competing priorities and stakeholder demands?",
                "Explain your approach to market research and competitive analysis."
            ],
            "general": [
                "Tell me about yourself and your professional background.",
                "What interests you about this role and our company?",
                "Describe your greatest professional accomplishment.",
                "How do you handle challenging situations or conflicts at work?",
                "Tell me about a time when you had to work under pressure.",
                "Describe your leadership style and experience managing others.",
                "How do you approach learning new skills or adapting to change?",
                "What are your career goals and aspirations?",
                "Tell me about a time when you failed and what you learned from it.",
                "How do you prioritize your work and manage your time effectively?"
            ]
        }

    def _load_role_topics(self) -> Dict[str, List[str]]:
        """Load topic categories for different roles"""
        
        return {
            "software_engineer": [
                "Technical Skills", "Problem Solving", "Code Quality", 
                "Collaboration", "System Design", "Debugging", 
                "Learning", "Testing", "Performance"
            ],
            "data_scientist": [
                "Data Analysis", "Machine Learning", "Statistics", 
                "Data Visualization", "Business Impact", "Tools & Technologies",
                "Model Validation", "Communication", "Domain Knowledge"
            ],
            "product_manager": [
                "Product Strategy", "Customer Research", "Prioritization",
                "Cross-functional Leadership", "Metrics & Analytics", "Market Analysis",
                "Stakeholder Management", "Product Development", "Innovation"
            ],
            "general": [
                "Background", "Motivation", "Problem Solving", 
                "Leadership", "Communication", "Adaptability",
                "Goals", "Teamwork", "Learning", "Experience"
            ]
        }
