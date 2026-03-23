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
        // Always ensure id is set from the Firebase Auth UID — defensive against
        // stale Turbopack cache where getUserProfile may return snap.data() without id.
        const resolvedUser = profile ? { ...profile, id: profile.id || user.uid } : null;
        setAppUser(resolvedUser);

        // Request push notification permission after sign-in
        if (resolvedUser) {
          requestNotificationPermission(resolvedUser.id).catch(() => {});
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
