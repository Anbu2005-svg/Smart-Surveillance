import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { User, Session } from '@supabase/supabase-js';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await authService.getSession();
        if (error) throw error;
        
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const subscription = authService.onAuthStateChange((result: any) => {
      setSession(result.session);
      setUser(result.session?.user || null);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { error: signInError } = await authService.signIn(email, password);
      if (signInError) throw new Error(signInError);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string = '') => {
    try {
      setError(null);
      setLoading(true);
      const { error: signUpError } = await authService.signUp(email, password, fullName);
      if (signUpError) throw new Error(signUpError);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const { error: oauthError } = await authService.signInWithGoogle();
      if (oauthError) throw new Error(oauthError);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error: signOutError } = await authService.signOut();
      if (signOutError) throw new Error(signOutError);
      setUser(null);
      setSession(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    error,
  };
};
