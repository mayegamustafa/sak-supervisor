import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Issue, FollowUp, Resolution, School, VisitLog } from '@/types';

// ─── Admin setup ─────────────────────────────────────────────────────────────

export async function checkAdminExists(): Promise<boolean> {
  const q = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toDate(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return String(ts ?? '');
}

// ─── Issues ──────────────────────────────────────────────────────────────────

export async function createIssue(
  data: Omit<Issue, 'id' | 'created_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'issues'), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getIssue(id: string): Promise<Issue | null> {
  const snap = await getDoc(doc(db, 'issues', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { ...d, id: snap.id, created_at: toDate(d.created_at) } as Issue;
}

export async function getSchoolIssues(schoolId: string): Promise<Issue[]> {
  if (!schoolId) return [];
  const q = query(
    collection(db, 'issues'),
    where('school_id', '==', schoolId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return { ...d, id: s.id, created_at: toDate(d.created_at) } as Issue;
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

export async function getAllIssues(): Promise<Issue[]> {
  const q = query(collection(db, 'issues'), orderBy('created_at', 'desc'));
  const snaps = await getDocs(q);
  return snaps.docs.map((s) => {
    const d = s.data();
    return { ...d, id: s.id, created_at: toDate(d.created_at) } as Issue;
  });
}

export async function updateIssueStatus(
  issueId: string,
  status: Issue['status']
): Promise<void> {
  await updateDoc(doc(db, 'issues', issueId), { status });
}

// ─── Resolutions ─────────────────────────────────────────────────────────────

export async function resolveIssue(
  issueId: string,
  resolution_description: string,
  resolved_by: string
): Promise<void> {
  await addDoc(collection(db, 'resolutions'), {
    issue_id: issueId,
    resolution_description,
    resolved_by,
    resolved_at: serverTimestamp(),
  });
  await updateDoc(doc(db, 'issues', issueId), { status: 'Resolved' });
}

export async function getResolution(issueId: string): Promise<Resolution | null> {
  if (!issueId) return null;
  const q = query(
    collection(db, 'resolutions'),
    where('issue_id', '==', issueId)
  );
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const s = snaps.docs[0];
  const d = s.data();
  return { ...d, id: s.id, resolved_at: toDate(d.resolved_at) } as Resolution;
}

export async function getAllResolutions(): Promise<Resolution[]> {
  const snaps = await getDocs(collection(db, 'resolutions'));
  return snaps.docs.map((s) => {
    const d = s.data();
    return { ...d, id: s.id, resolved_at: toDate(d.resolved_at) } as Resolution;
  });
}

// ─── Follow-ups ───────────────────────────────────────────────────────────────

export async function addFollowUp(
  issueId: string,
  comment: string,
  created_by: string
): Promise<void> {
  await addDoc(collection(db, 'followups'), {
    issue_id: issueId,
    comment,
    created_by,
    created_at: serverTimestamp(),
  });
}

export async function getFollowUps(issueId: string): Promise<FollowUp[]> {
  if (!issueId) return [];
  const q = query(
    collection(db, 'followups'),
    where('issue_id', '==', issueId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return { ...d, id: s.id, created_at: toDate(d.created_at) } as FollowUp;
    })
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
}

// ─── Schools ──────────────────────────────────────────────────────────────────

export async function createSchool(
  data: Omit<School, 'id' | 'created_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'schools'), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSchool(
  id: string,
  data: Partial<Omit<School, 'id' | 'created_at'>>
): Promise<void> {
  await updateDoc(doc(db, 'schools', id), data);
}

export async function getAllSchools(): Promise<School[]> {
  const q = query(collection(db, 'schools'), orderBy('school_name', 'asc'));
  const snaps = await getDocs(q);
  return snaps.docs.map((s) => {
    const d = s.data();
    return { ...d, id: s.id, created_at: toDate(d.created_at) } as School;
  });
}

export async function getSchool(id: string): Promise<School | null> {
  const snap = await getDoc(doc(db, 'schools', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { ...d, id: snap.id, created_at: toDate(d.created_at) } as School;
}

// ─── Visit Logs ───────────────────────────────────────────────────────────────

export async function logVisit(
  data: Omit<VisitLog, 'id' | 'created_at'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'visit_logs'), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getSupervisorVisits(supervisorId: string): Promise<VisitLog[]> {
  if (!supervisorId) return [];
  const q = query(
    collection(db, 'visit_logs'),
    where('supervisor_id', '==', supervisorId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return { ...d, id: s.id, created_at: toDate(d.created_at) } as VisitLog;
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

export async function getAllVisits(): Promise<VisitLog[]> {
  const q = query(collection(db, 'visit_logs'), orderBy('created_at', 'desc'));
  const snaps = await getDocs(q);
  return snaps.docs.map((s) => {
    const d = s.data();
    return { ...d, id: s.id, created_at: toDate(d.created_at) } as VisitLog;
  });
}
