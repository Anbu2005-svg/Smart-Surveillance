# Backend Configuration
import os
from pathlib import Path

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 5000))
API_RELOAD = os.getenv("API_RELOAD", "True").lower() == "true"
API_LOG_LEVEL = os.getenv("API_LOG_LEVEL", "info")

# Model Settings
MODEL_PATH = os.getenv("MODEL_PATH", "best.onnx")
DEVICE = os.getenv("DEVICE", "auto")  # 'cuda', 'cpu', or 'auto'
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.5))

# Frame Settings
FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", 640))
FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", 480))
MAX_CACHED_FRAMES = int(os.getenv("MAX_CACHED_FRAMES", 10))

# Storage Settings
TEMP_FRAMES_DIR = Path(os.getenv("TEMP_FRAMES_DIR", "temp_frames"))
TEMP_FRAMES_DIR.mkdir(exist_ok=True)

# CORS Settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Video Stream Settings
STREAM_SOURCES = {
    "stream_1": "0",  # Webcam 0
    "stream_2": "1",  # Webcam 1
    "stream_3": "2",  # Webcam 2
}

# Performance Settings
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 4))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 1))
