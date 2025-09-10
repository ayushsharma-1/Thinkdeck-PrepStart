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
            
            logger.info("Connected to RabbitMQ")
            
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
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish question request")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "resume_text": resume_text,
                "job_description": job_description,
                "role_name": role_name,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.question_queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published question request for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish question request: {str(e)}")
            return False

    async def publish_speech_request(
        self,
        session_id: str,
        audio_data: str,
        audio_format: str = "wav"
    ) -> bool:
        """Publish speech processing request"""
        if not self.enabled:
            logger.warning("RabbitMQ not enabled, cannot publish speech request")
            return False
        
        try:
            message = {
                "session_id": session_id,
                "audio_data": audio_data,
                "audio_format": audio_format,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            self.channel.basic_publish(
                exchange='',
                routing_key=self.speech_queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            logger.info(f"Published speech request for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish speech request: {str(e)}")
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
