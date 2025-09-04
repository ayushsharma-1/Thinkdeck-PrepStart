# 🚀 Verbal Vue AI - Complete System Architecture & Deployment Guide

## 📊 System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Device]
    end
    
    subgraph "CDN & Load Balancer"
        NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Frontend Layer"
        REACT[React + TypeScript]
        VITE[Vite Build Tool]
        TAILWIND[TailwindCSS]
        SHADCN[ShadCN UI Components]
    end
    
    subgraph "API Gateway"
        EXPRESS[Express.js Server]
        SOCKETIO[Socket.IO WebSockets]
        MIDDLEWARE[Auth & Rate Limiting]
    end
    
    subgraph "Business Logic Layer"
        CONTROLLERS[Controllers]
        SERVICES[Services]
        VALIDATION[Input Validation]
    end
    
    subgraph "External AI Services"
        OPENAI[OpenAI GPT-4]
        ASSEMBLY[AssemblyAI STT]
    end
    
    subgraph "Code Execution Engine"
        DOCKER[Docker Containers]
        PYTHON[Python Runtime]
        NODE[Node.js Runtime]
        JAVA[Java Runtime]
        CPP[C++ Runtime]
    end
    
    subgraph "Data Layer"
        MONGODB[MongoDB Database]
        REDIS[Redis Cache]
        FILESYSTEM[File Storage]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> REACT
    NGINX --> EXPRESS
    
    REACT --> VITE
    REACT --> TAILWIND
    REACT --> SHADCN
    
    EXPRESS --> SOCKETIO
    EXPRESS --> MIDDLEWARE
    MIDDLEWARE --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> VALIDATION
    
    SERVICES --> OPENAI
    SERVICES --> ASSEMBLY
    SERVICES --> DOCKER
    SERVICES --> MONGODB
    SERVICES --> REDIS
    SERVICES --> FILESYSTEM
    
    DOCKER --> PYTHON
    DOCKER --> NODE
    DOCKER --> JAVA
    DOCKER --> CPP
```

## 🏗️ Detailed Component Architecture

### Frontend Architecture (React + TypeScript)
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # ShadCN UI components
│   ├── AssessmentCard.tsx
│   ├── CodeEditor.tsx
│   ├── MCQTest.tsx
│   └── MockInterview.tsx
├── hooks/               # Custom React hooks
│   ├── useApi.ts
│   ├── useMobile.tsx
│   └── useToast.ts
├── pages/               # Page components
│   ├── Index.tsx
│   └── NotFound.tsx
├── services/            # API services
│   └── api.ts
└── lib/                 # Utilities
    └── utils.ts
```

### Backend Architecture (Node.js + Express)
```
backend/src/
├── controllers/         # Request handlers
│   ├── health.controller.ts
│   ├── company.controller.ts
│   ├── interview.controller.ts
│   ├── coding.controller.ts
│   └── mcq.controller.ts
├── middleware/          # Express middleware
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── logger.middleware.ts
├── models/             # MongoDB schemas
│   ├── Company.ts
│   ├── InterviewSession.ts
│   ├── CodingProblem.ts
│   ├── MCQQuestion.ts
│   └── index.ts
├── routes/             # API routes
│   ├── health.routes.ts
│   ├── company.routes.ts
│   ├── interview.routes.ts
│   └── coding.routes.ts
├── services/           # Business logic
│   ├── ai.service.ts
│   ├── speech.service.ts
│   ├── codeExecution.service.ts
│   ├── database.service.ts
│   └── socket.service.ts
├── types/              # TypeScript definitions
│   └── index.ts
└── utils/              # Utilities
    └── helpers.ts
```

## 🔄 Data Flow Architecture

### 1. Mock Interview Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant AI as OpenAI
    participant S as AssemblyAI
    participant DB as MongoDB
    
    C->>A: Upload Resume & JD
    A->>AI: Generate Questions
    AI-->>A: Return Questions
    A->>DB: Create Session
    A-->>C: Session ID + First Question
    
    loop Interview Loop
        C->>A: Upload Audio Answer
        A->>S: Transcribe Audio
        S-->>A: Return Transcription
        A->>AI: Evaluate Answer
        AI-->>A: Score + Feedback
        A->>DB: Update Session
        A-->>C: Next Question / Complete
    end
    
    A->>AI: Generate Final Evaluation
    AI-->>A: Final Score + Feedback
    A->>DB: Save Final Results
    A-->>C: Interview Results
```

### 2. Code Execution Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant D as Docker Engine
    participant FS as File System
    
    C->>A: Submit Code + Language
    A->>A: Validate Input
    A->>FS: Create Temp Directory
    A->>FS: Write Code to File
    A->>D: Create Container
    A->>D: Execute Code
    D-->>A: Execution Results
    A->>FS: Cleanup Temp Files
    A-->>C: Results + Output
```

## 🚀 Deployment Strategies

### 1. Development Environment
```bash
# Clone repository
git clone <repo-url>
cd verbal-vue-ai

# Setup environment
chmod +x setup-dev.sh
./setup-dev.sh

# Start development servers
npm run dev                    # Frontend (port 5173)
cd backend && npm run dev      # Backend (port 8000)
```

### 2. Docker Compose Deployment
```bash
# Production deployment
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up
```

### 3. AWS EC2 Deployment
```bash
# Automated deployment
chmod +x deploy.sh
./deploy.sh
```

### 4. Kubernetes Deployment (Advanced)
```yaml
# kubernetes/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── mongodb/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── pvc.yaml
├── backend/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
└── ingress.yaml
```

## 🔒 Security Architecture

### API Security Layers
1. **Rate Limiting**: 100 requests per 15-minute window
2. **Input Validation**: Joi schema validation for all inputs
3. **CORS Protection**: Configured allowed origins
4. **Helmet.js**: Security headers implementation
5. **File Upload Security**: Type validation and size limits

### Code Execution Security
1. **Container Isolation**: Each execution in separate Docker container
2. **Network Isolation**: No external network access during execution
3. **Resource Limits**: CPU, memory, and time constraints
4. **File System Protection**: Read-only code mounts
5. **Cleanup Automation**: Automatic container and file cleanup

### Data Security
1. **MongoDB Security**: Connection string encryption
2. **Temporary Sessions**: Automatic expiration and cleanup
3. **File Storage**: Temporary file handling with expiration
4. **Logging**: Secure logging without sensitive data

## 📊 Performance & Scalability

### Performance Optimizations
- **Frontend**: Code splitting, lazy loading, asset optimization
- **Backend**: Connection pooling, caching, compression
- **Database**: Proper indexing, aggregation pipelines
- **Code Execution**: Container reuse, execution queue management

### Scaling Strategies
```mermaid
graph TB
    subgraph "Horizontal Scaling"
        LB[Load Balancer]
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end
    
    subgraph "Data Layer Scaling"
        MONGO_PRIMARY[MongoDB Primary]
        MONGO_SECONDARY[MongoDB Secondary]
        REDIS_CLUSTER[Redis Cluster]
    end
    
    subgraph "Code Execution Scaling"
        DOCKER1[Docker Host 1]
        DOCKER2[Docker Host 2]
        K8S[Kubernetes Cluster]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> MONGO_PRIMARY
    API2 --> MONGO_PRIMARY
    API3 --> MONGO_PRIMARY
    
    MONGO_PRIMARY --> MONGO_SECONDARY
    
    API1 --> DOCKER1
    API2 --> DOCKER2
    API3 --> K8S
```

## 🔧 Configuration Management

### Environment Variables
```env
# Server Configuration
NODE_ENV=production
PORT=8000

# Database
MONGODB_URI=mongodb://username:password@host:port/database
MONGODB_OPTIONS=retryWrites=true&w=majority

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
ASSEMBLYAI_API_KEY=...

# Authentication
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=24h

# Code Execution
DOCKER_EXECUTION_TIMEOUT=30000
MAX_CONCURRENT_EXECUTIONS=10
SUPPORTED_LANGUAGES=python,javascript,java,cpp,c,go,rust

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
TEMP_DIR=/app/temp
CLEANUP_INTERVAL=3600000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_FAILED=true

# CORS & Security
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
APM_SERVER_URL=https://apm.yourdomain.com
```

## 🔍 Monitoring & Observability

### Application Monitoring
```javascript
// Health Check Endpoints
GET /api/health                 // Basic health status
GET /api/health/detailed        // Detailed system information
GET /api/health/dependencies    // External service status

// Metrics Endpoints
GET /api/metrics/system         // System resource usage
GET /api/metrics/api           // API performance metrics
GET /api/metrics/execution     // Code execution statistics
```

### Logging Strategy
```javascript
// Log Levels and Structure
{
  timestamp: "2025-09-04T10:00:00.000Z",
  level: "info|warn|error|debug",
  message: "Human readable message",
  service: "backend|frontend|execution",
  traceId: "unique-trace-id",
  userId: "session-or-user-id",
  metadata: {
    // Additional context
  }
}
```

### Alerting Rules
- **High Error Rate**: > 5% error rate for 5 minutes
- **Response Time**: > 2s average response time for 10 minutes
- **Resource Usage**: > 80% CPU/Memory for 15 minutes
- **Failed Code Executions**: > 10% failure rate for 5 minutes
- **Database Connections**: > 90% connection pool usage

## 🧪 Testing Strategy

### Test Pyramid
```
                🔺
               /   \
              /  E2E \
             /_______\
            /         \
           / Integration \
          /_______________\
         /                 \
        /    Unit Tests     \
       /___________________\
```

### Test Implementation
```bash
# Backend Tests
npm run test                    # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e              # End-to-end tests

# Frontend Tests
npm run test                    # Component tests
npm run test:e2e              # Cypress E2E tests

# Load Testing
npm run test:load             # Artillery load tests
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci
      - name: Run tests
        run: |
          npm test
          cd backend && npm test
      - name: Build application
        run: |
          npm run build
          cd backend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deployment script
          ./deploy.sh
```

## 🌟 Features & Capabilities Summary

### Core Features
✅ **AI-Powered Mock Interviews**
- Real-time speech-to-text transcription
- Dynamic question generation based on resume/JD
- Comprehensive scoring across 4 categories
- Detailed feedback and improvement suggestions

✅ **Multi-Language Code Execution**
- Support for 8+ programming languages
- Secure Docker-based sandboxed execution
- Real-time test case validation
- Performance metrics tracking

✅ **Comprehensive MCQ System**
- Multiple question categories and difficulty levels
- Company-specific question filtering
- Timed assessments with detailed analytics
- Multi-select and single-select support

✅ **Session Management**
- Temporary sessions without user accounts
- Automatic cleanup and expiration
- Real-time progress tracking
- Resume upload and parsing

### Technical Capabilities
🔧 **Scalable Architecture**
- Microservices-ready design
- Horizontal scaling support
- Load balancing capabilities
- Database replication support

🔒 **Enterprise Security**
- Container isolation for code execution
- Rate limiting and DDoS protection
- Input validation and sanitization
- Secure file upload handling

📊 **Monitoring & Analytics**
- Comprehensive logging system
- Performance metrics tracking
- Health check endpoints
- Error tracking and alerting

🚀 **Developer Experience**
- TypeScript throughout the stack
- Comprehensive API documentation
- Docker-based development environment
- Automated testing and deployment

This architecture provides a robust, scalable, and secure foundation for a comprehensive coding assessment and interview platform, designed to handle high loads while maintaining excellent performance and user experience.
