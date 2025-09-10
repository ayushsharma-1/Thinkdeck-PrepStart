import os
from typing import Optional

class Settings:
    """Application settings and configuration"""
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    PYTHON_ENV: str = os.getenv("PYTHON_ENV", "development")
    
    # CORS Settings
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # API Keys
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    ASSEMBLYAI_API_KEY: Optional[str] = os.getenv("ASSEMBLYAI_API_KEY")
    
    # AI Model Configuration
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    GOOGLE_MODEL: str = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
    
    # RabbitMQ Configuration
    RABBITMQ_URL: Optional[str] = os.getenv("RABBITMQ_URL")
    RABBITMQ_QUESTION_QUEUE: str = os.getenv("RABBITMQ_QUESTION_QUEUE", "question_generation")
    RABBITMQ_SPEECH_QUEUE: str = os.getenv("RABBITMQ_SPEECH_QUEUE", "speech_processing")
    
    # MongoDB Configuration
    MONGODB_URL: Optional[str] = os.getenv("MONGODB_URL")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # Request Configuration
    AI_REQUEST_TIMEOUT: int = int(os.getenv("AI_REQUEST_TIMEOUT", 15))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", 3))
    
    # File Upload Limits
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: list = ["pdf", "docx", "doc"]
    
    # Validation
    def validate_required_settings(self):
        """Validate that all required settings are present"""
        required_settings = [
            ("GROQ_API_KEY", self.GROQ_API_KEY),
            ("GOOGLE_API_KEY", self.GOOGLE_API_KEY),
            ("ASSEMBLYAI_API_KEY", self.ASSEMBLYAI_API_KEY),
            ("RABBITMQ_URL", self.RABBITMQ_URL),
        ]
        
        missing_settings = [
            setting_name for setting_name, setting_value in required_settings
            if not setting_value
        ]
        
        if missing_settings:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_settings)}")
    
    @property
    def is_development(self) -> bool:
        return self.PYTHON_ENV == "development"
    
    @property
    def is_production(self) -> bool:
        return self.PYTHON_ENV == "production"

# Create settings instance
settings = Settings()

# Validate settings on import (only for production)
if settings.is_production:
    settings.validate_required_settings()
