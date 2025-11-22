import { supabase } from '../lib/supabase';

export const authService = {
  async signUp(email: string, password: string) {
    try {
      console.debug('auth.signUp called with', { email: !!email, password: !!password });
      const res = await supabase.auth.signUp({ email, password });
      console.debug('auth.signUp response', res);
      if (res.error) throw res.error;
      return res;
    } catch (err) {
      console.error('signUp error', err);
      throw err;
    }
  },

  async signIn(email: string, password: string) {
    try {
      console.debug('auth.signIn called with', { email: !!email, password: !!password });
      const res = await supabase.auth.signInWithPassword({ email, password });
      console.debug('auth.signIn response', res);
      if (res.error) throw res.error;
      return res;
    } catch (err) {
      console.error('signIn error', err);
      throw err;
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      // If there's no active session, Supabase may return an AuthSessionMissingError.
      // Treat that as a 'no user' case instead of throwing so callers can handle null safely.
      if (error) {
        // don't rethrow for missing session — return null to indicate unauthenticated
        return null;
      }
      return data?.user ?? null;
    } catch (err) {
      // As a fallback, log at debug level and return null so the app doesn't crash
      // when there is no active auth session.
      // eslint-disable-next-line no-console
      console.debug('authService.getCurrentUser error:', err);
      return null;
    }
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  onAuthStateChange(callback: (user: { id?: string } | null) => void) {
    supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        callback(session?.user ?? null);
      })();
    });
  },
};
