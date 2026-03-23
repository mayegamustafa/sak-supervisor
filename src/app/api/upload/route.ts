import { NextRequest, NextResponse } from 'next/server';

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;
    const token = formData.get('token') as string | null;

    if (!file || !path || !token) {
      return NextResponse.json({ error: 'Missing file, path, or token' }, { status: 400 });
    }

    const filename = `${path}/${Date.now()}.jpeg`;
    const encodedName = encodeURIComponent(filename);
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Firebase Storage via REST API (server-side — no CORS)
    const uploadRes = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodedName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
          Authorization: `Bearer ${token}`,
        },
        body: arrayBuffer,
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('Firebase Storage upload failed:', text);
      return NextResponse.json({ error: 'Upload failed' }, { status: uploadRes.status });
    }

    const data = await uploadRes.json();
    // Build the download URL
    const downloadToken = data.downloadTokens;
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(data.name)}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
