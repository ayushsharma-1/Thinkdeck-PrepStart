# PrepStart AI Interview Platform - Backend Foundation

A comprehensive backend architecture for an AI-powered interview platform built with Node.js (Express), FastAPI (Python), and centralized logging, featuring real-time communication, AI question generation, speech-to-text processing, and robust cloud integrations.

## Architecture Overview

### **Logging Backend** (Port 5002)
- **Express.js** centralized logging service
- **RabbitMQ Consumer** for log aggregation from all services
- **WebSocket Streaming** for real-time log monitoring (Port 5003)
- **Log Dashboard** for visual log monitoring
- **Structured Logging** with service identification and state tracking

### **Node.js Backend** (Port 5000)
- **Express.js** server with RESTful APIs
- **Socket.IO** for real-time communication
- **MongoDB Atlas** for session data storage
- **Redis Cloud** for ephemeral chat storage
- **RabbitMQ** for messaging with FastAPI
- **Comprehensive logging** and error handling

### **FastAPI Backend** (Port 8000)
- **FastAPI** server for AI processing
- **AI Providers**: Groq (primary), Google Gemini (fallback)
- **AssemblyAI** for speech-to-text
- **Resume parsing** (PDF, DOCX) with PyPDF2 and python-docx
- **RabbitMQ consumers** for async processing

## Quick Start

### Prerequisites
- **Node.js 16+** and npm
- **Python 3.11+** and pip
- **Docker Desktop** (optional, for local services)

### 1. Setup Dependencies
Run the setup script to install all dependencies:
```batch
setup.bat
```

This will:
- Install Node.js dependencies (backend-server)
- Install Node.js dependencies (logging-backend)
- Create Python virtual environment
- Install Python dependencies
- Set up log directories for all services
- Pull Docker images

### 2. Start All Services
```batch
start-all.bat
```

This starts:
- Logging backend (port 5002)
- Infrastructure services (Docker: RabbitMQ, Redis, MongoDB)
- FastAPI backend (port 8000)
- Node.js backend (port 5000)
- Frontend client (port 3000, if available)

## API Endpoints

### Node.js Backend APIs

#### Interview Management
```http
POST /api/setup-interview
Content-Type: application/json

{
  "userDetails": {
    "name": "John Doe",
    "email": "john@example.com", 
    "phone": "+1234567890",
    "experience": "5 years"
  },
  "resume": {
    "data": "base64_encoded_file",
    "filename": "resume.pdf",
    "filetype": "pdf"
  },
  "jobDescription": "Full-stack developer position...",
  "roleName": "Software Engineer"
}
```

```http
POST /api/generate-question
Content-Type: application/json

{
  "sessionId": "uuid-session-id"
}
```

```http
POST /api/submit-response
Content-Type: application/json

{
  "sessionId": "uuid-session-id",
  "questionNumber": 1,
  "response": "My answer to the interview question..."
}
```

```http
GET /api/session/{sessionId}
```

### FastAPI Backend APIs

#### AI Processing
```http
POST /api/generate-question
Content-Type: application/json

{
  "session_id": "uuid-session-id",
  "resume_text": "Parsed resume content...",
  "job_description": "Job requirements...",
  "role_name": "Software Engineer",
  "question_number": 1,
  "previous_responses": [],
  "covered_topics": []
}
```

```http
POST /api/speech-to-text
Content-Type: application/json

{
  "audio_data": "base64_encoded_audio",
  "session_id": "uuid-session-id",
  "format": "wav"
}
```

### Health Checks
- Node.js: `GET http://localhost:5000/health`
- FastAPI: `GET http://localhost:8000/health`

## Data Flow

### Interview Session Creation
1. **Frontend** → Node.js `/api/setup-interview`
2. **Node.js** → RabbitMQ (resume parsing request)
3. **FastAPI** processes resume via RabbitMQ consumer
4. **FastAPI** → RabbitMQ (parsed resume response)
5. **Node.js** stores session in MongoDB
6. **Node.js** initializes chat in Redis

### Question Generation
1. **Frontend** → Node.js `/api/generate-question`
2. **Node.js** → RabbitMQ (question generation request)
3. **FastAPI** → AI Provider (Groq/Google)
4. **FastAPI** → RabbitMQ (generated question response)
5. **Node.js** stores question in MongoDB
6. **Node.js** updates chat in Redis
7. **Socket.IO** broadcasts to frontend

### Response Submission
1. **Frontend** → Node.js `/api/submit-response`
2. **Node.js** stores response in MongoDB
3. **Node.js** updates chat in Redis
4. **Socket.IO** broadcasts confirmation

## Database Schemas

### MongoDB Session Schema
```javascript
{
  sessionId: "uuid",
  userDetails: {
    name: "string",
    email: "string", 
    phone: "string",
    experience: "string"
  },
  resumeText: "string",
  jobDescription: "string",
  roleName: "string",
  status: "created|in_progress|completed|cancelled",
  questions: [{
    questionNumber: "number",
    question: "string",
    isAiGenerated: "boolean",
    topic: "string",
    difficulty: "easy|medium|hard"
  }],
  responses: [{
    questionNumber: "number", 
    response: "string",
    timestamp: "date"
  }],
  currentQuestionNumber: "number",
  totalQuestions: "number",
  completedAt: "date",
  createdAt: "date"
}
```

### Redis Chat Schema
```javascript
// Key: session:{sessionId}:chat
// TTL: 35 minutes
[{
  id: "uuid",
  sender: "user|system|ai",
  content: "string", 
  timestamp: "ISO string",
  isProcessing: "boolean"
}]
```

## Configuration

### Environment Variables

**Required for Production:**
- `GROQ_API_KEY`: Primary AI provider
- `GOOGLE_API_KEY`: Fallback AI provider  
- `ASSEMBLYAI_API_KEY`: Speech-to-text service
- `MONGODB_URI`: MongoDB Atlas connection
- `REDIS_URL`: Redis Cloud connection
- `RABBITMQ_URL`: RabbitMQ Cloud connection

**Optional:**
- `LOG_LEVEL`: Logging level (default: info)
- `RATE_LIMIT_MAX_REQUESTS`: API rate limiting
- `AI_REQUEST_TIMEOUT`: AI provider timeout (15s)
- `MAX_RETRIES`: Retry attempts for AI calls (3)

### AI Model Configuration
- **Groq Model**: llama-3.1-8b-instant
- **Google Model**: gemini-1.5-flash
- **Fallback**: Predefined questions by role

## 🚨 Error Handling & Resilience

### Retry Logic
- **3 retry attempts** for AI provider calls
- **15-second timeout** per request
- **Exponential backoff** for retries

### Fallback Mechanisms
- **AI Generation**: Groq → Google → Predefined questions
- **Service Failures**: Graceful degradation
- **Network Issues**: Automatic reconnection

### Monitoring
- **Health checks** for all services
- **Comprehensive logging** (console + file)
- **Error tracking** with stack traces
- **Performance metrics** logging

## 🐳 Docker Deployment

### Production Deployment
```bash
docker-compose up -d
```

### Development with Local Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Scaling Services
```bash
docker-compose up -d --scale backend-server=3 --scale backend-fastapi=2
```

## Service Management

### View Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend-server
docker-compose logs -f backend-fastapi
```

### Stop Services
```bash
docker-compose down
```

### Restart Service
```bash
docker-compose restart backend-server
```

## Debugging & Troubleshooting

### Common Issues

**1. RabbitMQ Connection Failed**
- Check RabbitMQ service status
- Verify connection URL and credentials
- Ensure proper network connectivity

**2. MongoDB Connection Failed**  
- Verify MongoDB Atlas whitelist
- Check connection string format
- Test network connectivity

**3. AI Provider Errors**
- Verify API keys are valid
- Check rate limits and quotas
- Monitor API provider status

**4. Redis Connection Issues**
- Check Redis Cloud service status
- Verify connection credentials
- Test network connectivity

### Debug Mode
Set `NODE_ENV=development` and `PYTHON_ENV=development` for:
- Verbose logging
- Detailed error messages
- Auto-reload on code changes

### Log Locations
- **Node.js**: `backend-server/logs/`
- **FastAPI**: `backend-fastapi/logs/`
- **Docker**: `docker-compose logs`

## Testing

### Unit Tests
```bash
# Node.js tests
cd backend-server && npm test

# Python tests  
cd backend-fastapi && python -m pytest
```

### API Testing
```bash
# Health checks
curl http://localhost:5000/health
curl http://localhost:8000/health

# Interview setup
curl -X POST http://localhost:5000/api/setup-interview \
  -H "Content-Type: application/json" \
  -d @test-data/interview-setup.json
```

## 🔐 Security Considerations

### API Security
- **Rate limiting**: 100 requests per 15 minutes
- **Input validation**: Joi (Node.js) and Pydantic (FastAPI)
- **CORS configuration**: Restricted to frontend origins
- **Helmet.js**: Security headers in Node.js

### Data Security
- **Environment variables**: Sensitive data in `.env` files
- **MongoDB**: Connection with authentication
- **Redis**: Password-protected connections
- **File uploads**: Size and type validation

## 🚀 Performance Optimization

### Caching Strategy
- **Redis**: Session chat data with TTL
- **MongoDB**: Indexed queries on sessionId
- **Connection pooling**: Database connections

### Scaling Considerations
- **Horizontal scaling**: Multiple service instances
- **Load balancing**: Nginx/HAProxy integration
- **Database sharding**: MongoDB scaling strategy
- **Message queue**: RabbitMQ clustering

## 📝 Development Guidelines

### Code Structure
- **Modular architecture**: Separate concerns
- **Service layer**: Business logic isolation
- **Controller layer**: Request/response handling
- **Model layer**: Data structures and validation

### Best Practices
- **Async/await**: For all async operations
- **Error handling**: Try-catch blocks with logging
- **Validation**: Input validation at API boundaries
- **Logging**: Structured logging with context

## 🤝 Contributing

### Development Workflow
1. Clone repository
2. Run `setup.bat` for dependencies
3. Configure environment variables
4. Start services with `start-all.bat`
5. Run tests before committing
6. Follow coding standards

### Code Review Checklist
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Logging statements included
- [ ] Tests written/updated
- [ ] Documentation updated

---

## 📞 Support & Maintenance

For issues, feature requests, or contributions, please refer to the project documentation or contact the development team.

**Service URLs:**
- Node.js Backend: http://localhost:5000
- FastAPI Backend: http://localhost:8000
- RabbitMQ Management: http://localhost:15672
- Frontend: http://localhost:3000

**Version**: 1.0.0  
**Last Updated**: September 2025
