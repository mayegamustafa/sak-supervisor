'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIssue, resolveIssue, updateIssueStatus } from '@/lib/firestore';
import { uploadPhoto } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import type { School, IssueCategory, IssuePriority, IssueStatus } from '@/types';

const CATEGORIES: IssueCategory[] = [
  'Infrastructure',
  'Teaching',
  'Discipline',
  'Attendance',
  'Learning Materials',
  'Sanitation',
  'Other',
];

const STATUSES: IssueStatus[] = ['Pending', 'In Progress', 'Resolved'];

interface Props {
  schools: School[];
}

export default function IssueForm({ schools }: Props) {
  const { appUser } = useAuth();
  const router = useRouter();

  const [school_id, setSchoolId] = useState('');
  const [class_section, setClassSection] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Infrastructure');
  const [customCategory, setCustomCategory] = useState('');
  const [issue_title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [status, setStatus] = useState<IssueStatus>('Pending');
  const [resolution_description, setResolutionDesc] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSchool = schools.find((s) => s.id === school_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    if (!school_id) { setError('Please select a school.'); return; }
    if (!issue_title.trim()) { setError('Issue title is required.'); return; }
    if (status === 'Resolved' && !resolution_description.trim()) {
      setError('Resolution description is required when status is Resolved.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let photo_url = '';
      if (photo) {
        photo_url = await uploadPhoto(photo, `issues/${school_id}`);
      }

      const issueId = await createIssue({
        school_id,
        school_name: selectedSchool?.school_name ?? '',
        class_section,
        category: category === 'Other' ? customCategory.trim() || 'Other' : category,
        issue_title,
        description,
        priority,
        status,
        photo_url,
        created_by: appUser.name,
      });

      if (status === 'Resolved') {
        await resolveIssue(issueId, resolution_description, appUser.name);
      } else if (status === 'In Progress') {
        await updateIssueStatus(issueId, 'In Progress');
      }

      router.push(`/issues/${issueId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to submit issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* School */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">School *</label>
        <select
          value={school_id}
          onChange={(e) => setSchoolId(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">Select school…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.school_name}</option>
          ))}
        </select>
      </div>

      {/* Class / Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Class / Section</label>
        <input
          type="text"
          value={class_section}
          onChange={(e) => setClassSection(e.target.value)}
          placeholder="e.g. KG 1, P.2 Y, P.7 Y"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value as IssueCategory); if (e.target.value !== 'Other') setCustomCategory(''); }}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {category === 'Other' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Specify Category *</label>
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Enter custom category…"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Issue Title *</label>
        <input
          type="text"
          value={issue_title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title of the issue"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the issue in detail…"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Status *</label>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                status === s
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution Description (shown only if Resolved) */}
      {status === 'Resolved' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Resolution Description *
          </label>
          <textarea
            value={resolution_description}
            onChange={(e) => setResolutionDesc(e.target.value)}
            rows={3}
            placeholder="How was this issue resolved?"
            className="w-full rounded-xl border border-green-400 px-4 py-3 text-base focus:border-green-600 focus:outline-none"
            required
          />
        </div>
      )}

      {/* Photo */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Photo Evidence (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm"
        />
        {photo && <p className="mt-1 text-xs text-gray-500">{photo.name}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Issue'}
      </button>
    </form>
  );
}
