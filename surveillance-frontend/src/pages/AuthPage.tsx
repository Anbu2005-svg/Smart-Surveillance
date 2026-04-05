import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, UserPlus, AlertCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const { signIn, signInWithGoogle, signUp, loading, error } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetNotice(null);
    setSuccess(false);

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      if (mode === 'login') {
        await signIn(email, password);
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        if (!fullName) {
          setLocalError('Please enter your full name');
          return;
        }
        await signUp(email, password, fullName);
        setSuccess(true);
        setLocalError(null);
        setTimeout(() => {
          setMode('login');
          setEmail('');
          setPassword('');
          setFullName('');
          setLocalError('Account created! Please check your email to verify your account.');
        }, 1000);
      }
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      setResetNotice(null);
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed');
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLocalError(null);
      setResetNotice(null);
      const emailValue = email.trim();
      if (!emailValue) {
        setLocalError('Enter your email first, then click Forgot password.');
        return;
      }
      const { error: resetError } = await authService.resetPassword(emailValue);
      if (resetError) throw new Error(resetError);
      setResetNotice('Password reset link sent to your registered email.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send password reset email.');
    }
  };

  const errorText = (localError || error || '').toLowerCase();
  const showForgotButton =
    mode === 'login' &&
    (errorText.includes('invalid login credentials') ||
      errorText.includes('invalid credentials') ||
      errorText.includes('wrong password') ||
      errorText.includes('password'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
              <svg
                className="w-9 h-9"
                viewBox="0 0 64 64"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <path
                  d="M32 6l22 8v14c0 14-9.7 25.8-22 30C19.7 53.8 10 42 10 28V14l22-8z"
                  fill="url(#brandGradient)"
                  opacity="0.95"
                />
                <circle cx="32" cy="30" r="10" fill="#0f172a" />
                <circle cx="32" cy="30" r="5" fill="#22d3ee" />
                <path d="M16 44c4-6 10-9 16-9s12 3 16 9" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Smart Surveillance</h1>
          </div>
          <p className="text-gray-400 mt-2">Real-time object detection system</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 transition-all duration-300 ease-out">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 px-4 font-semibold transition-all duration-200 ease-out ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 font-semibold transition-all duration-200 ease-out ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {(localError || error) && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{localError || error}</span>
              </div>
            )}
            {resetNotice && (
              <div className="bg-emerald-900 border border-emerald-700 text-emerald-100 px-4 py-3 rounded">
                <p className="text-sm">{resetNotice}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
                <p className="text-sm">
                  {mode === 'login' 
                    ? 'Login successful! Redirecting...' 
                    : 'Account created! Redirecting to login...'}
                </p>
              </div>
            )}

            {/* Full Name (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none transition"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none transition"
                disabled={loading}
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
              )}
              {showForgotButton && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 text-xs text-blue-300 hover:text-blue-200 underline underline-offset-2 transition"
                >
                  Forgot password? Send reset link
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-all duration-200 ease-out active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'}</>
              )}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-800 px-2 text-gray-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded transition-all duration-200 ease-out active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.8-4.2 2.8-7.1 0-.7-.1-1.4-.2-2.1H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21c2.5 0 4.6-.8 6.2-2.2l-3.1-2.4c-.9.6-2 .9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H3.7V16c1.6 3.1 4.8 5 8.3 5z"
                    />
                    <path
                      fill="#4A90E2"
                      d="M6.9 13.5c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.7c-.7 1.4-1 2.9-1 4.1s.4 2.8 1 4.1l3.2-2.3z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 6.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.6 3.8 14.5 3 12 3 8.5 3 5.3 4.9 3.7 8l3.2 2.4C7.6 8.5 9.6 6.9 12 6.9z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
