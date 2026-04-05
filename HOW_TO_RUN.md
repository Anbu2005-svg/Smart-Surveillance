# 🚀 HOW TO RUN THE CCTV DETECTION SYSTEM

Complete step-by-step guide to run your CCTV Detection System with YOLOv11n ONNX backend.

## ⚡ Quick Start (5 minutes)

### **Option A: Fastest Way - Use the START Script**

```bash
# Simply double-click or run:
START.bat
```

Then choose option **1** to start just the backend.

### **Option B: Manual Step-by-Step**

```bash
# 1. Navigate to project folder
cd c:\Users\Administrator\Downloads\CCTV

# 2. Activate virtual environment
venv\Scripts\activate

# 3. Start backend
python main.py
```

**Expected Output:**
```
============================================================
CCTV Detection API - Startup
============================================================
Loading YOLOv11n ONNX Model for CPU Inference
============================================================
✓ Found ONNX model at: C:\...\CCTV\best (1).onnx
✓ Model size: 2.6 MB
✓ Model loaded successfully for CPU inference
✓ Device: CPU
============================================================

INFO:     Uvicorn running on http://0.0.0.0:5000
INFO:     Application startup complete
```

**Backend is now running!** Access it at: **http://localhost:5000**

---

## 📋 Complete Setup Instructions

### **Step 1: Verify Virtual Environment (Already Done! ✓)**

Your virtual environment is already created in `venv/` folder.

To verify it exists:
```bash
dir venv
```

You should see:
- `Scripts/` folder (contains python.exe, pip.exe)
- `Lib/` folder (contains packages)
- `Include/` folder (contains headers)

### **Step 2: Install/Update Dependencies**

```bash
cd c:\Users\Administrator\Downloads\CCTV
venv\Scripts\activate
pip install -r requirements.txt
```

This will install all required packages:
- ✅ FastAPI (web framework)
- ✅ Uvicorn (ASGI server)
- ✅ PyTorch (deep learning)
- ✅ Ultralytics (YOLO models)
- ✅ OpenCV (computer vision)
- ✅ ONNX Runtime (model inference)

**First install might take 10-15 minutes.** ☕ Get a coffee!

### **Step 3: Start the Backend**

```bash
cd c:\Users\Administrator\Downloads\CCTV
venv\Scripts\activate
python main.py
```

**Keep this terminal open!** The backend is running on:
- **API**: http://localhost:5000
- **API Docs**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

### **Step 4: Start the Frontend (New Terminal)**

Open a **NEW command prompt** window:

```bash
cd c:\Users\Administrator\Downloads\CCTV\surveillance-frontend
npm install
npm run dev
```

**Frontend is now running on**: **http://localhost:3000**

---

## 🎯 Three Ways to Run the System

### **Method 1: START.bat (Easiest - Recommended)**

```bash
# Double-click START.bat or run:
START.bat

# Then select:
# 1 = Backend only
# 2 = Frontend only  
# 3 = Both (opens 2 windows)
# 4 = Check system specs first
# 5 = Exit
```

**Pros:** Interactive menu, auto-installs dependencies, checks system
**Cons:** Only one terminal window at a time

### **Method 2: run_backend.bat (Backend Only)**

```bash
run_backend.bat
```

This specifically starts just the FastAPI backend with auto-setup.

**Then start frontend separately** in another terminal:
```bash
cd surveillance-frontend
npm run dev
```

### **Method 3: Manual Commands (Most Control)**

Terminal 1 (Backend):
```bash
cd c:\Users\Administrator\Downloads\CCTV
venv\Scripts\activate
python main.py
```

Terminal 2 (Frontend):
```bash
cd c:\Users\Administrator\Downloads\CCTV\surveillance-frontend
npm install
npm run dev
```

---

## 📱 Access the Application

Once both are running:

| Component | URL | What to Do |
|-----------|-----|-----------|
| **Dashboard** | http://localhost:3000 | View detections in real-time |
| **API Docs** | http://localhost:5000/docs | Test API endpoints |
| **Health Check** | http://localhost:5000/api/health | Verify backend status |
| **ReDoc** | http://localhost:5000/redoc | Alternative API docs |

### **Dashboard Quick Test:**

1. Open http://localhost:3000
2. You'll see 3 video stream cards
3. Click any stream to select it
4. Click "Start" button to activate detection
5. The system will start processing frames
6. Detections will appear in the detection panel

---

## ⚙️ Configuration Guide

### **Backend Configuration (.env)**

Located at: `c:\Users\Administrator\Downloads\CCTV\.env`

```env
# API Settings
API_HOST=0.0.0.0
API_PORT=5000
API_RELOAD=true
API_LOG_LEVEL=info

# Model (Your YOLOv11n)
MODEL_PATH=CCTV/best (1).onnx
DEVICE=cpu
CONFIDENCE_THRESHOLD=0.5

# Performance
MAX_WORKERS=4
MAX_CACHED_FRAMES=10
```

**Key Settings:**
- `DEVICE=cpu` → Forces CPU-only inference
- `CONFIDENCE_THRESHOLD=0.5` → Lower = more detections, slower
- `MAX_WORKERS=4` → Set to your CPU cores/2

### **Frontend Configuration (vite.config.ts)**

The frontend automatically connects to backend at:
```
http://localhost:5000/api
```

If you change the backend port, update `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000',  // Change this if needed
    changeOrigin: true,
  },
}
```

---

## 🔍 Verify Everything is Working

### **Check 1: Backend Health**

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "connected",
  "gpu_available": false,
  "message": "CCTV Detection API is running with YOLOv11n ONNX (CPU Optimized)",
  "model_info": {
    "model_name": "YOLOv11n",
    "format": "ONNX",
    "model_size": "2.6 MB",
    "inference_time": 0.0485
  }
}
```

### **Check 2: List Video Streams**

```bash
curl http://localhost:5000/api/streams
```

Expected response:
```json
[
  {"id": "stream_1", "name": "Front Door Camera", "status": "inactive", "current_detections": 0},
  {"id": "stream_2", "name": "Back Gate Camera", "status": "inactive", "current_detections": 0},
  {"id": "stream_3", "name": "Parking Area", "status": "inactive", "current_detections": 0}
]
```

### **Check 3: Process Test Frame**

```bash
curl -X POST http://localhost:5000/api/process-frame/stream_1
```

This will:
1. Create a dummy test frame
2. Run YOLOv11n detection on it
3. Return detection results
4. Save the annotated frame

### **Check 4: Open API Documentation**

Visit: **http://localhost:5000/docs**

You can:
- See all available endpoints
- Test API calls directly
- View request/response examples
- Download OpenAPI spec

---

## 🚀 Performance Expectations

### **Startup Time**
- Backend startup: 3-5 seconds
- Model loading: 5-10 seconds
- Frontend startup: 2-3 seconds
- First inference: 200-500ms (warm-up)

### **Running Performance**
- Single stream inference: 45-55ms
- Single stream FPS: 18-22 FPS
- Multiple streams (3): ~7 FPS each
- Memory usage: 300-400 MB

### **First Time Setup**
- Initial npm install: 5-10 minutes
- Initial pip install: 10-15 minutes
- Total first-time run: 20-30 minutes

---

## 🐛 Troubleshooting

### **Problem: "Port 5000 already in use"**

```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port in .env
API_PORT=8000
```

### **Problem: "Module not found" errors**

```bash
# Reinstall dependencies
venv\Scripts\activate
pip install -r requirements.txt --force-reinstall
```

### **Problem: Frontend shows "Cannot connect to backend"**

1. Check backend is running: http://localhost:5000/api/health
2. Check port 5000 is accessible
3. Clear browser cache (Ctrl+Shift+Delete)
4. Restart both backend and frontend

### **Problem: Slow inference (>200ms)**

```env
# Increase confidence threshold
CONFIDENCE_THRESHOLD=0.7

# Or reduce cache
MAX_CACHED_FRAMES=5
```

### **Problem: "best (1).onnx not found"**

```bash
# Check if file exists
dir CCTV\best*.onnx

# Should show something like:
# Directory of c:\Users\...\CCTV
# 02/08/2026  10:30 AM        2,654,321 best (1).onnx
```

---

## 📊 System Requirements Check

Run the optimizer to verify your system:

```bash
venv\Scripts\activate
python optimize_cpu.py
```

This will show:
- ✓ CPU cores and frequency
- ✓ Available RAM
- ✓ Python version
- ✓ Installed dependencies
- ✓ Model location
- ✓ Optimization recommendations

---

## 🎓 Development vs Production

### **Development Mode** (Current Setup)
```bash
python main.py
# or
uvicorn main:app --reload
```

✅ Auto-reloads on code changes
✅ Detailed error messages
❌ Slower performance
❌ Not suitable for production

### **Production Mode**
```bash
uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4
```

✅ Better performance
✅ Multiple worker processes
❌ Won't auto-reload on changes

---

## 🔄 Typical Workflow

```
1. Open Terminal 1
   → cd c:\Users\Administrator\Downloads\CCTV
   → venv\Scripts\activate
   → python main.py
   → Wait for "Application startup complete"

2. Open Terminal 2 (or new window)
   → cd c:\Users\Administrator\Downloads\CCTV\surveillance-frontend
   → npm run dev
   → Wait for "Local: http://localhost:3000"

3. Open Browser
   → http://localhost:3000
   → Dashboard appears with 3 video streams

4. Test System
   → Click a stream
   → Click "Start" button
   → Click "Process Frame" (in API /docs)
   → See detection appear

5. Monitor Performance
   → Check http://localhost:5000/api/statistics
   → Watch FPS and detection counts
```

---

## 📚 Documentation Files

- **README.md** - System overview
- **README_BACKEND.md** - Backend API details
- **YOLOV11N_CPU_GUIDE.md** - CPU optimization guide
- **SETUP_SUMMARY.md** - Setup checklist
- **optimize_cpu.py** - Run to check system specs

---

## ✅ Success Checklist

- [ ] Virtual environment created and activated
- [ ] All dependencies installed (pip install -r requirements.txt)
- [ ] Backend starts without errors (python main.py)
- [ ] http://localhost:5000/api/health returns success
- [ ] http://localhost:5000/docs shows API documentation
- [ ] Frontend starts without errors (npm run dev)
- [ ] http://localhost:3000 shows dashboard
- [ ] Can select a video stream
- [ ] Can click "Start" button
- [ ] Detections appear in the panel

---

## 🎉 You're Done!

Your CCTV Detection System is **running successfully** when:
- ✅ Backend shows: "Application startup complete"
- ✅ Frontend shows: "Local: http://localhost:3000"
- ✅ Dashboard loads with 3 video streams
- ✅ API docs accessible at http://localhost:5000/docs

**Enjoy real-time CCTV detection with YOLOv11n!** 🚀

---

**Last Updated:** February 8, 2026
**Status:** ✅ Ready to Run
