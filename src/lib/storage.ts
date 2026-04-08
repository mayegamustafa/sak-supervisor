/**
 * Compress an image and return it as a base64 data URL.
 * Stores directly in Firestore — no Firebase Storage needed.
 *
 * Uses createImageBitmap (handles HEIC, WEBP, AVIF natively on mobile)
 * with a FileReader fallback for older browsers.
 *
 * - Max 800px wide
 * - JPEG quality 0.55
 * - Typical result: 30–100 KB base64 string
 */
async function compressToDataURL(file: File, maxWidth = 800, quality = 0.55): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Try createImageBitmap first — works with HEIC/WEBP/AVIF on modern browsers
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      // Fall through to FileReader approach
    }
  }

  // Fallback: read as data URL → Image element
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * "Upload" a photo by compressing it and returning a base64 data URL.
 * This avoids Firebase Storage entirely (free tier limits).
 * The data URL is stored directly in the Firestore document's photo_url field.
 */
export async function uploadPhoto(file: File, _pathPrefix: string): Promise<string> {
  return compressToDataURL(file);
}
