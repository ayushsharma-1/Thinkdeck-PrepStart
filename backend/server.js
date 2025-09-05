const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Interview Session Schema
const interviewSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    currentQuestionIndex: { type: Number, default: 0 },
    responses: [{
        questionIndex: Number,
        question: String,
        userResponse: String,
        timestamp: { type: Date, default: Date.now }
    }],
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

// Interview questions
const INTERVIEW_QUESTIONS = [
    "Tell me about yourself and your background.",
    "What interests you most about this role?",
    "Describe a challenging project you've worked on recently.",
    "How do you handle tight deadlines and pressure?",
    "What are your greatest strengths and weaknesses?",
    "Where do you see yourself in the next 5 years?",
    "Tell me about a time you had to work with a difficult team member.",
    "How do you stay updated with the latest technology trends?",
    "Describe a situation where you had to learn something new quickly.",
    "Why should we hire you for this position?"
];

// RabbitMQ connection
let rabbitConnection = null;
let rabbitChannel = null;

async function connectRabbitMQ() {
    try {
        rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL);
        rabbitChannel = await rabbitConnection.createChannel();
        
        // Declare queues
        await rabbitChannel.assertQueue('speech_to_text_requests', { durable: true });
        await rabbitChannel.assertQueue('interview_responses', { durable: true });
        
        // Consumer for responses from FastAPI
        rabbitChannel.consume('interview_responses', (message) => {
            if (message) {
                const response = JSON.parse(message.content.toString());
                console.log('Received from FastAPI:', response);
                
                // Emit to specific client
                io.to(response.session_id).emit('transcription_result', response);
                
                rabbitChannel.ack(message);
            }
        });
        
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('RabbitMQ connection failed:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'PrepStart AI Interview Backend' });
});

// Start new interview session
app.post('/api/start-interview', async (req, res) => {
    try {
        const sessionId = uuidv4();
        const session = new InterviewSession({ sessionId });
        await session.save();
        
        res.json({
            sessionId,
            firstQuestion: INTERVIEW_QUESTIONS[0],
            totalQuestions: INTERVIEW_QUESTIONS.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get interview session
app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const session = await InterviewSession.findOne({ sessionId: req.params.sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const currentQuestion = INTERVIEW_QUESTIONS[session.currentQuestionIndex];
        res.json({
            session,
            currentQuestion,
            totalQuestions: INTERVIEW_QUESTIONS.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit response and get next question
app.post('/api/submit-response', async (req, res) => {
    try {
        const { sessionId, response } = req.body;
        const session = await InterviewSession.findOne({ sessionId });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Save current response
        session.responses.push({
            questionIndex: session.currentQuestionIndex,
            question: INTERVIEW_QUESTIONS[session.currentQuestionIndex],
            userResponse: response
        });
        
        // Move to next question
        session.currentQuestionIndex++;
        
        let nextQuestion = null;
        let isComplete = false;
        
        if (session.currentQuestionIndex < INTERVIEW_QUESTIONS.length) {
            nextQuestion = INTERVIEW_QUESTIONS[session.currentQuestionIndex];
        } else {
            session.status = 'completed';
            isComplete = true;
        }
        
        await session.save();
        
        res.json({
            nextQuestion,
            isComplete,
            currentIndex: session.currentQuestionIndex,
            totalQuestions: INTERVIEW_QUESTIONS.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload audio for speech-to-text
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        
        const formData = new FormData();
        formData.append('audio', new Blob([req.file.buffer]), 'audio.wav');
        
        const response = await axios.post(`${process.env.FASTAPI_URL}/speech-to-text`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Speech-to-text error:', error);
        res.status(500).json({ error: 'Failed to process audio' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`Client ${socket.id} joined session ${sessionId}`);
    });
    
    socket.on('audio_data', async (data) => {
        try {
            // Send audio data to FastAPI via RabbitMQ
            if (rabbitChannel) {
                const message = {
                    type: 'speech_to_text',
                    session_id: data.sessionId,
                    audio_data: data.audioData,
                    timestamp: new Date().toISOString()
                };
                
                rabbitChannel.sendToQueue('speech_to_text_requests', 
                    Buffer.from(JSON.stringify(message)), 
                    { persistent: true }
                );
            }
        } catch (error) {
            console.error('Error processing audio data:', error);
            socket.emit('error', { message: 'Failed to process audio' });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectRabbitMQ();
});
