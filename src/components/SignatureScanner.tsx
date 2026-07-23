'use client';

import { useEffect, useRef, useState } from 'react';
import { prepareScan, renderScan, type ScanSource } from '@/lib/signature';

interface Props {
  /** Which picker to open first: the camera or the photo gallery. */
  initialSource: 'camera' | 'gallery';
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Capture a signature written on paper. Take a photo (or pick one), and the
 * paper is removed automatically — only the ink is kept — leaving a clean
 * transparent signature. A slider tunes how much ink is detected.
 */
export default function SignatureScanner({ initialSource, onSave, onCancel }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan] = useState<ScanSource | null>(null);
  const [threshold, setThreshold] = useState(160);
  const [preview, setPreview] = useState('');

  // Open the requested picker as soon as the sheet mounts.
  useEffect(() => {
    const t = setTimeout(() => {
      (initialSource === 'camera' ? cameraRef : galleryRef).current?.click();
    }, 60);
    return () => clearTimeout(t);
  }, [initialSource]);

  // Re-render the cleaned signature whenever the scan or threshold changes.
  useEffect(() => {
    if (!scan) return;
    setPreview(renderScan(scan, threshold));
  }, [scan, threshold]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      if (!scan) onCancel(); // picker dismissed with nothing chosen
      return;
    }
    setBusy(true);
    setError('');
    try {
      const src = await prepareScan(file);
      setScan(src);
      setThreshold(src.otsu); // start from the auto-detected cutoff
    } catch {
      setError('Could not read that image. Try another photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <p className="mb-3 text-sm font-medium text-white">Scan signature</p>

      <div className="flex min-h-56 w-full max-w-md items-center justify-center rounded-2xl bg-white p-3 shadow-2xl">
        {busy ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-red-800" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Scanned signature" className="max-h-52 w-full object-contain" />
        ) : (
          <p className="px-4 text-center text-sm text-gray-400">
            {error || 'Take or choose a photo of the signature on paper.'}
          </p>
        )}
      </div>

      {scan && (
        <div className="mt-4 w-full max-w-md">
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>Lighter detection</span>
            <span>Darker only</span>
          </div>
          <input
            type="range"
            min={60}
            max={230}
            step={2}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>
      )}

      <div className="mt-5 flex w-full max-w-md items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => (initialSource === 'camera' ? cameraRef : galleryRef).current?.click()}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20"
          >
            Retake
          </button>
          <button
            onClick={() => preview && onSave(preview)}
            disabled={!preview}
            className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-40"
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
}
