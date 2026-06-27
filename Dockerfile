FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsm6 libxext6 libxrender1 libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY main.py config.py stream_processor.py .

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p temp_frames uploaded_videos output_frames \
    && chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 5000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
