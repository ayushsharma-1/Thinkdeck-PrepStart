# Quick Start Guide - PrepStart AI Interview Platform

## Option 1: Manual Setup (Recommended for Development)

### Prerequisites
1. Install Node.js (https://nodejs.org/)
2. Install Python 3.8+ (https://python.org/)
3. Install MongoDB (https://www.mongodb.com/try/download/community)
4. Install RabbitMQ (https://www.rabbitmq.com/download.html)
5. Get AssemblyAI API Key (https://www.assemblyai.com/)

### Quick Setup
1. Run `setup.bat` to install all dependencies
2. Update `fastapi-backend/.env` with your AssemblyAI API key
3. Run `start-all.bat` to start all services
4. Open http://localhost:8080 in your browser

## Option 2: Docker Setup (Recommended for Production)

### Prerequisites
1. Install Docker Desktop
2. Get AssemblyAI API Key

### Quick Setup
1. Copy `.env.example` to `.env` and add your AssemblyAI API key
2. Run: `docker-compose up --build`
3. Open http://localhost:8080 in your browser

## Troubleshooting

### Services Not Starting
- Make sure all required ports are free (3000, 8000, 8080, 27017, 5672)
- Check if MongoDB and RabbitMQ services are running

### Speech Recognition Not Working
- Verify AssemblyAI API key is correct
- Check browser microphone permissions
- Ensure FastAPI backend is running on port 8000

### Connection Issues
- All services must be running before accessing the frontend
- Wait for all services to fully start (about 30 seconds)

## Service URLs
- Frontend: http://localhost:8080
- Node.js Backend: http://localhost:3000
- FastAPI Backend: http://localhost:8000
- RabbitMQ Management: http://localhost:15672 (admin/admin)
- MongoDB: mongodb://localhost:27017
