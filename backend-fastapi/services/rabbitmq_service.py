import os
import json
import asyncio
from typing import Dict, Any, Callable, Optional
import pika
from dotenv import load_dotenv
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

logger = setup_logger(__name__)

class RabbitMQService:
    """Simple RabbitMQ service stub using pika"""
    
    def __init__(self):
        self.connection = None
        self.channel = None
        self.rabbitmq_url = os.getenv("RABBITMQ_URL")
        
        if not self.rabbitmq_url:
            logger.warning("RABBITMQ_URL not provided, RabbitMQ features disabled")
            self.enabled = False
            return
        
        self.enabled = True
        self.question_queue = os.getenv("RABBITMQ_QUESTION_QUEUE", "question_generation")
        self.speech_queue = os.getenv("RABBITMQ_SPEECH_QUEUE", "speech_processing")
        self.interview_queue = os.getenv("RABBITMQ_INTERVIEW_QUEUE", "interview_processing")  # New unified queue
        
        # Try to connect
        try:
            self._connect()
            logger.info("RabbitMQ Service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize RabbitMQ: {str(e)}")
            self.enabled = False

    def _connect(self):
        """Establish connection to RabbitMQ"""
        if not self.enabled or not self.rabbitmq_url:
            return
            
        try:
            # Parse URL and create connection
            parameters = pika.URLParameters(self.rabbitmq_url)
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Declare queues
            self.channel.queue_declare(queue=self.question_queue, durable=True)
            self.channel.queue_declare(queue=self.speech_queue, durable=True)
            self.channel.queue_declare(queue=self.interview_queue, durable=True)  # New unified queue
            
            logger.info(f"Connected to RabbitMQ with queues: {self.question_queue}, {self.speech_queue}, {self.interview_queue}")
            
        except Exception as e:
            logger.error(f"RabbitMQ connection failed: {str(e)}")
            self.enabled = False
            raise

    async def connect(self):
        """Async connect method for compatibility"""
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, skipping connection")
            return
        
        try:
            self._connect()
            logger.info("RabbitMQ connected successfully")
        except Exception as e:
            logger.error(f"RabbitMQ connection failed: {str(e)}")
            self.enabled = False

    async def setup_consumers(self):
        """Setup message consumers - stub implementation"""
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, skipping consumers setup")
            return
        
        logger.info("RabbitMQ consumers setup (stub implementation)")

    async def publish_question_request(
        self, 
        session_id: str,
        resume_text: str,
        job_description: str,
        role_name: str
    ) -> bool:
        """Publish question generation request"""
        logger.info(f"Publishing question request for session: {session_id}")
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish question request")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "resume_text": resume_text[:200] + "..." if len(resume_text) > 200 else resume_text,
                "job_description": job_description[:200] + "..." if len(job_description) > 200 else job_description,
                "role_name": role_name,
                "timestamp": asyncio.get_event_loop().time(),
                "message_type": "question_generation_request"
            }
            
            message_body = json.dumps(message)
            logger.info(f"Message body: {message_body[:300]}..." if len(message_body) > 300 else f"Message body: {message_body}")
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.question_queue,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published question request for session {session_id} to queue: {self.question_queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish question request: {str(e)}")
            return False

    async def publish_response_data(
        self,
        session_id: str,
        question_number: int,
        response_text: str,
        question_text: str = ""
    ) -> bool:
        """Publish user response data"""
        logger.info(f"Publishing response data for session: {session_id}, question: {question_number}")
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish response data")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "question_number": question_number,
                "response_text": response_text,
                "question_text": question_text,
                "timestamp": asyncio.get_event_loop().time(),
                "message_type": "user_response"
            }
            
            message_body = json.dumps(message)
            logger.info(f"Response message: {message_body[:300]}..." if len(message_body) > 300 else f"Response message: {message_body}")
            
            response_queue = os.getenv("RABBITMQ_RESPONSE_QUEUE", "user_responses")
            
            self.channel.basic_publish(
                exchange='',
                routing_key=response_queue,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published response data for session {session_id} to queue: {response_queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish response data: {str(e)}")
            return False

    async def publish_speech_request(
        self,
        session_id: str,
        audio_data: str,
        audio_format: str = "wav"
    ) -> bool:
        """Publish speech processing request"""
        logger.info(f"Publishing speech request for session: {session_id}")
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish speech request")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "audio_data": audio_data[:100] + "..." if len(audio_data) > 100 else audio_data,  # Truncate for logging
                "audio_format": audio_format,
                "timestamp": asyncio.get_event_loop().time(),
                "message_type": "speech_processing_request"
            }
            
            message_body = json.dumps(message)
            logger.info(f"Speech message body length: {len(message_body)} bytes")
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.speech_queue,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published speech request for session {session_id} to queue: {self.speech_queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish speech request: {str(e)}")
            return False

    async def publish_interview_data(
        self,
        session_id: str,
        data_type: str,  # "question" or "response"
        data_content: dict
    ) -> bool:
        """Publish interview data (questions or responses) to unified processing queue"""
        logger.info(f"Publishing {data_type} for session: {session_id}")
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish interview data")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "data_type": data_type,  # "question" or "response"
                "data_content": data_content,
                "timestamp": asyncio.get_event_loop().time(),
                "message_type": "interview_data",
                "processing_status": "pending"
            }
            
            message_body = json.dumps(message)
            logger.info(f"Interview {data_type} message: {message_body[:300]}..." if len(message_body) > 300 else f"Interview {data_type} message: {message_body}")
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.interview_queue,
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published {data_type} for session {session_id} to queue: {self.interview_queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish {data_type}: {str(e)}")
            return False

    async def setup_interview_consumer(self, callback_function):
        """Setup consumer for the unified interview processing queue"""
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot setup consumer")
            return False
        
        try:
            logger.info(f"Setting up consumer for queue: {self.interview_queue}")
            
            def wrapper(ch, method, properties, body):
                """Wrapper to handle the callback"""
                try:
                    message = json.loads(body)
                    logger.info(f"Received interview data: {message.get('data_type')} for session {message.get('session_id')}")
                    
                    # Call the provided callback function
                    asyncio.create_task(callback_function(message))
                    
                    # Acknowledge the message
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    logger.info(f"Acknowledged message for session {message.get('session_id')}")
                    
                except Exception as e:
                    logger.error(f"Error processing interview message: {str(e)}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
            self.channel.basic_consume(
                queue=self.interview_queue,
                on_message_callback=wrapper
            )
            
            logger.info(f"Consumer setup complete for queue: {self.interview_queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup consumer: {str(e)}")
            return False

    async def close(self):
        """Close RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("RabbitMQ connection closed")

    def __del__(self):
        """Cleanup on destruction"""
        try:
            if hasattr(self, 'connection') and self.connection and not self.connection.is_closed:
                self.connection.close()
        except:
            pass
