import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import type { AppUser, UserRole } from '@/types';

export async function loginWithEmail(email: string, password: string) {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured. Add your .env.local file.');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await setDoc(doc(db, 'users', user.uid), {
    id: user.uid,
    name,
    email,
    role,
    active: true,
    created_at: serverTimestamp(),
  });

  return credential;
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  // Always derive id from the document path so appUser.id is never undefined
  return { ...data, id: snap.id } as AppUser;
}

export function onAuthChange(callback: (user: User | null) => void) {
  // Guard: if Firebase is not yet configured (missing .env.local), treat as signed-out.
  // Also catches stale Turbopack module cache where auth may still be a stub {}.
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  try {
    return onAuthStateChanged(auth, callback);
  } catch {
    // auth stub is in use (server was started before .env.local existed) — restart required
    callback(null);
    return () => {};
  }
}
