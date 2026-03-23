// Firebase configuration and initialization
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialise Firebase when a valid config is present (avoids SSR build errors
// when environment variables have not been set yet).
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (isConfigured) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // Provide safe no-op stubs at build/test time so imports don't throw.
  // These are replaced at runtime when the actual env vars are present.
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

/** True only when all required NEXT_PUBLIC_FIREBASE_* env vars are present. */
export const isFirebaseConfigured = isConfigured;

export { auth, db, storage };

