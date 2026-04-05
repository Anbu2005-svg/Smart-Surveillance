import { useState, useEffect } from 'react';
import { detectionAPI, DetectionResult, TelegramProfile, VideoStream, VerifierStatus } from '../services/api';

export const useDetections = (streamId: string) => {
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollMs = Number(import.meta.env.VITE_DETECTIONS_POLL_MS || 100);

  useEffect(() => {
    if (!streamId) {
      setDetections([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchDetections = async () => {
      if (cancelled) return;
      try {
        setError(null);
        const data = await detectionAPI.getDetections(streamId);
        if (cancelled) return;
        setDetections(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch detections');
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchDetections, pollMs);
        }
      }
    };

    setLoading(true);
    fetchDetections().finally(() => setLoading(false));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [streamId, pollMs]);

  return { detections, loading, error };
};

export const useMultiDetections = (streamIds: string[]) => {
  const [detectionsByStream, setDetectionsByStream] = useState<Record<string, DetectionResult[]>>({});
  const [loadingByStream, setLoadingByStream] = useState<Record<string, boolean>>({});
  const pollMs = Number(import.meta.env.VITE_MULTI_DETECTIONS_POLL_MS || import.meta.env.VITE_DETECTIONS_POLL_MS || 250);
  const streamKey = streamIds.slice().sort().join('|');

  useEffect(() => {
    const uniqueStreamIds = [...new Set(streamIds.filter(Boolean))];
    if (uniqueStreamIds.length === 0) {
      setDetectionsByStream({});
      setLoadingByStream({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const bootstrapLoadingState = uniqueStreamIds.reduce<Record<string, boolean>>((acc, streamId) => {
      acc[streamId] = true;
      return acc;
    }, {});
    setLoadingByStream(bootstrapLoadingState);

    const fetchAll = async () => {
      if (cancelled) return;

      const results = await Promise.allSettled(
        uniqueStreamIds.map(async (streamId) => {
          const detections = await detectionAPI.getDetections(streamId);
          return { streamId, detections };
        })
      );

      if (cancelled) return;

      setDetectionsByStream((prev) => {
        const next: Record<string, DetectionResult[]> = {};
        for (const streamId of uniqueStreamIds) {
          next[streamId] = prev[streamId] || [];
        }

        for (const result of results) {
          if (result.status === 'fulfilled') {
            next[result.value.streamId] = result.value.detections;
          }
        }
        return next;
      });

      setLoadingByStream((prev) => {
        const next = { ...prev };
        for (const streamId of uniqueStreamIds) {
          next[streamId] = false;
        }
        return next;
      });

      if (!cancelled) {
        timer = setTimeout(fetchAll, pollMs);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs, streamKey, streamIds]);

  return { detectionsByStream, loadingByStream };
};

export const useVideoStreams = () => {
  const [streams, setStreams] = useState<VideoStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchStreams = async () => {
      if (cancelled) return;
      try {
        setLoading(true);
        setError(null);
        const data = await detectionAPI.getVideoStreams();
        if (cancelled) return;
        setStreams(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch streams');
      } finally {
        if (cancelled) return;
        setLoading(false);
        timer = setTimeout(fetchStreams, 5000);
      }
    };

    fetchStreams();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { streams, loading, error };
};

export const useHealthStatus = () => {
  const [health, setHealth] = useState<{ status: string; gpu_available: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkHealth = async () => {
      if (cancelled) return;
      try {
        setError(null);
        const data = await detectionAPI.getHealthStatus();
        if (cancelled) return;
        setHealth(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to check health');
      } finally {
        if (!cancelled) {
          timer = setTimeout(checkHealth, 10000);
        }
      }
    };

    checkHealth();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { health, error };
};

export const useVerifierStatus = () => {
  const [verifier, setVerifier] = useState<VerifierStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchVerifierStatus = async () => {
      if (cancelled) return;
      try {
        setError(null);
        const data = await detectionAPI.getVerifierStatus();
        if (cancelled) return;
        setVerifier(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch verifier status');
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchVerifierStatus, 5000);
        }
      }
    };

    fetchVerifierStatus();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { verifier, error };
};

export const useTelegramProfile = () => {
  const [profile, setProfile] = useState<TelegramProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await detectionAPI.getTelegramProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Telegram profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { profile, loading, error, refresh };
};
