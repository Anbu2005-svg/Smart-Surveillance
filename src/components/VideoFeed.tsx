import React, { useEffect, useRef, useState } from 'react';
import { DetectionResult } from '../services/api';
import { formatTimestamp } from '../utils/helpers';
import { Eye, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { AuthenticatedFrameImage } from './AuthenticatedFrameImage';

interface VideoFeedProps {
  detectionResult: DetectionResult | null;
  isLoading: boolean;
  streamId?: string;
  isStreamActive?: boolean;
  localStream?: MediaStream | null;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  detectionResult,
  isLoading,
  streamId: _streamId,
  isStreamActive = false,
  localStream = null,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const displayedResult = detectionResult;

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  return (
    <div ref={containerRef} className="bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-800">
      <div className="aspect-video bg-black relative flex items-center justify-center">
        {localStream ? (
          <div className="relative w-full h-full">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs text-cyan-200 border border-cyan-500/30 font-medium">
              Device camera live
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2.5"></div>
              <p className="text-gray-400 text-xs sm:text-sm">Loading surveillance feed...</p>
            </div>
          </div>
        ) : displayedResult?.image_url ? (
          <div className="relative w-full h-full">
            <AuthenticatedFrameImage
              src={displayedResult.image_url}
              alt="Video feed"
              className="w-full h-full object-contain"
              refreshKey={autoRefresh ? displayedResult.timestamp : displayedResult.frame_id}
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                  <p className="text-gray-400 text-xs sm:text-sm">Loading video feed...</p>
                </div>
              }
            />
          </div>
        ) : isStreamActive ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 px-4">
            <div className="text-center">
              <div className="w-9 h-9 border-4 border-gray-800 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2.5"></div>
              <p className="text-gray-300 text-xs sm:text-sm font-medium">Waiting for video stream...</p>
              <p className="text-gray-500 text-xs mt-1">Capture starting on server</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 px-4">
            <div className="text-center">
              <Eye className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-400 text-xs sm:text-sm font-medium">No video feed selected</p>
              <p className="text-gray-600 text-xs mt-0.5">Click Start on a stream to begin</p>
            </div>
          </div>
        )}

        {/* Quick Fullscreen Overlay Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute right-2.5 top-2.5 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/90 border border-white/10 backdrop-blur-sm transition active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Video'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="bg-gray-900/90 px-3.5 py-2.5 border-t border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 truncate">
              {displayedResult?.timestamp ? formatTimestamp(displayedResult.timestamp) : 'Live Ready'}
            </p>
            <p className="text-xs font-semibold text-cyan-300 mt-0.5">
              {displayedResult?.detections.length || 0} objects detected
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition active:scale-95 ${autoRefresh
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition active:scale-95"
              title="Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
