'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllUsers, updateUserProfile } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import type { AppUser, UserRole } from '@/types';

export default function ManageUsersPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);

  // Add user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('supervisor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset password
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!appUser) router.replace('/login');
      else if (appUser.role !== 'admin') router.replace('/dashboard');
    }
  }, [loading, appUser, router]);

  const loadUsers = useCallback(async () => {
    const u = await getAllUsers();
    setUsers(u);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (appUser?.role === 'admin') loadUsers();
  }, [appUser, loadUsers]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      // Create Firebase Auth user via API
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Create Firestore profile
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await setDoc(doc(db, 'users', data.uid), {
        id: data.uid,
        name: newName,
        email: newEmail,
        role: newRole,
        active: true,
        created_at: serverTimestamp(),
      });

      setSuccess(`User ${newName} created successfully!`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAdd(false);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(uid: string) {
    if (!resetPassword || resetPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetPassword', uid, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password updated!');
      setShowReset(null);
      setResetPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: AppUser) {
    await updateUserProfile(user.id, { active: !user.active });
    // Also disable/enable in Firebase Auth
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.active ? 'disable' : 'enable', uid: user.id }),
    });
    loadUsers();
  }

  async function changeRole(uid: string, role: UserRole) {
    await updateUserProfile(uid, { role });
    loadUsers();
  }

  if (loading || !appUser || appUser.role !== 'admin') {
    return <div className="flex min-h-[60dvh] items-center justify-center"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Manage Users</h1>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white"
        >
          + Add User
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>}

      {/* Add User Form */}
      {showAdd && (
        <form onSubmit={handleAddUser} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-gray-800">New User</h2>
          <input
            type="text"
            placeholder="Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:border-amber-500 focus:outline-none"
          >
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-red-800 py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </form>
      )}

      {/* Users List */}
      {fetching ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${u.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-900'}`}>
                      {u.role}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {u.last_seen && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last seen: {new Date(u.last_seen).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {u.id !== appUser.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${u.active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                  >
                    {u.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => changeRole(u.id, u.role === 'admin' ? 'supervisor' : 'admin')}
                    className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700"
                  >
                    Make {u.role === 'admin' ? 'Supervisor' : 'Admin'}
                  </button>
                  <button
                    onClick={() => { setShowReset(showReset === u.id ? null : u.id); setResetPassword(''); }}
                    className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={async () => {
                      const newVal = !u.biometric_required;
                      await updateUserProfile(u.id, { biometric_required: newVal, ...(newVal ? { biometric_enabled: true } : {}) });
                      loadUsers();
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${u.biometric_required ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {u.biometric_required ? '🔒 Biometric Required' : '🔓 Require Biometric'}
                  </button>
                </div>
              )}

              {/* Reset Password Form */}
              {showReset === u.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="New password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    disabled={submitting}
                    className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
