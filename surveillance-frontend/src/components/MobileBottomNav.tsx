import React from 'react';
import { Home, Radar, Bell, Download, Smartphone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';

interface MobileBottomNavProps {
  activeView?: 'home' | 'monitor';
  onHomeClick?: () => void;
  onMonitorClick?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView = 'home',
  onHomeClick,
  onMonitorClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInstallable, isInstalled, installApp } = usePWA();

  const isTelegramSetup = location.pathname.startsWith('/telegram-setup');
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname === '/';

  const handleHome = () => {
    if (!isDashboard) {
      navigate('/dashboard');
    } else if (onHomeClick) {
      onHomeClick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleMonitor = () => {
    if (!isDashboard) {
      navigate('/dashboard?view=monitor');
    } else if (onMonitorClick) {
      onMonitorClick();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl px-2 py-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] shadow-2xl">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Home Button */}
        <button
          onClick={handleHome}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-90 ${
            isDashboard && activeView === 'home'
              ? 'text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition ${
              isDashboard && activeView === 'home' ? 'bg-cyan-500/20 shadow-sm' : ''
            }`}
          >
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* Live Monitor Button */}
        <button
          onClick={handleMonitor}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-90 ${
            isDashboard && activeView === 'monitor'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition ${
              isDashboard && activeView === 'monitor' ? 'bg-blue-500/20 shadow-sm' : ''
            }`}
          >
            <Radar className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Monitor</span>
        </button>

        {/* Telegram Alerts Setup Button */}
        <button
          onClick={() => navigate('/telegram-setup?edit=1')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-90 ${
            isTelegramSetup
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition ${
              isTelegramSetup ? 'bg-amber-500/20 shadow-sm' : ''
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Alerts</span>
        </button>

        {/* Install PWA Button (if installable and not installed) */}
        {isInstallable && !isInstalled && (
          <button
            onClick={() => installApp()}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-cyan-400 font-bold transition active:scale-90 animate-pulse"
          >
            <div className="p-1 rounded-lg bg-cyan-500/20 shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Install</span>
          </button>
        )}

        {/* PWA Installed Indicator */}
        {isInstalled && (
          <div className="flex flex-col items-center justify-center py-1 px-3 text-emerald-400">
            <div className="p-1 rounded-lg bg-emerald-500/15">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">App Active</span>
          </div>
        )}
      </div>
    </nav>
  );
};
