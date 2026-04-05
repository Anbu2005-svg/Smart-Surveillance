@echo off
REM ========================================================
REM CCTV Detection System - Complete Startup Script
REM ========================================================
REM This script sets up and runs the entire system:
REM 1. Backend API (FastAPI)
REM 2. Frontend (React)
REM ========================================================

echo.
echo ========================================================
echo CCTV DETECTION SYSTEM - STARTUP
echo ========================================================
echo.

REM Check if virtual environment exists
if exist venv (
    echo [√] Virtual environment found
) else (
    echo [!] Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo [√] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check and install dependencies
echo [√] Checking dependencies...
pip install -r requirements.txt -q

echo.
echo ========================================================
echo System Status
echo ========================================================
echo Python Version:
python --version
echo.
echo Virtual Environment: ACTIVE
echo.

REM Display startup instructions
echo ========================================================
echo STARTUP OPTIONS
echo ========================================================
echo.
echo Option 1: Start Backend Only (Press 1, then Enter)
echo   - Starts FastAPI on http://localhost:5000
echo   - API docs at http://localhost:5000/docs
echo.
echo Option 2: Start Frontend Only (Press 2, then Enter)
echo   - Starts React on http://localhost:3000
echo   - Requires backend running separately
echo.
echo Option 3: Start Both (Press 3, then Enter)
echo   - Starts backend and opens frontend in browser
echo   - Requires 2 terminal windows
echo.
echo Option 4: Run Optimizer First (Press 4, then Enter)
echo   - Checks system specs and model
echo   - Shows optimization recommendations
echo.
echo Option 5: Exit (Press 5, then Enter)
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    cls
    echo.
    echo ========================================================
    echo STARTING BACKEND API (FastAPI)
    echo ========================================================
    echo.
    echo API URL: http://localhost:5000
    echo API Docs: http://localhost:5000/docs
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    python main.py
) else if "%choice%"=="2" (
    cls
    echo.
    echo ========================================================
    echo STARTING FRONTEND (React)
    echo ========================================================
    echo.
    echo Frontend URL: http://localhost:3000
    echo.
    echo NOTE: Make sure backend is running first!
    echo.
    cd surveillance-frontend
    npm install
    npm run dev
) else if "%choice%"=="3" (
    cls
    echo.
    echo ========================================================
    echo STARTING BOTH BACKEND AND FRONTEND
    echo ========================================================
    echo.
    echo Backend will start on port 5000
    echo Frontend will start on port 3000
    echo.
    echo A new terminal window will open for the frontend.
    echo Keep this window open for the backend.
    echo.
    echo Press any key to continue...
    pause
    
    REM Start backend in current window
    echo Starting Backend...
    python main.py &
    
    REM Open new terminal for frontend
    start cmd /k "cd surveillance-frontend && npm install && npm run dev"
    
) else if "%choice%"=="4" (
    cls
    echo.
    echo ========================================================
    echo RUNNING SYSTEM OPTIMIZER
    echo ========================================================
    echo.
    echo This will check:
    echo - System specifications (CPU, RAM)
    echo - All dependencies
    echo - Model file location
    echo - Optimization recommendations
    echo.
    python optimize_cpu.py
    echo.
    echo Press any key to return to menu...
    pause
    goto start
) else if "%choice%"=="5" (
    echo.
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice. Please try again.
    timeout /t 2
    goto start
)

:start
endlocal
