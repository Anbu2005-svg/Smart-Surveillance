export interface Detection {
  id: string;
  class: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  timestamp: string;
}

export interface DetectionResult {
  frame_id: string;
  timestamp: string;
  detections: Detection[];
  image_url: string;
}

export interface VideoStream {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  current_detections: number;
}

export interface Statistics {
  total_detections: number;
  active_streams: number;
  processing_time: number;
}

export interface HealthStatus {
  status: string;
  gpu_available: boolean;
}
