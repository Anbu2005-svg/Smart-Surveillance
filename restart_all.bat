@echo off
echo ===================================================
echo RESTARTING CCTV System...
echo ===================================================

echo Stopping any running servers (Python/Node)...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo ===================================================
echo Starting New Servers...
echo ===================================================

echo Starting Backend Server (Port 5000)...
start "CCTV Backend" cmd /k "call new.venv\Scripts\activate && python main.py"

echo Waiting 5 seconds...
timeout /t 5 >nul

echo Starting Frontend Server (Port 3000)...
cd surveillance-frontend
start "CCTV Frontend" cmd /k "npm run dev"

echo ===================================================
echo System restarted!
echo Please go to: http://localhost:3000
echo ===================================================
pause
