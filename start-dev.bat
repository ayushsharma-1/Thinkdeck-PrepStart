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
echo [1/3] Starting FastAPI backend (Port 8000)...
start "FastAPI Backend" cmd /k "cd backend-fastapi && python main.py"

echo Waiting for FastAPI to start...
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Starting Node.js backend (Port 5000)...
start "Node.js Backend" cmd /k "cd backend-server && npm run dev"

echo Waiting for Node.js to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Starting Next.js frontend (Port 3000)...
start "Next.js Frontend" cmd /k "cd frontend-client && npm run dev"

echo.
echo ========================================
echo Development servers starting...
echo ========================================
echo.
echo Services will be available on:
echo - Node.js Backend:  http://localhost:5000
echo - FastAPI Backend:  http://localhost:8000
echo - Next.js Frontend: http://localhost:3000
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
