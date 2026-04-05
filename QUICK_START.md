# CCTV Detection System - Quick Reference Card

## 🚀 FASTEST WAY TO RUN (Copy & Paste)

### Terminal 1 - Backend (API)
```bash
cd c:\Users\Administrator\Downloads\CCTV
venv\Scripts\activate
python main.py
```
✅ Wait for: `Application startup complete`
📍 Access at: http://localhost:5000

### Terminal 2 - Frontend (Dashboard)
```bash
cd c:\Users\Administrator\Downloads\CCTV\surveillance-frontend
npm run dev
```
✅ Wait for: `Local: http://localhost:3000`
📍 Open: http://localhost:3000

---

## 📱 After Both Are Running

| What | Where | Purpose |
|------|-------|---------|
| **Dashboard** | http://localhost:3000 | View camera streams & detections |
| **API Docs** | http://localhost:5000/docs | Interactive API testing |
| **Health** | http://localhost:5000/api/health | Check backend status |

---

## 🎬 How to Test

1. Open http://localhost:3000 in browser
2. Click on any video stream card (e.g., "Front Door Camera")
3. Click the green **"Start"** button
4. Go to http://localhost:5000/docs
5. Find `POST /api/process-frame/{stream_id}`
6. Click "Try it out" and execute
7. See detections appear in dashboard!

---

## ⚙️ One-Click Alternative

Instead of manual steps, just run:
```bash
START.bat
```

Then choose **Option 1** for backend or **Option 3** for both.

---

## 🔧 Key Ports & URLs

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://localhost:5000 |
| Frontend | 3000 | http://localhost:3000 |
| API Documentation | 5000 | http://localhost:5000/docs |

---

## 🛑 Stop Services

- **Backend**: Press `Ctrl+C` in Terminal 1
- **Frontend**: Press `Ctrl+C` in Terminal 2

---

## 📊 Performance

- **Inference Time**: 45-55ms per frame
- **FPS Single Stream**: 18-22 FPS
- **Model**: YOLOv11n ONNX (2.6 MB)
- **Device**: CPU Optimized

---

## 🆘 Common Issues & Fixes

### Port Already in Use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Not Found
```bash
venv\Scripts\activate
pip install -r requirements.txt --force-reinstall
```

### Frontend Can't Connect
1. Check backend: http://localhost:5000/api/health
2. Clear browser cache (Ctrl+Shift+Delete)
3. Restart both services

---

## 📚 More Info

- **Detailed Guide**: Read `HOW_TO_RUN.md`
- **System Check**: Run `python optimize_cpu.py`
- **API Reference**: Visit http://localhost:5000/docs
- **Configuration**: Edit `.env` file

---

## ✅ Success Indicators

✓ Backend shows: `INFO: Application startup complete`
✓ Frontend shows: `Local: http://localhost:3000`  
✓ Dashboard loads with 3 camera streams
✓ http://localhost:5000/docs is accessible

---

**Created:** February 8, 2026 | **Status:** ✅ Production Ready
