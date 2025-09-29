import asyncio
import json
from typing import Dict, Any
from services.redis_service import RedisService
from services.rabbitmq_service import RabbitMQService
from utils.logger import setup_logger

logger = setup_logger(__name__)

class InterviewProcessor:
    """Service to process interview data from RabbitMQ and store in Redis"""
    
    def __init__(self):
        self.redis_service = RedisService()
        self.rabbitmq_service = RabbitMQService()
        self.session_data = {}  # Temporary storage for pairing questions and responses
        
    async def start_processing(self):
        """Start the interview data processing consumer"""
        logger.info("Starting interview data processor...")
        
        # Connect to services
        await self.redis_service.connect()
        await self.rabbitmq_service.connect()
        
        # Setup consumer
        await self.rabbitmq_service.setup_interview_consumer(self.process_interview_message)
        
        logger.info("Interview processor started and ready to consume messages")
        
    async def process_interview_message(self, message: Dict[str, Any]):
        """Process an interview message (question or response)"""
        try:
            session_id = message.get("session_id")
            data_type = message.get("data_type")  # "question" or "response"
            data_content = message.get("data_content", {})
            
            logger.info(f"Processing {data_type} for session: {session_id}")
            
            if not session_id:
                logger.error("No session_id in message, skipping")
                return
            
            # Initialize session data if not exists
            if session_id not in self.session_data:
                self.session_data[session_id] = {
                    "questions": [],
                    "responses": [],
                    "pending_pairs": {}
                }
            
            session = self.session_data[session_id]
            
            if data_type == "question":
                await self._process_question(session_id, session, data_content)
            elif data_type == "response":
                await self._process_response(session_id, session, data_content)
            else:
                logger.warning(f"Unknown data_type: {data_type}")
                
        except Exception as e:
            logger.error(f"Error processing interview message: {str(e)}")
    
    async def _process_question(self, session_id: str, session: Dict, question_data: Dict):
        """Process a question and store it"""
        question_number = question_data.get("question_number")
        logger.info(f"Processing question {question_number} for session: {session_id}")
        
        try:
            # Skip individual question storage - using complete Q&A pairs instead
            # success = await self.redis_service.store_question(session_id, question_data)
            logger.info(f"Question {question_number} processed (complete Q&A pair will be stored by Node.js backend)")
            
            # Add to session tracking
            session["questions"].append(question_data)
            session["pending_pairs"][question_number] = {"question": question_data, "response": None}
            
            logger.info(f"Session {session_id} now has {len(session['questions'])} questions")
            
        except Exception as e:
            logger.error(f"Error processing question: {str(e)}")
    
    async def _process_response(self, session_id: str, session: Dict, response_data: Dict):
        """Process a response and pair it with its question"""
        question_number = response_data.get("question_number")
        logger.info(f"Processing response to question {question_number} for session: {session_id}")
        
        try:
            # Skip individual response storage - using complete Q&A pairs instead
            # success = await self.redis_service.store_response(session_id, response_data)
            logger.info(f"Response to question {question_number} processed (complete Q&A pair will be stored by Node.js backend)")
            
            # Add to session tracking
            session["responses"].append(response_data)
            
            # Pair with question if available
            if question_number in session["pending_pairs"]:
                session["pending_pairs"][question_number]["response"] = response_data
                logger.info(f"Paired response with question {question_number}")
                
                # Store the complete pair
                await self._store_complete_pair(session_id, session["pending_pairs"][question_number])
            
            logger.info(f"Session {session_id} now has {len(session['responses'])} responses")
            
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
    
    async def _store_complete_pair(self, session_id: str, pair_data: Dict):
        """Store a complete question-response pair"""
        question = pair_data["question"]
        response = pair_data["response"]
        question_number = question.get("question_number")
        
        logger.info(f"Storing complete Q&A pair {question_number} for session: {session_id}")
        
        try:
            # Create combined pair data
            pair_entry = {
                "session_id": session_id,
                "question_number": question_number,
                "question_data": question,
                "response_data": response,
                "pair_timestamp": response.get("timestamp", question.get("generated_at")),
                "is_complete_pair": True
            }
            
            # Store in Redis with a specific key for complete pairs
            redis_key = f"interview:{session_id}:pairs"
            pair_json = json.dumps(pair_entry, default=str)
            
            await self.redis_service.redis_client.rpush(redis_key, pair_json)
            await self.redis_service.redis_client.expire(redis_key, self.redis_service.redis_ttl)
            
            pair_count = await self.redis_service.redis_client.llen(redis_key)
            logger.info(f"Complete Q&A pair {question_number} stored. Total pairs: {pair_count}")
            
        except Exception as e:
            logger.error(f"Error storing complete pair: {str(e)}")
    
    async def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get a summary of processed data for a session"""
        if session_id not in self.session_data:
            return {"error": "Session not found in processor"}
        
        session = self.session_data[session_id]
        return {
            "session_id": session_id,
            "questions_processed": len(session["questions"]),
            "responses_processed": len(session["responses"]),
            "pending_pairs": len(session["pending_pairs"]),
            "completed_pairs": sum(1 for pair in session["pending_pairs"].values() if pair["response"] is not None)
        }
    
    async def cleanup_session(self, session_id: str):
        """Clean up processed session data"""
        if session_id in self.session_data:
            del self.session_data[session_id]
            logger.info(f"Cleaned up processor data for session: {session_id}")