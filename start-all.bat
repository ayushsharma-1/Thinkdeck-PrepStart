@echo off
echo ========================================
echo PrepStart AI Interview Platform Launcher
echo ========================================
echo.

echo Checking system status...
echo - MongoDB Atlas: Using cloud database ✓
echo - CloudAMQP: Using cloud message queue ✓
echo - Redis Cloud: Using cloud session storage ✓
echo - AI Services: Groq + Google Gemini ✓
echo.

echo Starting services in sequence...
echo.

echo [1/3] Starting FastAPI Backend (Python) on port 8000...
start "FastAPI Backend - PrepStart" cmd /k "cd /d %~dp0fastapi-backend && echo ============================================ && echo FastAPI Backend - AI Interview Platform && echo ============================================ && echo. && echo Features: && echo - Speech-to-Text: AssemblyAI && echo - AI Models: Groq (primary) + Google Gemini (fallback) && echo - Anti-repetition: ENABLED && echo - Question diversity: ENHANCED && echo. && echo Starting server... && python main.py"
echo   ✓ FastAPI backend starting... (AI processing, speech services)
timeout /t 5 /nobreak >nul

echo [2/3] Starting Node.js Backend on port 3000...
start "Node.js Backend - PrepStart" cmd /k "cd /d %~dp0backend && echo ============================================ && echo Node.js Backend - API Server && echo ============================================ && echo. && echo Services: && echo - REST API endpoints && echo - Socket.IO real-time communication && echo - MongoDB integration && echo - RabbitMQ messaging && echo. && echo Starting server... && npm start"
echo   ✓ Node.js backend starting... (API endpoints, real-time features)
timeout /t 3 /nobreak >nul

echo [3/3] Starting Next.js Frontend on port 3001...
start "Next.js Frontend - PrepStart" cmd /k "cd /d %~dp0frontend && echo ============================================ && echo Next.js Frontend - Modern Interview Interface && echo ============================================ && echo. && echo Features: && echo - Google Meet-inspired UI && echo - WebRTC permissions handling && echo - Redis session management && echo - Real-time chat system && echo - Interview rules and violations && echo - Session results and transcripts && echo. && echo Starting development server... && npm run dev"
echo   ✓ Next.js frontend starting... (Modern UI, Redis integration)
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Service Status Check
echo ========================================
echo.
echo Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo Testing service availability...

echo Checking FastAPI Backend (Port 8000)...
curl -s http://localhost:8000/ >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ FastAPI Backend: ONLINE
) else (
    echo ⚠ FastAPI Backend: Starting... (may take a few more seconds)
)

echo Checking Node.js Backend (Port 3000)...
curl -s http://localhost:3000/ >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Node.js Backend: ONLINE
) else (
    echo ⚠ Node.js Backend: Starting... (may take a few more seconds)
)

echo Checking Next.js Frontend (Port 3001)...
curl -s http://localhost:3001/ >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Next.js Frontend: ONLINE
) else (
    echo ⚠ Next.js Frontend: Starting... (may take a few more seconds)
)

echo.
echo ========================================
echo PrepStart AI Interview Platform Ready!
echo ========================================
echo.
echo 🚀 Service URLs:
echo   • Main Application: http://localhost:3001
echo   • API Documentation: http://localhost:8000/docs
echo   • Backend Health: http://localhost:3000/api/health
echo.
echo 🎯 Current Features:
echo   • Google Meet-inspired modern interface
echo   • WebRTC camera/microphone/screen permissions
echo   • Redis-powered session management (30min TTL)
echo   • Real-time chat with auto-scroll
echo   • Interview rules and violation detection
echo   • Session results with transcript download
echo   • AI-powered question generation (Groq + Gemini)
echo   • Speech-to-text with AssemblyAI
echo   • Anti-repetition and enhanced diversity
echo.
echo 💡 Usage Instructions:
echo   1. Wait for all services to fully start (~30 seconds)
echo   2. Open http://localhost:3001 in your browser
echo   3. Fill in candidate details and upload resume
echo   4. Grant camera/microphone permissions
echo   5. Accept interview rules and start session
echo.
echo 🔧 Management:
echo   • Press Ctrl+C in any terminal to stop that service
echo   • Close all terminal windows to stop all services
echo   • Check terminal windows for logs and errors
echo.
echo Opening main application in browser...
timeout /t 5 /nobreak >nul
start http://localhost:3001

echo.
echo All services are running! Monitor the terminal windows for any issues.
echo The modern interview interface should now be available.
echo.
pause >nul
