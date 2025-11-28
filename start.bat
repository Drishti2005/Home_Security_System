@echo off
echo ========================================
echo Virtual Home Security System
echo ========================================
echo.
echo Starting all services...
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start backend server in new window
echo Starting backend server...
start "Backend Server" cmd /k "npm run server"
timeout /t 3 /nobreak >nul

REM Start frontend in new window
echo Starting frontend...
start "Frontend Dev Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo To start Telegram bot, run: npm run bot
echo.
echo Press any key to exit this window...
pause >nul
