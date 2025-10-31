@echo off
echo ========================================
echo Starting Voice Agent Backend Server
echo ========================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Checking Python version...
python --version

echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo WebSocket endpoint: ws://localhost:8000/ws
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python main.py

