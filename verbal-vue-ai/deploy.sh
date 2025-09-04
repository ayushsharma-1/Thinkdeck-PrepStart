#!/bin/bash

# Deployment script for AWS EC2
set -e

echo "🚀 Starting deployment to AWS EC2..."

# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Node.js and npm
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Clone repository (if not already exists)
if [ ! -d "verbal-vue-ai" ]; then
    echo "Cloning repository..."
    git clone https://github.com/ayushsharma-1/verbal-vue-ai.git
fi

cd verbal-vue-ai

# Pull latest changes
git pull origin main

# Copy environment file
if [ ! -f ".env" ]; then
    echo "Copying environment template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual credentials"
    exit 1
fi

# Build and run with Docker Compose
echo "Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running successfully!"
    echo ""
    echo "🌐 Frontend: http://$(curl -s http://checkip.amazonaws.com):5173"
    echo "🔗 Backend API: http://$(curl -s http://checkip.amazonaws.com):8000/api/health"
    echo "📊 MongoDB: mongodb://$(curl -s http://checkip.amazonaws.com):27017"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🔄 To restart: docker-compose restart"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
