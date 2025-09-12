@echo off
echo ========================================
echo PrepStart Backend - Stopping All Services
echo ========================================

echo.
echo [1/3] Stopping Node.js and FastAPI processes...
taskkill /f /im "node.exe" >nul 2>&1
taskkill /f /im "python.exe" >nul 2>&1
echo Backend processes stopped

echo.
echo [2/3] Stopping Docker services...
docker-compose down
if errorlevel 1 (
    echo WARNING: Failed to stop some Docker services
) else (
    echo Docker services stopped successfully
)

echo.
echo [3/3] Cleaning up temporary files...
if exist "backend-server\logs\*.log" del "backend-server\logs\*.log" /q
if exist "backend-fastapi\logs\*.log" del "backend-fastapi\logs\*.log" /q
if exist "logging-backend\logs\*.log" del "logging-backend\logs\*.log" /q
echo Cleanup completed

echo.
echo ========================================
echo All services stopped successfully!
echo ========================================
echo.
pause
