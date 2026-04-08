import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SupervisionTool, SupervisionSession } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function toDate(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return String(ts ?? '');
}

// ─── Supervision Tools ──────────────────────────────────────────────────────

export async function createSupervisionTool(
  data: Omit<SupervisionTool, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'supervision_tools'), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSupervisionTool(
  id: string,
  data: Partial<Omit<SupervisionTool, 'id' | 'created_at'>>
): Promise<void> {
  await updateDoc(doc(db, 'supervision_tools', id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteSupervisionTool(id: string): Promise<void> {
  await deleteDoc(doc(db, 'supervision_tools', id));
}

export async function getSupervisionTool(id: string): Promise<SupervisionTool | null> {
  const snap = await getDoc(doc(db, 'supervision_tools', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...d,
    id: snap.id,
    created_at: toDate(d.created_at),
    updated_at: toDate(d.updated_at),
  } as SupervisionTool;
}

export async function getAllSupervisionTools(): Promise<SupervisionTool[]> {
  const snaps = await getDocs(collection(db, 'supervision_tools'));
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return {
        ...d,
        id: s.id,
        created_at: toDate(d.created_at),
        updated_at: toDate(d.updated_at),
      } as SupervisionTool;
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

// ─── Supervision Sessions ───────────────────────────────────────────────────

export async function createSupervisionSession(
  data: Omit<SupervisionSession, 'id' | 'created_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'supervision_sessions'), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getSupervisionSession(id: string): Promise<SupervisionSession | null> {
  const snap = await getDoc(doc(db, 'supervision_sessions', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...d,
    id: snap.id,
    created_at: toDate(d.created_at),
  } as SupervisionSession;
}

export async function getAllSupervisionSessions(): Promise<SupervisionSession[]> {
  const snaps = await getDocs(collection(db, 'supervision_sessions'));
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return {
        ...d,
        id: s.id,
        created_at: toDate(d.created_at),
      } as SupervisionSession;
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

export async function getUserSupervisionSessions(userId: string): Promise<SupervisionSession[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'supervision_sessions'),
    where('supervisor_id', '==', userId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return {
        ...d,
        id: s.id,
        created_at: toDate(d.created_at),
      } as SupervisionSession;
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

export async function deleteSupervisionSession(id: string): Promise<void> {
  await deleteDoc(doc(db, 'supervision_sessions', id));
}
