import redis.asyncio as redis
import json
import os
from typing import List, Dict, Any, Optional
from utils.logger import setup_logger

logger = setup_logger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = None
        self.redis_url = os.getenv('REDIS_URL')
        self.redis_ttl = int(os.getenv('REDIS_TTL', 3600))
        
    async def connect(self):
        """Connect to Redis"""
        logger.info(f"Attempting to connect to Redis. URL: {self.redis_url}")
        if not self.redis_url:
            logger.warning("Redis URL not provided, Redis functionality disabled")
            return False
            
        try:
            logger.info("Creating Redis client from URL...")
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            logger.info("Testing Redis connection with ping...")
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.redis_client = None
            return False
    
    async def get_all_responses(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all responses for a session"""
        logger.info(f"Getting all responses for session: {session_id}")
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, returning empty responses")
            return []
            
        try:
            redis_key = f"interview:{session_id}:responses"
            logger.info(f"Querying Redis with key: {redis_key}")
            response_data = await self.redis_client.lrange(redis_key, 0, -1)
            logger.info(f"Found {len(response_data)} raw items in Redis")
            
            responses = []
            for i, data in enumerate(response_data):
                try:
                    response = json.loads(data)
                    responses.append(response)
                    logger.debug(f"Parsed response {i+1}: question_number={response.get('question_number', 'N/A')}")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse response data {i+1}: {str(e)}")
                    
            logger.info(f"Retrieved {len(responses)} valid responses from Redis for session: {session_id}")
            return responses
            
        except Exception as e:
            logger.error(f"Failed to get responses from Redis: {str(e)}")
            return []
    
    async def store_response(self, session_id: str, response_data: Dict[str, Any]) -> bool:
        """Store a response in Redis"""
        logger.info(f"Storing response for session: {session_id}")
        logger.info(f"Response data keys: {list(response_data.keys())}")
        
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, cannot store response")
            return False
            
        try:
            redis_key = f"interview:{session_id}:responses"
            response_json = json.dumps(response_data, default=str)
            logger.debug(f"Serialized response: {response_json[:200]}..." if len(response_json) > 200 else f"Serialized response: {response_json}")
            
            await self.redis_client.rpush(redis_key, response_json)
            await self.redis_client.expire(redis_key, self.redis_ttl)
            
            # Get current list length for logging
            list_length = await self.redis_client.llen(redis_key)
            logger.info(f"Stored response in Redis for session: {session_id}. Total responses: {list_length}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store response in Redis: {str(e)}")
            return False
    
    async def store_question(self, session_id: str, question_data: Dict[str, Any]) -> bool:
        """Store an AI-generated question in Redis"""
        logger.info(f"Storing AI question for session: {session_id}")
        logger.info(f"Question data: question_number={question_data.get('question_number', 'N/A')}")
        
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, cannot store question")
            return False
            
        try:
            redis_key = f"interview:{session_id}:questions"
            question_json = json.dumps(question_data, default=str)
            logger.debug(f"Serialized question: {question_json[:200]}..." if len(question_json) > 200 else f"Serialized question: {question_json}")
            
            await self.redis_client.rpush(redis_key, question_json)
            await self.redis_client.expire(redis_key, self.redis_ttl)
            
            # Get current list length for logging
            list_length = await self.redis_client.llen(redis_key)
            logger.info(f"Stored question in Redis for session: {session_id}. Total questions: {list_length}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store question in Redis: {str(e)}")
            return False
    
    async def get_all_questions(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all AI-generated questions for a session"""
        logger.info(f"Getting all questions for session: {session_id}")
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, returning empty questions")
            return []
            
        try:
            redis_key = f"interview:{session_id}:questions"
            logger.info(f"Querying Redis with key: {redis_key}")
            question_data = await self.redis_client.lrange(redis_key, 0, -1)
            logger.info(f"Found {len(question_data)} raw question items in Redis")
            
            questions = []
            for i, data in enumerate(question_data):
                try:
                    question = json.loads(data)
                    questions.append(question)
                    logger.debug(f"Parsed question {i+1}: question_number={question.get('question_number', 'N/A')}")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse question data {i+1}: {str(e)}")
                    
            logger.info(f"Retrieved {len(questions)} valid questions from Redis for session: {session_id}")
            return questions
            
        except Exception as e:
            logger.error(f"Failed to get questions from Redis: {str(e)}")
            return []
    
    async def get_all_pairs(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all question-response pairs for a session"""
        logger.info(f"Getting all Q&A pairs for session: {session_id}")
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, returning empty pairs")
            return []
            
        try:
            redis_key = f"interview:{session_id}:pairs"
            logger.info(f"Querying Redis with key: {redis_key}")
            pair_data = await self.redis_client.lrange(redis_key, 0, -1)
            logger.info(f"Found {len(pair_data)} raw pair items in Redis")
            
            pairs = []
            for i, data in enumerate(pair_data):
                try:
                    pair = json.loads(data)
                    pairs.append(pair)
                    logger.debug(f"Parsed pair {i+1}: question_number={pair.get('question_number', 'N/A')}")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse pair data {i+1}: {str(e)}")
                    
            logger.info(f"Retrieved {len(pairs)} valid pairs from Redis for session: {session_id}")
            return pairs
            
        except Exception as e:
            logger.error(f"Failed to get pairs from Redis: {str(e)}")
            return []

    async def get_complete_interview_data(self, session_id: str) -> Dict[str, Any]:
        """Get both questions and responses for a session"""
        logger.info(f"Getting complete interview data for session: {session_id}")
        
        questions = await self.get_all_questions(session_id)
        responses = await self.get_all_responses(session_id)
        pairs = await self.get_all_pairs(session_id)
        
        complete_data = {
            "session_id": session_id,
            "questions": questions,
            "responses": responses,
            "pairs": pairs,
            "question_count": len(questions),
            "response_count": len(responses),
            "pair_count": len(pairs)
        }
        
        logger.info(f"Complete interview data - Questions: {len(questions)}, Responses: {len(responses)}, Pairs: {len(pairs)}")
        return complete_data
    
    async def cleanup_session_data(self, session_id: str) -> bool:
        """Remove all session data from Redis"""
        logger.info(f"Cleaning up session data for: {session_id}")
        if not self.redis_client:
            logger.info("Redis client not connected, attempting to connect...")
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, cannot cleanup")
            return False
            
        try:
            # Get all keys for this session (questions, responses, and pairs)
            pattern = f"interview:{session_id}:*"
            logger.info(f"Looking for keys matching pattern: {pattern}")
            keys = await self.redis_client.keys(pattern)
            
            if keys:
                logger.info(f"Found {len(keys)} keys to delete: {keys}")
                deleted_count = await self.redis_client.delete(*keys)
                logger.info(f"Deleted {deleted_count} Redis keys for session: {session_id}")
            else:
                logger.info(f"No Redis keys found for session: {session_id}")
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to cleanup Redis data: {str(e)}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            logger.info("Closing Redis connection...")
            await self.redis_client.close()
            logger.info("Redis connection closed")
        else:
            logger.info("No Redis connection to close")
