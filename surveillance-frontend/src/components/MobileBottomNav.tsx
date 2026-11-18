import React from 'react';
import { Home, Radar, Bell, Download, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';

interface MobileBottomNavProps {
  activeView: 'home' | 'monitor';
  onHomeClick: () => void;
  onMonitorClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onHomeClick,
  onMonitorClick,
}) => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installApp } = usePWA();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-xl px-2 py-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)] shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Home Button */}
        <button
          onClick={() => {
            onHomeClick();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeView === 'home'
              ? 'text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeView === 'home' ? 'bg-cyan-500/20' : ''
            }`}
          >
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* Live Monitor Button */}
        <button
          onClick={() => {
            onMonitorClick();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeView === 'monitor'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeView === 'monitor' ? 'bg-blue-500/20' : ''
            }`}
          >
            <Radar className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Monitor</span>
        </button>

        {/* Telegram Alerts */}
        <button
          onClick={() => navigate('/telegram-setup?edit=1')}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <div className="p-1 rounded-lg">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Alerts</span>
        </button>

        {/* Install App button if installable */}
        {isInstallable && !isInstalled && (
          <button
            onClick={() => installApp()}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-cyan-400 font-semibold transition-all animate-pulse"
          >
            <div className="p-1 rounded-lg bg-cyan-500/20">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Install</span>
          </button>
        )}

        {/* If installed, show App Active badge */}
        {isInstalled && (
          <div className="flex flex-col items-center justify-center py-1 px-3 text-emerald-400">
            <div className="p-1 rounded-lg bg-emerald-500/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">PWA Ready</span>
          </div>
        )}
      </div>
    </nav>
  );
};
