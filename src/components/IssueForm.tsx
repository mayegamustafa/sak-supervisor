'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createIssue, resolveIssue, updateIssueStatus, createNotification, autoLogVisit, getCustomCategories } from '@/lib/firestore';
import { sendPush } from '@/lib/messaging';
import { uploadPhoto } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { ExclamationTriangleIcon, TrophyIcon } from '@/components/Icons';
import type { School, IssueCategory, IssuePriority, IssueStatus, SubmissionType } from '@/types';

const BASE_ISSUE_CATEGORIES: IssueCategory[] = [
  'Academic',
  'Quality',
  'Finance',
  'Infrastructure',
  'TDP',
  'Other',
];

const STRENGTH_CATEGORIES: IssueCategory[] = [
  'Academic',
  'Quality',
  'Infrastructure',
  'TDP',
  'Other',
];

const AREA_SUGGESTIONS = [
  // Class levels
  'KG 1', 'KG 2',
  'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7',
  'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6',
  // School areas
  'Kitchen', 'Playground', 'Library', 'Computer Lab',
  'Staff Room', 'Toilets', 'Head Teacher\'s Office', 'Assembly Hall',
  'Dormitory', 'Canteen', 'Sports Field', 'Chapel', 'Mosque',
  'Science Lab', 'Art Room', 'Garden', 'Compound', 'Gate',
  'Store', 'Workshop', 'Nursery Class',
];

const STATUSES: IssueStatus[] = ['Pending', 'In Progress', 'Resolved'];

interface Props {
  schools: School[];
  defaultType?: SubmissionType;
}

export default function IssueForm({ schools, defaultType = 'issue' }: Props) {
  const { appUser } = useAuth();
  const router = useRouter();

  const [submission_type, setSubmissionType] = useState<SubmissionType>(defaultType);
  const [school_id, setSchoolId] = useState('');
  const [class_section, setClassSection] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Academic');
  const [customCategory, setCustomCategory] = useState('');
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [issue_title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [status, setStatus] = useState<IssueStatus>('Pending');
  const [resolution_description, setResolutionDesc] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCustomCategories().then(setCustomCats).catch(() => {});
  }, []);

  const selectedSchool = schools.find((s) => s.id === school_id);
  const isStrength = submission_type === 'strength';
  const baseCategories = isStrength ? STRENGTH_CATEGORIES : BASE_ISSUE_CATEGORIES;
  const CATEGORIES = [
    ...baseCategories.filter((c) => c !== 'Other'),
    ...customCats.filter((c) => !baseCategories.includes(c as IssueCategory)),
    'Other',
  ] as IssueCategory[];

  function handleTypeChange(t: SubmissionType) {
    setSubmissionType(t);
    setCategory('Academic');
    setCustomCategory('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    if (!school_id) { setError('Please select a school.'); return; }
    if (!issue_title.trim()) { setError('Submission title is required.'); return; }
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
        status: isStrength ? 'Resolved' : status,
        photo_url,
        submission_type,
        created_by: appUser.name,
        created_by_id: appUser.id,
      });

      if (!isStrength && status === 'Resolved') {
        await resolveIssue(issueId, resolution_description, appUser.name);
      } else if (!isStrength && status === 'In Progress') {
        await updateIssueStatus(issueId, 'In Progress');
      }

      const notifTitle = isStrength ? 'Strength / Achievement Recorded' : 'New Issue Reported';
      const notifBody = isStrength
        ? `${appUser.name} recorded: ${issue_title} at ${selectedSchool?.school_name ?? 'a school'}`
        : `${appUser.name} reported: ${issue_title} at ${selectedSchool?.school_name ?? 'a school'}`;
      await createNotification({
        type: 'issue',
        title: notifTitle,
        body: notifBody,
        target_all: true,
        created_by: appUser.id,
        related_id: issueId,
      });
      sendPush({ title: notifTitle, body: notifBody, target_all: true });

      autoLogVisit({
        supervisor_id: appUser.id,
        supervisor_name: appUser.name,
        school_id,
        school_name: selectedSchool?.school_name ?? '',
        activity: isStrength ? `Recorded strength: ${issue_title}` : `Reported issue: ${issue_title}`,
      }).catch(() => {});

      router.push(`/issues/${issueId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to submit. Please try again.');
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

      {/* Observation Type Toggle */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Observation Type *</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange('issue')}
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors ${
              !isStrength
                ? 'border-red-800 bg-red-800 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
            }`}
          >
            <ExclamationTriangleIcon className={`h-5 w-5 shrink-0 ${!isStrength ? 'text-white' : 'text-red-700'}`} />
            <div className="text-left">
              <div>Issue / Problem</div>
              <div className={`text-xs font-normal ${!isStrength ? 'text-red-200' : 'text-gray-400'}`}>Something to fix</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('strength')}
            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors ${
              isStrength
                ? 'border-green-700 bg-green-700 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-green-400'
            }`}
          >
            <TrophyIcon className={`h-5 w-5 shrink-0 ${isStrength ? 'text-white' : 'text-green-700'}`} />
            <div className="text-left">
              <div>Strength</div>
              <div className={`text-xs font-normal ${isStrength ? 'text-green-200' : 'text-gray-400'}`}>Something to celebrate</div>
            </div>
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">School *</label>
        <select
          value={school_id}
          onChange={(e) => setSchoolId(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          required
        >
          <option value="">Select school…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.school_name}</option>
          ))}
        </select>
      </div>

      {/* Class / Section / Area */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Class / Area</label>
        <input
          type="text"
          list="area-suggestions"
          value={class_section}
          onChange={(e) => setClassSection(e.target.value)}
          placeholder="e.g. P.5, Kitchen, Playground, Library…"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          autoComplete="off"
        />
        <datalist id="area-suggestions">
          {AREA_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
        </datalist>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value as IssueCategory); if (e.target.value !== 'Other') setCustomCategory(''); }}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
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
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Observation Title *
        </label>
        <input
          type="text"
          value={issue_title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isStrength ? 'e.g. Outstanding academic performance in P.7' : 'Brief title describing the issue'}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
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
          placeholder={isStrength ? 'Describe the strength or achievement in detail…' : 'Describe the issue in detail…'}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          required
        />
      </div>

      {/* Status — only for issues, not strengths */}
      {!isStrength && (
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
                  ? 'border-red-800 bg-red-800 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-red-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Resolution Description (shown only if Resolved, issues only) */}
      {!isStrength && status === 'Resolved' && (
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Photo Evidence (optional)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            Gallery
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setPhoto(f);
          setPhotoPreview(f ? URL.createObjectURL(f) : null);
        }} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setPhoto(f);
          setPhotoPreview(f ? URL.createObjectURL(f) : null);
        }} className="hidden" />
        {photoPreview && (
          <div className="mt-2 relative">
            <img src={photoPreview} alt="Preview" className="h-32 w-full rounded-xl object-cover border border-gray-200" />
            <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs">
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded-xl py-4 text-base font-bold text-white shadow-sm transition-colors disabled:opacity-60 ${isStrength ? 'bg-green-700 hover:bg-green-800' : 'bg-red-800 hover:bg-red-900'}`}
      >
        {submitting ? 'Submitting…' : 'Submit Observation'}
      </button>
    </form>
  );
}
