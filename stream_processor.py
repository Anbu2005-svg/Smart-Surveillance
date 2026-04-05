import cv2
import threading
import queue
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class VideoStreamProcessor:
    """Handles real-time video stream processing"""
    
    def __init__(self, stream_id: str, source: str, max_queue_size: int = 30):
        """
        Initialize video stream processor
        
        Args:
            stream_id: Unique identifier for the stream
            source: Video source (file path, URL, or camera index)
            max_queue_size: Maximum number of frames to keep in queue
        """
        self.stream_id = stream_id
        self.source = source
        self.max_queue_size = max_queue_size
        
        self.frame_queue = queue.Queue(maxsize=max_queue_size)
        self.is_running = False
        self.thread = None
        self.cap = None
        
        self.frame_count = 0
        self.fps = 0
        self.resolution = (640, 480)
        
    def start(self):
        """Start the video stream"""
        if self.is_running:
            return
        
        self.is_running = True
        self.thread = threading.Thread(target=self._process_stream, daemon=True)
        self.thread.start()
        logger.info(f"Started video stream: {self.stream_id}")
    
    def stop(self):
        """Stop the video stream"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2)
        if self.cap:
            self.cap.release()
        logger.info(f"Stopped video stream: {self.stream_id}")
    
    def _process_stream(self):
        """Internal method to process video stream"""
        try:
            # Open video source
            self.cap = cv2.VideoCapture(int(self.source) if self.source.isdigit() else self.source)
            
            if not self.cap.isOpened():
                logger.error(f"Failed to open video source: {self.source}")
                self.is_running = False
                return
            
            # Get stream properties
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.resolution = (width, height)
            
            logger.info(f"Stream {self.stream_id} opened: {self.resolution} @ {self.fps}fps")
            
            while self.is_running:
                ret, frame = self.cap.read()
                
                if not ret:
                    logger.warning(f"Failed to read frame from {self.stream_id}")
                    break
                
                # Try to put frame in queue (drop if full)
                try:
                    self.frame_queue.put(frame, block=False)
                    self.frame_count += 1
                except queue.Full:
                    # Drop oldest frame
                    try:
                        self.frame_queue.get_nowait()
                        self.frame_queue.put(frame, block=False)
                    except queue.Empty:
                        pass
        
        except Exception as e:
            logger.error(f"Error processing stream {self.stream_id}: {e}")
        
        finally:
            if self.cap:
                self.cap.release()
            self.is_running = False
    
    def get_frame(self) -> Optional[np.ndarray]:
        """Get the latest frame from the queue"""
        try:
            # Clear old frames, keep only the latest
            while self.frame_queue.qsize() > 1:
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    break
            
            return self.frame_queue.get_nowait()
        except queue.Empty:
            return None
    
    def get_info(self) -> dict:
        """Get stream information"""
        return {
            "stream_id": self.stream_id,
            "source": self.source,
            "is_running": self.is_running,
            "frame_count": self.frame_count,
            "fps": self.fps,
            "resolution": self.resolution,
            "queue_size": self.frame_queue.qsize()
        }


class FrameWriter:
    """Writes annotated frames to disk"""
    
    def __init__(self, output_dir: str = "output_frames"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def write_frame(self, frame: np.ndarray, filename: str) -> str:
        """Write a frame to disk"""
        output_path = self.output_dir / filename
        cv2.imwrite(str(output_path), frame)
        return str(output_path)
    
    def write_with_detections(self, frame: np.ndarray, detections: list) -> str:
        """Write frame with detection boxes drawn"""
        annotated_frame = frame.copy()
        
        height, width = frame.shape[:2]
        
        for det in detections:
            bbox = det["bbox"]
            
            # Convert from percentage to pixels
            x1 = int(bbox["x1"] / 100 * width)
            y1 = int(bbox["y1"] / 100 * height)
            x2 = int(bbox["x2"] / 100 * width)
            y2 = int(bbox["y2"] / 100 * height)
            
            # Color by class
            colors = {
                "person": (0, 0, 255),      # Red
                "car": (255, 0, 0),         # Blue
                "bike": (0, 165, 255),      # Orange
                "truck": (128, 0, 128),     # Purple
            }
            color = colors.get(det["class_name"], (0, 255, 0))  # Default green
            
            # Draw box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{det['class_name']} {det['confidence']:.2f}"
            cv2.putText(annotated_frame, label, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        filename = f"frame_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        return self.write_frame(annotated_frame, filename)


class StreamManager:
    """Manages multiple video streams"""
    
    def __init__(self):
        self.streams = {}
        self.frame_writer = FrameWriter()
    
    def add_stream(self, stream_id: str, source: str, name: str = ""):
        """Add a new stream"""
        if stream_id not in self.streams:
            processor = VideoStreamProcessor(stream_id, source)
            self.streams[stream_id] = {
                "processor": processor,
                "name": name or stream_id,
                "added_at": datetime.now()
            }
    
    def start_stream(self, stream_id: str):
        """Start processing a stream"""
        if stream_id in self.streams:
            self.streams[stream_id]["processor"].start()
    
    def stop_stream(self, stream_id: str):
        """Stop processing a stream"""
        if stream_id in self.streams:
            self.streams[stream_id]["processor"].stop()
    
    def get_frame(self, stream_id: str) -> Optional[np.ndarray]:
        """Get latest frame from a stream"""
        if stream_id in self.streams:
            return self.streams[stream_id]["processor"].get_frame()
        return None
    
    def stop_all(self):
        """Stop all streams"""
        for stream_id in self.streams:
            self.stop_stream(stream_id)
    
    def get_all_info(self) -> dict:
        """Get info about all streams"""
        info = {}
        for stream_id, stream_data in self.streams.items():
            info[stream_id] = {
                "name": stream_data["name"],
                **stream_data["processor"].get_info()
            }
        return info
