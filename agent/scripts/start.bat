@echo off
REM Eco Agent startup script (for Windows)

echo 🌱 Starting Eco Agent...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not installed
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Load environment
if not exist ".env" (
    echo ⚙️  Creating .env from template...
    copy .env.example .env
)

REM Create logs directory
if not exist "logs" mkdir logs

REM Start agent
echo ▶️  Starting agent process...
node index.js

pause
