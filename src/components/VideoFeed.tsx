import React, { useEffect, useRef, useState } from 'react';
import { DetectionResult } from '../services/api';
import { formatTimestamp } from '../utils/helpers';
import { Eye, RefreshCw } from 'lucide-react';
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
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const displayedResult = detectionResult;

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      <div className="aspect-video bg-black relative">
        {localStream ? (
          <div className="relative w-full h-full">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-cyan-100">
              Device camera live
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400">Loading video feed...</p>
            </div>
          </div>
        ) : displayedResult?.image_url ? (
          <div className="relative w-full h-full">
            <AuthenticatedFrameImage
              src={displayedResult.image_url}
              alt="Video feed"
              className="w-full h-full object-cover"
              refreshKey={autoRefresh ? displayedResult.timestamp : displayedResult.frame_id}
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <p className="text-gray-400">Loading video feed...</p>
                </div>
              }
            />
          </div>
        ) : isStreamActive ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-300">Waiting for first video frame...</p>
              <p className="text-gray-500 text-sm mt-2">The source is active; frames will appear after capture starts.</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No video feed available</p>
              <p className="text-gray-500 text-sm mt-2">Click Start on a stream to begin</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 px-4 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {displayedResult?.timestamp ? formatTimestamp(displayedResult.timestamp) : 'No timestamp'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {displayedResult?.detections.length || 0} objects detected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded transition ${autoRefresh
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
