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
        if not self.redis_url:
            logger.warning("Redis URL not provided, Redis functionality disabled")
            return False
            
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.redis_client = None
            return False
    
    async def get_all_responses(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all responses for a session"""
        if not self.redis_client:
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, returning empty responses")
            return []
            
        try:
            redis_key = f"interview:{session_id}:responses"
            response_data = await self.redis_client.lrange(redis_key, 0, -1)
            
            responses = []
            for data in response_data:
                try:
                    response = json.loads(data)
                    responses.append(response)
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse response data: {str(e)}")
                    
            logger.info(f"Retrieved {len(responses)} responses from Redis for session: {session_id}")
            return responses
            
        except Exception as e:
            logger.error(f"Failed to get responses from Redis: {str(e)}")
            return []
    
    async def store_response(self, session_id: str, response_data: Dict[str, Any]) -> bool:
        """Store a response in Redis"""
        if not self.redis_client:
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, cannot store response")
            return False
            
        try:
            redis_key = f"interview:{session_id}:responses"
            response_json = json.dumps(response_data, default=str)
            
            await self.redis_client.rpush(redis_key, response_json)
            await self.redis_client.expire(redis_key, self.redis_ttl)
            
            logger.info(f"Stored response in Redis for session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store response in Redis: {str(e)}")
            return False
    
    async def cleanup_session_data(self, session_id: str) -> bool:
        """Remove all session data from Redis"""
        if not self.redis_client:
            await self.connect()
            
        if not self.redis_client:
            logger.warning("Redis not available, cannot cleanup")
            return False
            
        try:
            # Get all keys for this session
            pattern = f"interview:{session_id}:*"
            keys = await self.redis_client.keys(pattern)
            
            if keys:
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
            await self.redis_client.close()
            logger.info("Redis connection closed")
