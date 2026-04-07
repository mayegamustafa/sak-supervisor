'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function Home() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [show, setShow] = useState(false);

  /* Trigger entrance animations after mount */
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* Navigate once auth resolves */
  useEffect(() => {
    if (loading) return;
    const dest = !appUser ? '/login' : appUser.role === 'admin' ? '/admin' : '/dashboard';
    const t = setTimeout(() => router.replace(dest), 1200);
    return () => clearTimeout(t);
  }, [appUser, loading, router]);

  return (
    <div className="splash-bg fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background particles */}
      <div className="splash-particles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="splash-particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Glow ring behind logos */}
      <div className={`splash-glow ${show ? 'splash-glow-in' : ''}`} />

      {/* Badges */}
      <div className={`flex items-center gap-5 sm:gap-8 ${show ? 'splash-logos-in' : 'opacity-0'}`}>
        <div className="splash-badge">
          <Image src="/badges/sak.jpg" alt="SAK Badge" width={96} height={96} priority className="rounded-full object-cover" />
        </div>
        <div className="splash-badge">
          <Image src="/badges/cps.png" alt="CPS Badge" width={96} height={96} priority className="rounded-full object-cover" />
        </div>
      </div>

      {/* App title */}
      <h1 className={`mt-7 text-2xl sm:text-3xl font-extrabold text-white tracking-wide transition-all duration-700 delay-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        SAK / CPS Supervision
      </h1>

      {/* Tagline */}
      <p className={`mt-2 text-xs sm:text-sm font-medium text-white/60 tracking-wider transition-all duration-700 delay-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        Smart School Monitoring for Excellence
      </p>

      {/* Loader */}
      <div className={`mt-10 transition-opacity duration-500 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
        <div className="splash-loader" />
      </div>

      {/* Footer */}
      <p className={`absolute bottom-8 text-[10px] text-white/30 transition-opacity duration-700 delay-1000 ${show ? 'opacity-100' : 'opacity-0'}`}>
        © {new Date().getFullYear()} SAK / CPS Schools
      </p>
    </div>
  );
}
