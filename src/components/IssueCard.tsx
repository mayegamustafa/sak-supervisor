'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Issue, Comment } from '@/types';
import { ExclamationTriangleIcon, StarIcon, HeartIcon, ChatBubbleIcon } from '@/components/Icons';
import { useAuth } from '@/context/AuthContext';
import { toggleLike, getComments, addComment } from '@/lib/firestore';

const issueStatusColor: Record<Issue['status'], string> = {
  Pending: 'bg-red-50 text-red-700 border-red-200',
  'In Progress': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Resolved: 'bg-green-50 text-green-700 border-green-200',
};

const strengthStatusColor: Record<Issue['status'], string> = {
  Pending: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Progress': 'bg-teal-50 text-teal-700 border-teal-200',
  Resolved: 'bg-green-50 text-green-700 border-green-200',
};

interface Props {
  issue: Issue;
}

export default function IssueCard({ issue }: Props) {
  const router = useRouter();
  const { appUser } = useAuth();
  const isStrength = issue.submission_type === 'strength';
  const statusColor = isStrength ? strengthStatusColor[issue.status] : issueStatusColor[issue.status];

  // ── Likes ────────────────────────────────────────────────────────────────
  const [likes, setLikes] = useState<string[]>(issue.likes ?? []);
  const liked = appUser ? likes.includes(appUser.id) : false;
  const [likeBusy, setLikeBusy] = useState(false);

  // ── Comments ─────────────────────────────────────────────────────────────
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(issue.comment_count ?? 0);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!appUser || likeBusy) return;
    setLikeBusy(true);
    const next = liked ? likes.filter((id) => id !== appUser.id) : [...likes, appUser.id];
    setLikes(next);
    await toggleLike(issue.id, appUser.id, liked);
    setLikeBusy(false);
  }, [appUser, liked, likes, likeBusy, issue.id]);

  const handleToggleComments = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showComments && comments === null) {
      const loaded = await getComments(issue.id);
      setComments(loaded);
    }
    setShowComments((v) => !v);
  }, [showComments, comments, issue.id]);

  const handleAddComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!appUser || !commentText.trim() || submitting) return;
    setSubmitting(true);
    const newComment = await addComment(
      issue.id,
      commentText.trim(),
      appUser.id,
      appUser.name ?? appUser.email ?? 'User'
    );
    setComments((prev) => [...(prev ?? []), newComment]);
    setLocalCommentCount((n) => n + 1);
    setCommentText('');
    setSubmitting(false);
  }, [appUser, commentText, submitting, issue.id]);

  return (
    <div
      className={`rounded-xl border shadow-sm overflow-hidden ${statusColor} cursor-pointer active:opacity-80 transition-opacity`}
      onClick={() => router.push(`/issues/${issue.id}`)}
    >
      {/* ── Card body ──────────────────────────────────────────────────────── */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {isStrength && <StarIcon className="mt-0.5 shrink-0 h-4 w-4 text-green-600" />}
            <h3 className="font-semibold leading-snug text-gray-900 line-clamp-2">{issue.issue_title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 truncate max-w-[100px]">
            {issue.created_by}
          </span>
        </div>

        <p className="mb-3 text-sm text-gray-600 line-clamp-2">{issue.description}</p>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          {isStrength ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-200">
              <StarIcon className="h-3 w-3" /> Strength
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
              <ExclamationTriangleIcon className="h-3 w-3" /> Issue
            </span>
          )}
          <span className="rounded-full bg-white/60 px-2 py-0.5 border border-current">{issue.status}</span>
          <span className="rounded-full bg-white/40 px-2 py-0.5">{issue.category}</span>
          <span className="truncate max-w-[120px]">{issue.school_name}</span>
          <span className="ml-auto text-gray-400">{new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* ── Photo ──────────────────────────────────────────────────────────── */}
      {issue.photo_url && (
        <div
          className="border-t border-black/5"
          onClick={(e) => { e.stopPropagation(); router.push(`/issues/${issue.id}`); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={issue.photo_url}
            alt="Observation photo"
            className="w-full max-h-72 object-cover"
          />
        </div>
      )}

      {/* ── Reaction bar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 px-4 py-2.5 border-t border-black/5 bg-black/[0.03]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={likeBusy || !appUser}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors select-none ${
            liked ? 'text-red-600' : 'text-gray-500 hover:text-red-500'
          } disabled:opacity-40`}
        >
          <HeartIcon className="h-[18px] w-[18px]" filled={liked} />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>

        {/* Comments toggle */}
        <button
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors select-none ${
            showComments ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
          }`}
        >
          <ChatBubbleIcon className="h-[18px] w-[18px]" />
          {localCommentCount > 0 && <span>{localCommentCount}</span>}
        </button>

        <span className="ml-auto text-xs text-gray-400 select-none">Tap to view details →</span>
      </div>

      {/* ── Inline comments ────────────────────────────────────────────────── */}
      {showComments && (
        <div
          className="border-t border-black/5 bg-white/60 px-4 py-3 space-y-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {comments === null ? (
            <p className="text-xs text-gray-400 animate-pulse">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400">No comments yet — be first!</p>
          ) : (
            <div className="space-y-2">
              {comments.slice(-5).map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-[10px] font-bold uppercase">
                    {c.user_name.charAt(0)}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800 mr-1.5">{c.user_name}</span>
                    <span className="text-gray-700">{c.text}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {(issue.comment_count ?? 0) > 5 && (
                <button
                  onClick={() => router.push(`/issues/${issue.id}`)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View all {issue.comment_count} comments →
                </button>
              )}
            </div>
          )}

          {appUser && (
            <form
              onSubmit={handleAddComment}
              className="flex gap-2 pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-800/30"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submitting}
                className="rounded-full bg-red-800 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
              >
                {submitting ? '…' : 'Post'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

