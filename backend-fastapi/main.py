import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
from dotenv import load_dotenv

from controllers.question_controller import router as question_router
from controllers.speech_controller import router as speech_router
from controllers.evaluation_controller import router as evaluation_router
from controllers.resume_controller import router as resume_router
from services.rabbitmq_service import RabbitMQService
from services.redis_service import RedisService
from services.interview_processor import InterviewProcessor
from utils.logger import setup_logger
import time

# Load environment variables
load_dotenv()

# Setup logger
logger = setup_logger(__name__)

# Service instances
rabbitmq_service = None
redis_service = None
interview_processor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global rabbitmq_service, redis_service, interview_processor
    try:
        # Initialize Redis service
        logger.info("Initializing Redis service...")
        redis_service = RedisService()
        await redis_service.connect()
        logger.info("Redis service initialized")
        
        # Initialize RabbitMQ service
        logger.info("Initializing RabbitMQ service...")
        rabbitmq_service = RabbitMQService()
        await rabbitmq_service.connect()
        await rabbitmq_service.setup_consumers()
        logger.info("RabbitMQ service initialized")
        
        # Initialize Interview Processor
        logger.info("Initializing Interview Processor...")
        interview_processor = InterviewProcessor()
        await interview_processor.start_processing()
        logger.info("Interview Processor initialized")
        
        logger.info("FastAPI server startup completed")
        yield
    except Exception as e:
        logger.error(f"❌ Failed to start FastAPI server: {e}")
        raise
    finally:
        # Shutdown
        if redis_service:
            logger.info("🔒 Closing Redis connection...")
            await redis_service.close()
        if rabbitmq_service:
            logger.info("🔒 Closing RabbitMQ connection...")
            await rabbitmq_service.close()
        if interview_processor:
            logger.info("🔒 Shutting down Interview Processor...")
            # Add cleanup if needed
        logger.info("✅ FastAPI server shutdown completed")

# Create FastAPI app
app = FastAPI(
    title="PrepStart AI FastAPI Backend",
    description="FastAPI backend for AI processing and resume parsing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    request_id = f"{int(start_time * 1000)}-{id(request)}"
    
    # Log incoming request
    logger.info("HTTP Request", extra={
        'request_id': request_id,
        'method': request.method,
        'url': str(request.url),
        'client_ip': request.client.host if request.client else 'unknown',
        'user_agent': request.headers.get('user-agent', 'unknown'),
        'content_type': request.headers.get('content-type', 'unknown')
    })
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info("HTTP Response", extra={
        'request_id': request_id,
        'status_code': response.status_code,
        'process_time': f"{process_time:.4f}s",
        'response_headers': dict(response.headers)
    })
    
    return response

# Include routers
app.include_router(question_router, prefix="/api", tags=["questions"])
app.include_router(speech_router, prefix="/api", tags=["speech"])
app.include_router(evaluation_router, prefix="/api", tags=["evaluation"])
app.include_router(resume_router, prefix="/api", tags=["resume"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "PrepStart FastAPI Backend",
        "version": "1.0.0",
        "timestamp": asyncio.get_event_loop().time()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "PrepStart AI FastAPI Backend is running"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("PYTHON_ENV") == "development",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
