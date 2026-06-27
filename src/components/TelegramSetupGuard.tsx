import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTelegramProfile } from '../hooks/useApi';

interface TelegramSetupGuardProps {
  children: React.ReactNode;
}

export const TelegramSetupGuard: React.FC<TelegramSetupGuardProps> = ({ children }) => {
  const { profile, loading, error } = useTelegramProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-200">
        Checking Telegram setup...
      </div>
    );
  }

  // Keep existing app flow resilient if setup endpoint is temporarily unavailable.
  if (error) {
    return <>{children}</>;
  }

  if (!profile?.configured) {
    return <Navigate to="/telegram-setup" replace />;
  }

  return <>{children}</>;
};

