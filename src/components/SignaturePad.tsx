'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeCanvas } from '@/lib/signature';

interface Props {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Full-screen pad for drawing a signature with a finger / stylus / mouse.
 * Strokes are drawn dark on a transparent canvas, so the saved PNG has no
 * background and sits cleanly on a signature line.
 */
export default function SignaturePad({ onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Size the canvas to its box at device pixel ratio for crisp strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const pos = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const start = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const move = useCallback((e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  }, [pos, hasInk]);

  const end = useCallback(() => {
    drawing.current = false;
    last.current = null;
  }, []);

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function save() {
    if (!hasInk) return;
    onSave(finalizeCanvas(canvasRef.current!));
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <p className="mb-3 text-sm font-medium text-white">Sign inside the box</p>

      <div className="w-full max-w-md rounded-2xl bg-white p-2 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="h-56 w-full touch-none rounded-xl border-2 border-dashed border-gray-300 bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      <div className="mt-5 flex w-full max-w-md items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            onClick={clear}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20"
          >
            Clear
          </button>
          <button
            onClick={save}
            disabled={!hasInk}
            className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
