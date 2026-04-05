@echo off
REM Backend startup script
REM This will start the FastAPI server on port 5000

cd /d D:\With_Front_End_CCTV-001\CCTV

echo.
echo ========================================
echo Starting CCTV Backend...
echo ========================================
echo.
echo Backend will be available at:
echo http://localhost:5000
echo API Docs: http://localhost:5000/docs
echo.
echo Loading YOLOv11n model (please wait)...
echo.

call new.venv\Scripts\activate.bat
python main.py

pause