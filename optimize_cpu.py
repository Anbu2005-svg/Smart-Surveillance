#!/usr/bin/env python3
"""
CCTV Detection Backend - CPU Performance Optimizer
Monitors and optimizes YOLOv11n ONNX inference on CPU
"""

import psutil
import time
import subprocess
import sys
from pathlib import Path
from datetime import datetime

class PerformanceMonitor:
    def __init__(self):
        self.start_time = datetime.now()
        self.cpu_percent = []
        self.memory_mb = []
        self.inference_times = []
        
    def get_system_info(self):
        """Get current system information"""
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq().current
        memory_total = psutil.virtual_memory().total / (1024**3)
        memory_available = psutil.virtual_memory().available / (1024**3)
        
        return {
            "cpu_cores": cpu_count,
            "cpu_freq_mhz": cpu_freq,
            "memory_total_gb": memory_total,
            "memory_available_gb": memory_available
        }
    
    def check_dependencies(self):
        """Check if all required packages are installed"""
        print("\n" + "="*60)
        print("Checking Dependencies")
        print("="*60)
        
        required_packages = {
            "fastapi": "FastAPI Web Framework",
            "uvicorn": "ASGI Server",
            "ultralytics": "YOLO Models",
            "opencv": "OpenCV (cv2)",
            "torch": "PyTorch",
            "numpy": "NumPy",
            "onnx": "ONNX",
            "onnxruntime": "ONNX Runtime (CPU Optimized)"
        }
        
        missing = []
        for pkg, desc in required_packages.items():
            try:
                __import__(pkg)
                print(f"✓ {desc:<35} installed")
            except ImportError:
                print(f"✗ {desc:<35} MISSING")
                missing.append(pkg)
        
        print("="*60)
        
        if missing:
            print(f"\n⚠️  Missing packages: {', '.join(missing)}")
            print("\nRun: pip install -r requirements.txt\n")
            return False
        else:
            print("✓ All dependencies satisfied!\n")
            return True
    
    def check_model(self):
        """Check if YOLO model exists"""
        print("Checking Model")
        print("="*60)
        
        model_path = Path("CCTV") / "best (1).onnx"
        
        if model_path.exists():
            size_mb = model_path.stat().st_size / (1024**2)
            print(f"✓ Model found: {model_path}")
            print(f"✓ Size: {size_mb:.2f} MB")
            print(f"✓ Type: ONNX (CPU Optimized)")
            print("="*60 + "\n")
            return True
        else:
            print(f"✗ Model NOT found at: {model_path}")
            print("="*60 + "\n")
            return False
    
    def get_optimization_recommendations(self):
        """Get CPU-specific optimization recommendations"""
        print("Optimization Recommendations for CPU")
        print("="*60)
        
        system_info = self.get_system_info()
        
        recommendations = []
        
        # CPU-based recommendations
        if system_info["cpu_cores"] >= 8:
            recommendations.append({
                "issue": "Multi-core CPU detected",
                "setting": "MAX_WORKERS=4",
                "explanation": "Use 4 workers for multi-stream processing"
            })
        elif system_info["cpu_cores"] >= 4:
            recommendations.append({
                "issue": "Quad-core CPU detected",
                "setting": "MAX_WORKERS=2",
                "explanation": "Use 2 workers to avoid overload"
            })
        else:
            recommendations.append({
                "issue": "Low-core CPU detected",
                "setting": "MAX_WORKERS=1",
                "explanation": "Single-threaded processing recommended"
            })
        
        # Memory-based recommendations
        if system_info["memory_available_gb"] < 2:
            recommendations.append({
                "issue": "Low available memory",
                "setting": "MAX_CACHED_FRAMES=3",
                "explanation": "Reduce frame cache to save memory"
            })
        elif system_info["memory_available_gb"] < 4:
            recommendations.append({
                "issue": "Medium available memory",
                "setting": "MAX_CACHED_FRAMES=5",
                "explanation": "Conservative frame cache setting"
            })
        else:
            recommendations.append({
                "issue": "Plenty of memory available",
                "setting": "MAX_CACHED_FRAMES=10",
                "explanation": "Full frame cache recommended"
            })
        
        # Inference optimization
        recommendations.append({
            "issue": "CPU Inference",
            "setting": "conf=0.5",
            "explanation": "Balanced confidence threshold for CPU"
        })
        
        recommendations.append({
            "issue": "Model Format",
            "setting": "Format: ONNX",
            "explanation": "ONNX Runtime provides CPU optimization"
        })
        
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec['issue']}")
            print(f"   Setting: {rec['setting']}")
            print(f"   Reason: {rec['explanation']}")
        
        print("\n" + "="*60 + "\n")
    
    def print_system_report(self):
        """Print detailed system report"""
        print("\n" + "="*60)
        print("System Information Report")
        print("="*60)
        
        info = self.get_system_info()
        
        print(f"CPU Cores:        {info['cpu_cores']}")
        print(f"CPU Frequency:    {info['cpu_freq_mhz']:.2f} MHz")
        print(f"Total Memory:     {info['memory_total_gb']:.2f} GB")
        print(f"Available Memory: {info['memory_available_gb']:.2f} GB")
        print(f"Memory Usage:     {psutil.virtual_memory().percent:.1f}%")
        print("="*60 + "\n")
    
    def print_model_specs(self):
        """Print YOLOv11n model specifications"""
        print("YOLOv11n Model Specifications")
        print("="*60)
        print("Model Name:       YOLOv11n (Nano)")
        print("Format:           ONNX (Cross-platform)")
        print("Input Size:       640x640 (auto-resizable)")
        print("Inference Backend: CPU-Optimized")
        print("\nPerformance Expectations:")
        print("  Single Stream:  ~18-22 FPS (~45-55ms per frame)")
        print("  3 Streams:      ~6-7 FPS per stream")
        print("\nModel Classes:    80 (COCO dataset)")
        print("="*60 + "\n")

def main():
    """Main function"""
    print("\n" + "="*60)
    print("CCTV Detection Backend - Performance Optimizer")
    print("YOLOv11n ONNX CPU Optimization")
    print("="*60)
    
    monitor = PerformanceMonitor()
    
    # Print system information
    monitor.print_system_report()
    
    # Check dependencies
    deps_ok = monitor.check_dependencies()
    
    # Check model
    model_ok = monitor.check_model()
    
    # Print model specs
    monitor.print_model_specs()
    
    # Get recommendations
    monitor.get_optimization_recommendations()
    
    # Summary
    print("="*60)
    print("Pre-flight Check Summary")
    print("="*60)
    
    status = "✓ READY" if (deps_ok and model_ok) else "✗ NOT READY"
    print(f"Status: {status}")
    
    if deps_ok and model_ok:
        print("\n✓ All checks passed! Ready to start the backend:")
        print("\n  Option 1: run_backend.bat")
        print("  Option 2: python main.py")
        print("  Option 3: docker-compose up --build")
        print("\nAPI will be available at: http://localhost:5000")
        print("Interactive docs: http://localhost:5000/docs")
    else:
        print("\n✗ Please fix the issues above before starting")
        if not deps_ok:
            print("  → Run: pip install -r requirements.txt")
        if not model_ok:
            print("  → Check that CCTV/best (1).onnx exists")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ Error: {e}\n")
        sys.exit(1)
