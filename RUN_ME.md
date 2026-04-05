# 🚀 Quick Start - Run Backend & Frontend

## **Super Easy - Just Double-Click Both Files!**

### **Step 1: Start Backend**
1. Go to: `D:\With_Front_End_CCTV-001\CCTV\`
2. **Double-click**: `start_backend.bat`
3. Wait for message: `Application startup complete`
4. ✅ Backend is running on http://localhost:5000

**Keep this window open!** Do not close it.

---

### **Step 2: Start Frontend** (Open NEW window)
1. Go to: `D:\With_Front_End_CCTV-001\CCTV\surveillance-frontend\`
2. **Double-click**: `start_frontend.bat`
3. Wait for message: `Local: http://localhost:3001`
4. ✅ Frontend is running on http://localhost:3001

**Keep this window open!** Do not close it.

---

### **Step 3: Open Website**
1. Open your browser
2. Go to: **http://localhost:3001**
3. You should see **Login/Sign-up page**
4. Sign up with email and password
5. Login and start detecting objects!

---

## ✅ What You Should See

### Backend Terminal:
```
========================================
Starting CCTV Backend...
========================================

Loading YOLOv11n model (please wait)...

✓ Found ONNX model
✓ Model loaded successfully for CPU inference
✓ Device: CPU
✓ Total streams initialized: 3

INFO:     Application startup complete.
```

### Frontend Terminal:
```
========================================
Starting CCTV Frontend...
========================================

Frontend will be available at:
http://localhost:3001

VITE v3.2.11 ready in 302 ms

  ➜  Local:   http://localhost:3001
  ➜  Network: http://192.168.X.X:3001
```

---

## 🎯 Access Points

| Service | URL | What It Does |
|---------|-----|--------------|
| **Website** | http://localhost:3001 | Web dashboard with login |
| **API** | http://localhost:5000 | Backend detection API |
| **API Docs** | http://localhost:5000/docs | Interactive API testing |
| **API Health** | http://localhost:5000/api/health | Check backend status |

---

## ❌ If Something Goes Wrong

### Error: "Port already in use"
```powershell
# In PowerShell, kill the process
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Then double-click the .bat files again
```

### Error: "npm not found"
- Make sure Node.js is installed: https://nodejs.org
- Restart your computer after installing Node.js
- Then double-click `start_frontend.bat`

### Error: "module not found" (Python)
- Double-click `start_backend.bat` 
- It will install missing packages automatically
- If still fails, run this in PowerShell:
  ```powershell
  cd D:\With_Front_End_CCTV-001\CCTV
  new.venv\Scripts\pip.exe install -r requirements.txt
  ```

### Website shows blank page
- Press F12 to open developer tools
- Check **Console** tab for errors
- Refresh page: Ctrl+F5
- Clear cache: Ctrl+Shift+Delete

---

## 🛑 How to Stop

1. Click in **Backend window**
   - Press `Ctrl+C`
   - Type `exit` and press Enter

2. Click in **Frontend window**
   - Press `Ctrl+C`
   - Type `exit` and press Enter

---

## 📋 Checklist Before Using

- [ ] Supabase credentials are in `surveillance-frontend\.env`
- [ ] Both batch files exist in their folders
- [ ] Backend is running (http://localhost:5000/api/health works)
- [ ] Frontend is running (http://localhost:3001 opens)
- [ ] Both terminals are still open

---

**That's it! Just double-click both .bat files and enjoy your CCTV system!** 🎉
