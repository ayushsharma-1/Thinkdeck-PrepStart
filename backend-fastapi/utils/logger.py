import os
import sys
import logging
import requests
import json
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(name: str) -> logging.Logger:
    """Setup logger with both console and file handlers"""
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatter
    formatter = logging.Formatter(
        os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    file_handler = RotatingFileHandler(
        log_dir / f"fastapi-{datetime.now().strftime('%Y-%m-%d')}.log",
        maxBytes=20*1024*1024,  # 20MB
        backupCount=14
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        log_dir / f"error-{datetime.now().strftime('%Y-%m-%d')}.log",
        maxBytes=20*1024*1024,  # 20MB
        backupCount=14
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    # Add real-time logging backend handler
    backend_handler = LoggingBackendHandler('fastapi')
    logger.addHandler(backend_handler)
    
    return logger


class LoggingBackendHandler(logging.Handler):
    """Custom logging handler that sends logs to logging backend service"""
    
    def __init__(self, service_name='fastapi'):
        super().__init__()
        self.service_name = service_name
        self.backend_url = 'http://localhost:5002/api/logs'
        self.enabled = True
        
    def emit(self, record):
        if not self.enabled:
            return
            
        try:
            log_data = {
                'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                'level': record.levelname.lower(),
                'message': record.getMessage(),
                'service': self.service_name,
                'metadata': {
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno,
                    'pathname': record.pathname
                }
            }
            
            # Send to logging backend asynchronously
            try:
                response = requests.post(
                    self.backend_url, 
                    json=log_data, 
                    timeout=0.5,
                    headers={'Content-Type': 'application/json'}
                )
            except requests.exceptions.RequestException as e:
                if e.__class__.__name__ in ['ConnectionError', 'ConnectTimeout']:
                    self.enabled = False
                    # Re-enable after 10 seconds
                    import threading
                    threading.Timer(10.0, lambda: setattr(self, 'enabled', True)).start()
                    
        except Exception:
            # Silently fail to avoid breaking the application
            pass
