/**
 * Compress an image and return it as a base64 data URL.
 * Stores directly in Firestore — no Firebase Storage needed.
 *
 * Images are aggressively compressed:
 * - Max 800px wide
 * - JPEG quality 0.6
 * - Typical result: 30–100 KB base64 string
 */
function compressToDataURL(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
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
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
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
