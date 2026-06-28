import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TelegramSetupPage } from './pages/TelegramSetupPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TelegramSetupGuard } from './components/TelegramSetupGuard';
import { detectionAPI } from './services/api';
import './styles/globals.css';

function App() {
  useEffect(() => {
    detectionAPI.wakeBackend();
  }, []);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/telegram-setup"
          element={
            <ProtectedRoute>
              <TelegramSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <TelegramSetupGuard>
                <Dashboard />
              </TelegramSetupGuard>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
