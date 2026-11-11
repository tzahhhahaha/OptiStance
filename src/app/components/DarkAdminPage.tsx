import React, { useCallback, useEffect, useState } from 'react';
import { X, BarChart3, Users, BookOpen, Settings, LogOut, AlertTriangle, ChevronRight, ArrowUpRight, Menu, RefreshCw, Headphones } from 'lucide-react';
import DarkAdminUsers from './admin/DarkAdminUsers';
import DarkAdminContent from './admin/DarkAdminContent';
import DarkAdminAnalytics from './admin/DarkAdminAnalytics';
import DarkAdminSettings from './admin/DarkAdminSettings';
import DarkAdminSupport from './admin/DarkAdminSupport';
import {
  supabaseGetUsers,
  supabaseGetSessions,
  supabaseGetOpenTicketsCount,
  subscribeToOnlineAthletes,
  subscribeToSupportTickets,
} from '../../services/supabaseApi';
import {
  bucketSessionsByDay,
  countOnlineAccounts,
  isEmptySeries,
  summariseRoster,
  summariseSessions,
  weekdayLabel,
  type DailyBucket,
} from '../utils/adminStats';

type AdminTab = 'dashboard' | 'users' | 'content' | 'analytics' | 'support' | 'settings';

const TABS: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Athletes', icon: Users },
  { id: 'content', label: 'Library', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: ArrowUpRight },
  { id: 'support', label: 'Support', icon: Headphones },
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
    accounts: {
      id: string;
      isActive: boolean;
      isVerified: boolean;
      role: 'Athlete' | 'SystemManager';
    }[];
    sessions: Parameters<typeof summariseSessions>[0];
    fetchedAt: Date;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const [users, sessions, openTickets] = await Promise.all([
        supabaseGetUsers(),
        // RLS allows admins to read every session; a failure here degrades the
        // dashboard rather than blocking the whole console.
        supabaseGetSessions().catch(() => []),
        supabaseGetOpenTicketsCount().catch(() => 0),
      ]);
      setOpenTicketsCount(openTickets);
      setData({
        accounts: users.map((u) => ({
          id: u.id,
          isActive: u.isActive,
          isVerified: u.isVerified,
          role: u.role,
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

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToOnlineAthletes((ids) => {
      setOnlineUserIds(new Set(ids));
    });
  }, [isAdmin]);

  // Subscribe to live Support Desk ticket changes to keep the unread badge fresh
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToSupportTickets(() => {
      void supabaseGetOpenTicketsCount()
        .then((count) => setOpenTicketsCount(count))
        .catch(() => {});
    });
    return unsubscribe;
  }, [isAdmin]);

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
                <h1 className="text-xl font-black text-white tracking-tight">Optistance</h1>
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
              const showSupportBadge = tab.id === 'support' && openTicketsCount > 0;
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
                  {showSupportBadge && (
                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]">
                      {openTicketsCount > 99 ? '99+' : openTicketsCount}
                    </span>
                  )}
                  {isActive && !showSupportBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
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
              {/* Support Desk Inbox Quick Action with Unread Badge */}
              <button
                type="button"
                onClick={() => setActiveTab('support')}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-all hover:bg-white/10"
                aria-label={
                  openTicketsCount === 0
                    ? 'Support Desk: No open tickets'
                    : `Support Desk: ${openTicketsCount} open tickets`
                }
                title="Support Desk Inbox"
              >
                <Headphones className="h-5 w-5" />
                {openTicketsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                    {openTicketsCount > 99 ? '99+' : openTicketsCount}
                  </span>
                )}
              </button>

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
                  onlineUserIds={onlineUserIds}
                  isLoading={!data && !loadError}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'users' && <DarkAdminUsers />}
              {activeTab === 'content' && <DarkAdminContent />}
              {activeTab === 'analytics' && <DarkAdminAnalytics />}
              {activeTab === 'support' && <DarkAdminSupport />}
              {activeTab === 'settings' && <DarkAdminSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ActivityRangeDays = 7 | 14 | 30;

const ACTIVITY_RANGES: { days: ActivityRangeDays; label: string }[] = [
  { days: 7, label: '7 Days' },
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days' },
];

/** Format `YYYY-MM-DD` as a readable tooltip header, e.g. "Tue, Oct 27". */
const formatTooltipDay = (day: string): string => {
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/** Compact axis label: weekday for 7D, short month/day for 14D/30D. */
const axisDayLabel = (day: string, rangeDays: ActivityRangeDays): string => {
  if (rangeDays === 7) return weekdayLabel(day);
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
};

// Dashboard Overview Component
function DarkAdminDashboard({
  accounts,
  sessions,
  onlineUserIds,
  isLoading,
  onNavigate,
}: {
  accounts: {
    id: string;
    isActive: boolean;
    isVerified: boolean;
    role: 'Athlete' | 'SystemManager';
  }[] | null;
  sessions: Parameters<typeof summariseSessions>[0] | null;
  onlineUserIds: ReadonlySet<string>;
  isLoading: boolean;
  onNavigate: (tab: AdminTab) => void;
}) {
  const [rangeDays, setRangeDays] = useState<ActivityRangeDays>(7);

  // Every figure below is derived from `users` + `practice_sessions`. The old
  // dashboard hardcoded "Not measured" / "Unavailable" in all four cards and
  // promised a chart that never arrived, so the console looked broken on open.
  const roster = accounts ? summariseRoster(accounts, sessions ?? []) : null;
  const totals = accounts && sessions ? summariseSessions(sessions, accounts) : null;
  const buckets: DailyBucket[] = sessions ? bucketSessionsByDay(sessions, rangeDays) : [];

  const stats = [
    {
      label: 'Accounts Online Now',
      value: accounts ? String(countOnlineAccounts(accounts, onlineUserIds)) : null,
      hint: roster ? `${roster.activeAthletes} active athletes · admins included` : null,
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
      label: 'Athlete Pose Access',
      value: roster ? `${roster.withFullAccess}/${roster.totalAccounts} Athletes` : null,
      hint: roster
        ? roster.basicAccess > 0
          ? `${roster.withFullAccess} Full Access · ${roster.basicAccess} on Basic`
          : 'All athletes have Full Access'
        : null,
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
              + Add to Library
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

        {/* Composed Volume + Accuracy Activity Chart with 7D / 14D / 30D switcher */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Practice Activity
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-indigo-500/80 to-indigo-400" />
                  Sessions
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Avg Accuracy %
                </span>
              </div>
            </div>

            <div
              className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1"
              role="group"
              aria-label="Activity time range"
            >
              {ACTIVITY_RANGES.map((option) => {
                const active = rangeDays === option.days;
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setRangeDays(option.days)}
                    aria-pressed={active}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      active
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <SessionBarChart buckets={buckets} rangeDays={rangeDays} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

/**
 * Volume + Accuracy Composed Chart.
 * Renders daily session bars alongside an overlaid average accuracy trend line
 * and interactive hover/focus tooltip.
 */
function SessionBarChart({
  buckets,
  rangeDays,
  isLoading,
}: {
  buckets: DailyBucket[];
  rangeDays: ActivityRangeDays;
  isLoading: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02]">
        <p className="text-sm text-zinc-500">Loading activity…</p>
      </div>
    );
  }

  if (buckets.length === 0 || isEmptySeries(buckets)) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-6 text-center">
        <p className="text-sm font-medium text-zinc-300">No practice sessions recorded</p>
        <p className="text-xs text-zinc-500">
          This chart fills in as athletes scan poses. It is empty because the table
          is empty, not because the data failed to load.
        </p>
      </div>
    );
  }

  const peak = Math.max(...buckets.map((b) => b.count), 1);
  const totalCols = buckets.length;

  // Build normalized (0-100) coordinates for buckets that have an accuracy score
  const accuracyPoints = buckets
    .map((bucket, idx) =>
      bucket.avgAccuracy !== null
        ? {
            idx,
            day: bucket.day,
            accuracy: bucket.avgAccuracy,
            xPct: ((idx + 0.5) / totalCols) * 100,
            yPct: 100 - Math.max(0, Math.min(100, bucket.avgAccuracy)),
          }
        : null
    )
    .filter((pt): pt is NonNullable<typeof pt> => pt !== null);

  const polylinePoints = accuracyPoints.map((pt) => `${pt.xPct},${pt.yPct}`).join(' ');
  const activeBucket = hoveredIdx !== null ? buckets[hoveredIdx] : null;
  const activeLeftPct =
    hoveredIdx !== null ? ((hoveredIdx + 0.5) / totalCols) * 100 : 50;

  const shouldShowXLabel = (idx: number): boolean => {
    if (rangeDays === 7) return true;
    if (rangeDays === 14) return idx % 2 === 0 || idx === totalCols - 1;
    return idx % 5 === 0 || idx === totalCols - 1;
  };

  return (
    <div
      className="relative rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* Interactive Floating Tooltip */}
      {activeBucket && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-white/15 bg-[#0d0d14]/95 px-3 py-2 text-xs shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl whitespace-nowrap"
          style={{
            left: `${Math.min(88, Math.max(12, activeLeftPct))}%`,
          }}
        >
          <p className="mb-1 font-bold text-white">{formatTooltipDay(activeBucket.day)}</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2 w-2 rounded-sm bg-indigo-400" />
              <span className="font-bold text-white">{activeBucket.count}</span>{' '}
              {activeBucket.count === 1 ? 'session' : 'sessions'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {activeBucket.avgAccuracy !== null ? (
                <>
                  <span className="font-bold text-emerald-400">
                    {activeBucket.avgAccuracy}%
                  </span>{' '}
                  accuracy
                </>
              ) : (
                <span className="text-zinc-500">Not scored</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-stretch gap-2">
        {/* Main Plot Area */}
        <div
          className="relative flex-1"
          role="img"
          aria-label={chartDescription(buckets, rangeDays)}
        >
          {/* Horizontal grid lines for 100%, 50%, 0% accuracy */}
          <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6 flex flex-col justify-between">
            <div className="border-b border-dashed border-white/[0.06]" />
            <div className="border-b border-dashed border-white/[0.06]" />
            <div className="border-b border-white/[0.06]" />
          </div>

          {/* Bars + X-axis labels */}
          <div
            className={`relative flex h-40 items-end ${
              rangeDays === 30 ? 'gap-1' : rangeDays === 14 ? 'gap-1.5' : 'gap-2'
            }`}
          >
            {buckets.map((bucket, idx) => {
              const heightPct = Math.max(
                (bucket.count / peak) * 100,
                bucket.count > 0 ? 6 : 2
              );
              const isHovered = hoveredIdx === idx;
              const label = `${weekdayLabel(bucket.day)}: ${
                bucket.count === 0
                  ? 'no sessions'
                  : `${bucket.count} session${bucket.count === 1 ? '' : 's'}${
                      bucket.avgAccuracy === null
                        ? ''
                        : `, ${bucket.avgAccuracy}% mean accuracy`
                    }`
              }`;

              return (
                <div
                  key={bucket.day}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(idx)}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 focus:outline-none cursor-pointer"
                >
                  {/* Top session count badge (shown for 7D/14D or when hovered) */}
                  <span
                    className={`h-3.5 text-[10px] font-bold transition-colors ${
                      isHovered ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {bucket.count === 0 || (rangeDays === 30 && !isHovered)
                      ? ''
                      : bucket.count}
                  </span>

                  {/* Bar track */}
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      title={label}
                      className={`w-full rounded-t-md transition-all ${
                        bucket.count === 0
                          ? isHovered
                            ? 'bg-white/[0.12]'
                            : 'bg-white/[0.04]'
                          : isHovered
                            ? 'bg-gradient-to-t from-indigo-500 to-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.45)]'
                            : 'bg-gradient-to-t from-indigo-500/60 to-indigo-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* X-axis label */}
                  <span
                    className={`h-4 text-[10px] transition-colors truncate ${
                      isHovered ? 'font-bold text-white' : 'text-zinc-500'
                    }`}
                  >
                    {shouldShowXLabel(idx) ? axisDayLabel(bucket.day, rangeDays) : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overlaid Avg Accuracy Trend Line + Nodes */}
          {accuracyPoints.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6">
              {accuracyPoints.length > 1 && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                >
                  <polyline
                    fill="none"
                    stroke="rgb(52, 211, 153)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                    className="drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  />
                </svg>
              )}

              {accuracyPoints.map((pt) => {
                const isHovered = hoveredIdx === pt.idx;
                return (
                  <div
                    key={pt.day}
                    style={{
                      left: `${pt.xPct}%`,
                      top: `${pt.yPct}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform ${
                      isHovered
                        ? 'h-3 w-3 scale-125 border-white bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,1)]'
                        : 'h-2 w-2 border-[#0a0a0f] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Y-Axis (Accuracy %) */}
        <div className="flex flex-col justify-between pt-4 pb-5 text-right text-[10px] font-medium text-emerald-400/70 select-none">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      </div>
    </div>
  );
}

const chartDescription = (
  buckets: DailyBucket[],
  rangeDays: ActivityRangeDays = 7
): string => {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const busiest = buckets.reduce<DailyBucket | null>(
    (best, b) => (b.count > (best?.count ?? 0) ? b : best),
    null
  );
  const busiestPart = busiest
    ? ` Busiest day: ${weekdayLabel(busiest.day)} with ${busiest.count}.`
    : '';
  return `Practice sessions over the last ${rangeDays} days. ${total} in total.${busiestPart}`;
};

export default DarkAdminPage;
