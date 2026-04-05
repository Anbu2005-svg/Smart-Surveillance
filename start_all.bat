@echo off
echo ===================================================
echo Starting CCTV System...
echo ===================================================

echo Starting Backend Server...
start "CCTV Backend" cmd /k "call new.venv\Scripts\activate && python main.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 >nul

echo Starting Frontend Server...
cd surveillance-frontend
start "CCTV Frontend" cmd /k "npm run dev"

echo ===================================================
echo System started!
echo Please wait a moment for the frontend to load.
echo if it doesn't open automatically, go to:
echo http://localhost:3000
echo ===================================================
pause
