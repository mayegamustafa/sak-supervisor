'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getIssue,
  getFollowUps,
  getResolution,
  addFollowUp,
  resolveIssue,
  updateIssueStatus,
  updateIssue,
  deleteIssue,
  deleteVisitLogsByIssue,
  createNotification,
  autoLogVisit,
} from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import { uploadPhoto, getIssuePhotos } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import FollowUpTimeline from '@/components/FollowUpTimeline';
import ImageViewer from '@/components/ImageViewer';
import { CheckCircleIcon } from '@/components/Icons';
import type { Issue, FollowUp, Resolution, IssueCategory, IssuePriority } from '@/types';

const priorityColor: Record<Issue['priority'], string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

const CATEGORIES: IssueCategory[] = ['Infrastructure', 'Teaching', 'Discipline', 'Attendance', 'Learning Materials', 'Sanitation', 'Other'];
const PRIORITIES: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical'];
const MAX_PHOTOS = 4;

function isWithin24Hours(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

export default function IssueDetailPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [fetching, setFetching] = useState(true);

  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const [resolutionDesc, setResolutionDesc] = useState('');
  const [resolving, setResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolvePhotos, setResolvePhotos] = useState<File[]>([]);
  const [resolvePhotoPreviews, setResolvePhotoPreviews] = useState<string[]>([]);
  const resolveCameraRef = useRef<HTMLInputElement>(null);
  const resolveGalleryRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<IssueCategory>('Infrastructure');
  const [editPriority, setEditPriority] = useState<IssuePriority>('Medium');
  const [editClassSection, setEditClassSection] = useState('');
  const [editPhotos, setEditPhotos] = useState<File[]>([]);
  const [editPhotoPreviews, setEditPhotoPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const editCameraRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteVisitLogs, setDeleteVisitLogs] = useState(false);

  useEffect(() => {
    if (!loading && !appUser) router.replace('/login');
  }, [loading, appUser, router]);

  useEffect(() => {
    if (!id || !appUser) return;
    Promise.all([getIssue(id), getFollowUps(id), getResolution(id)]).then(
      ([i, f, r]) => {
        setIssue(i);
        setFollowups(f);
        setResolution(r);
        setFetching(false);
      }
    );
  }, [id, appUser]);

  // Ownership & permission checks
  const isOwner = !!(issue && appUser && (issue.created_by_id === appUser.id || issue.created_by === appUser.name));
  const isAdmin = appUser?.role === 'admin';
  const canEdit = isOwner && issue ? isWithin24Hours(issue.created_at) : false;
  const canDelete = isAdmin || (isOwner && issue ? isWithin24Hours(issue.created_at) : false);
  const canResolve = isOwner || isAdmin;

  function addPhotos(
    files: FileList | null,
    photos: File[],
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const incoming = Array.from(files).slice(0, remaining);
    setFiles((prev) => [...prev, ...incoming]);
    setPreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);
  }

  function removePhoto(
    index: number,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function startEditing() {
    if (!issue) return;
    setEditTitle(issue.issue_title);
    setEditDescription(issue.description);
    setEditCategory(issue.category as IssueCategory);
    setEditPriority(issue.priority);
    setEditClassSection(issue.class_section);
    setEditPhotos([]);
    setEditPhotoPreviews([]);
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!issue || !appUser || !id) return;
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const data: Parameters<typeof updateIssue>[1] = {
        issue_title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        priority: editPriority,
        class_section: editClassSection.trim(),
      };
      if (editPhotos.length > 0) {
        data.photo_urls = await Promise.all(
          editPhotos.map((f) => uploadPhoto(f, `issues/${issue.school_id}`))
        );
        data.photo_url = '';
      }
      await updateIssue(id, data);
      const updated = await getIssue(id);
      setIssue(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !appUser || !issue) return;
    setDeleting(true);
    try {
      if (deleteVisitLogs) {
        await deleteVisitLogsByIssue(issue.school_id, issue.created_by_id, issue.created_at);
      }
      await deleteIssue(id);
      router.push('/issues');
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !appUser || !id || !issue) return;
    setAddingComment(true);
    await addFollowUp(id, comment.trim(), appUser.name);
    // Auto-set Pending → In Progress
    if (issue.status === 'Pending') {
      await updateIssueStatus(id, 'In Progress');
      setIssue((prev) => prev ? { ...prev, status: 'In Progress' } : prev);
    }
    const updated = await getFollowUps(id);
    setFollowups(updated);
    // Notify about the follow-up
    const notifTitle = 'Follow-up Added';
    const notifBody = `${appUser.name} added a follow-up on: ${issue.issue_title}`;
    createNotification({ type: 'issue', title: notifTitle, body: notifBody, target_all: true, created_by: appUser.id });
    sendPush({ title: notifTitle, body: notifBody, target_all: true });
    // Auto-log supervision visit
    autoLogVisit({
      supervisor_id: appUser.id,
      supervisor_name: appUser.name,
      school_id: issue.school_id,
      school_name: issue.school_name,
      activity: `Follow-up on: ${issue.issue_title}`,
    }).catch(() => {});
    setComment('');
    setAddingComment(false);
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolutionDesc.trim() || !appUser || !id || !issue) return;
    setResolving(true);
    try {
      // Best-effort photo uploads — a failed photo must not block resolving.
      let photo_urls: string[] = [];
      if (resolvePhotos.length > 0) {
        const results = await Promise.allSettled(
          resolvePhotos.map((f) => uploadPhoto(f, `resolutions/${issue.school_id}`))
        );
        photo_urls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r) => r.value);
      }
      await resolveIssue(id, resolutionDesc.trim(), appUser.name, photo_urls);
      const [i, r] = await Promise.all([getIssue(id), getResolution(id)]);
      setIssue(i);
      setResolution(r);
      // Notify about the resolution (best-effort)
      const notifTitle = 'Issue Resolved';
      const notifBody = `${appUser.name} resolved: ${issue.issue_title}`;
      createNotification({ type: 'issue', title: notifTitle, body: notifBody, target_all: true, created_by: appUser.id }).catch(() => {});
      try { sendPush({ title: notifTitle, body: notifBody, target_all: true }); } catch { /* ignore */ }
      // Auto-log supervision visit
      autoLogVisit({
        supervisor_id: appUser.id,
        supervisor_name: appUser.name,
        school_id: issue.school_id,
        school_name: issue.school_name,
        activity: `Resolved issue: ${issue.issue_title}`,
      }).catch(() => {});
      setShowResolveForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to resolve. Please try again.');
    } finally {
      setResolving(false);
    }
  }

  if (loading || fetching || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!issue) return <p className="p-4 text-gray-500">Issue not found.</p>;

  const hoursLeft = Math.max(0, 24 - (Date.now() - new Date(issue.created_at).getTime()) / 3600000);

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-red-800 font-medium">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Back
      </button>

      {/* Header / View Mode */}
      {!editing ? (
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{issue.issue_title}</h1>
            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 truncate max-w-[120px]">
              {issue.created_by}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-medium ${
              issue.status === 'Resolved'
                ? 'bg-green-100 text-green-700'
                : issue.status === 'In Progress'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-700'
            }`}>
              {issue.status}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{issue.category}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{issue.school_name}</span>
            {issue.class_section && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{issue.class_section}</span>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-700">{issue.description}</p>

          {getIssuePhotos(issue).length === 1 && (
            <ImageViewer
              src={getIssuePhotos(issue)[0]}
              alt="Issue photo"
              className="mt-3 w-full rounded-xl object-cover max-h-60"
            />
          )}
          {getIssuePhotos(issue).length > 1 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {getIssuePhotos(issue).map((src, i) => (
                <ImageViewer
                  key={i}
                  src={src}
                  alt={`Issue photo ${i + 1}`}
                  className="h-36 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            Reported by {issue.created_by} · {new Date(issue.created_at).toLocaleString()}
          </p>

          {/* Edit / Delete buttons */}
          {(canEdit || canDelete) && (
            <div className="mt-4 flex gap-3">
              {canEdit && issue.status !== 'Resolved' && (
                <button onClick={startEditing} className="flex-1 rounded-xl border border-red-300 py-2.5 text-sm font-semibold text-red-900 hover:bg-red-50">
                  Edit Issue
                </button>
              )}
              {canDelete && (
                <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 rounded-xl border border-red-300 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                  Delete Issue
                </button>
              )}
            </div>
          )}
          {isOwner && !isAdmin && !canEdit && issue.status !== 'Resolved' && (
            <p className="mt-2 text-xs text-gray-400">Edit/delete window has expired (24 hours).</p>
          )}
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSaveEdit} className="rounded-2xl bg-white border border-red-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">Edit Issue</h2>
            <span className="text-xs text-gray-400">{Math.floor(hoursLeft)}h left to edit</span>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as IssueCategory)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => setEditPriority(p)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    editPriority === p ? 'border-red-800 bg-red-800 text-white' : 'border-gray-300 bg-white text-gray-700'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Class / Section</label>
            <input type="text" value={editClassSection} onChange={(e) => setEditClassSection(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Replace Photos (optional, up to {MAX_PHOTOS})</label>
            <div className={`flex gap-2 ${editPhotos.length >= MAX_PHOTOS ? 'opacity-50 pointer-events-none' : ''}`}>
              <button type="button" onClick={() => editCameraRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <svg className="h-4 w-4 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                Camera
              </button>
              <button type="button" onClick={() => editGalleryRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <svg className="h-4 w-4 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                Gallery
              </button>
            </div>
            <input ref={editCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => {
              addPhotos(e.target.files, editPhotos, setEditPhotos, setEditPhotoPreviews);
              e.target.value = '';
            }} className="hidden" />
            <input ref={editGalleryRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => {
              addPhotos(e.target.files, editPhotos, setEditPhotos, setEditPhotoPreviews);
              e.target.value = '';
            }} className="hidden" />
            {editPhotoPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {editPhotoPreviews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Preview ${i + 1}`} className="h-24 w-full rounded-xl object-cover border border-gray-200" />
                    <button type="button" onClick={() => removePhoto(i, setEditPhotos, setEditPhotoPreviews)}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            {editPhotoPreviews.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">New photos will replace the existing ones.</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving || !editTitle.trim()}
              className="flex-1 rounded-xl bg-red-800 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-red-800">Delete this issue?</h2>
          <p className="text-sm text-red-700">This action cannot be undone. The issue and all its data will be permanently removed.</p>
          {isAdmin && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteVisitLogs}
                onChange={(e) => setDeleteVisitLogs(e.target.checked)}
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-red-700">Also delete associated visit logs for this school &amp; date</span>
            </label>
          )}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={() => { setShowDeleteConfirm(false); setDeleteVisitLogs(false); }}
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-gray-700 uppercase tracking-wide">Timeline</h2>
        <FollowUpTimeline issue={issue} followups={followups} resolution={resolution} />
      </div>

      {/* Add follow-up comment */}
      {issue.status !== 'Resolved' && (
        <form onSubmit={handleAddComment} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-gray-700">Add Follow-up Comment</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Add an update or observation…"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingComment || !comment.trim()}
            className="w-full rounded-xl bg-red-800 py-3 font-semibold text-white disabled:opacity-60"
          >
            {addingComment ? 'Posting…' : 'Post Comment'}
          </button>
        </form>
      )}

      {/* Resolve button — only for admin or issue creator */}
      {issue.status !== 'Resolved' && canResolve && !showResolveForm && (
        <button
          onClick={() => setShowResolveForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-base font-bold text-white"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Mark as Resolved
        </button>
      )}

      {showResolveForm && (
        <form onSubmit={handleResolve} className="rounded-2xl bg-green-50 border border-green-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-green-800">Resolution Details</h2>
          <textarea
            value={resolutionDesc}
            onChange={(e) => setResolutionDesc(e.target.value)}
            rows={3}
            placeholder="Describe how this issue was resolved…"
            className="w-full rounded-xl border border-green-300 px-4 py-3 text-base focus:border-green-500 focus:outline-none"
            required
          />

          {/* Resolution photos */}
          <div>
            <label className="block text-sm font-semibold text-green-800 mb-2">Photos (optional, up to {MAX_PHOTOS})</label>
            <div className={`flex gap-2 ${resolvePhotos.length >= MAX_PHOTOS ? 'opacity-50 pointer-events-none' : ''}`}>
              <button type="button" onClick={() => resolveCameraRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-green-300 px-3 py-2.5 text-sm font-medium text-green-800 bg-white hover:bg-green-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                Camera
              </button>
              <button type="button" onClick={() => resolveGalleryRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-green-300 px-3 py-2.5 text-sm font-medium text-green-800 bg-white hover:bg-green-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                Gallery
              </button>
            </div>
            <input ref={resolveCameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => {
              addPhotos(e.target.files, resolvePhotos, setResolvePhotos, setResolvePhotoPreviews);
              e.target.value = '';
            }} className="hidden" />
            <input ref={resolveGalleryRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => {
              addPhotos(e.target.files, resolvePhotos, setResolvePhotos, setResolvePhotoPreviews);
              e.target.value = '';
            }} className="hidden" />
            {resolvePhotoPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {resolvePhotoPreviews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Preview ${i + 1}`} className="h-24 w-full rounded-xl object-cover border border-green-200" />
                    <button type="button" onClick={() => removePhoto(i, setResolvePhotos, setResolvePhotoPreviews)}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={resolving || !resolutionDesc.trim()}
              className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              {resolving ? 'Resolving…' : 'Confirm Resolution'}
            </button>
            <button
              type="button"
              onClick={() => setShowResolveForm(false)}
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
