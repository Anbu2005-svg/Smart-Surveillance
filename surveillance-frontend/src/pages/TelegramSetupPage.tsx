import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, MessageCircle, Save, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTelegramProfile } from '../hooks/useApi';
import { detectionAPI, getApiErrorMessage } from '../services/api';

export const TelegramSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading, error, refresh } = useTelegramProfile();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === '1';

  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramNumber, setTelegramNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!profile) return;
    setTelegramChatId(profile.telegram_chat_id || '');
    setTelegramNumber(profile.telegram_number || '');
  }, [profile]);

  const shouldRedirectToDashboard = useMemo(
    () => !editMode && !!profile?.configured,
    [editMode, profile?.configured]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-200">
        Checking Telegram setup...
      </div>
    );
  }

  if (shouldRedirectToDashboard) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    const chatId = telegramChatId.trim();
    const number = telegramNumber.trim();
    if (!chatId && !number) {
      setLocalError('Enter Telegram chat ID or mobile number.');
      return;
    }

    try {
      setSaving(true);
      await detectionAPI.upsertTelegramProfile(chatId || undefined, number || undefined);
      await refresh();
      setSuccessMessage('Telegram details saved successfully.');
      if (!editMode) {
        setTimeout(() => navigate('/dashboard', { replace: true }), 700);
      }
    } catch (err) {
      setLocalError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTesting(true);
      setLocalError('');
      setSuccessMessage('');
      const response = await detectionAPI.sendTelegramTestAlert();
      setSuccessMessage(response.message);
    } catch (err) {
      setLocalError(getApiErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12">
      <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-cyan-300" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Telegram Alert Setup</h1>
        </div>
        <p className="text-slate-300 text-sm md:text-base">
          Connect your account so alerts are sent to your Telegram directly.
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Signed in as: <span className="text-slate-200 font-medium">{user?.email || 'Unknown user'}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/60 bg-rose-950/40 p-3 text-rose-100 text-sm">
            {error}
          </div>
        )}
        {localError && (
          <div className="mt-4 rounded-lg border border-rose-500/60 bg-rose-950/40 p-3 text-rose-100 text-sm">
            {localError}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-lg border border-emerald-500/60 bg-emerald-950/40 p-3 text-emerald-100 text-sm">
            {successMessage}
          </div>
        )}

        <div className="mt-6 bg-slate-800/80 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
            <MessageCircle className="w-4 h-4 text-cyan-300" />
            Recommended: Use Telegram Chat ID
          </div>
          <p className="text-sm text-slate-300">
            1. Open your bot in Telegram and send <code>/start</code>.
          </p>
          <p className="text-sm text-slate-300">
            2. Get your chat ID (for example from <code>@userinfobot</code>) and paste it below.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Telegram Chat ID (Preferred)</label>
            <input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 123456789 or -1001234567890"
              className="w-full bg-slate-950/80 text-slate-100 px-4 py-2.5 rounded border border-slate-600 focus:outline-none focus:border-cyan-300"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Telegram Mobile Number (Optional)</label>
            <input
              value={telegramNumber}
              onChange={(e) => setTelegramNumber(e.target.value)}
              placeholder="e.g. +15551234567"
              className="w-full bg-slate-950/80 text-slate-100 px-4 py-2.5 rounded border border-slate-600 focus:outline-none focus:border-cyan-300"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold disabled:bg-slate-600 disabled:text-slate-300"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Telegram Details'}
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={handleTestNotification}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold disabled:bg-slate-700/50"
            >
              <Send className="w-4 h-4" />
              {testing ? 'Sending...' : 'Test Notification'}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 rounded border border-slate-500 text-slate-200 hover:bg-slate-800"
            >
              Go to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

