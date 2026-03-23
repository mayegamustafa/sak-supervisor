import { auth } from './firebase';

/**
 * Compress an image file to reduce upload size and time.
 * Returns a Blob ready for upload.
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Uploads a photo via the server-side API route (avoids CORS issues).
 * Compresses the image first, then uploads through /api/upload.
 */
export async function uploadPhoto(file: File, pathPrefix: string): Promise<string> {
  const compressed = await compressImage(file);

  // Get current user's auth token for the server to authenticate with Firebase
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('file', compressed, 'photo.jpeg');
  formData.append('path', pathPrefix);
  formData.append('token', token);

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  const { url } = await res.json();
  return url;
}
