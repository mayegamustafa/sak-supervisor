import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let messaging: Messaging | null = null;

/** Detect if running inside a Capacitor native shell */
function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as Record<string, unknown>).Capacitor;
}

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (isNative()) return null; // Use Capacitor plugin on native
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
 * Works on both web (Firebase JS SDK) and native (Capacitor Push Notifications).
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // ── Native (Android / iOS via Capacitor) ──
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return null;

      await PushNotifications.register();

      return new Promise((resolve) => {
        PushNotifications.addListener('registration', async (token) => {
          if (token.value) {
            await setDoc(doc(db, 'fcm_tokens', userId), {
              token: token.value,
              platform: 'native',
              updated_at: new Date().toISOString(),
            });
          }
          resolve(token.value || null);
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Native push registration error:', err);
          resolve(null);
        });
      });
    } catch (err) {
      console.error('Capacitor push setup failed:', err);
      return null;
    }
  }

  // ── Web (Firebase JS SDK) ──
  if (!('Notification' in window)) return null;

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
      await setDoc(doc(db, 'fcm_tokens', userId), {
        token,
        platform: 'web',
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
 * Listen for foreground push messages.
 * On web: uses Firebase onMessage. On native: uses Capacitor listener.
 */
export function onForegroundMessage(callback: (payload: { title: string; body: string }) => void) {
  if (isNative()) {
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        callback({
          title: notification.title ?? 'Notification',
          body: notification.body ?? '',
        });
      });
    });
    return () => {};
  }

  const msg = getMessagingInstance();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    const title = payload.notification?.title ?? 'Notification';
    const body = payload.notification?.body ?? '';
    callback({ title, body });
  });
}

/**
 * Send a push notification via the server API.
 * Call this from client code after creating a Firestore notification.
 */
export async function sendPush(data: {
  title: string;
  body: string;
  target_user_id?: string;
  target_all?: boolean;
}): Promise<void> {
  try {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Push is best-effort — don't block the caller
  }
}
