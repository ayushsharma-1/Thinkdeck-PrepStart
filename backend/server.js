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

// Interview Session Schema - Simplified (only store basic user data)
const interviewSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    candidate: {
        name: String,
        email: String,
        phone: String,
        experience: String
    },
    jobDetails: {
        role_name: String,
        job_description: String
    },
    resumeText: String, // Resume converted to text for AI processing
    currentQuestionIndex: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    totalDuration: Number, // in minutes
    createdAt: { type: Date, default: Date.now }
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

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

// Setup interview with candidate details and resume
app.post('/api/setup-interview', async (req, res) => {
    try {
        const { name, email, phone, experience, role_name, job_description, resumeText } = req.body;
        
        const sessionId = uuidv4();
        const session = new InterviewSession({ 
            sessionId,
            candidate: { name, email, phone, experience },
            jobDetails: { role_name, job_description },
            resumeText,
            startTime: new Date()
        });
        
        await session.save();
        
        // Generate first question using AI
        const firstQuestionResponse = await axios.post(`${process.env.FASTAPI_URL}/generate-question`, {
            session_id: sessionId,
            previous_responses: [],
            resume_text: resumeText,
            job_description: job_description,
            role_name: role_name,
            question_number: 1
        });
        
        res.json({
            sessionId,
            firstQuestion: firstQuestionResponse.data.question,
            candidateName: name,
            roleName: role_name
        });
    } catch (error) {
        console.error('Setup interview error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload and process resume
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file provided' });
        }
        
        const formData = new FormData();
        formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
        
        const response = await axios.post(`${process.env.FASTAPI_URL}/upload-resume`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        res.json({
            resumeText: response.data.text,
            filename: response.data.filename,
            status: 'success'
        });
    } catch (error) {
        console.error('Resume upload error:', error);
        res.status(500).json({ error: 'Failed to process resume' });
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

// Submit response and get next AI-generated question (don't store responses)
app.post('/api/submit-response', async (req, res) => {
    try {
        const { sessionId, response, currentQuestion, responses = [] } = req.body;
        const session = await InterviewSession.findOne({ sessionId });
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Check if 30 minutes have passed
        const currentTime = new Date();
        const interviewDuration = (currentTime - session.startTime) / (1000 * 60); // minutes
        
        if (interviewDuration >= 30) {
            // End interview with feedback question
            session.status = 'completed';
            session.endTime = currentTime;
            session.totalDuration = interviewDuration;
            await session.save();
            
            return res.json({
                nextQuestion: "Thank you for your time! Do you have any questions or feedback about this interview process?",
                isComplete: true,
                isFeedback: true,
                duration: Math.round(interviewDuration),
                totalResponses: session.currentQuestionIndex + 1
            });
        }
        
        // Increment question index (we don't store the actual responses)
        session.currentQuestionIndex++;
        
        // Prepare responses array for AI context (sent in real-time, not stored)
        const previousResponses = responses || [];
        
        try {
            // Generate next question using AI with resume + JD + live responses
            const nextQuestionResponse = await axios.post(`${process.env.FASTAPI_URL}/generate-question`, {
                session_id: sessionId,
                previous_responses: previousResponses, // Live responses from frontend
                resume_text: session.resumeText, // Resume text extracted and converted
                job_description: session.jobDetails.job_description,
                role_name: session.jobDetails.role_name,
                question_number: session.currentQuestionIndex + 1
            });
            
            await session.save();
            
            res.json({
                nextQuestion: nextQuestionResponse.data.question,
                isComplete: false,
                currentIndex: session.currentQuestionIndex,
                duration: Math.round(interviewDuration),
                remainingTime: Math.max(0, 30 - interviewDuration)
            });
            
        } catch (aiError) {
            console.error('AI question generation failed:', aiError);
            
            // Enhanced contextual fallback system
            const fallbackQuestions = [
                `Based on your background, can you tell me more about your experience with ${session.jobDetails.role_name}?`,
                "What's the most challenging problem you've solved in your career?",
                "How do you approach learning new technologies or skills?",
                "Tell me about a time you worked effectively in a team.",
                "What motivates you in your professional work?",
                "How do you handle feedback and criticism?",
                "Describe a project you're particularly proud of.",
                "What are your career goals for the next few years?",
                "How do you stay organized and manage your time?",
                "What questions do you have about this role or our company?"
            ];
            
            const fallbackIndex = Math.min(session.currentQuestionIndex, fallbackQuestions.length - 1);
            await session.save();
            
            res.json({
                nextQuestion: fallbackQuestions[fallbackIndex],
                isComplete: false,
                currentIndex: session.currentQuestionIndex,
                duration: Math.round(interviewDuration),
                remainingTime: Math.max(0, 30 - interviewDuration)
            });
        }
        
    } catch (error) {
        console.error('Submit response error:', error);
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
