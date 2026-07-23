/**
 * Signature capture helpers — turn a drawn stroke or a photo of a signature
 * on paper into a clean, transparent PNG data URL that can be dropped onto a
 * signature line in a report (screen or PDF).
 *
 * Like photos (see storage.ts) signatures are stored as data URLs directly in
 * Firestore, so everything here keeps the output small: the image is scaled to
 * at most MAX_W wide, transparent margins are trimmed away, and it is re-encoded
 * smaller if the resulting string would be too large for a document.
 *
 * "Scanning" is done entirely on-device with canvas image processing — the photo
 * is converted to greyscale, an Otsu threshold separates ink from paper, the
 * paper is made transparent and the ink is recoloured to a solid dark stroke.
 */

/** Max width (px) of a stored signature image. Keeps Firestore docs small. */
export const MAX_W = 600;

/** Near-black default ink colour for scanned signatures. */
const DEFAULT_INK: [number, number, number] = [15, 23, 42];

/** Keep a signature data URL comfortably under a share of the 1 MB doc limit. */
const MAX_LEN = 180_000;

export interface ScanSource {
  /** Greyscale value (0 = black, 255 = white) per pixel, row-major. */
  gray: Uint8ClampedArray;
  width: number;
  height: number;
  /** Suggested ink/paper cutoff computed with Otsu's method. */
  otsu: number;
}

// ─── loading ────────────────────────────────────────────────────────────────

async function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // `from-image` respects EXIF orientation so phone photos aren't sideways.
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode failed'));
        el.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function sourceSize(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ('naturalWidth' in src) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

// ─── scanning (photo → clean signature) ──────────────────────────────────────

/**
 * Decode a photo once into a scaled greyscale buffer. Returned so the UI can
 * re-render the signature at different thresholds instantly (slider) without
 * re-decoding the file.
 */
export async function prepareScan(file: File): Promise<ScanSource> {
  const src = await loadImageBitmap(file);
  const { w: sw, h: sh } = sourceSize(src);
  const scale = Math.min(1, MAX_W / sw);
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0, width, height);
  if ('close' in src) src.close();

  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Uint8ClampedArray(width * height);
  const hist = new Array(256).fill(0);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rec. 601 luma
    const g = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    gray[p] = g;
    hist[g | 0]++;
  }

  return { gray, width, height, otsu: otsuThreshold(hist, width * height) };
}

/** Classic Otsu threshold from a 256-bin histogram. */
function otsuThreshold(hist: number[], total: number): number {
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Render a prepared scan to a transparent PNG: pixels darker than `threshold`
 * become ink, everything lighter becomes transparent. A soft band around the
 * cutoff keeps stroke edges smooth instead of jagged.
 */
export function renderScan(
  src: ScanSource,
  threshold: number,
  ink: [number, number, number] = DEFAULT_INK
): string {
  const { gray, width, height } = src;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(width, height);
  const band = 26; // soft edge width in grey levels

  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const g = gray[p];
    let alpha: number;
    if (g <= threshold - band) alpha = 255;
    else if (g >= threshold) alpha = 0;
    else alpha = Math.round(((threshold - g) / band) * 255);
    out.data[i] = ink[0];
    out.data[i + 1] = ink[1];
    out.data[i + 2] = ink[2];
    out.data[i + 3] = alpha;
  }
  ctx.putImageData(out, 0, 0);
  return finalize(trimCanvas(canvas));
}

// ─── trimming + size guard ────────────────────────────────────────────────────

/** Crop fully-transparent margins, leaving a small padding around the ink. */
export function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const { data } = ctx.getImageData(0, 0, w, h);
  let top = h, left = w, right = 0, bottom = 0;
  const A = 12; // ignore near-transparent noise
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > A) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < left || bottom < top) return canvas; // nothing drawn

  const pad = Math.round(Math.min(w, h) * 0.03) + 4;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(w - 1, right + pad);
  bottom = Math.min(h - 1, bottom + pad);
  const cw = right - left + 1;
  const ch = bottom - top + 1;

  const cropped = document.createElement('canvas');
  cropped.width = cw;
  cropped.height = ch;
  cropped.getContext('2d')!.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  return cropped;
}

/** Scale a canvas down to MAX_W and encode as PNG, re-encoding if too large. */
function finalize(canvas: HTMLCanvasElement): string {
  let c = canvas;
  if (c.width > MAX_W) {
    const scale = MAX_W / c.width;
    const scaled = document.createElement('canvas');
    scaled.width = MAX_W;
    scaled.height = Math.max(1, Math.round(c.height * scale));
    scaled.getContext('2d')!.drawImage(c, 0, 0, scaled.width, scaled.height);
    c = scaled;
  }
  let url = c.toDataURL('image/png');
  if (url.length > MAX_LEN && c.width > 320) {
    const scale = 320 / c.width;
    const small = document.createElement('canvas');
    small.width = 320;
    small.height = Math.max(1, Math.round(c.height * scale));
    small.getContext('2d')!.drawImage(c, 0, 0, small.width, small.height);
    url = small.toDataURL('image/png');
  }
  return url;
}

/** Trim + size-guard a signature that was drawn on a transparent canvas. */
export function finalizeCanvas(canvas: HTMLCanvasElement): string {
  return finalize(trimCanvas(canvas));
}
