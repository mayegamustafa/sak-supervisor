'use client';

import { useEffect, useState } from 'react';
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
  createNotification,
  autoLogVisit,
} from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import { uploadPhoto } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import FollowUpTimeline from '@/components/FollowUpTimeline';
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

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<IssueCategory>('Infrastructure');
  const [editPriority, setEditPriority] = useState<IssuePriority>('Medium');
  const [editClassSection, setEditClassSection] = useState('');
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  function startEditing() {
    if (!issue) return;
    setEditTitle(issue.issue_title);
    setEditDescription(issue.description);
    setEditCategory(issue.category as IssueCategory);
    setEditPriority(issue.priority);
    setEditClassSection(issue.class_section);
    setEditPhoto(null);
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!issue || !appUser || !id) return;
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      let photo_url = issue.photo_url;
      if (editPhoto) {
        photo_url = await uploadPhoto(editPhoto, `issues/${issue.school_id}`);
      }
      await updateIssue(id, {
        issue_title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        priority: editPriority,
        class_section: editClassSection.trim(),
        photo_url,
      });
      const updated = await getIssue(id);
      setIssue(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !appUser) return;
    setDeleting(true);
    try {
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
    await resolveIssue(id, resolutionDesc.trim(), appUser.name);
    const [i, r] = await Promise.all([getIssue(id), getResolution(id)]);
    setIssue(i);
    setResolution(r);
    // Notify about the resolution
    const notifTitle = 'Issue Resolved';
    const notifBody = `${appUser.name} resolved: ${issue.issue_title}`;
    createNotification({ type: 'issue', title: notifTitle, body: notifBody, target_all: true, created_by: appUser.id });
    sendPush({ title: notifTitle, body: notifBody, target_all: true });
    // Auto-log supervision visit
    autoLogVisit({
      supervisor_id: appUser.id,
      supervisor_name: appUser.name,
      school_id: issue.school_id,
      school_name: issue.school_name,
      activity: `Resolved issue: ${issue.issue_title}`,
    }).catch(() => {});
    setShowResolveForm(false);
    setResolving(false);
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
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[issue.priority]}`}>
              {issue.priority}
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

          {issue.photo_url && (
            <img
              src={issue.photo_url}
              alt="Issue photo"
              loading="lazy"
              className="mt-3 w-full rounded-xl object-cover max-h-60"
            />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Replace Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setEditPhoto(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm" />
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
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
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
