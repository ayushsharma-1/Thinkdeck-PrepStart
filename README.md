# PrepStart AI Interview Platform

A real-time AI interview platform that enables two-way communication between users and AI interviewer using speech-to-text technology.

## Architecture

- **Frontend**: HTML/CSS/JavaScript with Socket.IO for real-time communication
- **Node.js Backend**: Express.js server with Socket.IO and RabbitMQ integration
- **FastAPI Backend**: Python backend for speech-to-text processing using AssemblyAI
- **Database**: MongoDB for storing interview sessions
- **Message Queue**: RabbitMQ for inter-service communication

## Features

- 10 pre-defined interview questions
- Real-time speech-to-text conversion using AssemblyAI
- Text-to-speech for AI questions
- Both voice and text response options
- Progress tracking
- Session management
- Responsive UI

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB
- RabbitMQ
- AssemblyAI API Key

## Setup Instructions

### 1. Install Dependencies

#### RabbitMQ
**Windows:**
```powershell
# Install using Chocolatey
choco install rabbitmq

# Or download from https://www.rabbitmq.com/install-windows.html
```

**Start RabbitMQ:**
```powershell
rabbitmq-server
```

#### MongoDB
**Windows:**
```powershell
# Install using Chocolatey
choco install mongodb

# Or download from https://www.mongodb.com/try/download/community
```

**Start MongoDB:**
```powershell
mongod
```

### 2. Backend Setup (Node.js)

```powershell
cd backend
npm install
```

Update `.env` file with your configuration:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/prepstart
RABBITMQ_URL=amqp://localhost
FASTAPI_URL=http://localhost:8000
```

### 3. FastAPI Backend Setup

```powershell
cd fastapi-backend
pip install -r requirements.txt
```

Update `.env` file with your AssemblyAI API key:
```
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
RABBITMQ_URL=amqp://localhost
MONGODB_URL=mongodb://localhost:27017/prepstart
```

Get your AssemblyAI API key from: https://www.assemblyai.com/

### 4. Running the Application

**Terminal 1 - Start MongoDB:**
```powershell
mongod
```

**Terminal 2 - Start RabbitMQ:**
```powershell
rabbitmq-server
```

**Terminal 3 - Start FastAPI Backend:**
```powershell
cd fastapi-backend
python main.py
```

**Terminal 4 - Start Node.js Backend:**
```powershell
cd backend
npm start
```

**Terminal 5 - Serve Frontend:**
```powershell
cd frontend
# Using Python's built-in server
python -m http.server 8080
```

### 5. Access the Application

Open your browser and navigate to: `http://localhost:8080`

## API Endpoints

### Node.js Backend (Port 3000)
- `POST /api/start-interview` - Start a new interview session
- `GET /api/session/:sessionId` - Get interview session details
- `POST /api/submit-response` - Submit response and get next question
- `POST /api/speech-to-text` - Upload audio for transcription

### FastAPI Backend (Port 8000)
- `POST /speech-to-text` - Convert audio to text
- `WebSocket /ws/{session_id}` - Real-time speech processing

## Interview Questions

The platform includes 10 pre-defined interview questions:

1. Tell me about yourself and your background.
2. What interests you most about this role?
3. Describe a challenging project you've worked on recently.
4. How do you handle tight deadlines and pressure?
5. What are your greatest strengths and weaknesses?
6. Where do you see yourself in the next 5 years?
7. Tell me about a time you had to work with a difficult team member.
8. How do you stay updated with the latest technology trends?
9. Describe a situation where you had to learn something new quickly.
10. Why should we hire you for this position?

## Usage

1. Open the application in your browser
2. Click "Start Interview" to begin
3. Listen to the AI ask questions (text-to-speech)
4. Respond using:
   - **Voice**: Click the microphone button to record your response
   - **Text**: Type your response in the text area
5. Click "Next Question" to proceed
6. Complete all 10 questions to finish the interview

## Troubleshooting

### Common Issues

1. **Microphone not working**:
   - Ensure browser has microphone permissions
   - Check if microphone is working in other applications

2. **Speech-to-text not working**:
   - Verify AssemblyAI API key is correct
   - Check internet connection
   - Ensure FastAPI backend is running

3. **Connection issues**:
   - Verify all services are running (MongoDB, RabbitMQ, both backends)
   - Check firewall settings
   - Ensure ports are not blocked

4. **RabbitMQ connection failed**:
   - Make sure RabbitMQ service is running
   - Check RabbitMQ management console at http://localhost:15672

## Development

### Adding New Questions

Edit the `INTERVIEW_QUESTIONS` array in `backend/server.js`:

```javascript
const INTERVIEW_QUESTIONS = [
    "Your new question here...",
    // ... existing questions
];
```

### Customizing UI

Modify `frontend/index.html` and `frontend/script.js` for UI changes.

### Extending Speech Recognition

The FastAPI backend can be extended to support other speech recognition services by modifying `fastapi-backend/main.py`.

## License

MIT License
