@echo off
echo ========================================
echo PrepStart Backend - Dependencies Setup
echo ========================================

echo.
echo [1/4] Installing Node.js dependencies...
cd backend-server
if exist package.json (
    echo Installing backend-server dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo Node.js dependencies installed successfully!
) else (
    echo ERROR: package.json not found in backend-server directory
    pause
    exit /b 1
)

cd..
echo.
echo [2/4] Setting up Python virtual environment...
cd backend-fastapi
if exist requirements.txt (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create Python virtual environment
        pause
        exit /b 1
    )
    
    echo Activating virtual environment...
    call venv\Scripts\activate
    
    echo Installing Python dependencies...
    pip install --upgrade pip
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo Python dependencies installed successfully!
    
    call venv\Scripts\deactivate
) else (
    echo ERROR: requirements.txt not found in backend-fastapi directory
    pause
    exit /b 1
)

cd..
echo.
echo [3/4] Creating log directories...
if not exist "backend-server\logs" mkdir "backend-server\logs"
if not exist "backend-fastapi\logs" mkdir "backend-fastapi\logs"
echo Log directories created!

echo.
echo [4/4] Setting up Docker environment...
if exist docker-compose.yml (
    echo Pulling Docker images...
    docker-compose pull
    if errorlevel 1 (
        echo WARNING: Failed to pull Docker images. Make sure Docker is installed and running.
    ) else (
        echo Docker images pulled successfully!
    )
) else (
    echo ERROR: docker-compose.yml not found
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Configure your .env files in both backend directories
echo 2. Update API keys and database connection strings
echo 3. Run "start-all.bat" to start all services
echo.
pause
