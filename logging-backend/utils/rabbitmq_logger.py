import json
import asyncio
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
import os

class RabbitMQLogger:
    """Python RabbitMQ logger for centralized logging"""
    
    def __init__(self, service_type: str):
        self.service_type = service_type
        self.connection = None
        self.channel = None
        self.exchange = None
        self.is_connected = False
        self.message_queue = []
        self.connecting = False
        
    async def connect(self):
        """Connect to RabbitMQ"""
        if self.connecting or self.is_connected:
            return
            
        self.connecting = True
        
        try:
            rabbitmq_url = os.getenv('RABBITMQ_URL')
            if not rabbitmq_url:
                print(f'[RABBITMQ_LOGGER] RABBITMQ_URL not provided, logging disabled for {self.service_type}')
                self.connecting = False
                return
                
            self.connection = await aio_pika.connect_robust(rabbitmq_url)
            self.channel = await self.connection.channel()
            
            exchange_name = os.getenv('RABBITMQ_EXCHANGE_NAME', 'interview_logs_exchange')
            self.exchange = await self.channel.declare_exchange(
                exchange_name,
                ExchangeType.TOPIC,
                durable=True
            )
            
            self.is_connected = True
            self.connecting = False
            
            print(f'[RABBITMQ_LOGGER] Connected for service: {self.service_type}')
            
            # Process queued messages
            while self.message_queue:
                message = self.message_queue.pop(0)
                await self._publish_message(message)
                
        except Exception as error:
            print(f'[RABBITMQ_LOGGER] Failed to connect: {error}')
            self.is_connected = False
            self.connecting = False
            
    async def log(
        self, 
        which: str, 
        state: str, 
        dependency: str, 
        file: str, 
        message: str, 
        level: str = 'info', 
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a message to RabbitMQ"""
        log_data = {
            'service_type': self.service_type,
            'which': which,
            'state': state,
            'dependency': dependency,
            'file': file,
            'message': message,
            'level': level,
            'metadata': metadata or {},
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'id': str(uuid.uuid4())
        }
        
        if not self.is_connected and not self.connecting:
            try:
                await self.connect()
            except Exception as e:
                print(f'[RABBITMQ_LOGGER] Failed to connect during log: {e}')
        
        if self.is_connected:
            await self._publish_message(log_data)
        else:
            # Queue message for later if not connected
            self.message_queue.append(log_data)
            if len(self.message_queue) > 100:
                # Prevent memory leaks by limiting queue size
                self.message_queue.pop(0)
                
    async def _publish_message(self, log_data: Dict[str, Any]):
        """Publish message to RabbitMQ exchange"""
        try:
            if not self.exchange or not self.is_connected:
                return
                
            routing_key = os.getenv('RABBITMQ_ROUTING_KEY', 'logs.all')
            
            message = Message(
                json.dumps(log_data).encode('utf-8'),
                delivery_mode=DeliveryMode.PERSISTENT,
                timestamp=datetime.now()
            )
            
            await self.exchange.publish(message, routing_key=routing_key)
            
            print(f"[RABBITMQ_LOGGER] Published log: {log_data['service_type']}/{log_data['which']} - {log_data['message'][:50]}...")
            
        except Exception as error:
            print(f'[RABBITMQ_LOGGER] Error publishing message: {error}')
            self.is_connected = False
            
    # Convenience methods for different log levels
    async def info(self, which: str, state: str, dependency: str, file: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        await self.log(which, state, dependency, file, message, 'info', metadata)
        
    async def warn(self, which: str, state: str, dependency: str, file: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        await self.log(which, state, dependency, file, message, 'warn', metadata)
        
    async def error(self, which: str, state: str, dependency: str, file: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        await self.log(which, state, dependency, file, message, 'error', metadata)
        
    async def debug(self, which: str, state: str, dependency: str, file: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        await self.log(which, state, dependency, file, message, 'debug', metadata)
        
    async def disconnect(self):
        """Disconnect from RabbitMQ"""
        try:
            if self.connection and not self.connection.is_closed:
                await self.connection.close()
            self.is_connected = False
            print('[RABBITMQ_LOGGER] Disconnected successfully')
        except Exception as error:
            print(f'[RABBITMQ_LOGGER] Error during disconnect: {error}')

# Singleton instance for easy usage
_logger_instance = None

def get_rabbitmq_logger(service_type: str = 'backend-fastapi') -> RabbitMQLogger:
    """Get singleton RabbitMQ logger instance"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = RabbitMQLogger(service_type)
    return _logger_instance

# Usage example:
# logger = get_rabbitmq_logger('backend-fastapi')
# await logger.info('ai_service', 'generating', 'groq_api', 'ai_service.py', 'Generating AI question')