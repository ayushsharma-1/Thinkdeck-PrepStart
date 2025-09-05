@echo off
echo Installing dependencies for PrepStart AI Interview Platform...
echo.

echo Installing Backend Node.js dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Error installing Backend Node.js dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing Frontend Node.js dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo Error installing Frontend Node.js dependencies
    pause
    exit /b 1
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
)
cd ..

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Get your AssemblyAI API key from https://www.assemblyai.com/
echo 2. Update fastapi-backend/.env with your API key
echo 3. Make sure MongoDB and RabbitMQ are installed
echo 4. Run start-all.bat to start all services
echo.
pause
