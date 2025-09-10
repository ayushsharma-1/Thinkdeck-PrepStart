@echo off
echo ======================================echo.
echo [3/3] Starting Next.js frontend...
cd frontend-client
if exist "package.json" (
    start "PrepStart Frontend" cmd /k "npm run dev"
    if errorlevel 1 (
        echo WARNING: Failed to start frontend client
    )
) else (
    echo INFO: Frontend not found, skipping...
)epStart Backend - Starting All Services
echo ========================================
echo Using Cloud Services:
echo - MongoDB Atlas
echo - Redis Cloud  
echo - RabbitMQ Cloud
echo ========================================

echo.
echo Checking environment files...
if not exist "backend-server\.env" (
    echo ERROR: backend-server\.env file not found
    echo Please create the .env file with your cloud service credentials
    pause
    exit /b 1
)

if not exist "backend-fastapi\.env" (
    echo ERROR: backend-fastapi\.env file not found
    echo Please create the .env file with your API keys
    pause
    exit /b 1
)

echo.
echo [1/3] Starting FastAPI backend...
cd backend-fastapi
start "PrepStart FastAPI" cmd /k "venv\Scripts\activate && python main.py"
if errorlevel 1 (
    echo ERROR: Failed to start FastAPI backend
    cd..
    pause
    exit /b 1
)

cd..
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Starting Node.js backend...
cd backend-server
start "PrepStart Node.js" cmd /k "npm run dev"
if errorlevel 1 (
    echo ERROR: Failed to start Node.js backend
    cd..
    pause
    exit /b 1
)

cd..
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Starting frontend client...
cd frontend-client
if exist package.json (
    start "PrepStart Frontend" cmd /k "npm start"
    if errorlevel 1 (
        echo WARNING: Failed to start frontend client
    )
) else (
    echo INFO: Frontend not found, skipping...
)

cd..

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Services running on:
echo - Node.js Backend:  http://localhost:5000
echo - FastAPI Backend:  http://localhost:8000  
echo - Frontend Client:  http://localhost:3000
echo.
echo Cloud Services (External):
echo - MongoDB Atlas:    [Your Atlas Connection String]
echo - Redis Cloud:      [Your Redis Cloud URL]  
echo - RabbitMQ Cloud:   [Your CloudAMQP URL]
echo.
echo Press any key to open application...
pause

echo Opening application...
start http://localhost:3000

echo.
echo ========================================
echo Services are now running!
echo ========================================
echo.
echo To stop services:
echo - Press Ctrl+C in each terminal window
echo - Or run: stop-all.bat
echo.
pause
