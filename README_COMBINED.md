# PrepStart AI Interview Platform

A modern AI-powered interview platform with Google Meet-inspired interface, real-time speech processing, Redis session management, and intelligent question generation using multiple AI providers.

## ✨ Key Features

- 🎯 **Modern Google Meet-Inspired UI** - Clean, professional interface with video tiles and chat sidebar
- 🎙️ **WebRTC Integration** - Camera, microphone, and screen share permissions with visual feedback
- ⚡ **Redis Session Management** - 30-minute ephemeral storage with automatic cleanup
- 🤖 **Multi-AI Provider Support** - Groq (primary) + Google Gemini (fallback) for robust question generation
- 🗣️ **Advanced Speech Processing** - AssemblyAI for high-quality speech-to-text conversion
- 📄 **Resume Intelligence** - PDF, DOCX, TXT processing with contextual question generation
- 💬 **Real-time Chat** - Live chat during interviews with auto-scroll and message persistence
- 🛡️ **Violation Detection** - Tab-switch monitoring and interview rule enforcement
- 📊 **Session Analytics** - Comprehensive results with transcript download and statistics
- ⏱️ **Timed Sessions** - 30-minute interview timer with progress tracking

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)

### One-Command Setup

1. **Run Complete Setup** (installs dependencies + validates configuration):
   ```bash
   setup.bat
   ```

2. **Start All Services**:
   ```bash
   start-all.bat
   ```

3. **Access Modern Interface**: http://localhost:3001

That's it! The platform will automatically:
- ✅ Install all dependencies (Node.js, Python, Redis packages)
- ✅ Validate environment configurations
- ✅ Test service connectivity
- ✅ Launch all services with health monitoring
- ✅ Open the application in your browser

## 🏗️ Modern Architecture

### Service Overview
- **Next.js Frontend** (Port 3001) - Modern React interface with Tailwind CSS, Redis integration
- **Node.js Backend** (Port 3000) - Express API with Socket.IO for real-time features  
- **FastAPI Backend** (Port 8000) - Python service for AI processing and speech-to-text
- **Redis Cloud** - Session storage with 30-minute TTL and real-time chat
- **MongoDB Atlas** - Cloud database for persistent interview data
- **CloudAMQP** - Message queue for inter-service communication

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Redis (ioredis)
- **Backend**: Node.js, Express.js, Socket.IO, MongoDB
- **AI Services**: FastAPI, AssemblyAI, Groq, Google Gemini
- **Infrastructure**: Redis Cloud, MongoDB Atlas, CloudAMQP
- **Media**: WebRTC API for camera/microphone/screen permissions

## 🎨 User Experience Flow

### 1. Welcome & Setup
- **Personal Information**: Name, email, phone, experience
- **Job Details**: Role, job description for contextual questions
- **Resume Upload**: PDF/DOCX/TXT processing with AI analysis
- **Modern UI**: Gradient backgrounds, smooth animations, professional design

### 2. Permissions & Rules
- **WebRTC Permissions**: Camera, microphone, screen share testing
- **Visual Feedback**: Permission status indicators with error handling
- **Interview Rules**: Comprehensive rule system with violation consequences
- **Acknowledgment**: User consent with checkbox validation

### 3. Google Meet-Style Interview
- **75/25 Layout**: Main video area (75%) + chat sidebar (25%)
- **Dual Video Tiles**: Interviewer and candidate video containers
- **Control Bar**: Mute, camera, screen share, chat, end call controls
- **Real-time Chat**: Live messaging with timestamps and auto-scroll
- **Timer Display**: 30-minute countdown with progress visualization

### 4. Session Results
- **Comprehensive Summary**: Session statistics, duration, questions answered
- **Transcript Download**: Full conversation export in multiple formats
- **Performance Insights**: Response quality and engagement metrics
- **Restart Option**: Clean session reset for new interviews

## 📁 Project Structure

```
PrepStart/
├── frontend/                    # Next.js Modern Interface (Port 3001)
│   ├── app/
│   │   ├── page.tsx            # Main application with flow management
│   │   ├── layout.tsx          # App layout with global providers
│   │   ├── globals.css         # Tailwind + custom styles
│   │   └── api/                # API routes for Redis integration
│   │       ├── chat/route.ts   # Chat message management
│   │       └── session/route.ts # Session CRUD operations
│   ├── components/
│   │   ├── PermissionSetup.tsx # WebRTC permission handling
│   │   ├── InterviewRules.tsx  # Rule acknowledgment system
│   │   ├── InterviewInterface.tsx # Google Meet-style main interface
│   │   ├── SessionResults.tsx  # Results and transcript download
│   │   └── ui/                 # Reusable UI components (buttons, toasts)
│   ├── lib/
│   │   ├── redis.ts           # Redis session management utilities
│   │   ├── api-config.ts      # API configuration and endpoints
│   │   └── utils.ts           # Shared utility functions
│   └── .env.local             # Frontend + Redis environment variables
├── backend/                    # Node.js API Server (Port 3000)
│   ├── server.js              # Express server with Socket.IO integration
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Backend environment variables
├── fastapi-backend/           # Python AI Service (Port 8000)
│   ├── main.py               # FastAPI server with multi-AI integration
│   ├── requirements.txt      # Python dependencies (AI providers)
│   └── .env                  # AI API keys and configuration
├── setup.bat                 # Complete setup with dependency installation
├── start-all.bat            # Service launcher with health monitoring
└── docker-compose.yml       # Docker deployment configuration
```

## 🔧 Environment Configuration

### Backend (.env)
```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prepstart
RABBITMQ_URL=amqps://username:password@host.cloudamqp.com/vhost
FASTAPI_URL=http://localhost:8000
```

### FastAPI (.env)
```env
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_ai_api_key
RABBITMQ_URL=amqps://username:password@host.cloudamqp.com/vhost
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000

# Redis Cloud Configuration
REDIS_URL=redis://default:password@host.redis-cloud.com:port
REDIS_PASSWORD=your_redis_password
```

## 🔌 API Endpoints

### Next.js API Routes (Built-in)
- `POST /api/session` - Create/manage interview sessions in Redis
- `GET /api/session?sessionId=` - Retrieve session data
- `DELETE /api/session?sessionId=` - Clean up session
- `POST /api/chat` - Send chat messages
- `GET /api/chat?sessionId=` - Retrieve chat history

### Node.js Backend (Port 3000)
- `GET /` - Health check and service status
- `GET /api/health` - Detailed health information
- `POST /api/upload-resume` - Resume file processing and text extraction
- `POST /api/setup-interview` - Initialize interview session with AI
- `POST /api/speech-to-text` - Audio transcription via AssemblyAI
- `POST /api/submit-response` - Submit response and get next AI question

### FastAPI Backend (Port 8000)
- `GET /docs` - Interactive Swagger API documentation
- `POST /process-speech` - Advanced speech processing pipeline
- `POST /generate-questions` - Multi-AI question generation
- `POST /extract-resume` - Document text extraction and analysis

## 🧪 Testing & Validation

The `setup.bat` script automatically runs comprehensive tests:

### Configuration Validation
- ✅ Environment file existence and required variables
- ✅ API key validation for all services
- ✅ Database connection strings
- ✅ Redis Cloud connectivity

### Dependency Verification
- ✅ Node.js and Python installation
- ✅ Package installation status (node_modules, pip packages)
- ✅ Redis client library integration
- ✅ WebRTC API availability

### Service Health Checks
The `start-all.bat` script includes automatic endpoint testing:
- ✅ FastAPI backend health (Port 8000)
- ✅ Node.js backend connectivity (Port 3000)
- ✅ Next.js frontend availability (Port 3001)
- ✅ Redis connection and session management

## 🐳 Docker Deployment

For production deployment, use the included Docker configuration:

```bash
# Copy environment template
cp .env.example .env

# Add your API keys to .env file
# ASSEMBLYAI_API_KEY=your_key_here
# GROQ_API_KEY=your_key_here
# GOOGLE_API_KEY=your_key_here

# Start all services
docker-compose up --build

# Access application
open http://localhost:3001
```

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

**1. Redis Connection Failed**
```bash
# Check Redis Cloud credentials in .env.local
# Verify network connectivity
# Test connection: redis-cli -h host -p port -a password ping
```

**2. WebRTC Permissions Denied**
```bash
# Ensure HTTPS in production (WebRTC requires secure context)
# Check browser microphone/camera permissions
# Verify browser compatibility (Chrome, Firefox, Safari)
```

**3. AI Question Generation Failed**
```bash
# Primary: Check Groq API key and quota
# Fallback: Verify Google Gemini API key
# Network: Test API connectivity
# Logs: Check FastAPI backend terminal for detailed errors
```

**4. Session Not Persisting**
```bash
# Redis TTL: Sessions expire after 30 minutes (by design)
# Connection: Verify Redis Cloud connection
# Storage: Check Redis memory limits
```

**5. Chat Messages Not Appearing**
```bash
# Redis: Verify session exists and chat operations
# Frontend: Check browser console for WebSocket errors
# Backend: Ensure Socket.IO connections are established
```

### Debug Mode

Start services individually for detailed logging:

```bash
# Terminal 1: FastAPI with verbose logging
cd fastapi-backend && python main.py

# Terminal 2: Node.js with debug mode
cd backend && DEBUG=* npm start

# Terminal 3: Next.js with verbose output
cd frontend && npm run dev

# Terminal 4: Redis monitoring
redis-cli monitor
```

## 📊 Performance & Monitoring

### Service Health URLs
- **Frontend Health**: http://localhost:3001
- **Backend Health**: http://localhost:3000/api/health
- **FastAPI Docs**: http://localhost:8000/docs
- **Redis Monitoring**: Via Redis Cloud dashboard

### Performance Metrics
- **Session Storage**: 30-minute TTL, automatic cleanup
- **File Processing**: Resume parsing < 5 seconds
- **Speech Recognition**: Real-time with < 2 second latency
- **AI Response**: Multi-provider fallback for reliability
- **Chat System**: Real-time with message persistence

## 🔒 Security Features

### Data Protection
- **Ephemeral Sessions**: 30-minute Redis TTL, automatic cleanup
- **Environment Isolation**: Separate .env files for each service
- **API Security**: Rate limiting and input validation
- **File Upload**: Secure resume processing with type validation

### Privacy Measures
- **Session Isolation**: Each interview gets unique session ID
- **Automatic Cleanup**: Redis sessions auto-expire
- **No Persistent Audio**: Speech processed in real-time, not stored
- **Secure Connections**: HTTPS recommended for production

## 🎯 Advanced Features

### AI Interview Intelligence
- **Context-Aware Questions**: Based on resume and job description
- **Anti-Repetition**: Prevents duplicate questions within session
- **Difficulty Adaptation**: Questions adapt based on responses
- **Multi-Modal Input**: Voice + text response options

### Modern UX Patterns
- **Google Meet Design**: Familiar, professional interface
- **Responsive Layout**: Works on desktop, tablet, mobile
- **Real-time Feedback**: Live chat, typing indicators, status updates
- **Progressive Enhancement**: Graceful degradation for older browsers

### Session Management
- **Automatic Recovery**: Resume interrupted sessions
- **Violation Tracking**: Monitor tab switches, focus changes
- **Time Management**: Visual countdown, progress indicators
- **Results Export**: Comprehensive transcript download

## 📈 Scaling & Production

### Production Checklist
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up Redis Cluster for high availability
- [ ] Implement API rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up monitoring and logging
- [ ] Implement backup strategies

### Environment-Specific Configuration
```env
# Production
NODE_ENV=production
REDIS_URL=redis://prod-cluster:6379
MONGODB_URI=mongodb://prod-cluster:27017

# Staging  
NODE_ENV=staging
REDIS_URL=redis://staging-cluster:6379

# Development
NODE_ENV=development
REDIS_URL=redis://localhost:6379
```

## 📝 License

This project is for educational and demonstration purposes. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📞 Support

For issues or questions:

1. **Quick Validation**: Run `setup.bat` to check configuration
2. **Service Health**: Check `start-all.bat` output for service status
3. **Debug Logs**: Monitor individual service terminals
4. **Configuration**: Verify all .env files have required variables
5. **Dependencies**: Ensure Node.js, Python, and network connectivity

---

**Built with ❤️ using Next.js, FastAPI, Redis, and modern web technologies**
