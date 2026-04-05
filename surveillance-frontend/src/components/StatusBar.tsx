import React from 'react';
import { AlertCircle, Bell, CheckCircle, Cpu, Home, LogOut, Radar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="glass-panel sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-5">
        <button
          onClick={onHomeClick}
          className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
            activeView === 'home'
              ? 'bg-cyan-500/20 border border-cyan-300/40'
              : 'bg-slate-800/80 border border-slate-600/40 hover:border-cyan-300/40'
          }`}
          title="Home"
        >
          <Home className="w-4 h-4 text-cyan-300" />
          <span className="text-sm font-semibold text-cyan-100 tracking-wide">CCTV HOME</span>
        </button>
        <button
          onClick={onMonitorClick}
          className={`px-3 py-2 rounded-lg transition hidden md:flex items-center gap-2 ${
            activeView === 'monitor'
              ? 'bg-blue-500/20 border border-blue-300/40'
              : 'bg-slate-800/80 border border-slate-600/40 hover:border-blue-300/40'
          }`}
          title="Monitoring"
        >
          <Radar className="w-4 h-4 text-blue-300" />
          <span className="text-sm font-semibold text-blue-100 tracking-wide">MONITOR</span>
        </button>
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-medium text-slate-200">
            Backend: {status === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">
            GPU: {gpuAvailable ? 'Available' : 'Not Available'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{user.email}</p>
              <p className="text-xs text-slate-400">Authenticated</p>
            </div>
            <button
              onClick={() => navigate('/telegram-setup?edit=1')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/90 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Bell className="w-4 h-4" />
              Telegram
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-rose-600/90 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
