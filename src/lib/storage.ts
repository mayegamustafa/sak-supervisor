/**
 * Convert any image file to a JPEG Blob using OffscreenCanvas/Canvas.
 * Handles HEIC, WEBP, AVIF, PNG, etc. by going through the browser's
 * native image decoder → canvas → JPEG re-encode pipeline.
 *
 * - Max 600px wide (keeps Firestore docs under 1MB)
 * - JPEG quality 0.5
 * - Typical result: 15–60 KB base64 string
 */
async function fileToJpegDataUrl(file: File, maxWidth = 600, quality = 0.5): Promise<string> {
  // Step 1: Convert file to an ImageBitmap or Image element
  let imgWidth: number;
  let imgHeight: number;
  let source: ImageBitmap | HTMLImageElement;

  try {
    // createImageBitmap works directly with File/Blob — best for HEIC/WEBP
    const bitmap = await createImageBitmap(file);
    imgWidth = bitmap.width;
    imgHeight = bitmap.height;
    source = bitmap;
  } catch {
    // Fallback: convert File → data URL → Image element
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    imgWidth = img.naturalWidth;
    imgHeight = img.naturalHeight;
    source = img;
  }

  // Step 2: Scale down
  if (imgWidth > maxWidth) {
    imgHeight = Math.round((imgHeight * maxWidth) / imgWidth);
    imgWidth = maxWidth;
  }

  // Step 3: Draw to canvas → export as JPEG
  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, imgWidth, imgHeight);

  // Clean up bitmap if used
  if ('close' in source) source.close();

  const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);

  // Safety check: keep each photo small enough that up to 4 of them comfortably
  // fit inside a single Firestore document (1 MB limit). Re-compress if needed.
  if (jpegDataUrl.length > 230_000) {
    const smallerCanvas = document.createElement('canvas');
    const scale = Math.min(1, 420 / imgWidth);
    smallerCanvas.width = Math.round(imgWidth * scale);
    smallerCanvas.height = Math.round(imgHeight * scale);
    const ctx2 = smallerCanvas.getContext('2d')!;
    ctx2.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
    return smallerCanvas.toDataURL('image/jpeg', 0.4);
  }

  return jpegDataUrl;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = src;
  });
}

/**
 * "Upload" a photo by converting to compressed JPEG data URL.
 * This avoids Firebase Storage entirely (free tier limits).
 * The data URL is stored directly in the Firestore document's photo_url field.
 */
export async function uploadPhoto(file: File, _pathPrefix: string): Promise<string> {
  return fileToJpegDataUrl(file);
}

/**
 * Normalise an observation's photos into a single array.
 * Supports the legacy single `photo_url` field as well as the new
 * `photo_urls` array, so old records keep rendering.
 */
export function getIssuePhotos(issue: { photo_url?: string; photo_urls?: string[] }): string[] {
  if (issue.photo_urls?.length) return issue.photo_urls;
  return issue.photo_url ? [issue.photo_url] : [];
}
