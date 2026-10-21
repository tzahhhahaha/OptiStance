import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Trash2,
  Shield,
  ShieldOff,
  CheckCircle,
  AlertCircle,
  X,
  KeyRound,
  Eye,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  supabaseGetUsers,
  supabaseGetSessions,
  supabaseDeleteUser,
  supabaseUpdateUserRole,
  supabaseSignUp,
  adminSetUserPassword,
  reviewVerification,
  subscribeToOnlineAthletes,
  type User as DbUser,
} from '../../../services/supabaseApi';
import type { VerificationStatus } from '../../types';
import { aggregateSessionsByAthlete } from '../../utils/athleteStats';
import { PASSWORD_RULE_MESSAGE, meetsPasswordPolicy } from '../../utils/passwordPolicy';

interface Athlete {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'admin';
  /** Real count from `practice_sessions`. */
  sessions: number;
  /** Real mean, or null when no session recorded a score. */
  avgAccuracy: number | null;
  /** Last practice session timestamp, or null if never trained. */
  lastSessionAt: string | null;
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  joinDate: string;
}

type ScopeFilter = 'all' | 'online' | 'active' | 'deactivated' | 'verified' | 'unverified';

/** Format a last active practice session timestamp into a human-friendly relative label. */
const formatLastActive = (lastSessionAt: string | null): string => {
  if (!lastSessionAt) return 'Never practiced';
  const timestamp = new Date(lastSessionAt).getTime();
  if (isNaN(timestamp)) return 'Never practiced';
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(lastSessionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Badge styling + label for a verification state. */
const VERIFICATION_PRESENTATION: Record<
  VerificationStatus,
  { label: string; className: string }
> = {
  verified: { label: 'Verified', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
  unverified: { label: 'Basic', className: 'bg-white/[0.06] text-zinc-300 border border-white/10' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' },
  rejected: { label: 'Access revoked', className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30' },
};

const toAthlete = (
  user: DbUser,
  sessions: number,
  avgAccuracy: number | null,
  lastSessionAt: string | null = null
): Athlete => ({
  id: user.id,
  name: user.fullName,
  email: user.email,
  role: user.role === 'SystemManager' ? 'admin' : 'athlete',
  sessions,
  avgAccuracy,
  lastSessionAt,
  isActive: user.isActive,
  isVerified: user.isVerified,
  verificationStatus: user.verificationStatus ?? (user.isVerified ? 'verified' : 'unverified'),
  joinDate: user.createdAt ? user.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
});

export default function DarkAdminUsers() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** True when the roster loaded but nobody has ever trained. */
  const [hasAnyActivity, setHasAnyActivity] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');

  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Each modal owns its error. They used to share one `actionError` slot, so a
  // failure in the add-athlete form surfaced inside the reset and detail modals.
  const [addError, setAddError] = useState<string | null>(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetTarget, setResetTarget] = useState<Athlete | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [confirmRemove, setConfirmRemove] = useState<Athlete | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineAthletes((ids) => {
      setOnlineUserIds(new Set(ids));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [users, sessions] = await Promise.all([
        supabaseGetUsers(),
        // RLS permits admins to read every session ("Admins view all
        // sessions"), so these are the real per-athlete numbers.
        supabaseGetSessions().catch(() => []),
      ]);

      const aggregates = aggregateSessionsByAthlete(sessions);
      setAthletes(
        users.map((user) => {
          const stats = aggregates.get(user.id);
          return toAthlete(
            user,
            stats?.sessions ?? 0,
            stats?.avgAccuracy ?? null,
            stats?.lastSessionAt ?? null
          );
        })
      );
      setHasAnyActivity(sessions.length > 0);
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Could not load the athlete roster. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const patchAthlete = (id: string, changes: Partial<Athlete>) => {
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
    setSelectedAthlete((prev) => (prev && prev.id === id ? { ...prev, ...changes } : prev));
  };

  /**
   * Remove = soft delete. `supabaseDeleteUser` flips `is_active` to false; the
   * row stays. It used to be filtered out of local state and then reappeared as
   * "Active" on the next load, so removed athletes were unrecoverable.
   */
  const handleRemove = async () => {
    if (!confirmRemove) return;
    const target = confirmRemove;
    setPendingAction('remove');
    setDetailError(null);
    try {
      await supabaseDeleteUser(target.id);
      patchAthlete(target.id, { isActive: false });
      if (selectedAthlete?.id === target.id) setSelectedAthlete(null);
      setResetNotice(
        `${target.name} was removed. Their account is deactivated — they can be reactivated by promoting them again from this page.`
      );
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to remove athlete. Please try again.');
    } finally {
      setPendingAction(null);
      setConfirmRemove(null);
    }
  };

  const handleRoleChange = async (athlete: Athlete) => {
    const nextRole: Athlete['role'] = athlete.role === 'admin' ? 'athlete' : 'admin';
    setPendingAction('role');
    setDetailError(null);
    try {
      await supabaseUpdateUserRole(athlete.id, nextRole);
      patchAthlete(athlete.id, { role: nextRole });
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to update role. Please try again.');
    } finally {
      setPendingAction(null);
    }
  };

  /**
   * Moderation. Verification is auto-granted by the database on request, so
   * there is nothing to approve — but `review_verification` is the only route to
   * take access away again, and it was never called from anywhere. This is that
   * missing safety valve.
   */
  const handleVerificationToggle = async (athlete: Athlete) => {
    const granting = !athlete.isVerified;
    setPendingAction('verify');
    setDetailError(null);
    try {
      await reviewVerification(
        athlete.id,
        granting,
        granting ? 'Restored by an administrator' : 'Revoked by an administrator'
      );
      const nextStatus: VerificationStatus = granting ? 'verified' : 'rejected';
      patchAthlete(athlete.id, { isVerified: granting, verificationStatus: nextStatus });
    } catch (e) {
      setDetailError(
        e instanceof Error ? e.message : 'Failed to change pose access. Please try again.'
      );
    } finally {
      setPendingAction(null);
    }
  };

  const openResetModal = (athlete: Athlete) => {
    setResetTarget(athlete);
    setResetPassword('');
    setResetError(null);
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (!meetsPasswordPolicy(resetPassword)) {
      setResetError(PASSWORD_RULE_MESSAGE);
      return;
    }
    setIsSaving(true);
    setResetError(null);
    try {
      const email = await adminSetUserPassword(resetTarget.id, resetPassword);
      setShowResetModal(false);
      setResetPassword('');
      setResetNotice(
        `Password reset for ${email}. Give them the new password over a channel you trust — ` +
          `it is not emailed and cannot be recovered afterwards.`
      );
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newEmail.includes('@')) {
      setAddError('Provide a name and a valid email address.');
      return;
    }
    if (!meetsPasswordPolicy(newPassword)) {
      setAddError(PASSWORD_RULE_MESSAGE);
      return;
    }
    setIsSaving(true);
    setAddError(null);
    try {
      const { user } = await supabaseSignUp(newName, newEmail, newPassword);
      setAthletes((prev) => [toAthlete(user, 0, null), ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add athlete.');
    } finally {
      setIsSaving(false);
    }
  };

  const matchesScope = (athlete: Athlete) => {
    switch (scope) {
      case 'online':
        return onlineUserIds.has(athlete.id);
      case 'active':
        return athlete.isActive;
      case 'deactivated':
        return !athlete.isActive;
      case 'verified':
        return athlete.isVerified;
      case 'unverified':
        return !athlete.isVerified;
      default:
        return true;
    }
  };

  const filteredAthletes = athletes.filter((a) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm =
      !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term);
    return matchesTerm && matchesScope(a);
  });

  const onlineCount = athletes.filter((a) => onlineUserIds.has(a.id)).length;
  const activeCount = athletes.filter((a) => a.isActive).length;
  const revokedCount = athletes.filter((a) => !a.isVerified).length;

  const SCOPES: { id: ScopeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: athletes.length },
    { id: 'online', label: 'Online', count: onlineCount },
    { id: 'active', label: 'Active accounts', count: activeCount },
    { id: 'deactivated', label: 'Deactivated', count: athletes.length - activeCount },
    { id: 'verified', label: 'Full access', count: athletes.length - revokedCount },
    { id: 'unverified', label: 'Basic', count: revokedCount },
  ];

  return (
    <div className="space-y-6">
      {/*
        Pinned at the top. This notice used to be the last child of the page,
        below the table, so after a successful password reset the modal closed
        and the warning that the password is not emailed disappeared below the
        fold.
      */}
      {resetNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200 flex-1">{resetNotice}</p>
          <button
            onClick={() => setResetNotice(null)}
            className="text-emerald-400/70 hover:text-emerald-300 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-rose-200">{loadError}</p>
            <button
              onClick={() => void loadUsers()}
              className="mt-2 text-xs font-bold text-rose-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Header with Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Athlete Management</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Roles, pose access, and practice activity
          </p>
        </div>
        <button
          onClick={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
        >
          + Add Athlete
        </button>
      </div>

      {/* Search + scope filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search athletes by name or email"
            className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => {
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                  active
                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:bg-white/[0.08] hover:text-zinc-200'
                }`}
              >
                {s.label}
                <span className="ml-1.5 opacity-60">{s.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading athletes…</p>
      ) : filteredAthletes.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <UserX className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-sm font-bold text-white mb-1">
            {athletes.length === 0
              ? 'No athletes yet'
              : scope !== 'all' || searchTerm.trim()
                ? 'No athletes match this filter'
                : 'No athletes to show'}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {athletes.length === 0
              ? 'Accounts appear here as soon as athletes sign up.'
              : 'Try a different filter or clear the search.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Name</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Email</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Role</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Pose Access</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Sessions</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Accuracy</th>
                    <th className="px-6 py-4 text-left font-bold text-white uppercase tracking-wider text-xs">Activity & Status</th>
                    <th className="px-6 py-4 text-center font-bold text-white uppercase tracking-wider text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredAthletes.map((athlete) => {
                    const badge = VERIFICATION_PRESENTATION[athlete.verificationStatus];
                    return (
                      <tr
                        key={athlete.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setDetailError(null);
                              setSelectedAthlete(athlete);
                            }}
                            className="font-bold text-white text-left hover:text-indigo-300 transition-colors"
                          >
                            {athlete.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-zinc-400 text-xs">{athlete.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                            athlete.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {athlete.role === 'admin' ? 'Admin' : 'Athlete'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">{athlete.sessions}</td>
                        <td className="px-6 py-4">
                          {athlete.avgAccuracy === null ? (
                            <span
                              className="text-zinc-500 text-xs"
                              title={
                                hasAnyActivity
                                   ? 'This athlete has sessions, but none recorded a score.'
                                   : 'No practice sessions have been recorded yet.'
                              }
                            >
                              Not scored
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                  style={{ width: `${athlete.avgAccuracy}%` }}
                                />
                              </div>
                              <span className="text-white font-bold text-xs">{athlete.avgAccuracy}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {!athlete.isActive ? (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span className="text-rose-400 text-xs font-bold">Deactivated</span>
                            </div>
                          ) : onlineUserIds.has(athlete.id) ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                                <span className="text-emerald-400 text-xs font-bold">Online</span>
                              </div>
                              <p className="text-[11px] text-zinc-400">Active now</p>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex rounded-full h-2 w-2 bg-zinc-500" />
                                <span className="text-zinc-400 text-xs font-semibold">Offline</span>
                              </div>
                              <p className="text-[11px] text-zinc-500" title={athlete.lastSessionAt ?? undefined}>
                                {athlete.lastSessionAt ? `Active ${formatLastActive(athlete.lastSessionAt)}` : 'Never practiced'}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {/* Hover-reveal only on pointer devices. Always visible
                              below md — this is a Capacitor app and there is no
                              hover state on a phone, so the actions were simply
                              unreachable. */}
                          <div className="flex items-center justify-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setDetailError(null);
                                setSelectedAthlete(athlete);
                              }}
                              aria-label={`View ${athlete.name}`}
                              className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-all"
                              title="View athlete"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDetailError(null);
                                setConfirmRemove(athlete);
                              }}
                              disabled={!athlete.isActive}
                              aria-label={`Remove ${athlete.name}`}
                              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title={athlete.isActive ? 'Remove athlete' : 'Already removed'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — a 7-column table meant ~900px of horizontal scroll
              inside a fullscreen shell on a phone. */}
          <div className="md:hidden space-y-3">
            {filteredAthletes.map((athlete) => {
              const badge = VERIFICATION_PRESENTATION[athlete.verificationStatus];
              return (
                <div
                  key={athlete.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{athlete.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{athlete.email}</p>
                    </div>
                    {!athlete.isActive ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-zinc-400 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Deactivated
                      </span>
                    ) : onlineUserIds.has(athlete.id) ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Online
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                        <span className="inline-flex rounded-full h-2 w-2 bg-zinc-600" />
                        {athlete.lastSessionAt ? formatLastActive(athlete.lastSessionAt) : 'Offline'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      athlete.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {athlete.role === 'admin' ? 'Admin' : 'Athlete'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span>
                      <span className="font-bold text-white">{athlete.sessions}</span> sessions
                    </span>
                    <span>
                      {athlete.avgAccuracy === null ? (
                        <span className="text-zinc-500">Not scored</span>
                      ) : (
                        <>
                          <span className="font-bold text-white">{athlete.avgAccuracy}%</span>{' '}
                          accuracy
                        </>
                      )}
                    </span>
                    {athlete.lastSessionAt && (
                      <span className="truncate">
                        Last: <span className="font-bold text-zinc-300">{formatLastActive(athlete.lastSessionAt)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setDetailError(null);
                        setSelectedAthlete(athlete);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => {
                        setDetailError(null);
                        setConfirmRemove(athlete);
                      }}
                      disabled={!athlete.isActive}
                      className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Athlete Detail Modal */}
      {selectedAthlete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="athlete-detail-title"
            className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#0d0d12]/95 backdrop-blur-2xl">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 id="athlete-detail-title" className="text-2xl font-black text-white truncate">
                    {selectedAthlete.name}
                  </h3>
                  {!selectedAthlete.isActive ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                      Deactivated
                    </span>
                  ) : onlineUserIds.has(selectedAthlete.id) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Online now
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-400 text-xs font-medium">
                      Offline
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-1 truncate">{selectedAthlete.email}</p>
              </div>
              <button
                onClick={() => setSelectedAthlete(null)}
                aria-label="Close"
                className="w-10 h-10 shrink-0 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Total Sessions</p>
                  <p className="text-2xl font-black text-white">{selectedAthlete.sessions}</p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Avg Accuracy</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {selectedAthlete.avgAccuracy === null ? (
                      <span className="text-base text-zinc-500">Not scored</span>
                    ) : (
                      `${selectedAthlete.avgAccuracy}%`
                    )}
                  </p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Last Practice</p>
                  <p className="text-sm font-bold text-white">
                    {formatLastActive(selectedAthlete.lastSessionAt)}
                  </p>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-xs text-zinc-500 font-bold mb-2">Member Since</p>
                  <p className="text-sm font-bold text-white">
                    {new Date(selectedAthlete.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Pose access — the moderation safety valve */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    Pose Access
                  </p>
                  <p className="text-sm text-zinc-300">
                    {selectedAthlete.isVerified
                      ? 'Intermediate and Advanced poses are unlocked.'
                      : 'Limited to Beginner poses.'}
                  </p>
                </div>
                <button
                  onClick={() => void handleVerificationToggle(selectedAthlete)}
                  disabled={pendingAction === 'verify'}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 ${
                    selectedAthlete.isVerified
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {selectedAthlete.isVerified ? (
                    <>
                      <ShieldOff className="w-4 h-4" /> Revoke access
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Restore access
                    </>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  onClick={() => openResetModal(selectedAthlete)}
                  className="flex-1 min-w-[10rem] py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold transition-all inline-flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </button>
                <button
                  onClick={() => void handleRoleChange(selectedAthlete)}
                  disabled={pendingAction === 'role'}
                  className="flex-1 min-w-[10rem] py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold transition-all disabled:opacity-60"
                >
                  {selectedAthlete.role === 'admin' ? 'Demote to Athlete' : 'Promote to Admin'}
                </button>
                <button
                  onClick={() => {
                    setDetailError(null);
                    setConfirmRemove(selectedAthlete);
                  }}
                  disabled={!selectedAthlete.isActive}
                  className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {selectedAthlete.isActive ? 'Remove' : 'Removed'}
                </button>
                <button
                  onClick={() => setSelectedAthlete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 font-bold transition-all"
                >
                  Close
                </button>
              </div>
              {detailError && (
                <p role="alert" className="text-xs text-rose-400">{detailError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm removal — replaces window.confirm, which is unstyled next to the
          app's own modals and blocks the WebView on mobile. */}
      {confirmRemove && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-remove-title"
            className="bg-[#0d0d12]/95 border border-white/[0.08] rounded-3xl w-full max-w-md p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 id="confirm-remove-title" className="text-lg font-black text-white mb-2">
              Remove {confirmRemove.name}?
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              Their account is deactivated and they will lose access. Their practice
              history is kept, and you can reactivate them later.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRemove()}
                disabled={pendingAction === 'remove'}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-60"
              >
                {pendingAction === 'remove' ? 'Removing…' : 'Remove athlete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Athlete Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-athlete-title"
            className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <h3 id="add-athlete-title" className="text-lg font-black text-white">Add Athlete</h3>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAthlete} className="p-6 space-y-4">
              <div>
                <label htmlFor="add-athlete-name" className="text-xs text-zinc-500 font-bold mb-1.5 block">Full Name</label>
                <input
                  id="add-athlete-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label htmlFor="add-athlete-email" className="text-xs text-zinc-500 font-bold mb-1.5 block">Email</label>
                <input
                  id="add-athlete-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label htmlFor="add-athlete-password" className="text-xs text-zinc-500 font-bold mb-1.5 block">Temporary Password</label>
                <input
                  id="add-athlete-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={PASSWORD_RULE_MESSAGE}
                  aria-describedby="add-athlete-password-hint"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
                <p id="add-athlete-password-hint" className="text-[11px] text-zinc-500 mt-1.5">
                  {PASSWORD_RULE_MESSAGE} No email is sent — hand it over directly.
                </p>
              </div>
              {addError && <p role="alert" className="text-xs text-rose-400">{addError}</p>}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-60 transition-all"
              >
                {isSaving ? 'Creating...' : 'Create Athlete Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setShowResetModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            className="bg-[#0d0d12]/95 backdrop-blur-2xl rounded-3xl border border-white/[0.08] w-full max-w-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="min-w-0">
                <h3 id="reset-password-title" className="text-lg font-black text-white">Reset Password</h3>
                <p className="text-xs text-zinc-500 mt-1 truncate">{resetTarget.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                }}
                aria-label="Close"
                className="w-8 h-8 shrink-0 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  No email is sent. Email delivery is not configured on this project, so
                  you must pass the new password to the athlete yourself. Their previous
                  password stops working immediately.
                </p>
              </div>
              <div>
                <label htmlFor="reset-password-input" className="text-xs text-zinc-500 font-bold mb-1.5 block">New Password</label>
                <input
                  id="reset-password-input"
                  type="password"
                  autoFocus
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder={PASSWORD_RULE_MESSAGE}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              {resetError && <p role="alert" className="text-xs text-rose-400">{resetError}</p>}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold disabled:opacity-60 transition-all"
              >
                {isSaving ? 'Resetting...' : 'Set New Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
