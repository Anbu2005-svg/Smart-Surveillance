import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../config/supabase';

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const oauthError =
          params.get('error_description') ||
          hashParams.get('error_description') ||
          params.get('error') ||
          hashParams.get('error');
        if (oauthError) {
          throw new Error(oauthError);
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
        }

        let { data: currentSession, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!currentSession.session) {
          const code = params.get('code');
          if (!code) {
            throw new Error('Google sign-in did not return a valid session.');
          }

          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          const { data: exchangedSession, error: exchangedSessionError } = await supabase.auth.getSession();
          if (exchangedSessionError) throw exchangedSessionError;
          currentSession = exchangedSession;
        }

        if (!currentSession.session) {
          throw new Error('Google sign-in completed, but no session was created.');
        }

        if (!cancelled) {
          window.history.replaceState({}, document.title, '/auth/callback');
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Google sign-in failed.');
        }
      }
    };

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen auth-bg flex items-center justify-center px-4">
        <div className="auth-card rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Google sign-in failed</h1>
          <p className="text-sm text-slate-300 mb-5">{error}</p>
          <button
            onClick={() => navigate('/auth', { replace: true })}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center px-4">
      <div className="text-center">
        <Loader className="w-12 h-12 text-cyan-300 animate-spin mx-auto mb-4" />
        <p className="text-slate-300 font-medium">Finishing Google sign-in...</p>
      </div>
    </div>
  );
};
