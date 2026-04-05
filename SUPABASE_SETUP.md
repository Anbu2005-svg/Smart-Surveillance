# 🔐 CCTV System with Supabase Authentication - Setup Guide

## ✅ What's Been Added

### 1. **Supabase Authentication**
- User registration and login
- Email verification
- Password reset functionality
- Persistent sessions

### 2. **Video Input Methods**
- **🎥 Webcam**: Use built-in or USB cameras (ID: 0, 1, 2, etc.)
- **📡 IP Camera**: RTSP streams and IP camera URLs
- **🎬 Video File**: Local video files for testing

### 3. **Enhanced Frontend**
- Authentication page with login/signup
- Protected dashboard routes
- User profile display
- Logout functionality

---

## 🚀 Quick Start

### Step 1: Setup Supabase (Required for Authentication)

1. **Create a Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "Sign Up" and create a new project
   - Choose a region near you

2. **Get Your Credentials**
   - In Supabase Dashboard: Click on project settings
   - Go to **API** section
   - Copy:
     - **Project URL** (looks like: `https://xxxx.supabase.co`)
     - **anon/public key** (long string starting with `eyJ...`)

3. **Configure Frontend**
   - Open: `surveillance-frontend/.env` (or create it)
   - Add:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:5000/api
   ```

### Step 2: Enable Email Authentication in Supabase

1. Go to Supabase Dashboard > Authentication > Providers
2. Make sure **Email** provider is enabled
3. Go to **Email Templates** and verify they're set up
4. (Optional) Enable other providers like Google, GitHub, etc.

### Step 3: Start Backend

```powershell
cd D:\With_Front_End_CCTV-001\CCTV
new.venv\Scripts\python.exe main.py
```

**Expected Output:**
```
============================================================
CCTV Detection API - Startup
============================================================
Loading YOLOv11n ONNX Model for CPU Inference
✓ Found ONNX model
✓ Model loaded successfully for CPU inference
✓ Device: CPU
✓ Total streams initialized: 3

INFO:     Application startup complete.
Uvicorn running on http://0.0.0.0:5000
```

### Step 4: Start Frontend

```powershell
cd D:\With_Front_End_CCTV-001\CCTV\surveillance-frontend
npm run dev
```

**Expected Output:**
```
  VITE v... dev server running at:

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help
```

### Step 5: Login and Use the System

1. **Open** http://localhost:3000
2. **Sign Up**: Create a new account with email/password
3. **Verify**: Check your email and click verification link (if configured)
4. **Login**: Use your credentials to access the dashboard
5. **Select Stream**: Choose "Front Door Camera", "Back Gate Camera", or "Parking Area"
6. **Click Start**: A modal will appear asking for video input method
7. **Select Input**:
   - **Webcam**: Enter camera ID (usually `0`)
   - **IP Camera**: Enter RTSP URL (e.g., `rtsp://192.168.1.100:554/stream`)
   - **Video File**: Enter file path (e.g., `C:\Videos\sample.mp4`)
8. **View Detections**: Real-time objects detected by YOLOv11n

---

## 🎮 Usage Examples

### Using Webcam
```
Input Method: Webcam
Camera ID: 0
```
You'll see live feed from your webcam with YOLOv11n detections

### Using IP Camera (RTSP)
```
Input Method: IP Camera
Camera URL: rtsp://admin:password@192.168.1.100:554/stream
```

### Using Video File
```
Input Method: Video File
File Path: C:\PATH\TO\video.mp4
```

---

## 🔧 API Endpoints

### Authentication (Frontend handles automatically)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/logout` - Logout

### Detection (No authentication required for now, can be added)
- `GET /api/streams` - Get available streams
- `GET /api/health` - Check backend status
- `POST /api/detection/start/{stream_id}` - Start detection
- `POST /api/detection/start-with-input/{stream_id}` - Start with custom input
- `POST /api/detection/stop/{stream_id}` - Stop detection
- `GET /api/detections/{stream_id}` - Get detections
- `GET /api/statistics` - Get stats

#### Start Detection with Video Input
```bash
curl -X POST http://localhost:5000/api/detection/start-with-input/stream_1 \
  -H "Content-Type: application/json" \
  -d '{
    "input_method": "webcam",
    "input_source": "0"
  }'
```

---

## 📱 API Response Example

```json
{
  "message": "Detection started on stream_1",
  "status": "active",
  "input_method": "webcam",
  "input_source": "0"
}
```

---

## 🐛 Troubleshooting

### "Webcam not working"
- Ensure camera is plugged in
- Check camera ID (try 0, 1, 2, etc.)
- Try opening camera in another app first to verify it works

### "Supabase connection failed"
- Verify URL and key in `.env` file
- Check Supabase project is running
- Ensure Email provider is enabled in Supabase

### "RTSP stream not connecting"
- Verify URL format: `rtsp://[username]:[password]@[ip]:[port]/[stream]`
- Check firewall isn't blocking the port
- Test URL with VLC player first

### "Video file not found"
- Use absolute paths: `C:\Users\...\video.mp4`
- Not relative paths: `../../video.mp4`
- Ensure file format is supported (mp4, avi, mov, mkv)

### "Port 5000 or 3000 already in use"
```powershell
# Find and kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change backend port (edit config.py)
# Or change frontend port: npm run dev -- --port 3001
```

---

## 📊 Features

✅ Real-time object detection (YOLOv11n)
✅ Multiple video sources (Webcam, IP Camera, Video Files)
✅ Supabase authentication
✅ User management
✅ Protected routes
✅ GPU and CPU support
✅ Multi-stream processing
✅ Detection statistics
✅ Frame caching

---

## 🔐 Security Notes

- Supabase handles secure password hashing
- API calls can be extended with JWT tokens for authentication
- Currently, detection API is public (can be protected with token)
- Use HTTPS in production
- Keep Supabase keys secret (use .env files, never commit)

---

## 📞 Support

If you encounter issues:
1. Check the backend logs for errors
2. Verify API is responding: http://localhost:5000/api/health
3. Open browser console (F12) for frontend errors
4. Check Supabase dashboard for auth issues

---

## Next Steps

1. ✅ Setup Supabase (free tier available)
2. ✅ Configure environment variables
3. ✅ Run backend and frontend
4. ✅ Test with webcam or video file
5. ✅ (Optional) Deploy to production with proper security

Enjoy your CCTV detection system! 🎉
