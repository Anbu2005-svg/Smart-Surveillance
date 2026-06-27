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
    <div className="min-h-screen auth-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-[430px] w-full">
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-slate-900/95 auth-brand-icon">
              <svg className="w-9 h-9" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
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
            <h1 className="text-[38px] leading-none font-extrabold text-white tracking-tight">Smart Surveillance</h1>
          </div>
          <p className="text-slate-300 text-sm mt-2">Real-time object detection system</p>
        </div>

        <div className="auth-card rounded-lg overflow-hidden transition-all duration-300 ease-out">
          <div className="flex border-b border-slate-600/45 bg-slate-700/60">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 px-4 font-semibold transition-all duration-200 ease-out ${
                mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-600/70'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 px-4 font-semibold transition-all duration-200 ease-out ${
                mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-600/70'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-900/10">
            {(localError || error) && (
              <div className="bg-rose-950/75 border border-rose-700 text-rose-100 px-4 py-3 rounded flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{localError || error}</span>
              </div>
            )}
            {resetNotice && (
              <div className="bg-emerald-950/70 border border-emerald-700 text-emerald-100 px-4 py-3 rounded">
                <p className="text-sm">{resetNotice}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-950/70 border border-green-700 text-green-100 px-4 py-3 rounded">
                <p className="text-sm">
                  {mode === 'login' ? 'Login successful! Redirecting...' : 'Account created! Redirecting to login...'}
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-600/55 text-white px-4 py-2 rounded border border-slate-500/70 focus:border-blue-400 outline-none transition placeholder:text-slate-300/80"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-600/55 text-white px-4 py-2 rounded border border-slate-500/70 focus:border-blue-400 outline-none transition placeholder:text-slate-300/80"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full bg-slate-600/55 text-white px-4 py-2 rounded border border-slate-500/70 focus:border-blue-400 outline-none transition placeholder:text-slate-300/80"
                disabled={loading}
              />
              {mode === 'signup' && <p className="text-xs text-slate-300 mt-1">At least 6 characters</p>}
              {showForgotButton && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2 transition"
                >
                  Forgot password? Send reset link
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition-all duration-200 ease-out active:scale-[0.99] flex items-center justify-center gap-2"
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
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-slate-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-300 text-slate-900 font-semibold py-2 px-4 rounded transition-all duration-200 ease-out active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
