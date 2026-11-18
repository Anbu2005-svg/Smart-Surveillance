import React from 'react';
import { AlertCircle, Bell, CheckCircle, Cpu, Download, Home, LogOut, Radar, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';

interface StatusBarProps {
  status: string;
  gpuAvailable: boolean;
  activeView?: 'home' | 'monitor';
  onHomeClick?: () => void;
  onMonitorClick?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  gpuAvailable,
  activeView = 'home',
  onHomeClick,
  onMonitorClick,
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installApp } = usePWA();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] flex items-center justify-between gap-2 shadow-lg backdrop-blur-xl">
      {/* Left: Navigation and Core Status */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-5 flex-wrap min-w-0">
        <button
          onClick={onHomeClick}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
            activeView === 'home'
              ? 'bg-cyan-500/20 border border-cyan-300/40'
              : 'bg-slate-800/80 border border-slate-600/40 hover:border-cyan-300/40'
          }`}
          title="Smart Home Command Center"
        >
          <Home className="w-4 h-4 text-cyan-300" />
          <span className="text-xs sm:text-sm font-semibold text-cyan-100 tracking-wide">
            <span className="hidden sm:inline">SMART </span>HOME
          </span>
        </button>

        <button
          onClick={onMonitorClick}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
            activeView === 'monitor'
              ? 'bg-blue-500/20 border border-blue-300/40'
              : 'bg-slate-800/80 border border-slate-600/40 hover:border-blue-300/40'
          }`}
          title="Live Camera Monitoring"
        >
          <Radar className="w-4 h-4 text-blue-300" />
          <span className="text-xs sm:text-sm font-semibold text-blue-100 tracking-wide">
            MONITOR
          </span>
        </button>

        {/* Backend Connectivity Status */}
        <div
          className="flex items-center gap-1.5 bg-slate-900/60 px-2 sm:px-2.5 py-1 rounded-md border border-slate-700/60 flex-shrink-0"
          title={`Backend API: ${status}`}
        >
          {status === 'connected' ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
          )}
          <span className="text-[11px] sm:text-xs font-medium text-slate-200">
            <span className="hidden md:inline">Backend: </span>
            {status === 'connected' ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* GPU Status */}
        <div
          className="hidden lg:flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-700/60 flex-shrink-0"
          title="Hardware Acceleration"
        >
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-medium text-slate-300">
            GPU: {gpuAvailable ? 'Available' : 'CPU Mode'}
          </span>
        </div>
      </div>

      {/* Right: Actions (Install PWA, Telegram, User, Logout) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* PWA Install Button on Desktop & Tablet */}
        {isInstallable && !isInstalled && (
          <button
            onClick={() => installApp()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold rounded-lg transition active:scale-95 shadow-sm"
            title="Install as Progressive Web App"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {isInstalled && (
          <div
            className="hidden xl:flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium"
            title="Running as installed Progressive Web App"
          >
            <Smartphone className="w-3 h-3" />
            <span>PWA Active</span>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block max-w-[140px] md:max-w-[180px] truncate">
              <p className="text-xs font-medium text-slate-200 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-400">Authenticated</p>
            </div>

            <button
              onClick={() => navigate('/telegram-setup?edit=1')}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
              title="Configure Telegram security alerts"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Telegram</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition active:scale-95 shadow"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
