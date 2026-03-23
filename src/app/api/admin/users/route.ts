import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAdminAuth() {
  if (!getApps().length) {
    const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!pk) throw new Error('Firebase Admin not configured — set FIREBASE_ADMIN_PRIVATE_KEY env var');
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: pk.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getAuth();
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, uid } = await req.json();
    const adminAuth = getAdminAuth();

    if (action === 'create') {
      const user = await adminAuth.createUser({ email, password });
      return NextResponse.json({ uid: user.uid });
    }

    if (action === 'resetPassword') {
      await adminAuth.updateUser(uid, { password });
      return NextResponse.json({ success: true });
    }

    if (action === 'disable') {
      await adminAuth.updateUser(uid, { disabled: true });
      return NextResponse.json({ success: true });
    }

    if (action === 'enable') {
      await adminAuth.updateUser(uid, { disabled: false });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
