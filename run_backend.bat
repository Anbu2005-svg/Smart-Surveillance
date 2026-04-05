@echo off
REM CCTV Detection Backend Startup Script

echo.
echo ========================================
echo CCTV Detection Backend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Start the backend
echo.
echo Starting FastAPI server...
echo API will be available at: http://localhost:5000
echo Interactive docs: http://localhost:5000/docs
echo.

python main.py

pause
