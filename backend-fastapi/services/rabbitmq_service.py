import os
import json
import asyncio
import pika
import redis.asyncio as redis
from typing import Dict, Any, Optional
from utils.logger import setup_logger

logger = setup_logger(__name__)

class RabbitMQService:
    def __init__(self):
        # Load all configuration from environment variables
        self.rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
        self.response_queue = os.getenv('RABBITMQ_RESPONSE_QUEUE', 'interview_response_queue')
        self.question_queue = os.getenv('RABBITMQ_QUESTION_QUEUE', 'question_generation')
        self.speech_queue = os.getenv('RABBITMQ_SPEECH_QUEUE', 'speech_processing')
        
        # Redis configuration
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.redis_ttl = int(os.getenv('REDIS_TTL', '3600'))
        
        # Connection objects
        self.connection = None
        self.channel = None
        self.redis_client = None
        self.is_consuming = False
        
    def _connect_sync(self):
        """Connect to RabbitMQ"""
        try:
            params = pika.URLParameters(self.rabbitmq_url)
            self.connection = pika.BlockingConnection(params)
            self.channel = self.connection.channel()
            
            # Declare all queues
            self.channel.queue_declare(queue=self.response_queue, durable=True)
            self.channel.queue_declare(queue=self.question_queue, durable=True)
            self.channel.queue_declare(queue=self.speech_queue, durable=True)
            
            logger.info(f"[RabbitMQ] Connected and declared queues: {self.response_queue}, {self.question_queue}, {self.speech_queue}")
            return True
        except Exception as e:
            logger.error(f"[RabbitMQ] Failed to connect: {str(e)}")
            return False
    
    async def connect(self):
        """Async connect method for FastAPI lifespan compatibility"""
        return self._connect_sync()
    
    async def setup_consumers(self):
        """Setup consumers - placeholder for FastAPI compatibility"""
        logger.info("[RabbitMQ] Consumers setup placeholder - use start_consuming() for actual consumption")
        return True
    
    async def connect_redis(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
            # Test connection
            await self.redis_client.ping()
            logger.info(f"[Redis] Connected successfully to {self.redis_url}")
            return True
        except Exception as e:
            logger.error(f"[Redis] Failed to connect: {str(e)}")
            return False
    
    def publish_response(self, session_id: str, ai_question: str, user_response: Optional[str] = None, 
                        question_number: int = 1, candidate_name: str = "", role_name: str = ""):
        """Publish AI question and user response to RabbitMQ response queue"""
        if not self.connection or self.connection.is_closed:
            if not self._connect_sync():
                logger.error("[RabbitMQ] Failed to connect for publishing")
                return False
                
        try:
            message_data = {
                "session_id": session_id,
                "ai_question": ai_question,
                "user_response": user_response,
                "question_number": question_number,
                "candidate_name": candidate_name,
                "role_name": role_name,
                "timestamp": json.dumps({"timestamp": "now"}, default=str)
            }
            
            message_json = json.dumps(message_data, default=str)
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.response_queue,
                body=message_json,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"[RabbitMQ] Published response for session_id={session_id}, question_number={question_number}")
            logger.info(f"[RabbitMQ] AI Question: {ai_question}")
            if user_response:
                logger.info(f"[RabbitMQ] User Response: {user_response}")
            
            return True
            
        except Exception as e:
            logger.error(f"[RabbitMQ] Failed to publish response for session_id={session_id}: {str(e)}")
            return False
    
    def publish_to_queue(self, queue_name: str, message_data: Dict[str, Any]):
        """Generic method to publish to any queue"""
        if not self.connection or self.connection.is_closed:
            if not self._connect_sync():
                logger.error("[RabbitMQ] Failed to connect for publishing")
                return False
                
        try:
            message_json = json.dumps(message_data, default=str)
            
            self.channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message_json,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"[RabbitMQ] Published message to queue: {queue_name}")
            return True
            
        except Exception as e:
            logger.error(f"[RabbitMQ] Failed to publish to queue {queue_name}: {str(e)}")
            return False
    
    async def store_in_redis(self, session_id: str, ai_question: str, user_response: Optional[str] = None, 
                           question_number: int = 1, candidate_name: str = "", role_name: str = ""):
        """Store response data in Redis"""
        if not self.redis_client:
            await self.connect_redis()
            
        try:
            redis_key = f"interview:{session_id}:responses"
            response_data = {
                "session_id": session_id,
                "ai_question": ai_question,
                "user_response": user_response,
                "question_number": question_number,
                "candidate_name": candidate_name,
                "role_name": role_name,
                "timestamp": json.dumps({"timestamp": "now"}, default=str)
            }
            
            response_json = json.dumps(response_data, default=str)
            await self.redis_client.rpush(redis_key, response_json)
            await self.redis_client.expire(redis_key, self.redis_ttl)
            
            logger.info(f"[Redis] Stored response for session_id={session_id}, question_number={question_number}")
            logger.info(f"[Redis] AI Question: {ai_question}")
            if user_response:
                logger.info(f"[Redis] User Response: {user_response}")
            
            return True
            
        except Exception as e:
            logger.error(f"[Redis] Failed to store response for session_id={session_id}: {str(e)}")
            return False
    
    async def process_response_message(self, message_data: Dict[str, Any]):
        """Process a message from the response queue and store in Redis"""
        try:
            session_id = message_data.get('session_id')
            ai_question = message_data.get('ai_question')
            user_response = message_data.get('user_response')
            question_number = message_data.get('question_number', 1)
            candidate_name = message_data.get('candidate_name', '')
            role_name = message_data.get('role_name', '')
            
            logger.info(f"[RabbitMQ] Processing message for session_id={session_id}, question_number={question_number}")
            
            # Store in Redis
            success = await self.store_in_redis(
                session_id=session_id,
                ai_question=ai_question,
                user_response=user_response,
                question_number=question_number,
                candidate_name=candidate_name,
                role_name=role_name
            )
            
            return success
            
        except Exception as e:
            logger.error(f"[RabbitMQ] Failed to process message: {str(e)}")
            return False
    
    async def start_consuming(self):
        """Start consuming messages from the response queue"""
        if not self.connection or self.connection.is_closed:
            if not self._connect_sync():
                logger.error("[RabbitMQ] Failed to connect for consuming")
                return False
        
        if not self.redis_client:
            await self.connect_redis()
        
        try:
            loop = asyncio.get_event_loop()
            
            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body)
                    logger.info(f"[RabbitMQ] Received message from {self.response_queue}")
                    
                    # Process message asynchronously
                    task = loop.create_task(self.process_response_message(data))
                    
                    # Acknowledge message
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    
                except Exception as e:
                    logger.error(f"[RabbitMQ] Failed to process message: {str(e)} | Raw: {body}")
                    # Reject and requeue message on error
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            
            # Set up consumer
            self.channel.basic_qos(prefetch_count=1)  # Process one message at a time
            self.channel.basic_consume(
                queue=self.response_queue, 
                on_message_callback=callback,
                auto_ack=False  # Manual acknowledgment
            )
            
            logger.info(f"[RabbitMQ] Started consuming from queue: {self.response_queue}")
            self.is_consuming = True
            
            # Start consuming
            self.channel.start_consuming()
            
        except Exception as e:
            logger.error(f"[RabbitMQ] Error starting consumer: {str(e)}")
            return False
    
    def stop_consuming(self):
        """Stop consuming messages"""
        try:
            if self.channel and self.is_consuming:
                self.channel.stop_consuming()
                self.is_consuming = False
                logger.info("[RabbitMQ] Stopped consuming messages")
        except Exception as e:
            logger.error(f"[RabbitMQ] Error stopping consumer: {str(e)}")
    
    async def close(self):
        """Close all connections"""
        try:
            # Stop consuming first
            self.stop_consuming()
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
                logger.info("[Redis] Connection closed")
            
            # Close RabbitMQ connection
            if self.connection and not self.connection.is_closed:
                self.connection.close()
                logger.info("[RabbitMQ] Connection closed")
                
        except Exception as e:
            logger.error(f"[RabbitMQ] Error closing connections: {str(e)}")

# Global instance
rabbitmq_service = RabbitMQService()

# Backward compatibility - expose the publisher interface
class RabbitMQResponsePublisher:
    def __init__(self):
        self.service = rabbitmq_service
    
    def connect(self):
        return self.service._connect_sync()
    
    def publish_response(self, session_id: str, ai_question: str, user_response: Optional[str] = None, 
                        question_number: int = 1, candidate_name: str = "", role_name: str = ""):
        return self.service.publish_response(session_id, ai_question, user_response, question_number, candidate_name, role_name)
    
    def close(self):
        asyncio.create_task(self.service.close())

# Global publisher instance for backward compatibility
rabbitmq_publisher = RabbitMQResponsePublisher()

# Standalone consumer function for direct execution
async def main():
    """Main function to run the consumer standalone"""
    logger.info("[RabbitMQ] Starting standalone consumer...")
    
    try:
        service = RabbitMQService()
        await service.start_consuming()
    except KeyboardInterrupt:
        logger.info("[RabbitMQ] Consumer stopped by user")
    except Exception as e:
        logger.error(f"[RabbitMQ] Consumer error: {str(e)}")
    finally:
        await service.close()

if __name__ == "__main__":
    asyncio.run(main())
