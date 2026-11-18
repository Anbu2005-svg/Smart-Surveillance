import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const OfflineBanner: React.FC = () => {
  const { isOnline, hasUpdate, updateApp } = usePWA();

  return (
    <>
      {/* Offline Toast */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600/95 text-white px-4 py-2.5 shadow-lg backdrop-blur flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold transition-all">
          <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
          <span>
            You are currently offline. Cached interface is available, but live camera streams are paused.
          </span>
        </div>
      )}

      {/* PWA Update Toast */}
      {hasUpdate && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-6 md:right-auto z-50 float-in">
          <div className="bg-slate-900/95 border border-cyan-400 text-slate-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <div className="text-xs">
              <p className="font-bold text-cyan-300">New Surveillance Update Available</p>
              <p className="text-slate-400">Click reload to apply the latest build.</p>
            </div>
            <button
              onClick={updateApp}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </>
  );
};
