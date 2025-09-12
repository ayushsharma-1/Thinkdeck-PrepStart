import asyncio
import json
import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import aio_pika
import socket

class RabbitMQLogger:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.connection = None
        self.channel = None
        self.exchange = None
        self.is_connected = False
        self.hostname = socket.gethostname()
        self.pid = os.getpid()
        self.version = os.getenv('APP_VERSION', '1.0.0')
        
        if os.getenv('ENABLE_RABBITMQ_LOGGING', 'false').lower() == 'true':
            asyncio.create_task(self.setup_rabbitmq())
        else:
            print(f"[{self.service_name}] RabbitMQ logging disabled")

    async def setup_rabbitmq(self):
        try:
            rabbitmq_url = os.getenv('RABBITMQ_URL')
            exchange_name = os.getenv('RABBITMQ_LOGS_EXCHANGE', 'interview_logs_exchange')
            
            if not rabbitmq_url:
                print(f"[{self.service_name}] RabbitMQ URL not configured, skipping log streaming")
                return
            
            self.connection = await aio_pika.connect_robust(rabbitmq_url)
            self.channel = await self.connection.channel()
            
            self.exchange = await self.channel.declare_exchange(
                exchange_name, 
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            
            self.is_connected = True
            print(f"[{self.service_name}] RabbitMQ Logger connected successfully")
            
        except Exception as error:
            print(f"[{self.service_name}] RabbitMQ Logger setup failed: {str(error)}")
            # Retry after 5 seconds
            await asyncio.sleep(5)
            asyncio.create_task(self.setup_rabbitmq())

    async def publish_log(self, level: str, message: str, context: Optional[Dict[str, Any]] = None):
        if not self.is_connected or not self.exchange:
            return
        
        try:
            log_entry = {
                'id': str(uuid.uuid4()),
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'service': self.service_name,
                'level': level.upper(),
                'message': str(message),
                'context': context or {},
                'hostname': self.hostname,
                'pid': self.pid,
                'version': self.version
            }
            
            routing_key = os.getenv('RABBITMQ_LOGS_ROUTING_KEY', f'logs.backend.{self.service_name}')
            
            await self.exchange.publish(
                aio_pika.Message(
                    body=json.dumps(log_entry).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key=routing_key
            )
            
        except Exception as error:
            print(f"[{self.service_name}] Failed to publish log to RabbitMQ: {str(error)}")

    def error(self, message: str, context: Optional[Dict[str, Any]] = None):
        if self.is_connected:
            asyncio.create_task(self.publish_log('error', message, context))
    
    def warn(self, message: str, context: Optional[Dict[str, Any]] = None):
        if self.is_connected:
            asyncio.create_task(self.publish_log('warn', message, context))
    
    def info(self, message: str, context: Optional[Dict[str, Any]] = None):
        if self.is_connected:
            asyncio.create_task(self.publish_log('info', message, context))
    
    def debug(self, message: str, context: Optional[Dict[str, Any]] = None):
        if self.is_connected:
            asyncio.create_task(self.publish_log('debug', message, context))
    
    def warning(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Alias for warn to match Python logging interface"""
        self.warn(message, context)

    async def close(self):
        try:
            if self.channel:
                await self.channel.close()
            if self.connection:
                await self.connection.close()
            self.is_connected = False
            print(f"[{self.service_name}] RabbitMQ Logger closed")
        except Exception as error:
            print(f"[{self.service_name}] Error closing RabbitMQ Logger: {str(error)}")

# Global instance
rabbitmq_logger = None

def get_rabbitmq_logger(service_name: str = 'backend-fastapi') -> RabbitMQLogger:
    global rabbitmq_logger
    if rabbitmq_logger is None:
        rabbitmq_logger = RabbitMQLogger(service_name)
    return rabbitmq_logger