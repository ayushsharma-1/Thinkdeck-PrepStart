@echo off
echo Starting PrepStart AI Interview Platform...
echo.
echo Using cloud MongoDB and RabbitMQ services...
echo.

echo Starting FastAPI Backend...
start "FastAPI" cmd /k "cd fastapi-backend && python main.py"
timeout /t 5 /nobreak >nul

echo Starting Node.js Backend...
start "NodeJS" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm start"
timeout /t 2 /nobreak >nul

echo.
echo All services started!
echo.
echo Access the application at: http://localhost:8081
echo.
echo Press any key to continue...
pause >nul
