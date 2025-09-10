# PrepStart AI - Advanced Interview Platform

## 🚀 Overview

PrepStart AI is a comprehensive interview preparation platform with advanced AI-powered features, real-time monitoring, and production-ready workflows. This system combines a Node.js backend, FastAPI AI services, and a modern Next.js frontend to deliver a complete interview simulation experience.

## 🏗️ Architecture

### Backend Services
- **Node.js Server (Port 5000)**: Main application server with Express.js, Socket.IO, MongoDB, Redis, RabbitMQ
- **FastAPI Server (Port 8000)**: AI services for question generation, speech processing, and resume analysis

### Frontend Application  
- **Next.js App (Port 3000)**: Modern React application with JavaScript, Tailwind CSS, and ShadCN components

## 🎯 Advanced Features

### 1. Real-Time Media Management
- **Always-On Microphone**: Continuous audio stream with WebRTC getUserMedia
- **Audio Level Monitoring**: Real-time analysis using AudioContext and AnalyserNode
- **Silence Detection**: Automatic recording stop after 5 seconds of silence
- **Video Controls**: Camera, microphone, screen sharing with violation detection

### 2. AI-Powered Interview Flow
- **Dynamic Question Generation**: Context-aware questions using Groq and Google Gemini
- **Speech Synthesis**: Text-to-speech for AI questions with onend callbacks
- **Speech Recognition**: Automatic transcription via FastAPI AssemblyAI integration
- **Dual Input Support**: Voice recording (auto) and manual text input

### 3. Advanced Violation Detection
- **Tab Switching**: Document visibility API monitoring with localStorage tracking  
- **Permission Monitoring**: Media track enabled state checking every 2 seconds
- **Warning System**: 1 warning then session termination
- **Violation Storage**: Persistent tracking in localStorage for results

### 4. Session Management & Timing
- **30-Minute Sessions**: Automatic countdown with 5-minute buffer for Redis expiry
- **Final Question**: "Do you have any feedback for me?" when time expires
- **Session Persistence**: Redis primary storage with MongoDB fallback
- **Real-Time Updates**: Socket.IO for live chat synchronization

### 5. Error Handling & Resilience
- **Connection Retry**: 3x retry with exponential backoff (1s, 2s, 4s delays)
- **API Timeouts**: 15s question generation, 30s audio processing limits
- **Fallback Systems**: Default questions when AI fails, graceful degradation
- **Toast Notifications**: User-friendly error feedback with Sonner

### 6. Results & Analytics
- **AI-Generated Scoring**: 1-10 scale assessment on technical skills, communication, cultural fit
- **Detailed Feedback**: Comprehensive analysis using Groq/Gemini LLMs
- **Performance Metrics**: Response time, question completion, violation tracking
- **Export Options**: JSON download and social sharing capabilities

## 🛠️ Component Architecture

### Page Components
- **PreStartPage**: WebRTC permissions with getUserMedia error handling
- **RulesPage**: Interview guidelines with tab switching detection demo
- **SetupPage**: User details form with resume upload and validation
- **InterviewPage**: Google Meet-inspired layout (75% video, 25% chat)
- **ResultsPage**: Comprehensive results display with scoring breakdown

### Advanced InterviewPage Features
- **Media Stream Management**: Persistent video/audio streams with cleanup
- **Recording Control**: MediaRecorder with 2-minute safety timeout
- **Audio Processing**: Real-time level monitoring with visual indicators
- **Chat Integration**: Bidirectional messaging with AI response simulation
- **Connection Status**: Real-time WebSocket status with retry logic

## 🔧 Technical Implementation

### Media Handling
```javascript
// Always-on microphone with audio level monitoring
const initializeAudioContext = async () => {
  audioContextRef.current = new AudioContext();
  const source = audioContextRef.current.createMediaStreamSource(stream);
  analyserRef.current = audioContextRef.current.createAnalyser();
  source.connect(analyserRef.current);
  monitorAudioLevels(); // Real-time RMS calculation
};

// Silence detection with configurable threshold
const SILENCE_THRESHOLD = 5000; // 5 seconds
const AUDIO_THRESHOLD = 0.01; // RMS threshold
```

### Violation Detection
```javascript
// Tab visibility monitoring
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isInterviewActive) {
    handleViolation('tabSwitch');
  }
});

// Media track state monitoring
const monitorMediaTracks = () => {
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack && !audioTrack.enabled && isAudioOn) {
    handleViolation('permissionDenied');
  }
};
```

### API Integration
```javascript
// Retry mechanism with exponential backoff
const fetchWithRetry = async (url, options, config) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, { ...options, signal: abortSignal });
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
};
```

### Real-Time Communication
```javascript
// Socket.IO integration for live updates
socketRef.current = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  timeout: 20000
});

socketRef.current.on('newQuestion', (data) => {
  handleNewQuestion(data.question, data.questionNumber);
});
```

## 📦 Deployment

### Development Setup
```bash
# Backend Services
cd backend-server && npm install && npm run dev
cd backend-fastapi && pip install -r requirements.txt && python main.py

# Frontend Application
cd frontend-client && npm install && npm run dev
```

### Production Deployment
```bash
# Use Docker Compose for full stack
docker-compose up -d

# Or use provided batch scripts (Windows)
setup.bat      # Initial environment setup
start-all.bat  # Start all services
stop-all.bat   # Stop all services
```

### Environment Configuration
```env
# Node.js Backend (.env)
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...
JWT_SECRET=...

# FastAPI Backend (.env)
GROQ_API_KEY=...
GOOGLE_API_KEY=...
ASSEMBLYAI_API_KEY=...
```

## 🎮 User Flow

1. **Permissions Setup**: Camera/microphone access with error handling
2. **Rules Agreement**: Interview guidelines with violation demo
3. **Profile Setup**: User details, job info, resume upload with validation
4. **Live Interview**: 
   - AI speaks question via speechSynthesis
   - Auto-recording starts after AI finishes
   - Speech-to-text processing via FastAPI
   - Response submission to Node.js
   - Next question generation via RabbitMQ
5. **Results Analysis**: AI-generated scoring and feedback

## 🔒 Security & Monitoring

- **Permission Violations**: Real-time media track monitoring
- **Session Integrity**: Tab switching detection with warnings
- **Data Protection**: Secure API endpoints with authentication
- **Stream Cleanup**: Proper disposal of media resources

## 🧪 Testing Features

- **Mock Data**: Fallback questions and responses for development
- **Error Simulation**: Configurable failure scenarios
- **Performance Metrics**: Response time and completion tracking
- **Violation Testing**: Tab switching demo on Rules page

## 📱 Responsive Design

- **Desktop Optimized**: Google Meet-inspired layout for interviews
- **Mobile Friendly**: Responsive components with touch controls
- **Accessibility**: ARIA labels and keyboard navigation
- **Cross-Browser**: WebRTC compatibility across modern browsers

## 🔮 Future Enhancements

- **Multi-Language Support**: Internationalization for global users
- **Advanced Analytics**: Machine learning insights on performance
- **Integration APIs**: Third-party HR system connections
- **Mobile App**: React Native version for mobile devices

---

## 📞 Support

For technical support or feature requests, please refer to the comprehensive error handling and logging systems built into each component. All major operations include detailed error messages and recovery suggestions.

**PrepStart AI** - Revolutionizing interview preparation with AI-powered insights and real-time monitoring.
