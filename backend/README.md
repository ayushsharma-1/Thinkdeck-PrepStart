# Verbal Vue AI - Comprehensive Assessment Platform

## 🎯 System Overview

A comprehensive coding assessment and AI-powered mock interview web platform featuring:

- **Frontend**: React with TypeScript, TailwindCSS, and ShadCN UI components
- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB for data persistence
- **AI Integration**: OpenAI GPT-4 for question generation and evaluation
- **Speech-to-Text**: AssemblyAI for real-time transcription
- **Code Execution**: Docker-based multi-language code runner
- **Deployment**: Docker Compose with Nginx reverse proxy

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│   Nginx Proxy   │────│  Express API    │
│   (Frontend)    │    │                 │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                    ┌─────────────────┐              │
                    │   MongoDB       │──────────────┤
                    │   (Database)    │              │
                    └─────────────────┘              │
                                                      │
                    ┌─────────────────┐              │
                    │  Docker Engine  │──────────────┤
                    │  (Code Runner)  │              │
                    └─────────────────┘              │
                                                      │
                    ┌─────────────────┐              │
                    │  AI Services    │──────────────┘
                    │ OpenAI/AssemblyAI│
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd verbal-vue-ai
cp .env.example .env
```

### 2. Configure Environment
Update `.env` with your API keys:
```env
MONGODB_URI=mongodb://mongodb:27017/verbal-vue-ai
OPENAI_API_KEY=your_openai_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### 3. Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Access the Application
- Frontend: http://localhost:5173
- API: http://localhost:8000/api
- MongoDB: mongodb://localhost:27017

## 📋 Features

### 🎤 AI Mock Interview
- **Real-time Speech Recognition**: Uses AssemblyAI for high-accuracy transcription
- **Dynamic Question Generation**: AI generates questions based on resume and job description
- **Live Evaluation**: Real-time answer assessment with detailed feedback
- **Comprehensive Scoring**: 4-category scoring system (Communication, Technical, Confidence, Relevance)
- **Session Management**: Temporary sessions with automatic cleanup

### 💻 Coding Challenges
- **Multi-language Support**: Python, JavaScript, Java, C++, C, Go, Rust, TypeScript
- **Secure Execution**: Docker-based sandboxed code execution
- **Test Case Management**: Hidden and visible test cases with detailed results
- **Performance Metrics**: Execution time and memory usage tracking
- **Problem Categorization**: Difficulty levels, categories, and company tags

### 📝 MCQ Assessment
- **Multiple Categories**: Technical, Aptitude, Verbal, Reasoning
- **Company-specific Questions**: Filter by target companies
- **Timed Tests**: Configurable time limits
- **Detailed Analytics**: Category-wise scoring and progress tracking

### 🔧 Code Execution Engine

#### Supported Languages
```typescript
enum ProgrammingLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  GO = 'go',
  RUST = 'rust'
}
```

#### Security Features
- **Isolated Execution**: Each code runs in a separate Docker container
- **Resource Limits**: Memory (256MB) and CPU (50%) constraints
- **Network Isolation**: No external network access during execution
- **Time Limits**: Configurable timeout per language
- **Concurrent Execution Control**: Maximum 10 simultaneous executions

## 🗄️ Database Schema

### Core Collections

#### Companies
```javascript
{
  name: String,
  slug: String,
  logo: String,
  description: String,
  website: String,
  isActive: Boolean,
  questionCount: Number
}
```

#### Interview Sessions
```javascript
{
  sessionId: String,
  resumeText: String,
  jobDescription: String,
  company: ObjectId,
  questions: [{
    question: String,
    answer: String,
    transcription: String,
    aiEvaluation: {
      score: Number,
      feedback: String,
      keywords: [String]
    },
    duration: Number,
    timestamp: Date
  }],
  status: 'active' | 'completed' | 'expired',
  duration: Number,
  finalEvaluation: {
    overallScore: Number,
    categoryScores: {
      communication: Number,
      technical: Number,
      confidence: Number,
      relevance: Number
    },
    strengths: [String],
    improvements: [String],
    detailedFeedback: String
  },
  expiresAt: Date
}
```

#### Coding Problems
```javascript
{
  title: String,
  description: String,
  difficulty: 'easy' | 'medium' | 'hard',
  category: String,
  companies: [ObjectId],
  tags: [String],
  constraints: String,
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  testCases: [{
    input: String,
    expectedOutput: String,
    isHidden: Boolean
  }],
  supportedLanguages: [String],
  timeLimit: Number,
  memoryLimit: Number,
  starterCode: Map,
  solution: Map,
  hints: [String],
  isActive: Boolean
}
```

#### MCQ Questions
```javascript
{
  title: String,
  question: String,
  options: [String],
  correctAnswers: [Number],
  explanation: String,
  category: 'technical' | 'aptitude' | 'verbal' | 'reasoning',
  difficulty: 'easy' | 'medium' | 'hard',
  companies: [ObjectId],
  tags: [String],
  isMultiSelect: Boolean,
  points: Number,
  timeLimit: Number,
  isActive: Boolean
}
```

## 🔌 API Endpoints

### Health & System
```
GET  /api/health              - Health check
GET  /api/health/stats        - System statistics
```

### Companies
```
GET  /api/companies           - List all companies
GET  /api/companies/:slug     - Get company by slug
POST /api/companies           - Create company (admin)
PUT  /api/companies/:id       - Update company (admin)
DEL  /api/companies/:id       - Delete company (admin)
GET  /api/companies/stats     - Company statistics
```

### Mock Interview
```
POST /api/interview/sessions                      - Create session
GET  /api/interview/sessions/:sessionId           - Get session
POST /api/interview/sessions/:sessionId/transcribe - Transcribe audio
POST /api/interview/sessions/:sessionId/evaluate   - Evaluate answer
POST /api/interview/sessions/:sessionId/complete   - Complete interview
POST /api/interview/upload-resume                  - Upload resume
```

### Coding Challenges
```
GET  /api/coding/problems           - List problems
GET  /api/coding/problems/:id       - Get problem
POST /api/coding/execute            - Execute code
POST /api/coding/submit             - Submit solution
GET  /api/coding/categories         - Problem categories
GET  /api/coding/tags               - Problem tags
GET  /api/coding/languages          - Supported languages
GET  /api/coding/stats/execution    - Execution statistics
```

### MCQ Tests
```
GET  /api/mcq/categories            - MCQ categories
POST /api/mcq/sessions              - Create test session
POST /api/mcq/sessions/:id/submit   - Submit answers
```

### File Upload
```
POST /api/upload                    - Upload file
```

## 🚢 Deployment Guide

### AWS EC2 Deployment

#### 1. Launch EC2 Instance
- **Instance Type**: t3.medium or larger
- **Operating System**: Ubuntu 20.04 LTS
- **Storage**: 30GB+ SSD
- **Security Groups**:
  - HTTP (80)
  - HTTPS (443)
  - SSH (22)
  - Custom ports for development (5173, 8000)

#### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd verbal-vue-ai

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Deploy
chmod +x deploy.sh
./deploy.sh
```

#### 4. Configure Domain (Optional)
```bash
# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Docker Compose Services

#### Backend Service
- **Port**: 8000
- **Dependencies**: MongoDB
- **Volumes**: uploads, logs, docker.sock
- **Health Check**: /api/health endpoint

#### Frontend Service
- **Port**: 5173
- **Dependencies**: Backend
- **Build**: Multi-stage with Nginx

#### MongoDB Service
- **Port**: 27017
- **Volume**: Persistent data storage
- **Database**: verbal-vue-ai

#### Nginx Service
- **Ports**: 80, 443
- **SSL**: Configured for HTTPS
- **Proxy**: Routes API and frontend requests

## 🔧 Development

### Local Development Setup
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd ../
npm install
npm run dev
```

### Backend Structure
```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Utility functions
│   └── server.ts       # Main server file
├── dist/               # Compiled JavaScript
├── uploads/            # File uploads
├── logs/               # Application logs
└── temp/               # Temporary files
```

### Environment Variables
```env
# Server
NODE_ENV=development
PORT=8000

# Database
MONGODB_URI=mongodb://localhost:27017/verbal-vue-ai

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# AI Services
OPENAI_API_KEY=sk-...
ASSEMBLYAI_API_KEY=...

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Code Execution
DOCKER_EXECUTION_TIMEOUT=30000
MAX_CONCURRENT_EXECUTIONS=10

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication for admin routes
- Role-based access control
- Session-based temporary access for assessments

### Input Validation
- Joi schema validation for all inputs
- File type and size restrictions
- SQL injection prevention (NoSQL injection for MongoDB)

### Code Execution Security
- Docker container isolation
- No network access during execution
- Resource limits (CPU, memory, time)
- Temporary file cleanup

### API Security
- CORS configuration
- Rate limiting
- Helmet.js security headers
- Request/response logging

## 📊 Monitoring & Logging

### Logging System
- **Winston Logger**: Structured logging with multiple levels
- **Log Rotation**: Automatic log file rotation
- **Error Tracking**: Detailed error logging with stack traces
- **Request Logging**: HTTP request/response logging

### Health Checks
- **Application Health**: /api/health endpoint
- **Database Connection**: MongoDB connection status
- **External Services**: AI service availability
- **Docker Status**: Container execution capability

### Performance Monitoring
- **Execution Statistics**: Code execution metrics
- **API Response Times**: Request duration tracking
- **Resource Usage**: Memory and CPU monitoring
- **Concurrent Executions**: Real-time execution queue status

## 🚨 Troubleshooting

### Common Issues

#### 1. Docker Permission Error
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

#### 2. MongoDB Connection Failed
```bash
# Check MongoDB service
docker-compose logs mongodb
# Verify connection string in .env
```

#### 3. Code Execution Timeout
```bash
# Check Docker daemon status
sudo systemctl status docker
# Increase timeout in environment variables
```

#### 4. AI Service Errors
- Verify OpenAI API key is valid and has credits
- Check AssemblyAI API key permissions
- Review rate limiting settings

### Log Analysis
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View backend application logs
tail -f backend/logs/combined.log
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Add Nginx load balancer
- **Multiple Backend Instances**: Scale backend containers
- **Database Sharding**: MongoDB horizontal partitioning
- **CDN**: Static asset delivery optimization

### Performance Optimization
- **Redis Caching**: Session and data caching
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Database connection optimization
- **Asset Compression**: Gzip compression for responses

### Cost Optimization
- **Container Resource Limits**: Optimize memory/CPU usage
- **Database Optimization**: Query optimization and indexing
- **Auto-scaling**: Dynamic instance scaling based on load
- **Spot Instances**: Use AWS spot instances for cost reduction

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Jest**: Unit and integration testing

### Testing
```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: GPT-4 API for AI-powered features
- **AssemblyAI**: High-accuracy speech-to-text service
- **Docker**: Containerization platform
- **MongoDB**: NoSQL database
- **React & TypeScript**: Frontend framework and language
- **Express.js**: Backend web framework
