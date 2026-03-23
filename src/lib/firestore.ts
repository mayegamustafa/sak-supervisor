import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Issue, FollowUp, Resolution, School, VisitLog, TermConfig, ChatMessage, ChatRoom, AppUser } from '@/types';

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

// ─── User Management (Admin) ─────────────────────────────────────────────────

export async function getAllUsers(): Promise<AppUser[]> {
  const snaps = await getDocs(collection(db, 'users'));
  return snaps.docs.map((s) => {
    const d = s.data();
    return { ...d, id: s.id, created_at: toDate(d.created_at) } as AppUser;
  });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<AppUser, 'name' | 'role' | 'active'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
}

// ─── Term Configuration ──────────────────────────────────────────────────────

export async function saveTermConfig(data: Omit<TermConfig, 'id' | 'created_at'>): Promise<string> {
  const ref = await addDoc(collection(db, 'term_configs'), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTermConfig(id: string, data: Partial<Omit<TermConfig, 'id' | 'created_at'>>): Promise<void> {
  await updateDoc(doc(db, 'term_configs', id), data);
}

export async function getAllTermConfigs(): Promise<TermConfig[]> {
  const snaps = await getDocs(collection(db, 'term_configs'));
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return { ...d, id: s.id, created_at: toDate(d.created_at) } as TermConfig;
    })
    .sort((a, b) => (b.start_date > a.start_date ? 1 : -1));
}

export function getActiveTerm(terms: TermConfig[], date: Date = new Date()): TermConfig | null {
  const iso = date.toISOString().split('T')[0];
  return terms.find((t) => iso >= t.start_date && iso <= t.end_date) ?? null;
}

export function getWeekNumber(termStart: string, date: Date = new Date()): number {
  const start = new Date(termStart);
  const diff = date.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

// ─── Presence ────────────────────────────────────────────────────────────────

export async function setUserOnline(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    online: true,
    last_seen: new Date().toISOString(),
  });
}

export async function setUserOffline(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    online: false,
    last_seen: new Date().toISOString(),
  });
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function getOrCreateChatRoom(
  user1Id: string,
  user1Name: string,
  user2Id: string,
  user2Name: string
): Promise<string> {
  // Check if a room already exists between these two users
  const q = query(
    collection(db, 'chat_rooms'),
    where('participants', 'array-contains', user1Id)
  );
  const snaps = await getDocs(q);
  const existing = snaps.docs.find((s) => {
    const d = s.data();
    return d.participants.includes(user2Id);
  });
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, 'chat_rooms'), {
    participants: [user1Id, user2Id],
    participant_names: { [user1Id]: user1Name, [user2Id]: user2Name },
    last_message: '',
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  await addDoc(collection(db, 'chat_rooms', chatId, 'messages'), {
    chat_id: chatId,
    sender_id: senderId,
    sender_name: senderName,
    text,
    created_at: serverTimestamp(),
  });
  await updateDoc(doc(db, 'chat_rooms', chatId), {
    last_message: text,
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export function onMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'chat_rooms', chatId, 'messages'),
    orderBy('created_at', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((s) => {
      const d = s.data();
      return { ...d, id: s.id, created_at: toDate(d.created_at) } as ChatMessage;
    });
    callback(msgs);
  });
}

export async function getUserChatRooms(userId: string): Promise<ChatRoom[]> {
  const q = query(
    collection(db, 'chat_rooms'),
    where('participants', 'array-contains', userId)
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((s) => {
      const d = s.data();
      return { ...d, id: s.id } as ChatRoom;
    })
    .sort((a, b) => (b.last_message_at > a.last_message_at ? 1 : -1));
}

// ─── Notifications (Firestore-based for triggers) ────────────────────────────

export async function createNotification(data: {
  type: 'issue' | 'chat' | 'visit' | 'system';
  title: string;
  body: string;
  target_user_id?: string;
  target_all?: boolean;
  created_by: string;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    created_at: serverTimestamp(),
  });
}

