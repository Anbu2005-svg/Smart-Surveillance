import React from 'react';
import { Detection } from '../services/api';
import { formatConfidence, getColorByClass } from '../utils/helpers';
import { Zap } from 'lucide-react';

interface DetectionPanelProps {
  detections: Detection[];
  isLoading: boolean;
}

export const DetectionPanel: React.FC<DetectionPanelProps> = ({ detections, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">Detections</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-white">
          Detections ({detections.length})
        </h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {detections.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No detections</p>
        ) : (
          detections.map((detection) => (
            <div
              key={detection.id}
              className="bg-gray-700 rounded p-3 border-l-4"
              style={{ borderColor: getColorByClass(detection.class_name) }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white capitalize">
                  {detection.class_name || 'unknown'}
                </span>
                <span
                  className="px-2 py-1 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: getColorByClass(detection.class_name) }}
                >
                  {formatConfidence(detection.confidence)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Box: ({detection.bbox.x1.toFixed(1)}, {detection.bbox.y1.toFixed(1)}) →
                ({detection.bbox.x2.toFixed(1)}, {detection.bbox.y2.toFixed(1)})
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
