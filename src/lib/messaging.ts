import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;
  try {
    const { getApps } = require('firebase/app');
    const app = getApps()[0];
    if (!app) return null;
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

/**
 * Request notification permission and register the FCM token in Firestore.
 * Call this after user logs in.
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const msg = getMessagingInstance();
  if (!msg) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — push notifications disabled');
    return null;
  }

  try {
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });

    if (token) {
      // Store the token in Firestore so the backend can send pushes
      await setDoc(doc(db, 'fcm_tokens', userId), {
        token,
        updated_at: new Date().toISOString(),
      });
    }

    return token;
  } catch (err) {
    console.error('Failed to get FCM token:', err);
    return null;
  }
}

/**
 * Listen for foreground push messages and show an in-app notification.
 */
export function onForegroundMessage(callback: (payload: { title: string; body: string }) => void) {
  const msg = getMessagingInstance();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    const title = payload.notification?.title ?? 'Notification';
    const body = payload.notification?.body ?? '';
    callback({ title, body });
  });
}
