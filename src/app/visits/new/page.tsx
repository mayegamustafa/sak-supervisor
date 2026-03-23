'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllSchools } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import VisitForm from '@/components/VisitForm';
import type { School } from '@/types';

export default function NewVisitPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!appUser) return;
    getAllSchools().then(setSchools);
  }, [appUser]);

  if (loading || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <h1 className="mb-6 text-lg font-bold text-gray-900">Log a School Supervision</h1>
      <VisitForm schools={schools} />
    </div>
  );
}
