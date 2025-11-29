import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/auth';
import { databaseService } from '../services/database';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface UserType {
  id?: string;
  [key: string]: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface AppContextType {
  user: UserType | null;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveUserProfile: (profile: Omit<UserProfile, 'id'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [user, setUser] = useState<UserType | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('auth');
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      // fallback to system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    checkUser();
    authService.onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        loadUserProfile(user.id);

        // If there's a buffered onboarding profile in localStorage, persist it now
        try {
          const raw = localStorage.getItem('onboarding:pendingProfile');
          if (raw) {
            const buffered = JSON.parse(raw);
            // Persist buffered profile (don't await here to avoid blocking state updates)
            (async () => {
              try {
                await saveUserProfile(buffered as Omit<UserProfile, 'id'>);
                localStorage.removeItem('onboarding:pendingProfile');
                console.info('Buffered onboarding profile persisted after sign-in');
              } catch (err) {
                console.error('Failed to persist buffered onboarding profile after sign-in', err);
              }
            })();
          }
        } catch (err) {
          console.error('Error reading buffered onboarding profile from localStorage', err);
        }
      } else {
        setUserProfile(null);
        setCurrentPage('auth');
      }
    });
    // apply theme on mount (applyTheme is defined below)
    // This registers the first visual state based on stored preference or system setting.
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const applyTheme = (value: 'light' | 'dark') => {
    const root = document.documentElement;
    if (value === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await databaseService.getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
        // After onboarding, land users on the dashboard for a comprehensive overview
        setCurrentPage(profile.completed_onboarding ? 'dashboard' : 'onboarding');
      } else {
        setCurrentPage('onboarding');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setCurrentPage('onboarding');
    }
  };

  const signUp = async (email: string, password: string) => {
    // Try to sign the user up, then attempt immediate sign-in where possible.
    const result = await authService.signUp(email, password);
    // Some Supabase projects auto-sign-in on signUp and return a user/session.
    // If signUp did not produce an active session, attempt signIn immediately.
    try {
      const signedIn = await authService.signIn(email, password);
      if (signedIn && (signedIn.user || signedIn.data?.user)) {
        const u = (signedIn.user || signedIn.data?.user) as any;
        setUser(u);
        setCurrentPage('onboarding');
        return;
      }
    } catch (err) {
      // signIn may fail if email confirmation is required; fall through and rely on auth state change
      console.debug('Immediate signIn after signUp failed or not allowed (email confirmation may be required).', err);
    }

    // If signUp returned a user object, set it (covers auto sign-in cases)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u: any = (result as any)?.user || (result as any)?.data?.user || null;
    if (u) {
      setUser(u);
      setCurrentPage('onboarding');
    }
  };

  const signIn = async (email: string, password: string) => {
    const { user } = await authService.signIn(email, password);
    if (user) {
      setUser(user);
      await loadUserProfile(user.id);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setUserProfile(null);
    setCurrentPage('auth');
  };

  const saveUserProfile = async (profile: Omit<UserProfile, 'id'>) => {
    // Ensure we use the authenticated user's ID as the profile `id` to satisfy RLS policies
    // Try to read the current auth user (do not rely solely on `user` state which may lag)
    const authUser = await (async () => {
      try {
        return await authService.getCurrentUser();
      } catch {
        return null;
      }
    })();

    const userId = (authUser && (authUser.id as string)) || (user && (user.id as string));
    if (!userId) throw new Error('No authenticated user; cannot save profile');

    try {
      let savedProfile;
      // Debug: log current auth user id and the payload we will send to Supabase
      // This helps diagnose RLS mismatches (auth.uid() vs inserted id)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authInfo: any = authUser;
        console.log('Saving user profile. authUser id=', authInfo?.id);
        console.log('Profile payload (will use this id):', { id: userId, ...profile });
      } catch (logErr) {
        console.warn('Failed to log auth info for debugging', logErr);
      }
      // Pass the auth user id explicitly so the created row's `id` equals auth.uid()
      if (userProfile) {
        savedProfile = await databaseService.updateUserProfile(userId, profile);
      } else {
        savedProfile = await databaseService.createUserProfile(userId, profile);
      }
      setUserProfile(savedProfile);
      if (savedProfile && savedProfile.completed_onboarding) {
        setCurrentPage('dashboard');
      }
    } catch (error) {
      // Log richer details to help diagnose 401/authorization issues from Supabase
      // Supabase errors may include `status`, `message`, and `details` properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = error;
      console.error('Error saving user profile:', e);
      if (e && typeof e === 'object') {
        console.error('Supabase error status:', e.status || e.statusCode || 'n/a');
        console.error('Supabase error message:', e.message || e.error || 'n/a');
        console.error('Supabase error details:', e.details || e.hint || 'n/a');
      }
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      userProfile,
      setUserProfile,
      currentPage,
      setCurrentPage,
      isLoading,
      theme,
      toggleTheme,
      signUp,
      signIn,
      signOut,
      saveUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
