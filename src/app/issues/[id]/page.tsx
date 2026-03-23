'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getIssue,
  getFollowUps,
  getResolution,
  addFollowUp,
  resolveIssue,
} from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import FollowUpTimeline from '@/components/FollowUpTimeline';
import { CheckCircleIcon } from '@/components/Icons';
import type { Issue, FollowUp, Resolution } from '@/types';

const priorityColor: Record<Issue['priority'], string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

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

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !appUser || !id) return;
    setAddingComment(true);
    await addFollowUp(id, comment.trim(), appUser.name);
    const updated = await getFollowUps(id);
    setFollowups(updated);
    setComment('');
    setAddingComment(false);
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolutionDesc.trim() || !appUser || !id) return;
    setResolving(true);
    await resolveIssue(id, resolutionDesc.trim(), appUser.name);
    const [i, r] = await Promise.all([getIssue(id), getResolution(id)]);
    setIssue(i);
    setResolution(r);
    setShowResolveForm(false);
    setResolving(false);
  }

  if (loading || fetching || !appUser) return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!issue) return <p className="p-4 text-gray-500">Issue not found.</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
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
      </div>

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
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingComment || !comment.trim()}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-60"
          >
            {addingComment ? 'Posting…' : 'Post Comment'}
          </button>
        </form>
      )}

      {/* Resolve button */}
      {issue.status !== 'Resolved' && !showResolveForm && (
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
