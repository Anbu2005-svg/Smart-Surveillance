import React, { useState } from 'react';
import { X, Webcam, RadioTower, FileVideo } from 'lucide-react';

interface VideoInputModalProps {
  isOpen: boolean;
  streamId: string;
  onConfirm: (
    inputMethod: string,
    inputSource: string,
    targetClasses?: string[],
    videoFile?: File | null
  ) => Promise<void> | void;
  onCancel: () => void;
}

export const VideoInputModal: React.FC<VideoInputModalProps> = ({
  isOpen,
  streamId,
  onConfirm,
  onCancel,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('webcam');
  const [webcamSource, setWebcamSource] = useState<string>('0');
  const [ipCameraSource, setIpCameraSource] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [classMode, setClassMode] = useState<'all' | 'specific'>('all');
  const [classInput, setClassInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const sourceByMethod: Record<string, string> = {
      webcam: webcamSource,
      ip_camera: ipCameraSource,
      video_file: videoFile?.name || '',
    };
    const chosenSource = (sourceByMethod[selectedMethod] || '').trim();
    if (!chosenSource) {
      setLocalError('Enter a valid source before starting detection.');
      return;
    }

    setLocalError('');
    setIsSubmitting(true);
    try {
      const targetClasses =
        classMode === 'specific'
          ? classInput
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter((v, i, arr) => v.length > 0 && arr.indexOf(v) === i)
          : [];

      if (classMode === 'specific' && targetClasses.length === 0) {
        setLocalError('Enter at least one class (comma-separated) for specific mode.');
        return;
      }

      await onConfirm(selectedMethod, chosenSource, targetClasses, videoFile);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Select Video Input</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          {/* Webcam Option */}
          <div
            onClick={() => {
              setSelectedMethod('webcam');
              setLocalError('');
            }}
            className={`p-4 rounded-lg cursor-pointer transition border-2 ${
              selectedMethod === 'webcam'
                ? 'bg-blue-900 border-blue-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Webcam className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Webcam</span>
            </div>
            <input
              type="text"
              placeholder="Webcam ID (e.g., 0, 1, 2)"
              value={webcamSource}
              onChange={(e) => {
                setSelectedMethod('webcam');
                setWebcamSource(e.target.value || '0');
                setLocalError('');
              }}
              className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
              disabled={selectedMethod !== 'webcam'}
            />
            <p className="text-xs text-gray-400 mt-2">Use your computer's webcam</p>
          </div>

          {/* IP Camera Option */}
          <div
            onClick={() => {
              setSelectedMethod('ip_camera');
              setLocalError('');
            }}
            className={`p-4 rounded-lg cursor-pointer transition border-2 ${
              selectedMethod === 'ip_camera'
                ? 'bg-blue-900 border-blue-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <RadioTower className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-white">IP Camera</span>
            </div>
            <input
              type="text"
              placeholder="IP URL or IP:port/path (e.g., 192.168.1.8:4747/video)"
              value={ipCameraSource}
              onChange={(e) => {
                setSelectedMethod('ip_camera');
                setIpCameraSource(e.target.value);
                setLocalError('');
              }}
              className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
              disabled={selectedMethod !== 'ip_camera'}
            />
            <p className="text-xs text-gray-400 mt-2">Works with RTSP/HTTP URLs, including DroidCam IP links</p>
          </div>

          {/* Video File Option */}
          <div
            onClick={() => {
              setSelectedMethod('video_file');
              setLocalError('');
            }}
            className={`p-4 rounded-lg cursor-pointer transition border-2 ${
              selectedMethod === 'video_file'
                ? 'bg-blue-900 border-blue-500'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <FileVideo className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Video File</span>
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                setSelectedMethod('video_file');
                const selected = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                setVideoFile(selected);
                setLocalError('');
              }}
              className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
              disabled={selectedMethod !== 'video_file'}
            />
            <p className="text-xs text-gray-400 mt-2">Upload a video file from your system</p>
          </div>

          {/* Class Selection */}
          <div className="p-4 rounded-lg border-2 bg-gray-800 border-gray-700">
            <div className="mb-3">
              <span className="font-semibold text-white">Classes to Detect</span>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setClassMode('all');
                  setLocalError('');
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  classMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All classes
              </button>
              <button
                type="button"
                onClick={() => {
                  setClassMode('specific');
                  setLocalError('');
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  classMode === 'specific'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Specific classes
              </button>
            </div>
            <input
              type="text"
              placeholder="fire, weapon, intruder"
              value={classInput}
              onChange={(e) => {
                setClassInput(e.target.value);
                setLocalError('');
              }}
              className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
              disabled={classMode !== 'specific'}
            />
            <p className="text-xs text-gray-400 mt-2">
              In specific mode, enter comma-separated class names.
            </p>
          </div>
          {localError && <p className="text-sm text-rose-300">{localError}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-800">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
          >
            {isSubmitting ? 'Starting...' : 'Start Detection'}
          </button>
        </div>
      </div>
    </div>
  );
};
