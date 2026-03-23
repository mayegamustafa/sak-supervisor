import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let messaging: Messaging | null = null;
let nativeListenersRegistered = false;

/** Detect if running inside a Capacitor native shell (not just web with Capacitor JS loaded) */
function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor as Record<string, unknown> | undefined;
  if (!cap) return false;
  // isNativePlatform() returns true ONLY inside the actual native app container
  if (typeof cap.isNativePlatform === 'function') return (cap.isNativePlatform as () => boolean)();
  return false;
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
 * Check current notification permission status without prompting.
 * Returns 'granted', 'denied', or 'prompt' (not yet asked).
 */
export async function getNotificationStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof window === 'undefined') return 'denied';

  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.checkPermissions();
      if (result.receive === 'granted') return 'granted';
      if (result.receive === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'denied';
    }
  }

  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

/**
 * Request notification permission and register the FCM token in Firestore.
 * Works on both web (Firebase JS SDK) and native (Capacitor Push Notifications).
 *
 * Safe to call multiple times — will re-register token if needed.
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // ── Native (Android / iOS via Capacitor) ──
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Create Android notification channel (required for Android 8+)
      // Without this, notifications are silently dropped!
      try {
        await PushNotifications.createChannel({
          id: 'sak_supervision',
          name: 'SAK Supervision',
          description: 'School supervision notifications',
          importance: 5, // MAX
          sound: 'default',
          vibration: true,
        });
      } catch {
        // createChannel may not be supported on iOS — that's OK
      }

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return null;

      await PushNotifications.register();

      // Only register listeners once to avoid duplicates
      if (!nativeListenersRegistered) {
        nativeListenersRegistered = true;

        PushNotifications.addListener('registration', async (token) => {
          if (token.value) {
            // Store with platform suffix so web & native tokens coexist
            await setDoc(doc(db, 'fcm_tokens', `${userId}_native`), {
              token: token.value,
              user_id: userId,
              platform: 'native',
              updated_at: new Date().toISOString(),
            });
            console.log('[Push] Native token registered');
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] Native registration error:', err);
        });
      }

      // Return a promise that resolves when registration completes (or times out)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 10000);
        PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout);
          resolve(token.value || null);
        });
      });
    } catch (err) {
      console.error('[Push] Capacitor push setup failed:', err);
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
    console.warn('[Push] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — push disabled');
    return null;
  }

  try {
    const swReg = await navigator.serviceWorker.getRegistration();
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      // Store with platform suffix so web & native tokens coexist
      await setDoc(doc(db, 'fcm_tokens', `${userId}_web`), {
        token,
        user_id: userId,
        platform: 'web',
        updated_at: new Date().toISOString(),
      });
      console.log('[Push] Web token registered');
    }

    return token;
  } catch (err) {
    console.error('[Push] Failed to get FCM token:', err);
    return null;
  }
}

/**
 * Silently refresh/register FCM token ONLY if notification permission
 * is already granted. Does NOT prompt the user.
 * Safe to call from non-user-gesture contexts (setTimeout, visibilitychange).
 */
export async function refreshTokenIfGranted(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const status = await getNotificationStatus();
  if (status !== 'granted') return null;

  // Permission already granted — register/refresh the token without prompting
  if (isNative()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.register();
      return null; // Token handled by listener
    } catch {
      return null;
    }
  }

  // Web: get token without calling requestPermission()
  const msg = getMessagingInstance();
  if (!msg) return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const swReg = await navigator.serviceWorker.getRegistration();
    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: swReg });
    if (token) {
      await setDoc(doc(db, 'fcm_tokens', `${userId}_web`), {
        token,
        user_id: userId,
        platform: 'web',
        updated_at: new Date().toISOString(),
      });
    }
    return token;
  } catch {
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
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Push] Send failed:', err);
    }
  } catch (err) {
    console.error('[Push] Network error:', err);
  }
}
