from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from starlette.middleware.gzip import GZipMiddleware
import uvicorn
import cv2
import numpy as np
from datetime import datetime
import uuid
from pathlib import Path
from typing import List, Optional
import json
import torch
import time
import logging
import threading
import os
import base64
import queue
import re
from urllib import request as urllib_request
from urllib import parse as urllib_parse
from urllib import error as urllib_error
from dotenv import load_dotenv

# Import YOLO model
from ultralytics import YOLO

# Pydantic models
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
load_dotenv()

# ============= Models =============
class Detection(BaseModel):
    id: str
    class_name: str
    confidence: float
    bbox: dict  # {x1, y1, x2, y2}
    timestamp: str

class DetectionResult(BaseModel):
    frame_id: str
    timestamp: str
    detections: List[Detection]
    image_url: str

class VideoStream(BaseModel):
    id: str
    name: str
    status: str  # 'active' or 'inactive'
    current_detections: int

class HealthStatus(BaseModel):
    status: str
    gpu_available: bool
    message: str
    model_info: dict

class Statistics(BaseModel):
    total_detections: int
    active_streams: int
    processing_time: float
    frames_processed: int

class VideoInputRequest(BaseModel):
    input_method: str  # 'webcam', 'ip_camera', or 'video_file'
    input_source: str  # camera ID, URL, or file path
    target_classes: Optional[List[str]] = None


class StreamCreateRequest(BaseModel):
    name: str
    source: str = "0"
    id: Optional[str] = None


class TelegramProfileUpdateRequest(BaseModel):
    telegram_chat_id: Optional[str] = None
    telegram_number: Optional[str] = None


class TelegramProfileResponse(BaseModel):
    configured: bool
    telegram_chat_id: Optional[str] = None
    telegram_number: Optional[str] = None
    updated_at: Optional[str] = None

# ============= FastAPI App =============
app = FastAPI(
    title="CCTV Detection API with YOLOv11n",
    description="Real-time object detection API for CCTV surveillance using optimized YOLOv11n ONNX model",
    version="1.0.0"
)

# Enable CORS from env with safe credentials behavior.
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
allow_any_origin = "*" in cors_origins or not cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_any_origin else cors_origins,
    allow_credentials=not allow_any_origin,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# ============= Global State =============
class CameraCapture:
    """Handle camera capture for a stream"""
    def __init__(self, source: str = "0"):
        self.source = source
        self.cap = None
        self.is_running = False
        self.latest_frame = None
        self.lock = threading.Lock()
        self.reader_thread = None
        self.read_timeout_ms = int(os.getenv("CAMERA_READ_TIMEOUT_MS", "1000"))
    
    def start(self):
        """Start camera capture"""
        if self.cap and self.cap.isOpened():
            return True

        source = str(self.source).strip()
        # Try to convert to int (index) if it looks like one, unless it's a file path or URL
        if source.isdigit():
            source = int(source)

        # Try multiple backends on Windows for better webcam compatibility.
        candidates = []
        if isinstance(source, int):
            candidates = [
                lambda: cv2.VideoCapture(source, cv2.CAP_DSHOW),
                lambda: cv2.VideoCapture(source, cv2.CAP_MSMF),
                lambda: cv2.VideoCapture(source),
            ]
        else:
            candidates = [lambda: cv2.VideoCapture(source)]

        self.cap = None
        for open_fn in candidates:
            cap = open_fn()
            if cap and cap.isOpened():
                self.cap = cap
                break
            if cap:
                cap.release()

        if not self.cap or not self.cap.isOpened():
            logger.error(f"Failed to open camera/source: {source}")
            return False

        # Keep camera buffer low to reduce lag from old queued frames.
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.read_timeout_ms)
            self.cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, self.read_timeout_ms)
        except Exception:
            pass
        
        self.is_running = True
        self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self.reader_thread.start()
        logger.info(f"Camera opened: {source}")
        return True

    def _reader_loop(self):
        """Continuously pull frames so processing always sees the newest frame."""
        while self.is_running and self.cap and self.cap.isOpened():
            try:
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self.lock:
                        self.latest_frame = frame
                else:
                    time.sleep(0.005)
            except Exception:
                time.sleep(0.01)
    
    def get_frame(self):
        """Get latest frame from camera"""
        if not self.is_running:
            return None

        with self.lock:
            if self.latest_frame is None:
                return None
            return self.latest_frame.copy()
    
    def stop(self):
        """Stop camera capture"""
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
        if self.reader_thread and self.reader_thread.is_alive():
            self.reader_thread.join(timeout=0.5)
        self.reader_thread = None
        with self.lock:
            self.latest_frame = None
        logger.info("Camera stopped")

class DetectionManager:
    def __init__(self):
        self.streams = {}
        self.camera_captures = {}
        self.detections = {}
        self.model = None
        self.requested_device = os.getenv("DEVICE", "auto").strip().lower()
        self.device = "cpu"
        self.model_path = os.getenv("MODEL_PATH", "best (1).onnx").strip().strip('"').strip("'")
        self.conf_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
        self.fire_conf_threshold = float(os.getenv("FIRE_CONFIDENCE_THRESHOLD", str(self.conf_threshold)))
        self.weapon_conf_threshold = float(os.getenv("WEAPON_CONFIDENCE_THRESHOLD", str(self.conf_threshold)))
        self.use_half_precision = os.getenv("USE_HALF_PRECISION", "true").lower() == "true"
        self.total_detections = 0
        self.processing_times = []
        self.frames_processed = 0
        self.active = False
        self.capture_threads = {}
        self.process_fps = float(os.getenv("DETECTION_PROCESS_FPS", "8"))
        self.process_width = int(os.getenv("PROCESS_FRAME_WIDTH", "640"))
        self.process_height = int(os.getenv("PROCESS_FRAME_HEIGHT", "480"))
        self.jpeg_quality = int(os.getenv("JPEG_QUALITY", "80"))
        self.draw_model_boxes = os.getenv("DRAW_MODEL_BOXES", "false").lower() == "true"
        self.frame_cache_max = int(os.getenv("MAX_CACHED_FRAMES", "80"))
        self.detections_history_size = int(os.getenv("DETECTIONS_HISTORY_SIZE", "6"))
        self.frame_cache = {}
        self.frame_order = []
        self.frame_cache_lock = threading.Lock()
        self.streams_store_path = Path(os.getenv("STREAMS_STORE_PATH", "streams_store.json"))
        self.streams_store_lock = threading.Lock()
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip().strip('"').strip("'").rstrip("/")
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip().strip('"').strip("'")
        self.supabase_streams_table = os.getenv("SUPABASE_STREAMS_TABLE", "camera_streams").strip() or "camera_streams"
        self.supabase_camera_feeds_table = os.getenv("SUPABASE_CAMERA_FEEDS_TABLE", "public.camera_feeds").strip() or "public.camera_feeds"
        self.supabase_detections_table = os.getenv("SUPABASE_DETECTIONS_TABLE", "public.detections").strip() or "public.detections"
        self.supabase_security_events_table = os.getenv("SUPABASE_SECURITY_EVENTS_TABLE", "public.security_events").strip() or "public.security_events"
        self.supabase_user_profiles_table = os.getenv("SUPABASE_USER_PROFILES_TABLE", "public.user_profiles").strip() or "public.user_profiles"
        self.supabase_timeout_sec = int(os.getenv("SUPABASE_TIMEOUT_SEC", "10"))
        self.last_supabase_error = ""
        self.supabase_event_logging_enabled = os.getenv("SUPABASE_EVENT_LOGGING_ENABLED", "true").lower() == "true"
        self.supabase_detection_log_cooldown_sec = float(os.getenv("SUPABASE_DETECTION_LOG_COOLDOWN_SEC", "1.0"))
        self.last_detection_log_at = {}
        self.stream_alert_targets = {}
        self.stream_alert_targets_lock = threading.Lock()
        self.video_upload_dir = Path(os.getenv("VIDEO_UPLOAD_DIR", "uploaded_videos"))
        self.max_upload_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
        self.allowed_video_extensions = {
            ext.strip().lower()
            for ext in os.getenv("ALLOWED_VIDEO_EXTENSIONS", ".mp4,.avi,.mov,.mkv,.webm")
            .split(",")
            if ext.strip()
        }
        self.model_info = {
            "model_name": None,
            "model_size": None,
            "format": None,
            "inference_time": 0.0
        }
        self.fp16_allowed = True
        
    def load_model(self):
        """Load model and select best available device."""
        try:
            logger.info("=" * 60)
            logger.info("Loading YOLO model")
            logger.info("=" * 60)

            cuda_available = torch.cuda.is_available()
            if self.requested_device == "cuda":
                self.device = "cuda:0" if cuda_available else "cpu"
            elif self.requested_device == "cpu":
                self.device = "cpu"
            else:
                self.device = "cuda:0" if cuda_available else "cpu"

            model_candidate = Path(self.model_path)
            if not model_candidate.exists():
                model_candidate = Path("CCTV") / self.model_path

            if not model_candidate.exists():
                logger.warning(f"Configured model not found: {self.model_path}, falling back to yolov11n.pt")
                model_candidate = Path("yolov11n.pt")

            self.model = YOLO(str(model_candidate))
            self.model_info["model_name"] = model_candidate.name
            self.model_info["format"] = model_candidate.suffix.replace(".", "").upper() or "PT"
            if model_candidate.exists():
                model_size = model_candidate.stat().st_size / (1024 * 1024)
                self.model_info["model_size"] = f"{model_size:.2f} MB"

            # Most ONNX exports in this project are FP32. Running FP16 on those models
            # causes "Unexpected input data type ... float16 expected float".
            if self.model_info["format"] == "ONNX":
                self.fp16_allowed = False
                if self.use_half_precision:
                    logger.warning("Disabling half precision for ONNX model (FP32 input expected).")
                    self.use_half_precision = False

            logger.info(f"Model loaded: {model_candidate}")
            logger.info(f"Device selected: {self.device}")
            logger.info("=" * 60)
            return True

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            logger.error("=" * 60)
            return False

    def get_gpu_status(self) -> bool:
        """Check GPU availability"""
        return torch.cuda.is_available()
    
    def is_supabase_configured(self) -> bool:
        return bool(self.supabase_url) and bool(self.supabase_service_role_key)

    def _supabase_request(self, method: str, path: str, params: Optional[dict] = None, data: Optional[dict] = None, prefer: Optional[str] = None):
        schema = None
        normalized_path = path
        # Allow schema-qualified path like "public.camera_streams".
        if "." in path and "/" not in path:
            possible_schema, possible_table = path.split(".", 1)
            if possible_schema and possible_table:
                schema = possible_schema
                normalized_path = possible_table

        query = ""
        if params:
            query = "?" + urllib_parse.urlencode(params)
        url = f"{self.supabase_url}/rest/v1/{normalized_path}{query}"
        headers = {
            "apikey": self.supabase_service_role_key,
            "Authorization": f"Bearer {self.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        if schema:
            # PostgREST schema targeting for non-default schemas.
            if method.upper() == "GET":
                headers["Accept-Profile"] = schema
            else:
                headers["Content-Profile"] = schema
        if prefer:
            headers["Prefer"] = prefer

        body = None
        if data is not None:
            body = json.dumps(data).encode("utf-8")

        req = urllib_request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib_request.urlopen(req, timeout=self.supabase_timeout_sec) as response:
                raw = response.read().decode("utf-8")
                self.last_supabase_error = ""
                if not raw:
                    return []
                return json.loads(raw)
        except Exception as e:
            self.last_supabase_error = str(e)
            if "404" in self.last_supabase_error:
                self.last_supabase_error = (
                    f"{self.last_supabase_error}. "
                    f"Table path '{path}' not found in Supabase REST. "
                    f"Create table or set SUPABASE_STREAMS_TABLE correctly (example: public.camera_streams)."
                )
            raise

    def add_stream(self, stream_id: str, stream_name: str, source: str = "0", persist: bool = True):
        """Add a video stream"""
        self.streams[stream_id] = {
            "name": stream_name,
            "source": source,
            "status": "inactive",
            "detections": [],
            "current_detections": 0
        }
        self.camera_captures[stream_id] = CameraCapture(source)
        logger.info(f"Stream added: {stream_id} - {stream_name}")
        if persist:
            self.persist_streams()

    def persist_streams(self):
        """Persist stream names and sources to Supabase, fallback to disk."""
        if self.is_supabase_configured():
            try:
                payload = []
                for stream_id, stream_info in self.streams.items():
                    payload.append({
                        "id": stream_id,
                        "name": str(stream_info.get("name", stream_id)),
                        "source": str(stream_info.get("source", "0")),
                    })
                self._supabase_request(
                    "POST",
                    self.supabase_streams_table,
                    data=payload,
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                return
            except Exception as e:
                logger.error(f"Failed to persist streams to Supabase, falling back to file: {e}")

        # Fallback local file persistence
        records = []
        for stream_id, stream_info in self.streams.items():
            records.append({
                "id": stream_id,
                "name": str(stream_info.get("name", stream_id)),
                "source": str(stream_info.get("source", "0")),
            })

        try:
            with self.streams_store_lock:
                self.streams_store_path.write_text(
                    json.dumps(records, indent=2),
                    encoding="utf-8",
                )
        except Exception as e:
            logger.error(f"Failed to persist streams: {e}")

    def _load_streams_from_file(self, persist: bool = False) -> int:
        """Load stream records from local file, optionally persisting each stream."""
        if not self.streams_store_path.exists():
            return 0

        with self.streams_store_lock:
            raw = self.streams_store_path.read_text(encoding="utf-8")
        items = json.loads(raw)
        if not isinstance(items, list):
            logger.warning("Stream store is not a list, ignoring")
            return 0

        loaded = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            stream_id = str(item.get("id", "")).strip()
            name = str(item.get("name", "")).strip()
            source = str(item.get("source", "0")).strip()
            if not stream_id or not name:
                continue
            self.add_stream(stream_id, name, source, persist=persist)
            loaded += 1
        return loaded

    def _supabase_insert_row(self, table: str, row: dict):
        if not self.is_supabase_configured() or not self.supabase_event_logging_enabled:
            return
        try:
            self._supabase_request(
                "POST",
                table,
                data=row,
                prefer="return=minimal",
            )
        except Exception as e:
            logger.debug(f"Supabase insert skipped for {table}: {e}")

    def get_user_telegram_profile(self, user_id: str) -> Optional[dict]:
        """Fetch telegram profile row for a specific authenticated user."""
        if not self.is_supabase_configured():
            return None

        items = self._supabase_request(
            "GET",
            self.supabase_user_profiles_table,
            params={
                "select": "user_id,email,telegram_chat_id,telegram_number,updated_at",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if isinstance(items, list) and items:
            row = items[0]
            if isinstance(row, dict):
                return row
        return None

    def upsert_user_telegram_profile(
        self,
        user_id: str,
        email: str,
        telegram_chat_id: Optional[str],
        telegram_number: Optional[str],
    ) -> dict:
        """Create/update user telegram profile in Supabase."""
        row = {
            "user_id": user_id,
            "email": email or None,
            "telegram_chat_id": telegram_chat_id or None,
            "telegram_number": telegram_number or None,
            "updated_at": datetime.now().isoformat(),
        }
        items = self._supabase_request(
            "POST",
            self.supabase_user_profiles_table,
            params={"on_conflict": "user_id"},
            data=row,
            prefer="resolution=merge-duplicates,return=representation",
        )
        if isinstance(items, list) and items and isinstance(items[0], dict):
            return items[0]
        return row

    def set_stream_alert_target(self, stream_id: str, user_id: str, chat_id: str):
        """Attach per-stream Telegram destination for user-specific alerts."""
        with self.stream_alert_targets_lock:
            self.stream_alert_targets[stream_id] = {
                "user_id": user_id,
                "chat_id": chat_id,
                "updated_at": time.time(),
            }

    def clear_stream_alert_target(self, stream_id: str):
        with self.stream_alert_targets_lock:
            self.stream_alert_targets.pop(stream_id, None)

    def get_stream_alert_chat_id(self, stream_id: str) -> Optional[str]:
        with self.stream_alert_targets_lock:
            target = self.stream_alert_targets.get(stream_id)
            if not target:
                return None
            chat_id = str(target.get("chat_id", "")).strip()
            return chat_id or None

    def log_camera_feed_event(self, stream_id: str, event: str):
        stream = self.streams.get(stream_id, {})
        row = {
            "stream_id": stream_id,
            "stream_name": str(stream.get("name", stream_id)),
            "source": str(stream.get("source", "")),
            "input_method": str(stream.get("input_method", "")),
            "status": str(stream.get("status", "")),
            "event_type": event,
            "event_time": datetime.now().isoformat(),
        }
        self._supabase_insert_row(self.supabase_camera_feeds_table, row)

    def log_detection_events(self, stream_id: str, detections: list, image_url: str):
        if not detections:
            return
        now = time.time()
        last = self.last_detection_log_at.get(stream_id, 0.0)
        if (now - last) < self.supabase_detection_log_cooldown_sec:
            return
        self.last_detection_log_at[stream_id] = now

        stream = self.streams.get(stream_id, {})
        stream_name = str(stream.get("name", stream_id))
        for det in detections[:3]:
            row = {
                "stream_id": stream_id,
                "stream_name": stream_name,
                "class_name": str(det.get("class_name", "")),
                "confidence": float(det.get("confidence", 0.0)),
                "bbox": det.get("bbox", {}),
                "image_url": image_url,
                "event_time": datetime.now().isoformat(),
            }
            self._supabase_insert_row(self.supabase_detections_table, row)

            cls = str(det.get("class_name", "")).strip().lower()
            if cls in {"fire", "weapon", "intruder"}:
                sev = "high" if cls in {"fire", "weapon"} else "medium"
                security_row = {
                    "stream_id": stream_id,
                    "stream_name": stream_name,
                    "event_type": cls,
                    "severity": sev,
                    "details": det,
                    "event_time": datetime.now().isoformat(),
                }
                self._supabase_insert_row(self.supabase_security_events_table, security_row)

    def load_persisted_streams(self):
        """Load streams from Supabase first, fallback to local disk."""
        loaded_from_supabase = 0
        if self.is_supabase_configured():
            try:
                items = self._supabase_request(
                    "GET",
                    self.supabase_streams_table,
                    params={"select": "id,name,source"},
                )
                if isinstance(items, list):
                    loaded = 0
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        stream_id = str(item.get("id", "")).strip()
                        name = str(item.get("name", "")).strip()
                        source = str(item.get("source", "0")).strip()
                        if not stream_id or not name:
                            continue
                        self.add_stream(stream_id, name, source, persist=False)
                        loaded += 1
                    loaded_from_supabase = loaded
                    logger.info(f"Loaded {loaded} streams from Supabase table {self.supabase_streams_table}")
                    if loaded > 0:
                        return
            except Exception as e:
                logger.error(f"Failed to load streams from Supabase, falling back to file: {e}")

        try:
            loaded = self._load_streams_from_file(persist=False)
            logger.info(f"Loaded {loaded} persisted streams from {self.streams_store_path}")
            # If Supabase is configured but table was empty, backfill it from local file.
            if self.is_supabase_configured() and loaded_from_supabase == 0 and loaded > 0:
                try:
                    self.persist_streams()
                    logger.info(f"Backfilled {loaded} streams into Supabase table {self.supabase_streams_table}")
                except Exception as e:
                    logger.error(f"Failed to backfill Supabase from local stream store: {e}")
        except Exception as e:
            logger.error(f"Failed to load persisted streams: {e}")
    
    def detect_objects(self, frame: np.ndarray, stream_id: Optional[str] = None) -> tuple:
        """Run object detection on a frame using CPU-optimized ONNX model"""
        if self.model is None:
            return [], frame
        
        try:
            start_time = time.time()
            use_half = (
                self.use_half_precision
                and self.fp16_allowed
                and str(self.device).startswith("cuda")
            )
            
            # Run inference with CPU optimization
            inference_conf = min(self.conf_threshold, self.fire_conf_threshold, self.weapon_conf_threshold)
            try:
                results = self.model(
                    frame,
                    device=self.device,
                    verbose=False,
                    conf=inference_conf,
                    half=use_half
                )
            except Exception as e:
                msg = str(e)
                fp16_dtype_mismatch = (
                    use_half
                    and ("float16" in msg.lower())
                    and ("expected: (tensor(float))".lower() in msg.lower() or "expected float" in msg.lower())
                )
                if not fp16_dtype_mismatch:
                    raise

                # Safe fallback: disable FP16 after first mismatch and retry once.
                logger.warning("FP16 input rejected by model runtime; retrying inference in FP32.")
                self.use_half_precision = False
                self.fp16_allowed = False
                results = self.model(
                    frame,
                    device=self.device,
                    verbose=False,
                    conf=inference_conf,
                    half=False
                )
            
            inference_time = time.time() - start_time
            self.model_info["inference_time"] = inference_time
            
            detections = []
            target_classes = set()
            if stream_id and stream_id in self.streams:
                configured = self.streams[stream_id].get("target_classes", [])
                if isinstance(configured, list):
                    target_classes = {str(c).strip().lower() for c in configured if str(c).strip()}
            
            # Parse results
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    class_name = result.names[int(box.cls)]
                    confidence = float(box.conf)
                    normalized_class = str(class_name).strip().lower()
                    if normalized_class == "fire":
                        required_conf = self.fire_conf_threshold
                    elif normalized_class == "weapon":
                        required_conf = self.weapon_conf_threshold
                    else:
                        required_conf = self.conf_threshold
                    if confidence < required_conf:
                        continue
                    if target_classes and str(class_name).strip().lower() not in target_classes:
                        continue
                    detection = {
                        "id": str(uuid.uuid4()),
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": {
                            "x1": float(box.xyxy[0][0]) / frame.shape[1] * 100,
                            "y1": float(box.xyxy[0][1]) / frame.shape[0] * 100,
                            "x2": float(box.xyxy[0][2]) / frame.shape[1] * 100,
                            "y2": float(box.xyxy[0][3]) / frame.shape[0] * 100,
                        }
                    }
                    detections.append(detection)
            
            self.processing_times.append(inference_time)
            if len(self.processing_times) > 100:
                self.processing_times.pop(0)
            
            if self.draw_model_boxes:
                annotated = frame.copy()
                for det in detections:
                    x1 = int((float(det["bbox"]["x1"]) / 100.0) * frame.shape[1])
                    y1 = int((float(det["bbox"]["y1"]) / 100.0) * frame.shape[0])
                    x2 = int((float(det["bbox"]["x2"]) / 100.0) * frame.shape[1])
                    y2 = int((float(det["bbox"]["y2"]) / 100.0) * frame.shape[0])
                    label = f'{det["class_name"]} {float(det["confidence"]):.2f}'

                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 255), 2)
                    text_y = y1 - 8 if y1 > 18 else y1 + 16
                    cv2.putText(
                        annotated,
                        label,
                        (x1, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 220, 255),
                        2,
                        cv2.LINE_AA,
                    )
                return detections, annotated
            return detections, frame
            
        except Exception as e:
            logger.error(f"Error in detection: {e}")
            return [], frame
    
    def process_frame(self, stream_id: str, frame: np.ndarray) -> Optional[DetectionResult]:
        """Process a single frame"""
        if stream_id not in self.streams:
            return None
        
        # Run detection
        detections, annotated_frame = self.detect_objects(frame, stream_id=stream_id)
        
        # Create detection objects
        detection_objects = [
            Detection(
                id=det["id"],
                class_name=det["class_name"],
                confidence=det["confidence"],
                bbox=det["bbox"],
                timestamp=datetime.now().isoformat()
            )
            for det in detections
        ]
        
        # Update stats
        self.total_detections += len(detections)
        self.frames_processed += 1
        
        # Encode frame and keep in memory cache (faster than disk write on hot path)
        frame_id = str(uuid.uuid4())
        ok, encoded = cv2.imencode(
            ".jpg",
            annotated_frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
        )
        if not ok:
            logger.error("Failed to encode frame")
            return None

        frame_bytes = encoded.tobytes()
        with self.frame_cache_lock:
            self.frame_cache[frame_id] = frame_bytes
            self.frame_order.append(frame_id)
            while len(self.frame_order) > self.frame_cache_max:
                oldest = self.frame_order.pop(0)
                self.frame_cache.pop(oldest, None)

        result = DetectionResult(
            frame_id=frame_id,
            timestamp=datetime.now().isoformat(),
            detections=detection_objects,
            image_url=f"/frames/{frame_id}.jpg"
        )
        
        # Store in detections cache
        if stream_id not in self.detections:
            self.detections[stream_id] = []
        self.detections[stream_id].append(result)
        
        # Keep a short rolling window to reduce API payload/latency.
        if len(self.detections[stream_id]) > self.detections_history_size:
            self.detections[stream_id].pop(0)
        
        # Update stream detection count
        self.streams[stream_id]["current_detections"] = len(detection_objects)

        # Optional Telegram alerts (rate-limited)
        try:
            stream_name = self.streams[stream_id].get("name", stream_id)
            stream_chat_id = self.get_stream_alert_chat_id(stream_id)
            alert_pipeline.enqueue(
                stream_id,
                stream_name,
                detections,
                None,
                frame_bytes,
                stream_chat_id,
            )
        except Exception as e:
            logger.error(f"Telegram notify error: {e}")

        # Optional Supabase event logging (best-effort).
        try:
            self.log_detection_events(stream_id, detections, result.image_url)
        except Exception as e:
            logger.debug(f"Supabase detection log error: {e}")
        
        return result
    
    def capture_and_process_loop(self, stream_id: str):
        """Continuous capture and process loop"""
        camera = self.camera_captures.get(stream_id)
        if not camera:
            return
        
        if not camera.start():
            self.streams[stream_id]["status"] = "inactive"
            logger.error(f"Camera failed to start for {stream_id}. Stream set to inactive.")
            return
        min_interval = 1.0 / max(self.process_fps, 0.1)
        next_run = time.time()
        
        while self.streams[stream_id]["status"] == "active":
            frame = camera.get_frame()
            now = time.time()
            if frame is not None and now >= next_run:
                # Resize frame for faster processing
                frame = cv2.resize(frame, (self.process_width, self.process_height))
                self.process_frame(stream_id, frame)
                next_run = now + min_interval
            else:
                time.sleep(0.005)
        
        camera.stop()

    def shutdown(self):
        """Gracefully stop active stream workers and release camera resources."""
        try:
            for stream_id in list(self.streams.keys()):
                self.streams[stream_id]["status"] = "inactive"

            for camera in list(self.camera_captures.values()):
                try:
                    camera.stop()
                except Exception as e:
                    logger.error(f"Error stopping camera during shutdown: {e}")

            for _, thread in list(self.capture_threads.items()):
                if thread and thread.is_alive():
                    thread.join(timeout=1.5)

            with self.stream_alert_targets_lock:
                self.stream_alert_targets.clear()
        except Exception as e:
            logger.error(f"Detection manager shutdown error: {e}")


class TelegramNotifier:
    """Send throttled CCTV alerts to Telegram."""
    def __init__(self):
        self.enabled = os.getenv("TELEGRAM_ENABLED", "false").lower() == "true"
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
        self.min_confidence = float(os.getenv("TELEGRAM_MIN_CONFIDENCE", "0.7"))
        self.min_confidence_fire = float(os.getenv("TELEGRAM_MIN_CONFIDENCE_FIRE", str(self.min_confidence)))
        self.min_confidence_weapon = float(os.getenv("TELEGRAM_MIN_CONFIDENCE_WEAPON", str(self.min_confidence)))
        self.cooldown_sec = int(os.getenv("TELEGRAM_COOLDOWN_SEC", "30"))
        self.last_alert_at = {}

    def _resolve_chat_id(self, target_chat_id: Optional[str] = None) -> str:
        return str(target_chat_id or self.chat_id).strip()

    def is_configured(self, target_chat_id: Optional[str] = None) -> bool:
        chat_id = self._resolve_chat_id(target_chat_id)
        return self.enabled and bool(self.bot_token) and bool(chat_id)

    def _can_send(self, stream_id: str, detections: list, target_chat_id: Optional[str] = None) -> bool:
        if not self.is_configured(target_chat_id) or not detections:
            return False

        top = max(detections, key=lambda d: float(d.get("confidence", 0.0)))
        top_conf = float(top.get("confidence", 0.0))
        top_class = str(top.get("class_name", "")).strip().lower()
        if top_class == "fire":
            min_conf = self.min_confidence_fire
        elif top_class == "weapon":
            min_conf = self.min_confidence_weapon
        else:
            min_conf = self.min_confidence
        if top_conf < min_conf:
            return False

        now = time.time()
        last = self.last_alert_at.get(stream_id, 0)
        return (now - last) >= self.cooldown_sec

    def send_message(self, message: str, target_chat_id: Optional[str] = None) -> bool:
        chat_id = self._resolve_chat_id(target_chat_id)
        if not self.is_configured(chat_id):
            return False

        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = json.dumps({
                "chat_id": chat_id,
                "text": message,
            }).encode("utf-8")
            req = urllib_request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib_request.urlopen(req, timeout=10) as response:
                return response.getcode() == 200
        except Exception as e:
            logger.error(f"Telegram send failed: {e}")
            return False

    def send_photo(self, photo_path: str, caption: str, target_chat_id: Optional[str] = None) -> bool:
        chat_id = self._resolve_chat_id(target_chat_id)
        if not self.is_configured(chat_id):
            return False

        try:
            boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
            url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"

            with open(photo_path, "rb") as photo_file:
                photo_bytes = photo_file.read()

            parts = []
            parts.append(
                (
                    f"--{boundary}\r\n"
                    f'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
                    f"{chat_id}\r\n"
                ).encode("utf-8")
            )
            parts.append(
                (
                    f"--{boundary}\r\n"
                    f'Content-Disposition: form-data; name="caption"\r\n\r\n'
                    f"{caption}\r\n"
                ).encode("utf-8")
            )
            parts.append(
                (
                    f"--{boundary}\r\n"
                    f'Content-Disposition: form-data; name="photo"; filename="detection.jpg"\r\n'
                    f"Content-Type: image/jpeg\r\n\r\n"
                ).encode("utf-8")
            )
            parts.append(photo_bytes)
            parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
            body = b"".join(parts)

            req = urllib_request.Request(
                url,
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                method="POST",
            )
            with urllib_request.urlopen(req, timeout=15) as response:
                return response.getcode() == 200
        except Exception as e:
            logger.error(f"Telegram sendPhoto failed: {e}")
            return False

    def send_photo_bytes(self, photo_bytes: bytes, caption: str, target_chat_id: Optional[str] = None) -> bool:
        chat_id = self._resolve_chat_id(target_chat_id)
        if not self.is_configured(chat_id) or not photo_bytes:
            return False

        try:
            boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
            url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
            parts = []
            parts.append((f"--{boundary}\r\n" f'Content-Disposition: form-data; name="chat_id"\r\n\r\n' f"{chat_id}\r\n").encode("utf-8"))
            parts.append((f"--{boundary}\r\n" f'Content-Disposition: form-data; name="caption"\r\n\r\n' f"{caption}\r\n").encode("utf-8"))
            parts.append((f"--{boundary}\r\n" f'Content-Disposition: form-data; name="photo"; filename="detection.jpg"\r\n' f"Content-Type: image/jpeg\r\n\r\n").encode("utf-8"))
            parts.append(photo_bytes)
            parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
            body = b"".join(parts)

            req = urllib_request.Request(
                url,
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                method="POST",
            )
            with urllib_request.urlopen(req, timeout=15) as response:
                return response.getcode() == 200
        except Exception as e:
            logger.error(f"Telegram sendPhoto(bytes) failed: {e}")
            return False

    def notify_detection(
        self,
        stream_id: str,
        stream_name: str,
        detections: list,
        photo_path: Optional[str] = None,
        photo_bytes: Optional[bytes] = None,
        target_chat_id: Optional[str] = None,
    ):
        if not self._can_send(stream_id, detections, target_chat_id):
            return

        top = max(detections, key=lambda d: float(d.get("confidence", 0.0)))
        detection_type = top.get("class_name", "unknown")
        confidence = float(top.get("confidence", 0.0)) * 100
        message = (
            f"CCTV ALERT\n"
            f"Stream: {stream_name}\n"
            f"Type: {detection_type}\n"
            f"Confidence: {confidence:.2f}%\n"
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )

        sent = False
        if photo_bytes:
            sent = self.send_photo_bytes(photo_bytes, message, target_chat_id=target_chat_id)
        if not sent and photo_path and Path(photo_path).exists():
            sent = self.send_photo(photo_path, message, target_chat_id=target_chat_id)
        if not sent:
            sent = self.send_message(message, target_chat_id=target_chat_id)

        if sent:
            self.last_alert_at[stream_id] = time.time()
            logger.info(f"Telegram alert sent for {stream_id}")


class AIOutputVerifier:
    """Verify detections with a stronger VLM before Telegram delivery."""
    def __init__(self):
        self.enabled = os.getenv("VERIFY_ENABLED", "false").lower() == "true"
        self.provider = os.getenv("VERIFY_PROVIDER", "openai").strip().lower()
        self.model = os.getenv("VERIFY_MODEL", "gpt-4.1-mini").strip()
        self.api_url = os.getenv("VERIFY_API_URL", "").strip()
        raw_keys = (
            os.getenv("VERIFY_API_KEYS", "").strip()
            or os.getenv("VERIFY_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
            or os.getenv("GEMINI_API_KEY", "").strip()
        )
        # Support comma-separated keys for automatic fallback.
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.api_key = self.api_keys[0] if self.api_keys else ""
        self.timeout_sec = int(os.getenv("VERIFY_TIMEOUT_SEC", "10"))
        self.min_confidence = float(os.getenv("VERIFY_MIN_CONFIDENCE", "0.55"))
        self.send_on_error = os.getenv("VERIFY_SEND_ON_ERROR", "false").lower() == "true"
        self.target_classes = {
            c.strip().lower()
            for c in os.getenv("VERIFY_TARGET_CLASSES", "").split(",")
            if c.strip()
        }
        self.always_send_classes = {
            c.strip().lower()
            for c in os.getenv("VERIFY_ALWAYS_SEND_CLASSES", "").split(",")
            if c.strip()
        }
        if not self.api_url:
            if self.provider == "gemini":
                self.api_url = "https://generativelanguage.googleapis.com/v1beta"
            else:
                self.api_url = "https://api.openai.com/v1/chat/completions"

    def is_configured(self) -> bool:
        if not self.enabled:
            return True
        if self.provider not in {"openai", "gemini"}:
            return False
        return bool(self.api_keys) and bool(self.api_url) and bool(self.model)

    def should_verify(self, detections: list) -> bool:
        if not self.enabled or not detections:
            return False

        top = max(detections, key=lambda d: float(d.get("confidence", 0.0)))
        if float(top.get("confidence", 0.0)) < self.min_confidence:
            return False

        if self.target_classes:
            return str(top.get("class_name", "")).lower() in self.target_classes
        return True

    def _image_to_data_url(self, photo_path: str) -> str:
        with open(photo_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/jpeg;base64,{encoded}"

    def _image_to_b64(self, photo_path: str) -> str:
        with open(photo_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _image_to_b64_bytes(self, photo_bytes: bytes) -> str:
        return base64.b64encode(photo_bytes).decode("utf-8")

    def _build_openai_request(self, summary: dict, photo_path: Optional[str], photo_bytes: Optional[bytes] = None):
        content = [
            {
                "type": "text",
                "text": (
                    "Validate this CCTV alert. Return strict JSON only with keys "
                    "\"verified\" (boolean), \"reason\" (string), and \"confidence\" (0..1). "
                    "Set verified=true only if the detection is visually plausible.\n\n"
                    f"Detection summary:\n{json.dumps(summary)}"
                ),
            }
        ]
        if photo_bytes:
            try:
                data_url = f"data:image/jpeg;base64,{self._image_to_b64_bytes(photo_bytes)}"
                content.append({
                    "type": "image_url",
                    "image_url": {"url": data_url},
                })
            except Exception as e:
                logger.error(f"Verifier image encode failed: {e}")
        elif photo_path and Path(photo_path).exists():
            try:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": self._image_to_data_url(photo_path)},
                })
            except Exception as e:
                logger.error(f"Verifier image encode failed: {e}")

        payload = {
            "model": self.model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": "Return valid JSON only."},
                {"role": "user", "content": content},
            ],
            "max_tokens": 200,
        }
        req = urllib_request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        return req

    def _build_gemini_request(self, summary: dict, photo_path: Optional[str], photo_bytes: Optional[bytes] = None):
        prompt = (
            "Validate this CCTV alert. Return strict JSON only with keys "
            "\"verified\" (boolean), \"reason\" (string), and \"confidence\" (0..1). "
            "Set verified=true only if the detection is visually plausible.\n\n"
            f"Detection summary:\n{json.dumps(summary)}"
        )
        parts = [{"text": prompt}]
        if photo_bytes:
            try:
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": self._image_to_b64_bytes(photo_bytes),
                    }
                })
            except Exception as e:
                logger.error(f"Verifier image encode failed: {e}")
        elif photo_path and Path(photo_path).exists():
            try:
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": self._image_to_b64(photo_path),
                    }
                })
            except Exception as e:
                logger.error(f"Verifier image encode failed: {e}")

        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 200},
        }
        base = self.api_url.rstrip("/")
        if ":generateContent" in base:
            url = f"{base}?key={self.api_key}"
        else:
            url = f"{base}/models/{self.model}:generateContent?key={self.api_key}"

        req = urllib_request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        return req

    def _extract_raw_content(self, body: dict):
        if self.provider == "gemini":
            try:
                parts = body["candidates"][0]["content"]["parts"]
                return "\n".join(str(p.get("text", "")) for p in parts if isinstance(p, dict))
            except Exception:
                return ""
        return body["choices"][0]["message"]["content"]

    def _extract_json_object(self, text: str) -> Optional[dict]:
        decoder = json.JSONDecoder()
        for idx, ch in enumerate(text):
            if ch != "{":
                continue
            try:
                parsed, _ = decoder.raw_decode(text[idx:])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
        return None

    def _parse_verifier_content(self, raw_content) -> Optional[dict]:
        if isinstance(raw_content, list):
            chunks = []
            for item in raw_content:
                if isinstance(item, dict):
                    chunks.append(str(item.get("text", "")))
                else:
                    chunks.append(str(item))
            content_text = "\n".join(chunks)
        else:
            content_text = str(raw_content or "")

        candidates = [content_text.strip()]
        if "```" in content_text:
            no_fence = content_text.replace("```json", "").replace("```JSON", "").replace("```", "")
            candidates.append(no_fence.strip())

        for candidate in candidates:
            if not candidate:
                continue
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

            extracted = self._extract_json_object(candidate)
            if extracted is not None:
                return extracted

        return None

    def verify(
        self,
        stream_id: str,
        stream_name: str,
        detections: list,
        photo_path: Optional[str] = None,
        photo_bytes: Optional[bytes] = None,
    ) -> dict:
        if not self.should_verify(detections):
            return {"ok": True, "verified": True, "reason": "verification_not_required"}

        if not self.is_configured():
            return {"ok": False, "verified": False, "reason": "verifier_not_configured"}

        top = max(detections, key=lambda d: float(d.get("confidence", 0.0)))
        top_class = str(top.get("class_name", "")).strip().lower()
        if top_class in self.always_send_classes:
            return {"ok": True, "verified": True, "reason": "critical_class_bypass"}
        summary = {
            "stream_id": stream_id,
            "stream_name": stream_name,
            "top_class": top.get("class_name", "unknown"),
            "top_confidence": float(top.get("confidence", 0.0)),
            "detection_count": len(detections),
            "detections": [
                {
                    "class_name": d.get("class_name", "unknown"),
                    "confidence": round(float(d.get("confidence", 0.0)), 4),
                    "bbox": d.get("bbox", {}),
                }
                for d in detections[:10]
            ],
        }

        try:
            if self.provider == "gemini":
                last_error = None
                for key in self.api_keys:
                    self.api_key = key
                    req = self._build_gemini_request(summary, photo_path, photo_bytes)
                    try:
                        with urllib_request.urlopen(req, timeout=self.timeout_sec) as response:
                            if response.getcode() != 200:
                                last_error = f"verifier_http_{response.getcode()}"
                                continue
                            body = json.loads(response.read().decode("utf-8"))
                            raw = self._extract_raw_content(body)
                            parsed = self._parse_verifier_content(raw)
                            if parsed is None:
                                return {
                                    "ok": False,
                                    "verified": False,
                                    "reason": "verifier_parse_error",
                                    "raw_response": str(raw)[:300],
                                }
                            return {
                                "ok": True,
                                "verified": bool(parsed.get("verified", False)),
                                "reason": str(parsed.get("reason", "no_reason")),
                                "confidence": float(parsed.get("confidence", 0.0)),
                            }
                    except urllib_error.HTTPError as e:
                        code = getattr(e, "code", None)
                        # Rotate key on auth/quota errors
                        if code in {401, 403, 429}:
                            last_error = f"verifier_http_{code}"
                            continue
                        last_error = f"verifier_http_{code or 'error'}"
                        break
                    except Exception as e:
                        last_error = f"verifier_error:{e}"
                        continue
                return {"ok": False, "verified": False, "reason": last_error or "verifier_error"}
            else:
                req = self._build_openai_request(summary, photo_path, photo_bytes)
                with urllib_request.urlopen(req, timeout=self.timeout_sec) as response:
                    if response.getcode() != 200:
                        return {"ok": False, "verified": False, "reason": f"verifier_http_{response.getcode()}"}
                    body = json.loads(response.read().decode("utf-8"))
                    raw = self._extract_raw_content(body)
                    parsed = self._parse_verifier_content(raw)
                    if parsed is None:
                        return {
                            "ok": False,
                            "verified": False,
                            "reason": "verifier_parse_error",
                            "raw_response": str(raw)[:300],
                        }
                    return {
                        "ok": True,
                        "verified": bool(parsed.get("verified", False)),
                        "reason": str(parsed.get("reason", "no_reason")),
                        "confidence": float(parsed.get("confidence", 0.0)),
                    }
        except Exception as e:
            return {"ok": False, "verified": False, "reason": f"verifier_error:{e}"}


class AlertPipeline:
    """Asynchronous alert pipeline: verify then dispatch to Telegram."""
    def __init__(self, notifier: TelegramNotifier, verifier: AIOutputVerifier):
        self.notifier = notifier
        self.verifier = verifier
        self.queue = queue.Queue(maxsize=int(os.getenv("ALERT_QUEUE_MAXSIZE", "200")))
        self.enqueue_cooldown_sec = float(os.getenv("ALERT_ENQUEUE_COOLDOWN_SEC", "1.0"))
        self.last_enqueue_at = {}
        self.thread = None
        self.running = False
        self.stats = {
            "queued": 0,
            "processed": 0,
            "verified_sent": 0,
            "rejected": 0,
            "errors": 0,
        }

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()
        logger.info("Alert pipeline started")

    def enqueue(
        self,
        stream_id: str,
        stream_name: str,
        detections: list,
        photo_path: Optional[str],
        photo_bytes: Optional[bytes] = None,
        target_chat_id: Optional[str] = None,
    ):
        if not detections:
            return
        now = time.time()
        last = self.last_enqueue_at.get(stream_id, 0.0)
        if (now - last) < self.enqueue_cooldown_sec:
            return
        try:
            self.queue.put_nowait({
                "stream_id": stream_id,
                "stream_name": stream_name,
                "detections": detections,
                "photo_path": photo_path,
                "photo_bytes": photo_bytes,
                "target_chat_id": target_chat_id,
            })
            self.last_enqueue_at[stream_id] = now
            self.stats["queued"] += 1
        except queue.Full:
            self.stats["errors"] += 1
            logger.warning("Alert queue full, dropping alert candidate")

    def _worker(self):
        while self.running or not self.queue.empty():
            try:
                item = self.queue.get(timeout=0.5)
            except queue.Empty:
                continue

            try:
                decision = self.verifier.verify(
                    item["stream_id"],
                    item["stream_name"],
                    item["detections"],
                    item.get("photo_path"),
                    item.get("photo_bytes"),
                )

                if decision.get("ok") and decision.get("verified"):
                    self.notifier.notify_detection(
                        item["stream_id"],
                        item["stream_name"],
                        item["detections"],
                        item.get("photo_path"),
                        item.get("photo_bytes"),
                        item.get("target_chat_id"),
                    )
                    self.stats["verified_sent"] += 1
                elif (not decision.get("ok")) and self.verifier.send_on_error:
                    self.notifier.notify_detection(
                        item["stream_id"],
                        item["stream_name"],
                        item["detections"],
                        item.get("photo_path"),
                        item.get("photo_bytes"),
                        item.get("target_chat_id"),
                    )
                    self.stats["verified_sent"] += 1
                else:
                    self.stats["rejected"] += 1

                self.stats["processed"] += 1
            except Exception as e:
                self.stats["errors"] += 1
                logger.error(f"Alert pipeline worker error: {e}")
            finally:
                self.queue.task_done()

    def stop(self, wait_for_queue: bool = True, timeout_sec: float = 5.0):
        """Stop worker thread and optionally drain queue before exiting."""
        if not self.thread:
            self.running = False
            return

        if wait_for_queue:
            deadline = time.time() + max(timeout_sec, 0.0)
            while not self.queue.empty() and time.time() < deadline:
                time.sleep(0.05)

        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=1.5)
        self.thread = None
        logger.info("Alert pipeline stopped")

# Initialize detection manager
detector = DetectionManager()
telegram_notifier = TelegramNotifier()
verifier = AIOutputVerifier()
alert_pipeline = AlertPipeline(telegram_notifier, verifier)

def _parse_default_stream_sources() -> List[dict]:
    """
    Parse default stream list from DEFAULT_STREAM_SOURCES.
    Supported formats:
    - JSON list: [{"name":"Front","source":"0"}, {"name":"Gate","source":"rtsp://..."}]
    - CSV-like: Front Door|0,Back Gate|1,Parking|rtsp://...
    """
    raw = os.getenv("DEFAULT_STREAM_SOURCES", "").strip()
    if not raw:
        return []

    parsed: List[dict] = []
    try:
        payload = json.loads(raw)
        if isinstance(payload, list):
            for idx, item in enumerate(payload, start=1):
                if isinstance(item, dict):
                    source = str(item.get("source", "")).strip()
                    name = str(item.get("name", f"Camera {idx}")).strip() or f"Camera {idx}"
                else:
                    source = str(item).strip()
                    name = f"Camera {idx}"
                if source:
                    parsed.append({"name": name, "source": source})
        return parsed
    except json.JSONDecodeError:
        pass

    entries = [entry.strip() for entry in raw.split(",") if entry.strip()]
    for idx, entry in enumerate(entries, start=1):
        if "|" in entry:
            name, source = entry.split("|", 1)
            source = source.strip()
            name = (name.strip() or f"Camera {idx}")
        else:
            source = entry
            name = f"Camera {idx}"
        if source:
            parsed.append({"name": name, "source": source})

    return parsed


def _normalize_telegram_chat_id(raw_value: Optional[str]) -> Optional[str]:
    value = str(raw_value or "").strip()
    if not value:
        return None
    if not re.fullmatch(r"-?\d{5,20}", value):
        raise HTTPException(status_code=400, detail="Telegram chat ID must be numeric (example: 123456789 or -1001234567890)")
    return value


def _normalize_telegram_number(raw_value: Optional[str]) -> Optional[str]:
    value = str(raw_value or "").strip()
    if not value:
        return None
    compact = re.sub(r"[^\d+]", "", value)
    if compact.count("+") > 1 or ("+" in compact and not compact.startswith("+")):
        raise HTTPException(status_code=400, detail="Telegram mobile number format is invalid")
    digits = compact[1:] if compact.startswith("+") else compact
    if not digits.isdigit() or len(digits) < 7 or len(digits) > 15:
        raise HTTPException(status_code=400, detail="Telegram mobile number must contain 7 to 15 digits")
    return compact


def _extract_bearer_token(authorization: Optional[str]) -> str:
    header_value = str(authorization or "").strip()
    if not header_value:
        raise HTTPException(status_code=401, detail="Authentication required")

    parts = header_value.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return parts[1].strip()


def _require_authenticated_user(authorization: Optional[str]) -> dict:
    if not detector.is_supabase_configured():
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in CCTV/.env",
        )

    token = _extract_bearer_token(authorization)
    url = f"{detector.supabase_url}/auth/v1/user"
    headers = {
        "apikey": detector.supabase_service_role_key,
        "Authorization": f"Bearer {token}",
    }
    req = urllib_request.Request(url, headers=headers, method="GET")
    try:
        with urllib_request.urlopen(req, timeout=detector.supabase_timeout_sec) as response:
            payload = json.loads(response.read().decode("utf-8"))
            user_id = str(payload.get("id", "")).strip()
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid user token")
            return {
                "id": user_id,
                "email": str(payload.get("email", "")).strip(),
            }
    except urllib_error.HTTPError as e:
        if e.code in {401, 403}:
            raise HTTPException(status_code=401, detail="Invalid or expired user token")
        raise HTTPException(status_code=502, detail=f"Supabase auth error: HTTP {e.code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to verify user token: {e}")


def _try_get_authenticated_user(authorization: Optional[str]) -> Optional[dict]:
    try:
        return _require_authenticated_user(authorization)
    except Exception:
        return None


def _apply_stream_alert_target_for_user(stream_id: str, authorization: Optional[str]):
    """
    Best-effort stream-to-user alert mapping.
    Keeps existing global Telegram behavior untouched when no user mapping is available.
    """
    try:
        user = _try_get_authenticated_user(authorization)
        if not user:
            detector.clear_stream_alert_target(stream_id)
            return

        profile = detector.get_user_telegram_profile(user["id"]) or {}
        chat_id = str(profile.get("telegram_chat_id", "")).strip()
        if chat_id:
            detector.set_stream_alert_target(stream_id, user["id"], chat_id)
        else:
            detector.clear_stream_alert_target(stream_id)
    except Exception as e:
        logger.debug(f"Unable to set stream alert target for {stream_id}: {e}")

# ============= Routes =============

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("\n" + "=" * 60)
    logger.info("CCTV Detection API - Startup")
    logger.info("=" * 60)
    
    detector.load_model()
    detector.video_upload_dir.mkdir(parents=True, exist_ok=True)
    alert_pipeline.start()
    detector.load_persisted_streams()
    
    # Optional default streams from env for multi-camera bootstrap.
    auto_default_streams = os.getenv("AUTO_CREATE_DEFAULT_STREAMS", "false").lower() == "true"
    configured_sources = _parse_default_stream_sources()
    if configured_sources and not detector.streams:
        for idx, item in enumerate(configured_sources, start=1):
            detector.add_stream(f"stream_{idx}", item["name"], item["source"], persist=False)
        detector.persist_streams()
        logger.info(f"Loaded {len(configured_sources)} stream(s) from DEFAULT_STREAM_SOURCES")
    elif auto_default_streams and not detector.streams:
        detector.add_stream("stream_1", "Front Door Camera", "0")
        detector.add_stream("stream_2", "Back Gate Camera", "1")
        detector.add_stream("stream_3", "Parking Area", "2")
    
    logger.info(f"✓ Total streams initialized: {len(detector.streams)}")
    logger.info("=" * 60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully release resources on backend shutdown."""
    logger.info("\n" + "=" * 60)
    logger.info("CCTV Detection API - Shutdown")
    logger.info("=" * 60)
    detector.shutdown()
    alert_pipeline.stop(wait_for_queue=True, timeout_sec=5.0)
    logger.info("Graceful shutdown complete")
    logger.info("=" * 60 + "\n")

@app.get("/api/health", response_model=HealthStatus)
async def health_check():
    """Check backend health"""
    return HealthStatus(
        status="connected" if detector.model else "error",
        gpu_available=detector.get_gpu_status(),
        message="CCTV Detection API is running with YOLOv11n ONNX (CPU Optimized)",
        model_info=detector.model_info
    )

@app.get("/api/streams", response_model=List[VideoStream])
async def get_streams():
    """Get list of available video streams"""
    streams = []
    for stream_id, stream_info in detector.streams.items():
        streams.append(VideoStream(
            id=stream_id,
            name=stream_info["name"],
            status=stream_info["status"],
            current_detections=stream_info.get("current_detections", 0)
       ))
    return streams


@app.post("/api/streams", response_model=VideoStream)
async def create_stream(stream: StreamCreateRequest):
    """Create a new stream manually."""
    source = str(stream.source).strip()
    name = str(stream.name).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Stream name is required")
    if not source:
        raise HTTPException(status_code=400, detail="Stream source is required")

    stream_id = (stream.id or "").strip()
    if not stream_id:
        stream_id = f"stream_{len(detector.streams) + 1}"
        while stream_id in detector.streams:
            stream_id = f"stream_{len(detector.streams) + 1}_{uuid.uuid4().hex[:4]}"

    if stream_id in detector.streams:
        raise HTTPException(status_code=409, detail="Stream ID already exists")

    detector.add_stream(stream_id, name, source)
    return VideoStream(
        id=stream_id,
        name=name,
        status="inactive",
        current_detections=0,
    )

@app.get("/api/detections/{stream_id}", response_model=List[DetectionResult])
async def get_detections(stream_id: str):
    """Get detections for a specific stream"""
    if stream_id not in detector.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    return detector.detections.get(stream_id, [])


@app.get("/api/user/telegram", response_model=TelegramProfileResponse)
async def get_user_telegram_profile(authorization: Optional[str] = Header(default=None)):
    """Get authenticated user's Telegram setup status."""
    user = _require_authenticated_user(authorization)
    try:
        profile = detector.get_user_telegram_profile(user["id"]) or {}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load Telegram profile. Ensure {detector.supabase_user_profiles_table} exists in Supabase. Error: {e}",
        )
    telegram_chat_id = str(profile.get("telegram_chat_id", "")).strip() or None
    telegram_number = str(profile.get("telegram_number", "")).strip() or None
    updated_at = str(profile.get("updated_at", "")).strip() or None
    return TelegramProfileResponse(
        configured=bool(telegram_chat_id or telegram_number),
        telegram_chat_id=telegram_chat_id,
        telegram_number=telegram_number,
        updated_at=updated_at,
    )


@app.post("/api/user/telegram", response_model=TelegramProfileResponse)
async def upsert_user_telegram_profile(
    payload: TelegramProfileUpdateRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Save/update authenticated user's Telegram configuration.
    This is additive and does not alter existing bot dispatch logic.
    """
    user = _require_authenticated_user(authorization)
    telegram_chat_id = _normalize_telegram_chat_id(payload.telegram_chat_id)
    telegram_number = _normalize_telegram_number(payload.telegram_number)

    if not telegram_chat_id and not telegram_number:
        raise HTTPException(status_code=400, detail="Provide Telegram chat ID or Telegram mobile number")

    try:
        row = detector.upsert_user_telegram_profile(
            user_id=user["id"],
            email=user.get("email", ""),
            telegram_chat_id=telegram_chat_id,
            telegram_number=telegram_number,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save Telegram profile. Ensure {detector.supabase_user_profiles_table} exists in Supabase. Error: {e}",
        )

    # Refresh active stream mappings for this user (best effort).
    with detector.stream_alert_targets_lock:
        owned_stream_ids = [
            stream_id
            for stream_id, target in detector.stream_alert_targets.items()
            if str(target.get("user_id", "")).strip() == user["id"]
        ]
    for stream_id in owned_stream_ids:
        if telegram_chat_id:
            detector.set_stream_alert_target(stream_id, user["id"], telegram_chat_id)
        else:
            detector.clear_stream_alert_target(stream_id)

    return TelegramProfileResponse(
        configured=bool(row.get("telegram_chat_id") or row.get("telegram_number")),
        telegram_chat_id=str(row.get("telegram_chat_id", "")).strip() or None,
        telegram_number=str(row.get("telegram_number", "")).strip() or None,
        updated_at=str(row.get("updated_at", "")).strip() or None,
    )


@app.post("/api/user/telegram/test")
async def test_user_telegram_alert(authorization: Optional[str] = Header(default=None)):
    """Send a test message to authenticated user's Telegram chat ID."""
    user = _require_authenticated_user(authorization)
    try:
        profile = detector.get_user_telegram_profile(user["id"]) or {}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load Telegram profile. Ensure {detector.supabase_user_profiles_table} exists in Supabase. Error: {e}",
        )
    chat_id = str(profile.get("telegram_chat_id", "")).strip()
    if not chat_id:
        raise HTTPException(status_code=400, detail="Telegram chat ID is not configured for this user")
    if not telegram_notifier.enabled or not telegram_notifier.bot_token:
        raise HTTPException(status_code=400, detail="Telegram bot is not configured on backend")

    sent = telegram_notifier.send_message(
        f"CCTV user test alert at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        target_chat_id=chat_id,
    )
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send Telegram test alert")
    return {"message": "Telegram test alert sent", "chat_id": chat_id}

@app.post("/api/detection/start/{stream_id}")
async def start_detection(stream_id: str, authorization: Optional[str] = Header(default=None)):
    """Start detection on a stream - opens camera"""
    if stream_id not in detector.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    detector.streams[stream_id]["status"] = "active"
    
    # Start camera capture thread if not already running
    if stream_id not in detector.capture_threads or not detector.capture_threads[stream_id].is_alive():
        thread = threading.Thread(
            target=detector.capture_and_process_loop,
            args=(stream_id,),
            daemon=True
        )
        detector.capture_threads[stream_id] = thread
        thread.start()
        logger.info(f"Camera capture started: {stream_id}")

    _apply_stream_alert_target_for_user(stream_id, authorization)
    detector.log_camera_feed_event(stream_id, "start")
    
    logger.info(f"Detection started: {stream_id}")
    return {"message": f"Detection started on {stream_id}", "status": "active"}

@app.post("/api/detection/stop/{stream_id}")
async def stop_detection(stream_id: str):
    """Stop detection on a stream - closes camera"""
    if stream_id not in detector.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    detector.streams[stream_id]["status"] = "inactive"
    
    # Stop camera if it was running
    if stream_id in detector.camera_captures:
        detector.camera_captures[stream_id].stop()
    detector.clear_stream_alert_target(stream_id)
    detector.log_camera_feed_event(stream_id, "stop")
    
    logger.info(f"Detection stopped: {stream_id}")
    return {"message": f"Detection stopped on {stream_id}", "status": "inactive"}

@app.post("/api/detection/start-with-input/{stream_id}")
async def start_detection_with_input(
    stream_id: str,
    video_input: VideoInputRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Start detection with custom video input (webcam, IP camera, or video file)"""
    if stream_id not in detector.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    try:
        input_method = str(video_input.input_method or "").strip().lower()
        raw_source = str(video_input.input_source or "").strip()
        source_str = ""

        if input_method == "webcam":
            if not raw_source:
                raw_source = "0"
            if not raw_source.lstrip("-").isdigit():
                raise HTTPException(status_code=400, detail="Webcam source must be a numeric camera index (example: 0)")
            source_str = str(int(raw_source))
        elif input_method == "ip_camera":
            if not raw_source:
                raise HTTPException(status_code=400, detail="IP camera URL is required")
            source_str = raw_source
            if "://" not in source_str and source_str:
                source_str = f"http://{source_str}"
        elif input_method == "video_file":
            if not raw_source:
                raise HTTPException(status_code=400, detail="Video file path is required")
            file_path = Path(raw_source)
            if not file_path.exists():
                raise HTTPException(status_code=400, detail=f"Video file not found: {raw_source}")
            source_str = raw_source
        else:
            raise HTTPException(status_code=400, detail="Invalid input method")

        # Stop any running capture first to avoid stale handle/thread collisions.
        current_thread = detector.capture_threads.get(stream_id)
        current_camera = detector.camera_captures.get(stream_id)
        if current_camera:
            current_camera.stop()
        if current_thread and current_thread.is_alive():
            detector.streams[stream_id]["status"] = "inactive"
            current_thread.join(timeout=1.0)

        # Fast failure: open once and reuse the same capture object to avoid double-open latency.
        probe_camera = CameraCapture(source_str)
        if not probe_camera.start():
            raise HTTPException(
                status_code=400,
                detail=f"Unable to open {input_method} source '{source_str}'. Check camera/URL/path and try again.",
            )
        detector.camera_captures[stream_id] = probe_camera
        detector.streams[stream_id]["source"] = source_str
        detector.streams[stream_id]["input_method"] = input_method
        target_classes = video_input.target_classes if isinstance(video_input.target_classes, list) else []
        normalized_classes = []
        seen = set()
        for cls_name in target_classes:
            cls_norm = str(cls_name).strip().lower()
            if not cls_norm or cls_norm in seen:
                continue
            seen.add(cls_norm)
            normalized_classes.append(cls_norm)
        detector.streams[stream_id]["target_classes"] = normalized_classes
        detector.streams[stream_id]["status"] = "active"
        detector.persist_streams()

        thread = threading.Thread(
            target=detector.capture_and_process_loop,
            args=(stream_id,),
            daemon=True
        )
        detector.capture_threads[stream_id] = thread
        thread.start()
        logger.info(f"Camera capture started: {stream_id} ({input_method}: {source_str})")
        _apply_stream_alert_target_for_user(stream_id, authorization)
        detector.log_camera_feed_event(stream_id, "start")

        logger.info(f"Detection started with custom input: {stream_id}")
        return {
            "message": f"Detection started on {stream_id}",
            "status": "active",
            "input_method": input_method,
            "input_source": source_str,
            "target_classes": normalized_classes,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting detection with input: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file and return backend-local path for detection."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Video file is required")

    safe_name = Path(file.filename).name
    suffix = Path(safe_name).suffix or ".mp4"
    suffix = suffix.lower()
    if suffix not in detector.allowed_video_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {sorted(detector.allowed_video_extensions)}",
        )
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    target_path = detector.video_upload_dir / stored_name

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        max_bytes = detector.max_upload_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(status_code=400, detail=f"File is too large. Max size is {detector.max_upload_size_mb} MB")
        target_path.write_bytes(content)
        return {
            "filename": safe_name,
            "stored_path": str(target_path.resolve()),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Video upload failed: {e}")

@app.get("/api/statistics", response_model=Statistics)
async def get_statistics():
    """Get detection statistics"""
    active_count = sum(1 for s in detector.streams.values() if s["status"] == "active")
    avg_time = np.mean(detector.processing_times) if detector.processing_times else 0.0
    
    return Statistics(
        total_detections=detector.total_detections,
        active_streams=active_count,
        processing_time=float(avg_time),
        frames_processed=detector.frames_processed
    )

@app.get("/frames/{frame_id}.jpg")
async def get_frame(frame_id: str):
    """Get a specific frame image"""
    with detector.frame_cache_lock:
        frame_bytes = detector.frame_cache.get(frame_id)
    if frame_bytes:
        return Response(content=frame_bytes, media_type="image/jpeg")

    frame_path = Path("temp_frames") / f"{frame_id}.jpg"
    if not frame_path.exists():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(frame_path, media_type="image/jpeg")

@app.post("/api/process-frame/{stream_id}")
async def process_frame(stream_id: str):
    """Process a frame from a stream"""
    if stream_id not in detector.streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # If camera is running, get real frame, otherwise use dummy
    camera = detector.camera_captures.get(stream_id)
    if camera and camera.latest_frame is not None:
        frame = camera.latest_frame.copy()
    else:
        frame = np.ones((480, 640, 3), dtype=np.uint8) * 200
        frame[100:300, 150:450] = np.random.randint(50, 200, (200, 300, 3), dtype=np.uint8)
    
    result = detector.process_frame(stream_id, frame)
    
    if result is None:
        raise HTTPException(status_code=500, detail="Processing failed")
    
    logger.info(f"Frame processed for {stream_id}: {len(result.detections)} detections")
    return result

@app.get("/api/info")
async def get_info():
    """Get API information"""
    return {
        "name": "CCTV Detection API",
        "version": "1.0.0",
        "device": detector.device.upper(),
        "model_loaded": detector.model is not None,
        "model_info": detector.model_info,
        "gpu_available": detector.get_gpu_status(),
        "optimization": "YOLOv11n ONNX (CPU Optimized)",
        "stream_storage": {
            "provider": "supabase" if detector.is_supabase_configured() else "file",
            "supabase_configured": detector.is_supabase_configured(),
            "supabase_url_set": bool(detector.supabase_url),
            "supabase_service_key_set": bool(detector.supabase_service_role_key),
            "supabase_table": detector.supabase_streams_table,
            "user_profiles_table": detector.supabase_user_profiles_table,
            "fallback_file": str(detector.streams_store_path),
        },
        "telegram": {
            "enabled": telegram_notifier.enabled,
            "configured": telegram_notifier.is_configured(),
            "min_confidence": telegram_notifier.min_confidence,
            "cooldown_sec": telegram_notifier.cooldown_sec,
        },
        "verifier": {
            "enabled": verifier.enabled,
            "configured": verifier.is_configured(),
            "provider": verifier.provider,
            "model": verifier.model,
            "timeout_sec": verifier.timeout_sec,
            "min_confidence": verifier.min_confidence,
            "send_on_error": verifier.send_on_error,
            "target_classes": sorted(list(verifier.target_classes)),
            "pipeline": {
                "queue_size": alert_pipeline.queue.qsize(),
                **alert_pipeline.stats,
            },
        },
        "frameworks": {
            "fastapi": "0.104.1",
            "ultralytics": "latest",
            "pytorch": torch.__version__,
            "opencv": cv2.__version__
        }
    }

@app.get("/api/telegram/status")
async def telegram_status():
    """Get Telegram notifier status."""
    return {
        "enabled": telegram_notifier.enabled,
        "configured": telegram_notifier.is_configured(),
        "bot_token_set": bool(telegram_notifier.bot_token),
        "chat_id_set": bool(telegram_notifier.chat_id),
        "min_confidence": telegram_notifier.min_confidence,
        "cooldown_sec": telegram_notifier.cooldown_sec,
    }


@app.get("/api/supabase/status")
async def supabase_status():
    """Get Supabase stream storage status."""
    return {
        "configured": detector.is_supabase_configured(),
        "supabase_url_set": bool(detector.supabase_url),
        "supabase_service_key_set": bool(detector.supabase_service_role_key),
        "table": detector.supabase_streams_table,
        "timeout_sec": detector.supabase_timeout_sec,
        "fallback_file": str(detector.streams_store_path),
        "last_error": detector.last_supabase_error or None,
        "event_logging_enabled": detector.supabase_event_logging_enabled,
        "tables": {
            "streams": detector.supabase_streams_table,
            "camera_feeds": detector.supabase_camera_feeds_table,
            "detections": detector.supabase_detections_table,
            "security_events": detector.supabase_security_events_table,
            "user_profiles": detector.supabase_user_profiles_table,
        },
    }

@app.post("/api/supabase/sync")
async def supabase_sync():
    """Manually sync current stream records to Supabase."""
    if not detector.is_supabase_configured():
        raise HTTPException(
            status_code=400,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in CCTV/.env",
        )

    detector.persist_streams()
    return {
        "ok": True,
        "message": "Streams synced to Supabase",
        "table": detector.supabase_streams_table,
        "stream_count": len(detector.streams),
        "last_error": detector.last_supabase_error or None,
    }

@app.post("/api/test-telegram-alert")
async def test_telegram_alert():
    """Send a test Telegram alert."""
    if not telegram_notifier.is_configured():
        raise HTTPException(status_code=400, detail="Telegram is not configured")

    sent = telegram_notifier.send_message(
        f"CCTV test alert at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send Telegram alert")

    return {"message": "Test Telegram alert sent"}


@app.get("/api/verifier/status")
async def verifier_status():
    """Get verifier and async alert pipeline status."""
    return {
        "enabled": verifier.enabled,
        "configured": verifier.is_configured(),
        "provider": verifier.provider,
        "model": verifier.model,
        "timeout_sec": verifier.timeout_sec,
        "min_confidence": verifier.min_confidence,
        "send_on_error": verifier.send_on_error,
        "target_classes": sorted(list(verifier.target_classes)),
        "pipeline": {
            "queue_size": alert_pipeline.queue.qsize(),
            **alert_pipeline.stats,
        },
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CCTV Detection API with YOLOv11n ONNX",
        "docs": "/docs",
        "redoc": "/redoc",
        "info": "/api/info",
        "health": "/api/health"
    }

# ============= Main =============
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=False,
        log_level="info"
    )



