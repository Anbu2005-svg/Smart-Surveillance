FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    API_HOST=0.0.0.0 \
    API_PORT=5000 \
    MODEL_PATH="CCTV/best.onnx" \
    DEVICE=cpu \
    USE_HALF_PRECISION=false \
    PREFER_QUANTIZED_MODEL=false \
    IMAGE_USE_FALLBACK_MODEL_FIRST=true \
    USE_DIRECT_ONNX=true \
    ONNX_INTRA_OP_THREADS=2 \
    ONNX_INTER_OP_THREADS=1 \
    INFERENCE_LOCK_TIMEOUT_SEC=45 \
    CONFIDENCE_THRESHOLD=0.25 \
    IMAGE_CONFIDENCE_THRESHOLD=0.05 \
    LOG_EMPTY_DETECTION_SCORES=true \
    TELEGRAM_MIN_CONFIDENCE=0.05 \
    TELEGRAM_MIN_CONFIDENCE_FIRE=0.05 \
    TELEGRAM_MIN_CONFIDENCE_WEAPON=0.05 \
    INFERENCE_IMGSZ=640 \
    IMAGE_PROCESS_MAX_DIM=640 \
    DRAW_MODEL_BOXES=true \
    PROCESS_FRAME_WIDTH=416 \
    PROCESS_FRAME_HEIGHT=312 \
    MAX_CACHED_FRAMES=4 \
    DETECTIONS_HISTORY_SIZE=2 \
    DETECTION_PROCESS_FPS=4 \
    JPEG_QUALITY=55 \
    VIDEO_UPLOAD_DIR="uploaded_videos"

WORKDIR /app

# OpenCV/ONNX runtime dependencies + ffmpeg for network/video stream handling.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /usr/sbin/nologin appuser

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Backend source files
COPY main.py config.py stream_processor.py quantize_model.py ./
COPY streams_store.json ./

# Model assets required by inference (kept separate to avoid copying local venvs).
RUN mkdir -p CCTV
COPY ["CCTV/best (1).onnx", "CCTV/best (1).onnx"]
RUN cp "CCTV/best (1).onnx" "CCTV/best.onnx"
RUN python quantize_model.py || cp "CCTV/best.onnx" "CCTV/best-int8.onnx"
COPY CCTV/openvino/ CCTV/openvino/

RUN mkdir -p temp_frames uploaded_videos output_frames \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-${API_PORT}}/api/health" || exit 1

CMD ["sh", "-c", "uvicorn main:app --host ${API_HOST} --port ${PORT:-${API_PORT}} --workers 1 --proxy-headers"]
