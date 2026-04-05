# CCTV Detection Backend API

A high-performance FastAPI-based backend for real-time CCTV object detection and surveillance monitoring.

## Features

- ✅ **FastAPI Framework** - Modern, fast, and easy to use
- ✅ **YOLO Integration** - YOLOv8 object detection
- ✅ **GPU Support** - CUDA acceleration for faster inference
- ✅ **Multi-Stream Support** - Handle multiple video streams simultaneously
- ✅ **Real-time Detection** - Process frames in real-time
- ✅ **CORS Enabled** - Connect from any frontend application
- ✅ **Automatic API Docs** - Interactive Swagger UI and ReDoc
- ✅ **Production Ready** - With uvicorn server

## Requirements

- Python 3.9+
- CUDA 11.8+ (optional, for GPU acceleration)
- 8GB RAM minimum
- 4GB GPU VRAM (if using GPU)

## Installation

### 1. Create Virtual Environment (Windows)

```bash
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Download YOLOv8 Model (Optional)

The backend will automatically download YOLOv8n if needed, or use the local `best (1).onnx` model.

## Running the Backend

### Development Mode

```bash
python main.py
```

Or with custom settings:

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4
```

The API will be available at: **http://localhost:5000**

## API Endpoints

### Health & Info

- `GET /` - Root endpoint
- `GET /api/health` - Check backend health status
- `GET /api/info` - Get API information and model status

### Video Streams

- `GET /api/streams` - List all available video streams
- `POST /api/detection/start/{stream_id}` - Start detection on a stream
- `POST /api/detection/stop/{stream_id}` - Stop detection on a stream

### Detections

- `GET /api/detections/{stream_id}` - Get latest detections for a stream
- `POST /api/process-frame/{stream_id}` - Process a single frame (testing)
- `GET /frames/{frame_id}.jpg` - Retrieve processed frame image

### Statistics

- `GET /api/statistics` - Get overall detection statistics

## Interactive API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## Configuration

Edit `.env` file to customize:

```env
API_HOST=0.0.0.0
API_PORT=5000
MODEL_PATH=best (1).onnx
DEVICE=auto  # 'cuda', 'cpu', or 'auto'
CONFIDENCE_THRESHOLD=0.5
MAX_CACHED_FRAMES=10
```

Or use `config.py` for advanced settings.

## Project Structure

```
CCTV/
├── main.py              # FastAPI application
├── config.py            # Configuration settings
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
├── best (1).onnx        # YOLO model (optional)
├── openvino/            # OpenVINO optimized models
├── temp_frames/         # Temporary frame storage
└── surveillance-frontend/  # React frontend
```

## API Response Examples

### Health Check
```json
{
  "status": "connected",
  "gpu_available": true,
  "message": "CCTV Detection API is running"
}
```

### Video Streams
```json
[
  {
    "id": "stream_1",
    "name": "Front Door Camera",
    "status": "active",
    "current_detections": 3
  }
]
```

### Detection Result
```json
{
  "frame_id": "abc123",
  "timestamp": "2026-02-08T10:30:00",
  "detections": [
    {
      "id": "det001",
      "class_name": "person",
      "confidence": 0.95,
      "bbox": {
        "x1": 10.5,
        "y1": 20.3,
        "x2": 45.2,
        "y2": 80.1
      },
      "timestamp": "2026-02-08T10:30:00"
    }
  ],
  "image_url": "/frames/abc123.jpg"
}
```

## Performance Tips

1. **GPU Acceleration**: Set `DEVICE=cuda` in `.env` for 5-10x faster inference
2. **Batch Processing**: Increase `BATCH_SIZE` for multiple frames
3. **Workers**: Run with `--workers 4` for production
4. **Frame Caching**: Adjust `MAX_CACHED_FRAMES` based on memory

## Troubleshooting

### Model Not Loading
```bash
# Ensure model file exists or let it auto-download
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### GPU Not Available
```bash
python -c "import torch; print(torch.cuda.is_available())"
```

### Port Already in Use
```bash
# Use a different port
uvicorn main:app --port 8000
```

## Technologies Used

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **Ultralytics YOLOv8** - Object detection
- **PyTorch** - Deep learning
- **OpenCV** - Image processing
- **Pydantic** - Data validation

## License

AGPL-3.0 License (via Ultralytics YOLO)

## Support

For issues and features, refer to:
- FastAPI: https://fastapi.tiangolo.com
- Ultralytics: https://docs.ultralytics.com
- PyTorch: https://pytorch.org/docs
