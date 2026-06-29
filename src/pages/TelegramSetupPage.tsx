import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Check, Copy, Key, MessageCircle, Save, Send, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTelegramProfile } from '../hooks/useApi';
import { detectionAPI, getApiErrorMessage } from '../services/api';

type SetupMode = 'otp' | 'manual';

const TELEGRAM_BOT_USERNAME = 'SREC_CCTV_SURVEILLANCE_BOT';
const TELEGRAM_BOT_LINK = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
const TELEGRAM_BOT_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(TELEGRAM_BOT_LINK)}`;
const getBotUsername = (username?: string) => (username || TELEGRAM_BOT_USERNAME).replace(/^@/, '');

export const TelegramSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading, error, refresh } = useTelegramProfile();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === '1';

  const [mode, setMode] = useState<SetupMode>('otp');

  // ── OTP flow state ──
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Manual flow state ──
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramNumber, setTelegramNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // ── Shared state ──
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Populate from existing profile
  useEffect(() => {
    if (!profile) return;
    setTelegramChatId(profile.telegram_chat_id || '');
    setTelegramNumber(profile.telegram_number || '');
    setPhoneNumber(profile.telegram_number || '');
  }, [profile]);

  const shouldRedirectToDashboard = useMemo(
    () => !editMode && !!profile?.configured,
    [editMode, profile?.configured]
  );

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (expiresIn <= 0 || !otpSent) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, otpCode]);

  // Poll OTP status after code is sent
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await detectionAPI.getTelegramOTPStatus();
        if (status.status === 'verified' && status.chat_id_discovered) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setOtpVerified(true);
          setSuccessMessage('✅ Telegram verified! Chat ID discovered automatically.');
          await refresh();
          setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
        }
      } catch {
        // silently retry
      }
    }, 3000);
  }, [navigate, refresh]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  // ── Handlers ──

  const handleRequestOTP = async () => {
    const num = phoneNumber.trim();
    if (!num) {
      setLocalError('Enter your Telegram phone number.');
      return;
    }
    try {
      setRequestingOtp(true);
      setLocalError('');
      setSuccessMessage('');
      const res = await detectionAPI.requestTelegramOTP(num);
      setOtpCode(res.otp);
      setBotUsername(res.bot_username || '');
      setExpiresIn(res.expires_in || 300);
      setOtpSent(true);
      startPolling();
    } catch (err) {
      setLocalError(getApiErrorMessage(err));
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleCopyOTP = () => {
    navigator.clipboard.writeText(otpCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetOTP = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setOtpSent(false);
    setOtpCode('');
    setOtpVerified(false);
    setExpiresIn(0);
    setLocalError('');
    setSuccessMessage('');
  };

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12">
      <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-cyan-300" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
            Telegram Alert Setup
          </h1>
        </div>
        <p className="text-slate-300 text-sm md:text-base">
          Connect your Telegram to receive CCTV security alerts instantly.
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Signed in as:{' '}
          <span className="text-slate-200 font-medium">
            {user?.email || 'Unknown user'}
          </span>
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-[auto,1fr] items-center rounded-xl border border-cyan-500/30 bg-slate-800/70 p-4">
          <div className="mx-auto w-36 rounded-lg bg-white p-2">
            <img
              src={TELEGRAM_BOT_QR_URL}
              alt={`QR code for @${TELEGRAM_BOT_USERNAME}`}
              className="h-32 w-32"
            />
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <div>
              <p className="text-sm text-slate-400">Telegram bot</p>
              <p className="font-mono text-cyan-300 break-all">
                @{TELEGRAM_BOT_USERNAME}
              </p>
            </div>
            <a
              href={TELEGRAM_BOT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              <MessageCircle className="h-4 w-4" />
              Open Telegram Bot
            </a>
          </div>
        </div>

        {/* Error / Success banners */}
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

        {/* ── Tab Selector ── */}
        <div className="mt-6 flex gap-1 bg-slate-800/60 rounded-lg p-1">
          <button
            onClick={() => {
              setMode('otp');
              setLocalError('');
              setSuccessMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition ${
              mode === 'otp'
                ? 'bg-cyan-500/90 text-slate-900'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Quick Setup (OTP)
          </button>
          <button
            onClick={() => {
              setMode('manual');
              setLocalError('');
              setSuccessMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition ${
              mode === 'manual'
                ? 'bg-cyan-500/90 text-slate-900'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
            }`}
          >
            <Key className="w-4 h-4" />
            Manual Setup
          </button>
        </div>

        {/* ═══════════════ OTP MODE ═══════════════ */}
        {mode === 'otp' && (
          <div className="mt-6 space-y-5">
            {/* Step 1: Enter phone number */}
            {!otpSent && !otpVerified && (
              <>
                <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                    <Smartphone className="w-4 h-4 text-cyan-300" />
                    How it works
                  </div>
                  <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                    <li>Enter your Telegram phone number below</li>
                    <li>Click &quot;Send Verification Code&quot;</li>
                    <li>Open the bot in Telegram and send the code</li>
                    <li>Your chat ID is discovered automatically!</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Telegram Phone Number
                  </label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91XXXXXXXXXX"
                    className="w-full bg-slate-950/80 text-slate-100 px-4 py-2.5 rounded border border-slate-600 focus:outline-none focus:border-cyan-300"
                  />
                </div>

                <button
                  onClick={handleRequestOTP}
                  disabled={requestingOtp || !phoneNumber.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold disabled:bg-slate-600 disabled:text-slate-300 transition"
                >
                  <Send className="w-4 h-4" />
                  {requestingOtp ? 'Generating Code...' : 'Send Verification Code'}
                </button>
              </>
            )}

            {/* Step 2: OTP display + instructions */}
            {otpSent && !otpVerified && (
              <>
                {/* OTP Display Card */}
                <div className="bg-slate-800/80 border border-cyan-500/40 rounded-xl p-6 text-center">
                  <p className="text-slate-300 text-sm mb-3">
                    Your verification code
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl md:text-5xl font-mono font-bold tracking-[0.3em] text-cyan-300">
                      {otpCode}
                    </span>
                    <button
                      onClick={handleCopyOTP}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                      title="Copy code"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-emerald-300" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs mt-3">
                    {expiresIn > 0 ? (
                      <>
                        Expires in{' '}
                        <span className="text-amber-300 font-semibold">
                          {formatTime(expiresIn)}
                        </span>
                      </>
                    ) : (
                      <span className="text-rose-300">
                        Code expired — request a new one
                      </span>
                    )}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-3">
                  <p className="text-slate-100 font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-300" />
                    Send the code to the bot
                  </p>
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>
                      Open{' '}
                      {botUsername ? (
                        <a
                          href={`https://t.me/${getBotUsername(botUsername)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-300 underline hover:text-cyan-200"
                        >
                          @{getBotUsername(botUsername)}
                        </a>
                      ) : (
                        <a
                          href={TELEGRAM_BOT_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-300 underline hover:text-cyan-200"
                        >
                          @{TELEGRAM_BOT_USERNAME}
                        </a>
                      )}{' '}
                      in Telegram
                    </li>
                    <li>
                      Send{' '}
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300">
                        /start
                      </code>{' '}
                      if this is your first time
                    </li>
                    <li>
                      Send the 6-digit code:{' '}
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-bold">
                        {otpCode}
                      </code>
                    </li>
                  </ol>
                </div>

                {/* Waiting indicator */}
                <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Waiting for verification from Telegram bot...
                  </p>
                </div>

                <button
                  onClick={handleResetOTP}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition"
                >
                  Request New Code
                </button>
              </>
            )}

            {/* Step 3: Verified */}
            {otpVerified && (
              <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-300" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-emerald-200">
                  Telegram Verified!
                </h3>
                <p className="text-emerald-300 text-sm">
                  Your chat ID has been discovered and saved automatically.
                  You will now receive CCTV alerts on Telegram.
                </p>
                <p className="text-slate-400 text-xs">
                  Redirecting to dashboard...
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ MANUAL MODE ═══════════════ */}
        {mode === 'manual' && (
          <div className="mt-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 mb-5">
              <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                <MessageCircle className="w-4 h-4 text-cyan-300" />
                Manual Chat ID Entry
              </div>
              <p className="text-sm text-slate-300">
                1. Open{' '}
                <a
                  href={TELEGRAM_BOT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 underline hover:text-cyan-200"
                >
                  @{TELEGRAM_BOT_USERNAME}
                </a>{' '}
                in Telegram and send <code>/start</code>.
              </p>
              <p className="text-sm text-slate-300">
                2. Get your chat ID (for example from{' '}
                <code>@userinfobot</code>) and paste it below.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Telegram Chat ID (Preferred)
                </label>
                <input
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789 or -1001234567890"
                  className="w-full bg-slate-950/80 text-slate-100 px-4 py-2.5 rounded border border-slate-600 focus:outline-none focus:border-cyan-300"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Telegram Mobile Number (Optional)
                </label>
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
              </div>
            </form>
          </div>
        )}

        {/* Dashboard link */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded border border-slate-500 text-slate-200 hover:bg-slate-800 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
