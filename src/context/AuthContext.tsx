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
        const resolvedUser = profile ? { ...profile, id: profile.id || user.uid } : null;
        setAppUser(resolvedUser);
        setLoading(false);

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

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
