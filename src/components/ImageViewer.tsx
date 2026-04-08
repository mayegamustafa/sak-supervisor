'use client';

import { useState } from 'react';

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Tap-to-zoom image viewer. Shows inline thumbnail;
 * tap opens full-screen overlay with pinch/double-tap zoom.
 */
export default function ImageViewer({ src, alt = 'Photo', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  function handleDoubleTap() {
    setScale((s) => (s === 1 ? 2.5 : 1));
  }

  return (
    <>
      {/* Thumbnail */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onClick={() => { setOpen(true); setScale(1); }}
        className={`cursor-pointer ${className}`}
      />

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl backdrop-blur-sm"
            style={{ paddingTop: 'var(--safe-top)' }}
          >
            ✕
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(0.5, s - 0.5)); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg backdrop-blur-sm"
            >
              −
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setScale(1); }}
              className="flex h-10 items-center justify-center rounded-full bg-white/20 px-4 text-white text-xs font-medium backdrop-blur-sm"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(5, s + 0.5)); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg backdrop-blur-sm"
            >
              +
            </button>
          </div>

          {/* Image */}
          <div
            className="overflow-auto max-h-[90dvh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleTap}
          >
            <img
              src={src}
              alt={alt}
              className="transition-transform duration-200 ease-out"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
