'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getUserProfile } from '@/lib/auth';
import { requestNotificationPermission } from '@/lib/messaging';
import { setUserOnline, setUserOffline } from '@/lib/firestore';
import type { AppUser } from '@/types';

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        const resolvedUser = profile ? { ...profile, id: profile.id || user.uid } : null;
        setAppUser(resolvedUser);
        setLoading(false);

        // Mark user online
        if (resolvedUser) {
          setUserOnline(resolvedUser.id).catch(() => {});
        }

        // Request push notification permission AFTER UI is unblocked
        if (resolvedUser) {
          setTimeout(() => {
            requestNotificationPermission(resolvedUser.id).catch(() => {});
          }, 3000);
        }
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Presence: mark offline on tab close / visibility change, heartbeat while active
  // Also re-request notification permission when app comes to foreground
  useEffect(() => {
    if (!appUser) return;
    const uid = appUser.id;

    function goOffline() { setUserOffline(uid).catch(() => {}); }
    function handleVisibility() {
      if (document.hidden) {
        goOffline();
      } else {
        setUserOnline(uid).catch(() => {});
        // Re-register push token when app comes back (handles case where user enabled in settings)
        requestNotificationPermission(uid).catch(() => {});
      }
    }

    window.addEventListener('beforeunload', goOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    // Heartbeat every 60s to keep last_seen fresh
    const hb = setInterval(() => {
      if (!document.hidden) setUserOnline(uid).catch(() => {});
    }, 60_000);

    return () => {
      window.removeEventListener('beforeunload', goOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(hb);
    };
  }, [appUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
