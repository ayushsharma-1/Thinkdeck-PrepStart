@echo off
echo ========================================
echo PrepStart - Development Mode (No Docker)
echo ========================================
echo Using Cloud Services:
echo - MongoDB Atlas
echo - Redis Cloud  
echo - RabbitMQ Cloud
echo ========================================

echo.
echo Starting development servers...

echo.
echo [1/4] Starting Logging Backend (Port 5002)...
start "Logging Backend" cmd /k "cd logging-backend && npm run dev"

echo Waiting for Logging Backend to start...
timeout /t 3 /nobreak >nul

echo.
echo [2/4] Starting FastAPI backend (Port 8000)...
start "FastAPI Backend" cmd /k "cd backend-fastapi && python main.py"

echo Waiting for FastAPI to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Starting Node.js backend (Port 5000)...
start "Node.js Backend" cmd /k "cd backend-server && npm run dev"

echo Waiting for Node.js to start...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Starting Next.js frontend (Port 3000)...
start "Next.js Frontend" cmd /k "cd frontend-client && npm run dev"

echo.
echo ========================================
echo Development servers starting...
echo ========================================
echo.
echo Services will be available on:
echo - Logging Backend:   http://localhost:5002
echo - Node.js Backend:   http://localhost:5000
echo - FastAPI Backend:   http://localhost:8000
echo - Next.js Frontend:  http://localhost:3000
echo - Log Dashboard:     http://localhost:5002/dashboard
echo - WebSocket Logs:    ws://localhost:5003
echo.
echo Each service is running in its own terminal window.
echo Close the terminal windows to stop the services.
echo.
echo Press any key to open the application...
pause

start http://localhost:3000

echo.
echo ========================================
echo Development mode active!
echo ========================================
