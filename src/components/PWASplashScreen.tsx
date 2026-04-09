'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PWASplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only show splash for PWA / standalone mode (home screen shortcut)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isPWA) return;

    setVisible(true);
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setVisible(false), 500);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #8B0000 0%, #5A0A0A 50%, #3a0606 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full -translate-y-20 translate-x-20" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-400/5 rounded-full translate-y-16 -translate-x-16" />
      <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-amber-400/3 rounded-full" />

      {/* Logo badges */}
      <div className="flex items-center gap-4 mb-6 animate-in fade-in zoom-in duration-700">
        <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-white/20 shadow-2xl">
          <Image src="/badges/sak.jpg" alt="SAK" width={80} height={80} className="h-full w-full object-cover" priority />
        </div>
        <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-white/20 shadow-2xl">
          <Image src="/badges/cps.png" alt="CPS" width={80} height={80} className="h-full w-full object-cover" priority />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-1 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
        SAK Supervision
      </h1>
      <p className="text-sm text-amber-400/80 font-medium animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
        Schools Supervision System
      </p>

      {/* Spinner */}
      <div className="mt-10 animate-in fade-in duration-700 delay-500">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-white/20 border-t-amber-400" />
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-xs text-white/30">
        SIR APOLLO KAGGWA SCHOOL — SINCE 1996
      </p>
    </div>
  );
}
