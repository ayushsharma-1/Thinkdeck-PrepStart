import os
import asyncio
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from functools import wraps
from utils.logger import setup_logger

logger = setup_logger(__name__)

class RetryableError(Exception):
    """Exception that should trigger a retry"""
    pass

class NonRetryableError(Exception):
    """Exception that should not trigger a retry"""
    pass

def async_retry_with_timeout(
    max_retries: Optional[int] = None,
    timeout: Optional[float] = None,
    backoff_factor: float = 1.0
):
    """
    Decorator for async functions with retry logic and timeout
    """
    max_retries = max_retries or int(os.getenv("MAX_RETRIES", 3))
    timeout = timeout or float(os.getenv("AI_REQUEST_TIMEOUT", 15))
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            @retry(
                stop=stop_after_attempt(max_retries),
                wait=wait_exponential(multiplier=backoff_factor, min=1, max=10),
                retry=retry_if_exception_type(RetryableError),
                reraise=True
            )
            async def _retry_func():
                try:
                    return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
                except asyncio.TimeoutError:
                    logger.error(f"Timeout after {timeout}s in {func.__name__}")
                    raise RetryableError(f"Timeout after {timeout}s")
                except Exception as e:
                    logger.error(f"Error in {func.__name__}: {str(e)}")
                    # Determine if error should be retried
                    if isinstance(e, (ConnectionError, TimeoutError)):
                        raise RetryableError(str(e))
                    else:
                        raise NonRetryableError(str(e))
            
            try:
                return await _retry_func()
            except (RetryableError, NonRetryableError) as e:
                logger.error(f"Final error in {func.__name__}: {str(e)}")
                raise e
            
        return wrapper
    return decorator

class AppError(Exception):
    """Base application error"""
    def __init__(self, message: str, status_code: int = 500, error_code: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)

class ValidationError(AppError):
    """Validation error"""
    def __init__(self, message: str):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR")

class AIServiceError(AppError):
    """AI service error"""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code="AI_SERVICE_ERROR")

class RabbitMQError(AppError):
    """RabbitMQ error"""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code="RABBITMQ_ERROR")

def handle_exceptions(func):
    """Decorator to handle common exceptions"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ValidationError:
            raise
        except AIServiceError:
            raise
        except RabbitMQError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise AppError(f"Internal server error: {str(e)}", status_code=500)
    
    return wrapper
