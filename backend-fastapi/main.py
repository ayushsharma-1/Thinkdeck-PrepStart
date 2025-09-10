import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
from dotenv import load_dotenv

from controllers.question_controller import router as question_router
from controllers.speech_controller import router as speech_router
from controllers.evaluation_controller import router as evaluation_router
from services.rabbitmq_service import RabbitMQService
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Setup logger
logger = setup_logger(__name__)

# RabbitMQ service instance
rabbitmq_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global rabbitmq_service
    try:
        rabbitmq_service = RabbitMQService()
        await rabbitmq_service.connect()
        await rabbitmq_service.setup_consumers()
        logger.info("FastAPI server startup completed")
        yield
    except Exception as e:
        logger.error(f"Failed to start FastAPI server: {e}")
        raise
    finally:
        # Shutdown
        if rabbitmq_service:
            await rabbitmq_service.close()
        logger.info("FastAPI server shutdown completed")

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

# Include routers
app.include_router(question_router, prefix="/api", tags=["questions"])
app.include_router(speech_router, prefix="/api", tags=["speech"])
app.include_router(evaluation_router, prefix="/api", tags=["evaluation"])

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
