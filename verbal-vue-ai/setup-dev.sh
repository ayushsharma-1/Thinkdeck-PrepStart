#!/bin/bash

# Development Setup Script for Verbal Vue AI Platform
set -e

echo "🚀 Setting up Verbal Vue AI Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/en/download/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Installing Docker..."
    
    # Install Docker based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        echo "✅ Docker installed. Please logout and login again to use Docker."
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Please install Docker Desktop for Mac from: https://docs.docker.com/docker-for-mac/install/"
        exit 1
    else
        echo "Please install Docker for your operating system: https://docs.docker.com/get-docker/"
        exit 1
    fi
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo "✅ Prerequisites check completed!"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Setup environment file
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please update .env file with your API keys:"
    echo "   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys"
    echo "   - ASSEMBLYAI_API_KEY: Get from https://www.assemblyai.com/"
    echo "   - MONGODB_URI: Use provided MongoDB connection or set up your own"
    echo ""
    echo "Press Enter after updating the .env file to continue..."
    read
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p backend/temp

# Start MongoDB with Docker (for development)
echo "🗄️  Starting MongoDB container for development..."
docker run -d \
    --name mongodb-dev \
    -p 27017:27017 \
    -v mongodb_data:/data/db \
    mongo:7 \
    || echo "MongoDB container already running or failed to start"

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 10

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
cd ..

# Check if everything is working
echo "🧪 Running health checks..."

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 15

# Check backend health
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running and healthy!"
else
    echo "❌ Backend health check failed"
fi

# Stop background backend
kill $BACKEND_PID 2>/dev/null || true

echo ""
echo "🎉 Development environment setup completed!"
echo ""
echo "📚 Next steps:"
echo "   1. Update .env file with your API keys"
echo "   2. Start development servers:"
echo "      Frontend: npm run dev"
echo "      Backend:  cd backend && npm run dev"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000/api"
echo "   MongoDB: mongodb://localhost:27017/verbal-vue-ai"
echo ""
echo "📖 Documentation: See README.md for detailed information"
echo ""
echo "🚀 Happy coding!"
