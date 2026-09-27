import React, { useCallback, useEffect, useState } from 'react';
import { X, BarChart3, Users, Zap, Settings, LogOut, AlertTriangle, ChevronRight, ArrowUpRight, Menu, RefreshCw } from 'lucide-react';
import DarkAdminUsers from './admin/DarkAdminUsers';
import DarkAdminContent from './admin/DarkAdminContent';
import DarkAdminAnalytics from './admin/DarkAdminAnalytics';
import DarkAdminSettings from './admin/DarkAdminSettings';
import { supabaseGetUsers, supabaseGetSessions } from '../../services/supabaseApi';
import {
  bucketSessionsByDay,
  isEmptySeries,
  summariseRoster,
  summariseSessions,
  weekdayLabel,
  type DailyBucket,
} from '../utils/adminStats';

type AdminTab = 'dashboard' | 'users' | 'content' | 'analytics' | 'settings';

const TABS: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Athletes', icon: Users },
  { id: 'content', label: 'Stunts', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: ArrowUpRight },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface DarkAdminPageProps {
  onBack: () => void;
  isAdmin: boolean;
  userName?: string;
  userRole?: string;
}

export function DarkAdminPage({ onBack, isAdmin, userName = 'Admin', userRole = 'admin' }: DarkAdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // One fetch feeds the dashboard, the attention list and the sync stamp, so the
  // header no longer has to invent a notification count.
  const [data, setData] = useState<{
    accounts: { id: string; isActive: boolean; isVerified: boolean }[];
    sessions: Parameters<typeof summariseSessions>[0];
    fetchedAt: Date;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const [users, sessions] = await Promise.all([
        supabaseGetUsers(),
        // RLS allows admins to read every session; a failure here degrades the
        // dashboard rather than blocking the whole console.
        supabaseGetSessions().catch(() => []),
      ]);
      setData({
        accounts: users.map((u) => ({
          id: u.id,
          isActive: u.isActive,
          isVerified: u.isVerified,
        })),
        sessions,
        fetchedAt: new Date(),
      });
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : 'Could not load platform data. Check your connection.'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-[#050507] min-h-screen flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md">
          <div className="bg-[#0d0d12]/90 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto mb-6 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <X className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Access Denied</h2>
            <p className="text-sm text-zinc-400 text-center mb-6">
              Your account ({userName}) does not have administrator privileges.
            </p>
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Real follow-up list: athletes whose pose access was taken away. This is the
  // only work queue that actually exists, since verification is auto-granted.
  const needsAttention = (data?.accounts ?? []).filter((a) => a.isActive && !a.isVerified);
  const attentionCount = needsAttention.length;
  const activeLabel = data ? TABS.find((t) => t.id === activeTab)?.label : '';

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-[#050507] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Immersive Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-rose-500/10 to-transparent rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative flex h-full min-h-0 overflow-hidden">
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
          />
        )}

        {/* Sidebar */}
        <div className={`${mobileNavOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} w-64 shrink-0 flex-col overflow-y-auto border-r border-white/[0.05] bg-[#0a0a0f]/95 backdrop-blur-xl md:relative md:flex md:bg-[#0a0a0f]/60`}>
          {/* Header */}
          <div className="p-6 border-b border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">OptiStances</h1>
                <p className="text-xs text-zinc-500 font-medium">Admin Console</p>
              </div>
              <button
                onClick={onBack}
                aria-label="Close admin console"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Profile Card */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-rose-500/10 backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{userRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileNavOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-rose-500/10 text-white border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.05]">
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all border border-rose-500/20 font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] bg-[#0a0a0f]/40 px-4 backdrop-blur-xl md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open admin navigation"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-white truncate">{activeLabel}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              {/* Replaced a bell that always showed "3". This shows how many
                  active athletes are on Basic access, and takes you to them. */}
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10"
                aria-label={
                  attentionCount === 0
                    ? 'No athletes need attention'
                    : `${attentionCount} ${
                        attentionCount === 1 ? 'athlete needs' : 'athletes need'
                      } attention: pose access revoked`
                }
              >
                <AlertTriangle className="h-5 w-5" />
                {attentionCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                    {attentionCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => void load()}
                disabled={isRefreshing}
                aria-label="Refresh platform data"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <div className="hidden text-right sm:block">
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  Last refresh
                </p>
                {/* Was hardcoded to "Just now" regardless of when data loaded. */}
                <p className="text-xs text-white font-bold">
                  {data ? data.fetchedAt.toLocaleTimeString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 md:p-8 space-y-4">
              {loadError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div className="flex-1">
                    <p className="text-sm text-rose-200">{loadError}</p>
                    <button
                      onClick={() => void load()}
                      className="mt-2 text-xs font-bold text-rose-300 underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <DarkAdminDashboard
                  accounts={data?.accounts ?? null}
                  sessions={data?.sessions ?? null}
                  isLoading={!data && !loadError}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'users' && <DarkAdminUsers />}
              {activeTab === 'content' && <DarkAdminContent />}
              {activeTab === 'analytics' && <DarkAdminAnalytics />}
              {activeTab === 'settings' && <DarkAdminSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Overview Component
function DarkAdminDashboard({
  accounts,
  sessions,
  isLoading,
  onNavigate,
}: {
  accounts: { id: string; isActive: boolean; isVerified: boolean }[] | null;
  sessions: Parameters<typeof summariseSessions>[0] | null;
  isLoading: boolean;
  onNavigate: (tab: AdminTab) => void;
}) {
  // Every figure below is derived from `users` + `practice_sessions`. The old
  // dashboard hardcoded "Not measured" / "Unavailable" in all four cards and
  // promised a chart that never arrived, so the console looked broken on open.
  const roster = accounts ? summariseRoster(accounts, sessions ?? []) : null;
  const totals = accounts && sessions ? summariseSessions(sessions, accounts) : null;
  const buckets: DailyBucket[] = sessions ? bucketSessionsByDay(sessions, 7) : [];

  const stats = [
    {
      label: 'Active Athletes',
      value: roster ? String(roster.activeAthletes) : null,
      hint: roster ? `${roster.totalAccounts} accounts total` : null,
    },
    {
      label: 'Sessions Today',
      value: totals ? String(totals.today) : null,
      hint: totals ? `${totals.total} all time` : null,
    },
    {
      label: 'Avg Accuracy',
      // null, not 0: a platform with no scored sessions has no average.
      value: totals ? (totals.avgAccuracy === null ? null : `${totals.avgAccuracy}%`) : null,
      hint:
        totals?.avgAccuracy === null && totals !== null
          ? 'No sessions scored yet'
          : totals
            ? 'Across all scored sessions'
            : null,
    },
    {
      label: 'Full Pose Access',
      value: roster ? `${roster.withFullAccess}/${roster.totalAccounts}` : null,
      hint: roster ? `${roster.basicAccess} on Basic` : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]"
          >
            <p className="text-sm text-zinc-400 font-medium mb-3">{stat.label}</p>
            {isLoading || stat.value === null ? (
              <>
                <p className="text-3xl font-black text-zinc-600 font-mono">—</p>
                <p className="text-xs text-zinc-600 mt-1">{stat.hint ?? 'Not available'}</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-white font-mono">{stat.value}</p>
                {stat.hint && <p className="text-xs text-zinc-500 mt-1">{stat.hint}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions — these had no onClick at all. */}
        <div className="lg:col-span-1 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="w-full py-2 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium transition-all border border-indigo-500/30"
            >
              + Add Athlete
            </button>
            <button
              type="button"
              onClick={() => onNavigate('content')}
              className="w-full py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-medium transition-all border border-rose-500/30"
            >
              + Create Stunt
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-all border border-amber-500/30"
            >
              Export Report
            </button>
          </div>

          {totals && totals.athletesNeverTrained > 0 && (
            <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
              {totals.athletesNeverTrained} active{' '}
              {totals.athletesNeverTrained === 1 ? 'athlete has' : 'athletes have'} never
              recorded a session.
            </p>
          )}
        </div>

        {/* Seven-day activity — a real chart built from practice_sessions. */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Practice Activity
            </h3>
            <span className="text-xs text-zinc-500">Last 7 days</span>
          </div>
          <SessionBarChart buckets={buckets} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

/**
 * Hand-rolled 7-day bar chart. No charting dependency: the whole shape is a
 * column of divs, which keeps the bundle unchanged and stays crisp at any size.
 */
function SessionBarChart({ buckets, isLoading }: { buckets: DailyBucket[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02]">
        <p className="text-sm text-zinc-500">Loading activity…</p>
      </div>
    );
  }

  if (buckets.length === 0 || isEmptySeries(buckets)) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-6 text-center">
        <p className="text-sm font-medium text-zinc-300">No practice sessions recorded</p>
        <p className="text-xs text-zinc-500">
          This chart fills in as athletes scan poses. It is empty because the table
          is empty, not because the data failed to load.
        </p>
      </div>
    );
  }

  const peak = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="flex h-32 items-end gap-2" role="img" aria-label={chartDescription(buckets)}>
        {buckets.map((bucket) => {
          const heightPct = Math.max((bucket.count / peak) * 100, bucket.count > 0 ? 6 : 2);
          const label = `${weekdayLabel(bucket.day)}: ${
            bucket.count === 0
              ? 'no sessions'
              : `${bucket.count} session${bucket.count === 1 ? '' : 's'}${
                  bucket.avgAccuracy === null ? '' : `, ${bucket.avgAccuracy}% mean accuracy`
                }`
          }`;
          return (
            <div key={bucket.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400">
                {bucket.count === 0 ? '' : bucket.count}
              </span>
              <div
                title={label}
                className={`w-full rounded-t-md transition-[height] ${
                  bucket.count === 0 ? 'bg-white/[0.04]' : 'bg-gradient-to-t from-indigo-500/60 to-indigo-400'
                }`}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[10px] text-zinc-500">{weekdayLabel(bucket.day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const chartDescription = (buckets: DailyBucket[]): string => {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const busiest = buckets.reduce<DailyBucket | null>(
    (best, b) => (b.count > (best?.count ?? 0) ? b : best),
    null
  );
  const busiestPart = busiest
    ? ` Busiest day: ${weekdayLabel(busiest.day)} with ${busiest.count}.`
    : '';
  return `Practice sessions over the last 7 days. ${total} in total.${busiestPart}`;
};

export default DarkAdminPage;

