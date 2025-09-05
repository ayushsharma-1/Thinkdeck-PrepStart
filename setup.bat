@echo off
echo ========================================
echo PrepStart AI Interview Platform Setup
echo ========================================
echo.

echo Checking system requirements...
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
) else (
    echo ✓ Python is installed
)

echo.
echo Installing dependencies...
echo.

echo Installing Backend Node.js dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error installing Backend Node.js dependencies
    pause
    exit /b 1
) else (
    echo ✓ Backend Node.js dependencies installed
)
cd ..

echo.
echo Installing Next.js Frontend dependencies (including Redis)...
cd frontend
call npm install
if errorlevel 1 (
    echo Error installing Frontend Next.js dependencies
    pause
    exit /b 1
) else (
    echo ✓ Frontend Next.js dependencies installed
)
cd ..

echo.
echo Installing Python dependencies...
cd fastapi-backend
pip install -r requirements.txt
if errorlevel 1 (
    echo Error installing Python dependencies
    pause
    exit /b 1
) else (
    echo ✓ Python dependencies installed
)
cd ..

echo.
echo ========================================
echo Testing Configuration
echo ========================================

echo Checking Backend Environment (.env)...
if exist "backend\.env" (
    echo ✓ backend\.env found
    findstr /C:"PORT" backend\.env >nul && echo ✓ PORT configured || echo ✗ PORT missing
    findstr /C:"MONGODB_URI" backend\.env >nul && echo ✓ MONGODB_URI configured || echo ✗ MONGODB_URI missing  
    findstr /C:"RABBITMQ_URL" backend\.env >nul && echo ✓ RABBITMQ_URL configured || echo ✗ RABBITMQ_URL missing
    findstr /C:"FASTAPI_URL" backend\.env >nul && echo ✓ FASTAPI_URL configured || echo ✗ FASTAPI_URL missing
) else (
    echo ✗ backend\.env not found - Please create it!
)

echo.
echo Checking FastAPI Environment (.env)...
if exist "fastapi-backend\.env" (
    echo ✓ fastapi-backend\.env found
    findstr /C:"ASSEMBLYAI_API_KEY" fastapi-backend\.env >nul && echo ✓ ASSEMBLYAI_API_KEY configured || echo ✗ ASSEMBLYAI_API_KEY missing
    findstr /C:"RABBITMQ_URL" fastapi-backend\.env >nul && echo ✓ RABBITMQ_URL configured || echo ✗ RABBITMQ_URL missing
    findstr /C:"GROQ_API_KEY" fastapi-backend\.env >nul && echo ✓ GROQ_API_KEY configured || echo ✗ GROQ_API_KEY missing
    findstr /C:"GOOGLE_API_KEY" fastapi-backend\.env >nul && echo ✓ GOOGLE_API_KEY configured || echo ✗ GOOGLE_API_KEY missing
) else (
    echo ✗ fastapi-backend\.env not found - Please create it!
)

echo.
echo Checking Frontend Environment (.env.local)...
if exist "frontend\.env.local" (
    echo ✓ frontend\.env.local found
    findstr /C:"NEXT_PUBLIC_API_BASE_URL" frontend\.env.local >nul && echo ✓ API_BASE_URL configured || echo ✗ API_BASE_URL missing
    findstr /C:"NEXT_PUBLIC_FASTAPI_URL" frontend\.env.local >nul && echo ✓ FASTAPI_URL configured || echo ✗ FASTAPI_URL missing
    findstr /C:"REDIS_URL" frontend\.env.local >nul && echo ✓ REDIS_URL configured || echo ✗ REDIS_URL missing
) else (
    echo ✗ frontend\.env.local not found - Please create it!
)

echo.
echo Checking Dependencies Installation...
cd backend 2>nul && (
    if exist "node_modules" (echo ✓ Backend node_modules found) else (echo ✗ Backend dependencies missing)
    cd ..
) || echo ✗ Backend directory missing

cd frontend 2>nul && (
    if exist "node_modules" (echo ✓ Frontend node_modules found) else (echo ✗ Frontend dependencies missing)
    cd ..
) || echo ✗ Frontend directory missing

cd fastapi-backend 2>nul && (
    python -c "import assemblyai, pika, fastapi, groq, google.generativeai" 2>nul && echo ✓ Python dependencies OK || echo ✗ Python dependencies missing
    cd ..
) || echo ✗ FastAPI directory missing

echo.
echo ========================================
echo Setup Summary
echo ========================================
echo.
echo Architecture:
echo - Backend: Node.js with Express and Socket.IO (Port 3000)
echo - Frontend: Next.js with Redis integration (Port 3001 dev / 3000 prod)
echo - FastAPI: Python backend with AI services (Port 8000)
echo - Database: MongoDB Atlas (Cloud)
echo - Message Queue: CloudAMQP (Cloud)
echo - Session Storage: Redis Cloud
echo.
echo Service URLs:
echo - Main Application: http://localhost:3001
echo - API Documentation: http://localhost:8000/docs
echo - Backend Health: http://localhost:3000
echo.
echo AI Configuration:
echo - Primary AI: Groq (llama-3.1-8b-instant)
echo - Fallback AI: Google Gemini (gemini-1.5-flash)
echo - Features: Anti-repetition, Enhanced diversity, Google Meet UI
echo.
echo Next Steps:
echo 1. Ensure all environment files are properly configured
echo 2. Run start-all.bat to launch all services (Local Development)
echo 3. OR use Docker: Copy .env.docker to .env and run 'docker-compose up'
echo 4. Access the modern interview interface at http://localhost:3001 (Local) or http://localhost:3000 (Docker)
echo.
pause
