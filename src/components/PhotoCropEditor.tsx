'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  file: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

/**
 * Simple circular crop editor for profile photos.
 * Drag to reposition, pinch/slider to zoom, then confirm to crop.
 */
export default function PhotoCropEditor({ file, onCrop, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CROP_SIZE = 280;

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const image = new window.Image();
    image.onload = () => {
      setImg(image);
      // Initial scale: fit the shorter dimension to crop size
      const minDim = Math.min(image.naturalWidth, image.naturalHeight);
      setScale(CROP_SIZE / minDim);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw preview
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (CROP_SIZE - drawW) / 2 + offset.x;
    const drawY = (CROP_SIZE - drawH) / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, [img, scale, offset]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  function handleCrop() {
    if (!img) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = CROP_SIZE;
    outCanvas.height = CROP_SIZE;
    const ctx = outCanvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (CROP_SIZE - drawW) / 2 + offset.x;
    const drawY = (CROP_SIZE - drawH) / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const cropped = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      onCrop(cropped);
    }, 'image/jpeg', 0.85);
  }

  if (!imgSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <p className="text-white text-sm font-medium mb-4">Drag to reposition, zoom to fit</p>

      {/* Crop preview */}
      <div
        className="relative rounded-full overflow-hidden border-2 border-white/30 shadow-2xl touch-none"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} className="h-full w-full" />
      </div>

      {/* Zoom slider */}
      <div className="mt-4 flex items-center gap-3 w-64">
        <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
        <input
          type="range"
          min={0.3}
          max={3}
          step={0.05}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="flex-1 accent-amber-400"
        />
        <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/30 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCrop}
          className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:from-red-900 hover:to-red-950 transition-all"
        >
          Use Photo
        </button>
      </div>
    </div>
  );
}
