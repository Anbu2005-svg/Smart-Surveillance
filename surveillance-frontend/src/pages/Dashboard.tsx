import React, { useMemo, useState } from 'react';
import { StatusBar } from '../components/StatusBar';
import { VideoFeed } from '../components/VideoFeed';
import { DetectionPanel } from '../components/DetectionPanel';
import { VideoInputModal } from '../components/VideoInputModal';
import { useDetections, useMultiDetections, useVideoStreams, useHealthStatus, useVerifierStatus } from '../hooks/useApi';
import { Activity, Flame, Play, ShieldAlert, Square, UserRound } from 'lucide-react';
import { detectionAPI, getApiErrorMessage } from '../services/api';
import type { DetectionResult, VideoStream } from '../services/api';

const getStreamFps = (history: DetectionResult[]): number => {
  if (!history || history.length < 2) return 0;
  const current = Date.parse(history[history.length - 1].timestamp);
  const prev = Date.parse(history[history.length - 2].timestamp);
  if (!Number.isFinite(current) || !Number.isFinite(prev) || current <= prev) return 0;
  return 1000 / (current - prev);
};

export const Dashboard: React.FC = () => {
  const { streams, loading: streamsLoading } = useVideoStreams();
  const { health } = useHealthStatus();
  const { verifier } = useVerifierStatus();
  const [activeView, setActiveView] = useState<'home' | 'monitor'>('home');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [showVideoInputModal, setShowVideoInputModal] = useState(false);
  const [selectedStreamForInput, setSelectedStreamForInput] = useState<string>('');
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamSource, setNewStreamSource] = useState('');
  const [creatingStream, setCreatingStream] = useState(false);
  const [actionError, setActionError] = useState('');
  const [gridColumns, setGridColumns] = useState(2);
  const { detections, loading: detectionsLoading } = useDetections(selectedStreamId);

  const activeStreamList = useMemo(
    () => streams.filter((s) => s.status === 'active'),
    [streams]
  );
  const activeStreamIds = useMemo(
    () => activeStreamList.map((s) => s.id),
    [activeStreamList]
  );
  const { detectionsByStream, loadingByStream } = useMultiDetections(activeStreamIds);

  const selectedHistory = detections.length > 0 ? detections : (detectionsByStream[selectedStreamId] || []);
  const currentDetection = selectedHistory.length > 0 ? selectedHistory[selectedHistory.length - 1] : null;
  const currentDetections = currentDetection?.detections || [];
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  const activeStreams = useMemo(
    () => activeStreamList.length,
    [activeStreamList]
  );
  const topDetection = currentDetections[0];

  const handleStartDetection = (streamId: string) => {
    setSelectedStreamForInput(streamId);
    setShowVideoInputModal(true);
  };

  const handleVideoInputConfirm = async (
    inputMethod: string,
    inputSource: string,
    targetClasses: string[] = [],
    videoFile: File | null = null
  ) => {
    try {
      setActionError('');
      let resolvedSource = inputSource;
      if (inputMethod === 'video_file') {
        if (!videoFile) {
          throw new Error('Select a video file to upload.');
        }
        const uploaded = await detectionAPI.uploadVideoFile(videoFile);
        resolvedSource = uploaded.stored_path;
      }
      await detectionAPI.startDetectionWithInput(
        selectedStreamForInput,
        inputMethod,
        resolvedSource,
        targetClasses
      );
      setShowVideoInputModal(false);
      setSelectedStreamId(selectedStreamForInput);
      setActiveView('monitor');
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleStopDetection = async (streamId: string) => {
    try {
      setActionError('');
      await detectionAPI.stopDetection(streamId);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleSelectStream = (streamId: string) => {
    setSelectedStreamId(streamId);
    setActiveView('monitor');
  };

  const handleCreateStream = async () => {
    const name = newStreamName.trim();
    const source = newStreamSource.trim();
    if (!name || !source) return;
    try {
      setCreatingStream(true);
      setActionError('');
      await detectionAPI.createStream(name, source);
      setNewStreamName('');
      setNewStreamSource('');
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setCreatingStream(false);
    }
  };

  return (
    <div className="min-h-screen grid-overlay">
      <StatusBar
        status={health ? 'connected' : 'disconnected'}
        gpuAvailable={health?.gpu_available || false}
        activeView={activeView}
        onHomeClick={() => {
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onMonitorClick={() => setActiveView('monitor')}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {actionError && (
          <div className="rounded-lg border border-rose-400/60 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
            {actionError}
          </div>
        )}
        <section className="glass-panel rounded-2xl p-6 md:p-10 float-in">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-cyan-300 font-semibold tracking-widest text-xs uppercase mb-2">Smart Surveillance</p>
              <h1 className="text-3xl md:text-5xl font-black text-slate-100 leading-tight">
                Command Center for
                <span className="text-cyan-300"> Fire, Weapon, Intruder</span> Alerts
              </h1>
              <p className="text-slate-300 mt-3 max-w-2xl">
                Fast detector on edge + AI verifier before Telegram notifications. Built for noisy real-world CCTV streams.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveView('monitor')}
                  className="px-5 py-2.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-slate-900 font-semibold transition"
                >
                  Open Monitoring
                </button>
                <button
                  onClick={() => {
                    setActiveView('monitor');
                    if (streams[0]) setSelectedStreamId(streams[0].id);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-500/60 hover:border-cyan-300/50 text-slate-100 font-semibold transition"
                >
                  Jump to First Camera
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-600/40">
                <p className="text-slate-400 text-xs">Total Streams</p>
                <p className="text-2xl font-bold text-slate-100">{streams.length}</p>
              </div>
              <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-600/40">
                <p className="text-slate-400 text-xs">Active Streams</p>
                <p className="text-2xl font-bold text-emerald-300">{activeStreams}</p>
              </div>
              <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-600/40">
                <p className="text-slate-400 text-xs">Verifier</p>
                <p className="text-lg font-bold text-cyan-300">{verifier?.enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-600/40">
                <p className="text-slate-400 text-xs">Top Detection</p>
                <p className="text-lg font-bold text-amber-300">{topDetection?.class_name || 'none'}</p>
              </div>
            </div>
          </div>
        </section>

        {activeView === 'home' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 float-in stagger-1">
            <article className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 text-rose-300 mb-3">
                <Flame className="w-5 h-5" />
                <h2 className="font-bold">Fire Verification</h2>
              </div>
              <p className="text-slate-300 text-sm">Prioritize high-risk events and cross-check detector output before sending alerts.</p>
            </article>
            <article className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 text-amber-300 mb-3">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="font-bold">Weapon Filtering</h2>
              </div>
              <p className="text-slate-300 text-sm">Reduce false positives using multimodal reasoning on snapshots plus bounding boxes.</p>
            </article>
            <article className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3 text-cyan-300 mb-3">
                <UserRound className="w-5 h-5" />
                <h2 className="font-bold">Intruder Tracking</h2>
              </div>
              <p className="text-slate-300 text-sm">Switch to monitor mode to inspect streams, start detection, and track live events.</p>
            </article>
          </section>
        )}

        {activeView === 'monitor' && (
          <section className="space-y-6 float-in stagger-2">
            <div className="glass-panel rounded-xl p-5">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">AI Verification Pipeline</h2>
              {verifier ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-slate-900/70 rounded p-3 border border-slate-600/30">
                    <p className="text-slate-400 text-xs">Provider / Model</p>
                    <p className="text-slate-100 font-semibold">{verifier.provider} / {verifier.model}</p>
                  </div>
                  <div className="bg-slate-900/70 rounded p-3 border border-slate-600/30">
                    <p className="text-slate-400 text-xs">Configured</p>
                    <p className={`font-semibold ${verifier.configured ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {verifier.configured ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="bg-slate-900/70 rounded p-3 border border-slate-600/30">
                    <p className="text-slate-400 text-xs">Queue</p>
                    <p className="text-cyan-300 font-semibold">{verifier.pipeline.queue_size} pending</p>
                  </div>
                  <div className="bg-slate-900/70 rounded p-3 border border-slate-600/30">
                    <p className="text-slate-400 text-xs">Rejected / Errors</p>
                    <p className="text-rose-300 font-semibold">{verifier.pipeline.rejected} / {verifier.pipeline.errors}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Loading verifier status...</p>
              )}
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Video Streams</h2>
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                    placeholder="Camera name"
                    className="bg-slate-900/70 text-slate-100 text-sm rounded px-3 py-2 border border-slate-500/40 focus:outline-none focus:border-cyan-300"
                  />
                  <input
                    value={newStreamSource}
                    onChange={(e) => setNewStreamSource(e.target.value)}
                    placeholder="Source (0 / rtsp://...)"
                    className="bg-slate-900/70 text-slate-100 text-sm rounded px-3 py-2 border border-slate-500/40 focus:outline-none focus:border-cyan-300"
                  />
                  <button
                    onClick={handleCreateStream}
                    disabled={creatingStream || !newStreamName.trim() || !newStreamSource.trim()}
                    className="bg-cyan-500/90 hover:bg-cyan-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 text-sm px-3 py-2 rounded transition font-semibold"
                  >
                    {creatingStream ? 'Adding...' : 'Add Stream'}
                  </button>
                </div>
              </div>

              {streamsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-800/60 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : streams.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No streams available. Add one above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {streams.map((stream: VideoStream) => (
                    <div
                      key={stream.id}
                      onClick={() => handleSelectStream(stream.id)}
                      className={`p-4 rounded-lg cursor-pointer transition border ${
                        selectedStreamId === stream.id
                          ? 'bg-cyan-500/15 border-cyan-300/70'
                          : 'bg-slate-900/65 border-slate-500/40 hover:border-cyan-300/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-100">{stream.name}</span>
                        <span className={`w-2 h-2 rounded-full ${stream.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      </div>
                      <p className="text-sm text-slate-300">Detections: {stream.current_detections}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleStartDetection(stream.id);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleStopDetection(stream.id);
                          }}
                          className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition"
                        >
                          <Square className="w-3 h-3" />
                          Stop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Live Multi-Camera Monitor</h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="grid-columns" className="text-xs text-slate-300">Grid Columns</label>
                  <select
                    id="grid-columns"
                    value={gridColumns}
                    onChange={(e) => setGridColumns(Number(e.target.value))}
                    className="bg-slate-900/70 text-slate-100 text-sm rounded px-3 py-2 border border-slate-500/40 focus:outline-none focus:border-cyan-300"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>

              {activeStreamList.length === 0 ? (
                <p className="text-slate-400 text-sm">Start one or more streams to view the live grid.</p>
              ) : (
                <div className={`grid gap-4 ${
                  gridColumns === 1
                    ? 'grid-cols-1'
                    : gridColumns === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : gridColumns === 3
                        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                }`}>
                  {activeStreamList.map((stream) => {
                    const streamHistory = detectionsByStream[stream.id] || [];
                    const latest = streamHistory.length > 0 ? streamHistory[streamHistory.length - 1] : null;
                    const frameSrc = latest?.image_url ? `${apiOrigin}${latest.image_url}?t=${Date.now()}` : '';
                    const fps = getStreamFps(streamHistory);

                    return (
                      <div
                        key={stream.id}
                        onClick={() => handleSelectStream(stream.id)}
                        className={`rounded-lg overflow-hidden border cursor-pointer transition ${
                          selectedStreamId === stream.id
                            ? 'border-cyan-300/80 bg-cyan-900/10'
                            : 'border-slate-600/40 bg-slate-900/40 hover:border-cyan-300/50'
                        }`}
                      >
                        <div className="px-3 py-2 border-b border-slate-700/60 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-100 truncate">{stream.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300">FPS {fps.toFixed(1)}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          </div>
                        </div>
                        <div className="aspect-video bg-black flex items-center justify-center">
                          {latest?.image_url ? (
                            <img src={frameSrc} alt={`${stream.name} feed`} className="w-full h-full object-cover" />
                          ) : (
                            <p className="text-xs text-slate-400">
                              {loadingByStream[stream.id] ? 'Loading feed...' : 'Waiting for frames...'}
                            </p>
                          )}
                        </div>
                        <div className="px-3 py-2 text-xs text-slate-300 border-t border-slate-700/60">
                          Detections: {stream.current_detections}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedStreamId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel rounded-xl p-4">
                  <VideoFeed
                    detectionResult={currentDetection}
                    isLoading={detectionsLoading}
                    streamId={selectedStreamId}
                  />
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <DetectionPanel detections={currentDetections} isLoading={detectionsLoading} />
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-10 text-center">
                <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-300 text-lg">Select a stream in monitor mode to view detections.</p>
              </div>
            )}
          </section>
        )}

        <VideoInputModal
          isOpen={showVideoInputModal}
          streamId={selectedStreamForInput}
          onConfirm={handleVideoInputConfirm}
          onCancel={() => setShowVideoInputModal(false)}
        />
      </div>
    </div>
  );
};
