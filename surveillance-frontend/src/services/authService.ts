import { supabase } from '../config/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export const authService = {
  async logAuthAttempt(email: string, provider: string, success: boolean, reason = '') {
    try {
      await supabase.from('auth_attempts').insert({
        email,
        provider,
        success,
        reason,
        attempted_at: new Date().toISOString(),
      });
    } catch {
      // best-effort log only
    }
  },

  // Sign up with email and password
  async signUp(email: string, password: string, fullName: string = '') {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      await this.logAuthAttempt(email, 'email', true);
      return { data, error: null };
    } catch (error: any) {
      await this.logAuthAttempt(email, 'email', false, error?.message || 'signup_failed');
      return { data: null, error: error.message };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      await this.logAuthAttempt(email, 'email', true);
      return { data, error: null };
    } catch (error: any) {
      await this.logAuthAttempt(email, 'email', false, error?.message || 'signin_failed');
      return { data: null, error: error.message };
    }
  },

  // Sign in with Google OAuth
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      await this.logAuthAttempt('oauth_google', 'google', true);
      return { data, error: null };
    } catch (error: any) {
      await this.logAuthAttempt('oauth_google', 'google', false, error?.message || 'google_signin_failed');
      return { data: null, error: error.message };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Update password after recovery link opens app
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Subscribe to auth changes
  onAuthStateChange(callback: (data: any) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback({ event, session });
    });
    return data?.subscription;
  }
};
