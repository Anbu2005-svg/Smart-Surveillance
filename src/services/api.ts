import axios from 'axios';
import { supabase } from '../config/supabase';

const getDefaultApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }

    if (hostname.endsWith('.onrender.com')) {
      return `${protocol}//${hostname.replace('frontend', 'backend')}/api`;
    }
  }

  return 'http://localhost:5000/api';
};

const normalizeApiBaseUrl = (value: string): string => {
  const fallback = getDefaultApiBaseUrl();
  const rawValue = (value || fallback).trim() || fallback;

  try {
    const url = new URL(rawValue);
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    if (!url.pathname.endsWith('/api')) {
      url.pathname = `${url.pathname}/api`.replace(/\/{2,}/g, '/');
    }
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    const cleaned = rawValue.replace(/([^:])\/{2,}/g, '$1/').replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Detection {
  id: string;
  class_name: string;
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

export interface VerifierPipelineStats {
  queue_size: number;
  queued: number;
  processed: number;
  verified_sent: number;
  rejected: number;
  errors: number;
}

export interface VerifierStatus {
  enabled: boolean;
  configured: boolean;
  provider: string;
  model: string;
  timeout_sec: number;
  min_confidence: number;
  send_on_error: boolean;
  target_classes: string[];
  pipeline: VerifierPipelineStats;
}

export interface TelegramProfile {
  configured: boolean;
  telegram_chat_id: string | null;
  telegram_number: string | null;
  updated_at: string | null;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Authentication required');
  }
  return { Authorization: `Bearer ${accessToken}` };
};

export const detectionAPI = {
  // Get list of available video streams
  getVideoStreams: async (): Promise<VideoStream[]> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get('/streams', { headers });
    return response.data;
  },

  // Create a new stream manually
  createStream: async (
    name: string,
    source: string,
    id?: string
  ): Promise<VideoStream> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post('/streams', { name, source, id }, { headers });
    return response.data;
  },

  // Get current detections from a specific stream
  getDetections: async (streamId: string): Promise<DetectionResult[]> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get(`/detections/${streamId}`, { headers });
    return response.data;
  },

  // Start detection on a stream
  startDetection: async (streamId: string): Promise<{ message: string }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(`/detection/start/${streamId}`, {}, { headers });
    return response.data;
  },

  // Start detection with custom video input
  startDetectionWithInput: async (
    streamId: string,
    inputMethod: string,
    inputSource: string,
    targetClasses?: string[]
  ): Promise<{ message: string; status: string; input_method: string; input_source: string; target_classes?: string[] }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(
      `/detection/start-with-input/${streamId}`,
      {
        input_method: inputMethod,
        input_source: inputSource,
        target_classes: targetClasses && targetClasses.length > 0 ? targetClasses : [],
      },
      { headers }
    );
    return response.data;
  },

  uploadVideoFile: async (file: File): Promise<{ filename: string; stored_path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const response = await apiClient.post('/upload-video', formData, {
      headers,
    });
    return response.data;
  },

  // Stop detection on a stream
  stopDetection: async (streamId: string): Promise<{ message: string }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(`/detection/stop/${streamId}`, {}, { headers });
    return response.data;
  },

  // Process a single frame (for real-time updates)
  processFrame: async (streamId: string): Promise<DetectionResult> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(`/process-frame/${streamId}`, {}, { headers });
    return response.data;
  },

  processBrowserFrame: async (
    streamId: string,
    frame: Blob,
    targetClasses: string[] = []
  ): Promise<DetectionResult> => {
    const formData = new FormData();
    formData.append('file', frame, `browser-frame-${Date.now()}.jpg`);
    if (targetClasses.length > 0) {
      formData.append('target_classes', JSON.stringify(targetClasses));
    }
    const headers = await getAuthHeaders();
    const response = await apiClient.post(`/process-browser-frame/${streamId}`, formData, {
      headers,
      timeout: 30000,
    });
    return response.data;
  },

  // Get health status of the backend
  getHealthStatus: async (): Promise<{ status: string; gpu_available: boolean }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Get statistics
  getStatistics: async (): Promise<{
    total_detections: number;
    active_streams: number;
    processing_time: number;
  }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get('/statistics', { headers });
    return response.data;
  },

  // Get AI verifier and alert pipeline status
  getVerifierStatus: async (): Promise<VerifierStatus> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get('/verifier/status', { headers });
    return response.data;
  },

  // Get authenticated user's Telegram setup details
  getTelegramProfile: async (): Promise<TelegramProfile> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get('/user/telegram', { headers });
    return response.data;
  },

  // Save/update authenticated user's Telegram setup
  upsertTelegramProfile: async (
    telegram_chat_id?: string,
    telegram_number?: string
  ): Promise<TelegramProfile> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(
      '/user/telegram',
      {
        telegram_chat_id: telegram_chat_id || null,
        telegram_number: telegram_number || null,
      },
      { headers }
    );
    return response.data;
  },

  // Send a test Telegram message to authenticated user's chat id
  sendTelegramTestAlert: async (): Promise<{ message: string; chat_id: string }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post('/user/telegram/test', {}, { headers });
    return response.data;
  },

  // Request OTP for Telegram verification (auto chat-ID discovery)
  requestTelegramOTP: async (
    telegram_number: string
  ): Promise<{
    message: string;
    otp: string;
    expires_in: number;
    bot_username: string | null;
  }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.post(
      '/user/telegram/request-otp',
      { telegram_number },
      { headers }
    );
    return response.data;
  },

  // Check OTP verification status (poll this after requesting OTP)
  getTelegramOTPStatus: async (): Promise<{
    status: string;
    chat_id_discovered?: string;
    telegram_number?: string;
  }> => {
    const headers = await getAuthHeaders();
    const response = await apiClient.get('/user/telegram/otp-status', { headers });
    return response.data;
  },

  getFrameObjectUrl: async (imageUrl: string): Promise<string> => {
    const headers = await getAuthHeaders();
    const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
    const response = await axios.get(absoluteUrl, {
      headers,
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg);
          return String(item);
        })
        .join(', ');
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Request failed';
};

export default apiClient;
