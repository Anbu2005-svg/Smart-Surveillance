# CCTV Detection System

A complete real-time CCTV object detection and surveillance system built with **FastAPI** (backend) and **React** (frontend).

## 🎯 Overview

This project provides a modern, scalable surveillance system with:
- Real-time YOLOv8 object detection
- Multi-stream video processing
- Interactive web dashboard
- GPU acceleration support
- Production-ready API
- Docker containerization

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CCTV Detection System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────────┐    │
│  │   React Frontend │◄─────────│   FastAPI Backend    │    │
│  │   (Port 3000)    │ HTTP/API │   (Port 5000)        │    │
│  └──────────────────┘          └──────────────────────┘    │
│                                           │                  │
│                                   ┌───────▼────────┐        │
│                                   │  YOLOv8 Model  │        │
│                                   │  + OpenCV      │        │
│                                   │  + PyTorch     │        │
│                                   └────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Run Locally (Windows)

#### Backend Setup
```bash
# Navigate to CCTV directory
cd c:\Users\Administrator\Downloads\CCTV

# Run the startup script
run_backend.bat
```

This will:
1. Create a Python virtual environment
2. Install all dependencies
3. Start the FastAPI server on http://localhost:5000

#### Frontend Setup
```bash
# In a new terminal
cd c:\Users\Administrator\Downloads\CCTV\surveillance-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

### Option 2: Run with Docker

```bash
# Build and start both services
docker-compose up --build

# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

## 📁 Project Structure

```
CCTV/
├── Backend Files
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration settings
│   ├── stream_processor.py      # Video stream handling
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables
│   ├── run_backend.bat          # Windows startup script
│   ├── Dockerfile               # Docker container config
│   ├── README_BACKEND.md        # Backend documentation
│   │
│   ├── CCTV/                    # YOLO models folder
│   │   ├── best (1).onnx        # ONNX model
│   │   └── newvenv/             # Python virtual environment
│   │
│   └── openvino/                # OpenVINO optimized models
│       ├── best.bin
│       ├── best.xml
│       └── metadata.yaml
│
├── Frontend Files
│   ├── surveillance-frontend/
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   ├── pages/           # Page components
│   │   │   ├── services/        # API client
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── types/           # TypeScript types
│   │   │   ├── utils/           # Utilities
│   │   │   ├── styles/          # CSS styles
│   │   │   ├── App.tsx          # Root component
│   │   │   └── main.tsx         # Entry point
│   │   ├── public/              # Static assets
│   │   ├── index.html           # HTML template
│   │   ├── package.json         # Node dependencies
│   │   ├── vite.config.ts       # Vite configuration
│   │   ├── tsconfig.json        # TypeScript config
│   │   └── tailwind.config.js   # Tailwind CSS config
│   │
│   └── README.md                # Frontend documentation
│
├── Docker & Deployment
│   ├── docker-compose.yml       # Docker orchestration
│   ├── Dockerfile               # Backend Docker image
│   └── .gitignore               # Git ignore rules
│
└── Documentation
    └── This README.md
```

## 🔌 API Endpoints

### Base URL: `http://localhost:5000/api`

#### Health & Status
- `GET /health` - Check backend health
- `GET /info` - Get API information
- `GET /` - Root endpoint

#### Video Streams
- `GET /streams` - List all streams
- `POST /detection/start/{stream_id}` - Start detection
- `POST /detection/stop/{stream_id}` - Stop detection

#### Detections
- `GET /detections/{stream_id}` - Get detections for stream
- `POST /process-frame/{stream_id}` - Process test frame
- `GET /frames/{frame_id}.jpg` - Retrieve frame image

#### Statistics
- `GET /statistics` - Get detection stats

**Interactive Docs**: http://localhost:5000/docs (Swagger UI)

## 🛠️ Configuration

### Backend Configuration (.env)
```env
# API Settings
API_HOST=0.0.0.0
API_PORT=5000
API_RELOAD=true
API_LOG_LEVEL=info

# Model Settings
MODEL_PATH=best (1).onnx
DEVICE=auto        # 'cuda', 'cpu', or 'auto'
CONFIDENCE_THRESHOLD=0.5

# Performance
MAX_WORKERS=4
BATCH_SIZE=1
```

### Frontend Configuration (vite.config.ts)
```typescript
VITE_API_URL=http://localhost:5000/api
```

## 📊 Dashboard Features

### 🎬 Video Streams Panel
- View all available streams
- See detection counts per stream
- Start/Stop detection buttons
- Real-time status indicators

### 📺 Video Feed Display
- Live video streaming
- Real-time bounding boxes
- Confidence scores
- Color-coded object classes

### 🔍 Detection Panel
- List of detected objects
- Bounding box coordinates
- Confidence percentages
- Scrollable detection history

### 📈 Status Bar
- Backend connection status
- GPU availability indicator
- System health monitoring

## 🎓 Technologies Used

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Ultralytics YOLOv8** - Object detection model
- **PyTorch** - Deep learning framework
- **OpenCV** - Computer vision library
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS
- **Axios** - HTTP client
- **Lucide React** - Icon library

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 🚨 System Requirements

### Minimum
- Python 3.9+
- Node.js 16+
- 8GB RAM
- 4GB GPU VRAM (optional)

### Recommended
- Python 3.10+
- Node.js 18+
- 16GB RAM
- 8GB GPU VRAM
- NVIDIA CUDA 11.8+

## 📈 Performance Tips

1. **GPU Acceleration**
   - Set `DEVICE=cuda` in `.env`
   - Provides 5-10x faster inference

2. **Multi-worker Processing**
   - Increase `MAX_WORKERS` for more streams
   - Use `--workers 4` in production

3. **Frame Caching**
   - Adjust `MAX_CACHED_FRAMES` based on memory
   - Keep last 10-30 frames for best balance

4. **Model Optimization**
   - Use OpenVINO models for CPU
   - Use ONNX format for faster inference

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check port availability
netstat -ano | findstr :5000
```

### GPU not detected
```bash
# Check CUDA installation
python -c "import torch; print(torch.cuda.is_available())"

# Install CUDA-enabled PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Frontend connection issues
```bash
# Check API proxy in vite.config.ts
# Ensure API_URL points to correct backend URL
# Check CORS settings in main.py
```

### Model loading errors
```bash
# Auto-download YOLOv8
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Verify ONNX model
python -c "from ultralytics import YOLO; YOLO('best (1).onnx')"
```

## 📚 Documentation

- **Backend**: See [README_BACKEND.md](./README_BACKEND.md)
- **Frontend**: See [surveillance-frontend/README.md](./surveillance-frontend/README.md)
- **API Docs**: http://localhost:5000/docs

## 🔐 Security Notes

- CORS is currently open (`*`). Restrict in production:
  ```python
  CORS_ORIGINS = ["http://localhost:3000", "https://yourdomain.com"]
  ```
- Use environment variables for sensitive config
- Implement authentication for production

## 📝 License

This project uses:
- **YOLO**: AGPL-3.0 License (via Ultralytics)
- **FastAPI**: MIT License
- **React**: MIT License

## 🤝 Support & Contribution

For issues or improvements:
1. Check existing documentation
2. Review troubleshooting section
3. Check component/module-specific README files

## 📞 Contact & Resources

- **FastAPI**: https://fastapi.tiangolo.com
- **Ultralytics YOLO**: https://docs.ultralytics.com
- **React**: https://react.dev
- **PyTorch**: https://pytorch.org

## 🎉 Getting Started Checklist

- [ ] Clone/download the repository
- [ ] Install Python 3.9+ and Node.js 16+
- [ ] Run `run_backend.bat` to start backend
- [ ] Navigate to frontend and run `npm install && npm run dev`
- [ ] Open http://localhost:3000 in browser
- [ ] Check http://localhost:5000/docs for API documentation
- [ ] Start detection and test the system!

---

**Version**: 1.0.0  
**Last Updated**: February 8, 2026
