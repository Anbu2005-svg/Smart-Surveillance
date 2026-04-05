@echo off
setlocal

:: Switch to script directory to ensure relative paths work
cd /d "%~dp0"

echo ===================================================
echo RESTARTING CCTV System (Robust V2)
echo ===================================================
echo Current Directory: %CD%

:: Check for Python
if not exist "new.venv\Scripts\python.exe" (
    echo [ERROR] Virtual Environment not found at: new.venv\Scripts\python.exe
    echo Please run setup first!
    pause
    exit /b 1
)

:: Check for Frontend
if not exist "surveillance-frontend\package.json" (
    echo [ERROR] Frontend not found at: surveillance-frontend
    pause
    exit /b 1
)

echo Stopping any running servers...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo ===================================================
echo Starting Servers...
echo ===================================================

:: Start Backend
echo Starting Backend (Port 5000)...
start "CCTV Backend" cmd /k "cd /d "%~dp0" && call new.venv\Scripts\activate && python main.py || echo [ERROR] Backend crashed! && pause"

:: Start Frontend
echo Starting Frontend (Port 3000)...
start "CCTV Frontend" cmd /k "cd /d "%~dp0surveillance-frontend" && npm run dev || echo [ERROR] Frontend crashed! && pause"

echo ===================================================
echo Servers Launched!
echo.
echo Please allow 10-15 seconds for startup.
echo Then go to: http://localhost:3000/index.html
echo.
echo If windows close immediately, there was an error.
echo Check the console output in those windows.
echo ===================================================
pause
