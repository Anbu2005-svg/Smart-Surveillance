@echo off
REM Frontend startup script
REM This will start the Vite dev server on port 3001

cd /d D:\With_Front_End_CCTV-001\CCTV\surveillance-frontend

echo.
echo ========================================
echo Starting CCTV Frontend...
echo ========================================
echo.
echo Frontend will be available at:
echo http://localhost:3000

echo.

npm run dev

pause