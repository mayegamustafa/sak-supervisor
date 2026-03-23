import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (!getApps().length) {
    let pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!pk) throw new Error('Firebase Admin not configured');
    // Handle both formats: escaped \n in single line, or real newlines in multi-line
    pk = pk.replace(/\\n/g, '\n');
    // Strip surrounding quotes if present
    if (pk.startsWith('"') && pk.endsWith('"')) pk = pk.slice(1, -1);
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: pk,
      }),
    });
  }
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/push
 * Body: { title, body, target_user_id?, target_all? }
 *
 * Sends FCM push notifications to device tokens stored in the fcm_tokens collection.
 */
export async function POST(req: NextRequest) {
  try {
    const { title, body, target_user_id, target_all } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const messaging = getMessaging();

    // Collect FCM tokens
    let tokens: string[] = [];

    if (target_all) {
      const snap = await db.collection('fcm_tokens').get();
      tokens = snap.docs.map((d) => d.data().token).filter(Boolean);
    } else if (target_user_id) {
      // Query by user_id field (tokens stored as {userId}_web / {userId}_native)
      const snap = await db.collection('fcm_tokens')
        .where('user_id', '==', target_user_id)
        .get();
      tokens = snap.docs.map((d) => d.data().token).filter(Boolean);
    }

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No tokens found' });
    }

    // Send via FCM — sendEachForMulticast handles up to 500 tokens
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
        },
      },
      android: {
        priority: 'high',
        notification: {
          title,
          body,
          icon: '@mipmap/ic_launcher',
          channelId: 'sak_supervision',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    // Clean up invalid tokens
    const failedTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        failedTokens.push(tokens[i]);
      }
    });
    if (failedTokens.length > 0) {
      const batch = db.batch();
      for (const snap of (await db.collection('fcm_tokens').where('token', 'in', failedTokens).get()).docs) {
        batch.delete(snap.ref);
      }
      await batch.commit();
    }

    return NextResponse.json({
      sent: response.successCount,
      failed: response.failureCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Push API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
