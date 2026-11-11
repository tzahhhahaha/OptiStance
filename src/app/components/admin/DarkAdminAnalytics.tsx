import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Users,
  Activity,
  Target,
  Download,
  AlertCircle,
  Medal,
  Dumbbell,
} from 'lucide-react';
import {
  supabaseGetUsers,
  supabaseGetSessions,
  supabaseGetStunts,
  subscribeToOnlineAthletes,
} from '../../../services/supabaseApi';
import type { SessionWithRelations } from '../../../services/supabaseService';
import type { Stunt } from '../../../types/supabase';
import { MASTERY_THRESHOLD } from '../../types';
import {
  PERIOD_LABELS,
  activeUserCount,
  localDayKey,
  meanComplianceGrade,
  rankAthletes,
  rollUpByStunt,
  sessionsInPeriod,
  weekdayLabel,
  type PeriodKey,
  type RankableAccount,
} from '../../utils/adminStats';

const PERIODS: PeriodKey[] = ['today', 'week', 'month', 'all'];

/** RFC 4180: quote the value and double any embedded quote. */
const csvCell = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows: (string | number | null)[][]): string =>
  rows.map((row) => row.map(csvCell).join(',')).join('\n');

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString();
};

const formatLastOnline = (lastSeenAt: string | null): string => {
  if (!lastSeenAt) return 'Never online';
  const parsed = new Date(lastSeenAt);
  return Number.isNaN(parsed.getTime())
    ? 'Unknown'
    : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Format a last active practice session timestamp into a human-friendly relative label. */
const formatLastActive = (lastSessionAt: string | null): string => {
  if (!lastSessionAt) return 'Never practiced';
  const timestamp = new Date(lastSessionAt).getTime();
  if (Number.isNaN(timestamp)) return 'Never practiced';
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

type StuntSortMode = 'attempts' | 'lowest_accuracy' | 'highest_mastery';

interface StuntMetaInfo {
  name: string;
  category: string;
  difficulty: string;
}

const STUNT_SORT_OPTIONS: { id: StuntSortMode; label: string }[] = [
  { id: 'attempts', label: 'Most Attempted' },
  { id: 'lowest_accuracy', label: 'Needs Attention' },
  { id: 'highest_mastery', label: 'Highest Mastery' },
];

const formatCategoryLabel = (category?: string | null): string => {
  if (!category) return 'Stunt';
  const normalized = category.toLowerCase();
  if (normalized === 'pom_motion') return 'Pom Motion';
  if (normalized === 'jump') return 'Jump';
  if (normalized === 'tumbling') return 'Tumbling';
  if (normalized === 'liberty') return 'Liberty';
  if (normalized === 'stunt') return 'Stunt';
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDifficultyBadge = (
  difficulty?: string | null
): { label: string; className: string } => {
  const tier = (difficulty ?? '').toLowerCase();
  if (tier === 'advanced') {
    return {
      label: 'Advanced',
      className: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
    };
  }
  if (tier === 'intermediate') {
    return {
      label: 'Intermediate',
      className: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
    };
  }
  return {
    label: 'Beginner',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  };
};

export default function DarkAdminAnalytics() {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [stuntSort, setStuntSort] = useState<StuntSortMode>('attempts');
  const [sessions, setSessions] = useState<SessionWithRelations[] | null>(null);
  const [accounts, setAccounts] = useState<RankableAccount[]>([]);
  const [stuntNames, setStuntNames] = useState<Map<string, string>>(new Map());
  const [stuntMeta, setStuntMeta] = useState<Map<string, StuntMetaInfo>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [, setRelativeTick] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineAthletes((ids) => {
      setOnlineUserIds(new Set(ids));
    });
    const timer = setInterval(() => {
      setRelativeTick((n) => n + 1);
    }, 30000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [users, allSessions, stunts] = await Promise.all([
        supabaseGetUsers(),
        supabaseGetSessions(),
        supabaseGetStunts().catch(() => [] as Stunt[]),
      ]);

      setAccounts(
        users.map((u) => ({
          id: u.id,
          name: u.fullName,
          isActive: u.isActive,
          lastSeenAt: u.lastSeenAt,
        }))
      );
      setSessions(allSessions);
      setStuntNames(new Map(stunts.map((s) => [s.id, s.name])));

      const metaMap = new Map<string, StuntMetaInfo>();
      for (const s of stunts) {
        metaMap.set(s.id, {
          name: s.name,
          category: s.category,
          difficulty: s.difficulty_tier,
        });
      }
      for (const sess of allSessions) {
        if (!metaMap.has(sess.stunt_id) && sess.stunts?.name) {
          metaMap.set(sess.stunt_id, {
            name: sess.stunts.name,
            category: sess.stunts.category ?? 'stunt',
            difficulty: 'beginner',
          });
        }
      }
      setStuntMeta(metaMap);
    } catch (e) {
      if (!silent) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load analytics. Check your connection and try again.'
        );
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const refreshSilently = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void load(true);
      }
    };
    const interval = setInterval(refreshSilently, 30000);
    window.addEventListener('online', refreshSilently);
    document.addEventListener('visibilitychange', refreshSilently);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refreshSilently);
      document.removeEventListener('visibilitychange', refreshSilently);
    };
  }, [load]);

  const inPeriod = useMemo(
    () => (sessions ? sessionsInPeriod(sessions, period) : []),
    [sessions, period]
  );

  const cards = useMemo(() => {
    if (sessions === null) return [];
    const scored = inPeriod.filter(
      (s): s is SessionWithRelations & { overall_accuracy: number } =>
        typeof s.overall_accuracy === 'number'
    );
    const avgAccuracy =
      scored.length === 0
        ? null
        : Math.round(scored.reduce((sum, s) => sum + s.overall_accuracy, 0) / scored.length);
    const compliance = meanComplianceGrade(inPeriod);

    return [
      {
        label: 'Active Athletes',
        value: activeUserCount(inPeriod),
        hint: `of ${accounts.length} accounts`,
        icon: Users,
        color: 'from-indigo-500 to-indigo-600',
      },
      {
        label: 'Practice Sessions',
        value: inPeriod.length,
        hint: PERIOD_LABELS[period],
        icon: Activity,
        color: 'from-emerald-500 to-emerald-600',
      },
      {
        // Null renders as an explicit "Not scored" — a zero here would read as
        // "every attempt failed", which is a completely different statement.
        value: avgAccuracy,
        display: avgAccuracy === null ? 'Not scored' : `${avgAccuracy}%`,
        hint: scored.length === 0 ? 'No scored attempts' : `${scored.length} scored`,
        label: 'Avg Accuracy',
        icon: Target,
        color: 'from-amber-500 to-amber-600',
      },
      {
        value: compliance,
        display: compliance === null ? 'Not graded' : `${compliance}%`,
        hint: 'From icu_compliance_grade',
        label: 'Compliance Grade',
        icon: TrendingUp,
        color: 'from-rose-500 to-rose-600',
      },
    ];
  }, [sessions, inPeriod, period, accounts.length]);

  const ranked = useMemo(
    () => (sessions ? rankAthletes(inPeriod, accounts, 10) : []),
    [sessions, inPeriod, accounts]
  );

  const topStunts = useMemo(() => {
    if (!sessions) return [];
    const rolled = rollUpByStunt(inPeriod, MASTERY_THRESHOLD);
    const sorted = [...rolled].sort((a, b) => {
      if (stuntSort === 'lowest_accuracy') {
        const aScore = a.avgAccuracy ?? 999;
        const bScore = b.avgAccuracy ?? 999;
        return aScore - bScore || b.attempts - a.attempts;
      }
      if (stuntSort === 'highest_mastery') {
        const aMastery = a.masteryRate ?? -1;
        const bMastery = b.masteryRate ?? -1;
        return (
          bMastery - aMastery ||
          (b.avgAccuracy ?? -1) - (a.avgAccuracy ?? -1) ||
          b.attempts - a.attempts
        );
      }
      return b.attempts - a.attempts || (b.avgAccuracy ?? -1) - (a.avgAccuracy ?? -1);
    });
    return sorted.slice(0, 5);
  }, [sessions, inPeriod, stuntSort]);

  const volumeBuckets = useMemo(
    () => (sessions ? buildVolumeTierBuckets(sessions, period) : []),
    [sessions, period]
  );

  const periodTierTotals = useMemo(() => {
    let mastered = 0;
    let developing = 0;
    let needsWork = 0;
    let minutes = 0;
    for (const b of volumeBuckets) {
      mastered += b.mastered;
      developing += b.developing;
      needsWork += b.needsWork;
      minutes += b.minutes;
    }
    return { mastered, developing, needsWork, minutes };
  }, [volumeBuckets]);

  const hasData = sessions !== null && sessions.length > 0;

  const exportCsv = () => {
    if (!sessions) return;
    const lines: (string | number | null)[][] = [
      ['Optistance analytics export', new Date().toISOString()],
      ['Period', PERIOD_LABELS[period]],
      [],
      ['Metric', 'Value'],
      ['Active athletes', activeUserCount(inPeriod)],
      ['Practice sessions', inPeriod.length],
      [
        'Average accuracy',
        cards[2].value === null ? null : `${cards[2].value}%`,
      ],
      ['Average compliance grade', cards[3].value === null ? null : `${cards[3].value}%`],
      [],
      ['Athlete', 'Sessions', 'Average accuracy', 'Last session'],
      ...ranked.map((a) => [
        a.name,
        a.sessions,
        a.avgAccuracy === null ? null : `${a.avgAccuracy}%`,
        a.lastSessionAt ? formatDate(a.lastSessionAt) : null,
      ]),
      [],
      ['Stunt', 'Category', 'Difficulty', 'Attempts', 'Average accuracy', 'Mastery rate'],
      ...topStunts.map((s) => {
        const meta = stuntMeta.get(s.stuntId);
        return [
          meta?.name ?? stuntNames.get(s.stuntId) ?? s.stuntId,
          formatCategoryLabel(meta?.category),
          formatDifficultyBadge(meta?.difficulty).label,
          s.attempts,
          s.avgAccuracy === null ? null : `${s.avgAccuracy}%`,
          s.masteryRate === null ? null : `${s.masteryRate}%`,
        ];
      }),
    ];

    const blob = new Blob([toCsv(lines)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optistance-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Performance Analytics</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Computed from every recorded practice session
          </p>
        </div>
        <button
          onClick={exportCsv}
          // Previously always clickable, and it happily exported four rows
          // reading "Not measured" — a file that looked like a real report.
          disabled={!hasData}
          title={hasData ? undefined : 'No practice sessions recorded yet'}
          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-white font-bold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => void load()}
            className="underline underline-offset-2 text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/*
        Period selector. This used to change only the heading text — every
        number on the page was identical whichever period was picked. It now
        actually filters, and each button states the window it selects.
      */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reporting period">
        {PERIODS.map((key) => {
          const isActive = key === period;
          return (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              aria-pressed={isActive}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
                isActive
                  ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-white/[0.05] text-zinc-400 border-white/[0.08] hover:bg-white/[0.1]'
              }`}
            >
              {PERIOD_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[7.5rem] rounded-2xl border border-white/[0.08] bg-white/[0.02] animate-pulse"
              />
            ))
          : cards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all group overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium mb-1">{item.label}</p>
                  <p className="text-3xl font-black text-white font-mono">{item.display}</p>
                  <p className="text-xs text-zinc-500 mt-1">{item.hint}</p>
                </div>
              );
            })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Practice Volume
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                {PERIOD_LABELS[period]} · Stacked by score tier &amp; avg accuracy
              </p>
            </div>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-300">
              {periodTierTotals.minutes}m practiced
            </span>
          </div>

          {/* Compact Score-Tier Legend + Period Totals Pill Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-300">
              <span className="h-2 w-2 rounded-sm bg-emerald-400" />
              Mastered ≥80%
              <span className="font-black text-white">{periodTierTotals.mastered}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-amber-300">
              <span className="h-2 w-2 rounded-sm bg-amber-400" />
              Developing 60–79%
              <span className="font-black text-white">{periodTierTotals.developing}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-rose-300">
              <span className="h-2 w-2 rounded-sm bg-rose-500" />
              Needs Work &lt;60%
              <span className="font-black text-white">{periodTierTotals.needsWork}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
              Avg Accuracy %
            </span>
          </div>

          <PracticeVolumeChart
            buckets={volumeBuckets}
            period={period}
            isLoading={isLoading}
          />
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] flex flex-col">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Top Stunts by Attempts
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                {PERIOD_LABELS[period]} · Attempts volume vs. avg accuracy
              </p>
            </div>

            {/* Sort Mode Switcher */}
            <div
              className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1"
              role="group"
              aria-label="Sort stunts"
            >
              {STUNT_SORT_OPTIONS.map((opt) => {
                const active = stuntSort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStuntSort(opt.id)}
                    aria-pressed={active}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual-Bar Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-indigo-400" />
              Attempts Volume
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400" />
              Avg Accuracy % (≥80% Mastered)
            </span>
          </div>

          {isLoading ? (
            <div className="h-48 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-pulse" />
          ) : topStunts.length === 0 ? (
            <div className="flex flex-1 min-h-[12rem] flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 text-center">
              <p className="text-xs font-medium text-zinc-400">No attempts in this period</p>
              <p className="text-[11px] text-zinc-600">
                {period !== 'all'
                  ? 'Try widening the period to see all-time stunt attempts.'
                  : 'Stunt attempts and accuracy comparisons appear here as athletes train.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {(() => {
                const maxAttempts = Math.max(...topStunts.map((s) => s.attempts), 1);
                return topStunts.map((stunt, index) => {
                  const meta = stuntMeta.get(stunt.stuntId);
                  const displayName = meta?.name ?? stuntNames.get(stunt.stuntId) ?? stunt.stuntId;
                  const categoryLabel = formatCategoryLabel(meta?.category);
                  const difficultyBadge = formatDifficultyBadge(meta?.difficulty);
                  const attemptsPct = Math.max((stunt.attempts / maxAttempts) * 100, 6);
                  const accuracyVal = stunt.avgAccuracy ?? 0;
                  const accuracyBarClass =
                    stunt.avgAccuracy === null
                      ? 'bg-white/[0.08]'
                      : stunt.avgAccuracy >= MASTERY_THRESHOLD
                        ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-400'
                        : stunt.avgAccuracy >= 60
                          ? 'bg-gradient-to-r from-amber-500/80 to-amber-400'
                          : 'bg-gradient-to-r from-rose-500/80 to-rose-400';
                  const accuracyTextClass =
                    stunt.avgAccuracy === null
                      ? 'text-zinc-500'
                      : stunt.avgAccuracy >= MASTERY_THRESHOLD
                        ? 'text-emerald-400'
                        : stunt.avgAccuracy >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400';

                  return (
                    <li
                      key={stunt.stuntId}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      {/* Stunt Header + Category & Difficulty Badges */}
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-black text-zinc-400">
                            {index + 1}
                          </span>
                          <Dumbbell className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                          <span className="truncate text-xs font-bold text-white">
                            {displayName}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                            {categoryLabel}
                          </span>
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${difficultyBadge.className}`}
                          >
                            {difficultyBadge.label}
                          </span>
                        </div>

                        {stunt.masteryRate !== null && (
                          <span className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                            Mastery rate:{' '}
                            <strong className="text-white">{stunt.masteryRate}%</strong>
                          </span>
                        )}
                      </div>

                      {/* Side-by-Side Dual-Bar Comparison: Attempts Volume vs. Avg Accuracy % */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                        {/* Bar 1: Attempts Volume */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">Attempts</span>
                            <span className="font-bold text-white tabular-nums">
                              {stunt.attempts}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                              style={{ width: `${attemptsPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Bar 2: Avg Accuracy % with 80% Mastery Threshold marker */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">Avg Accuracy</span>
                            <span className={`font-bold tabular-nums ${accuracyTextClass}`}>
                              {stunt.avgAccuracy === null
                                ? 'Not scored'
                                : `${stunt.avgAccuracy}%`}
                            </span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={`h-full rounded-full transition-all ${accuracyBarClass}`}
                              style={{
                                width: `${stunt.avgAccuracy === null ? 0 : Math.max(accuracyVal, 4)}%`,
                              }}
                            />
                            {/* 80% Mastery Threshold reference tick */}
                            <div
                              title={`Mastery Threshold (${MASTERY_THRESHOLD}%)`}
                              className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/40"
                              style={{ left: `${MASTERY_THRESHOLD}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
      </div>

      {/* Athlete leaderboard */}
      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
        <div className="mb-4 flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Top Athletes</h4>
          <span className="text-xs text-zinc-500">{PERIOD_LABELS[period]}</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-zinc-500">Loading athletes…</p>
        ) : ranked.length === 0 ? (
          <p className="text-xs text-zinc-500">No athlete accounts yet.</p>
        ) : ranked.every((a) => a.sessions === 0) ? (
          <p className="text-xs text-zinc-500 leading-relaxed">
            None of these {ranked.length} athletes recorded a session in this period.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Athlete</th>
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Sessions</th>
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Avg Accuracy</th>
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Last Online</th>
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {ranked.map((athlete) => (
                    <tr key={athlete.id}>
                      <td className="px-4 py-3 font-medium text-white">{athlete.name}</td>
                      <td className="px-4 py-3 font-bold text-white tabular-nums">{athlete.sessions}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {athlete.avgAccuracy === null ? (
                          <span className="text-zinc-500">Not scored</span>
                        ) : (
                          <span className="font-bold text-emerald-400">{athlete.avgAccuracy}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <span title={athlete.lastSeenAt ?? undefined}>
                          {onlineUserIds.has(athlete.id)
                            ? 'Online now'
                            : formatLastOnline(athlete.lastSeenAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="space-y-2 md:hidden">
              {ranked.map((athlete) => (
                <li
                  key={athlete.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-white">
                      {athlete.name}
                    </p>
                    {!athlete.isActive ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-rose-400 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5" /> Deactivated
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
                  <p className="mt-1 text-xs text-zinc-400">
                    <span className="font-bold text-white">{athlete.sessions}</span> sessions
                    {' · '}
                    {athlete.avgAccuracy === null ? (
                      <span className="text-zinc-500">not scored</span>
                    ) : (
                      <span className="font-bold text-emerald-400">{athlete.avgAccuracy}%</span>
                    )}
                    <span> · Last online: {onlineUserIds.has(athlete.id) ? 'Now' : formatLastOnline(athlete.lastSeenAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

interface VolumeTierBucket {
  key: string;
  axisLabel: string;
  tooltipTitle: string;
  count: number;
  mastered: number;
  developing: number;
  needsWork: number;
  unscored: number;
  minutes: number;
  avgAccuracy: number | null;
}

const TODAY_SLOTS: { startHour: number; endHour: number; axisLabel: string; title: string }[] = [
  { startHour: 0, endHour: 4, axisLabel: '12a', title: 'Today · 12 AM – 4 AM' },
  { startHour: 4, endHour: 8, axisLabel: '4a', title: 'Today · 4 AM – 8 AM' },
  { startHour: 8, endHour: 12, axisLabel: '8a', title: 'Today · 8 AM – 12 PM' },
  { startHour: 12, endHour: 16, axisLabel: '12p', title: 'Today · 12 PM – 4 PM' },
  { startHour: 16, endHour: 20, axisLabel: '4p', title: 'Today · 4 PM – 8 PM' },
  { startHour: 20, endHour: 24, axisLabel: '8p', title: 'Today · 8 PM – 12 AM' },
];

const formatDayTooltip = (dayKey: string): string => {
  const parsed = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dayKey;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatShortMonthDay = (dayKey: string): string => {
  const parsed = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dayKey;
  return parsed.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
};

const accumulateSessionIntoBucket = (
  bucket: VolumeTierBucket & { _scoreSum: number; _scoredCount: number },
  session: SessionWithRelations
) => {
  bucket.count += 1;
  bucket.minutes += Math.max(1, Math.round(session.duration_minutes ?? 1));
  if (typeof session.overall_accuracy === 'number') {
    bucket._scoreSum += session.overall_accuracy;
    bucket._scoredCount += 1;
    if (session.overall_accuracy >= MASTERY_THRESHOLD) {
      bucket.mastered += 1;
    } else if (session.overall_accuracy >= 60) {
      bucket.developing += 1;
    } else {
      bucket.needsWork += 1;
    }
  } else {
    bucket.unscored += 1;
  }
};

const finalizeBuckets = (
  raw: Array<VolumeTierBucket & { _scoreSum: number; _scoredCount: number }>
): VolumeTierBucket[] =>
  raw.map(({ _scoreSum, _scoredCount, ...rest }) => ({
    ...rest,
    avgAccuracy: _scoredCount > 0 ? Math.round(_scoreSum / _scoredCount) : null,
  }));

/**
 * Build stacked score-tier + accuracy buckets synchronized with the active
 * reporting period (`today` = 4-hour slots, `week` = 7 days, `month` = current
 * month days, `all` = last 30 days).
 */
const buildVolumeTierBuckets = (
  sessions: readonly SessionWithRelations[],
  period: PeriodKey,
  now: Date = new Date()
): VolumeTierBucket[] => {
  if (period === 'today') {
    const todayKey = localDayKey(now);
    const raw = TODAY_SLOTS.map((slot) => ({
      key: `slot-${slot.startHour}`,
      axisLabel: slot.axisLabel,
      tooltipTitle: slot.title,
      count: 0,
      mastered: 0,
      developing: 0,
      needsWork: 0,
      unscored: 0,
      minutes: 0,
      avgAccuracy: null as number | null,
      _scoreSum: 0,
      _scoredCount: 0,
    }));

    for (const session of sessions) {
      if (localDayKey(session.session_date) !== todayKey) continue;
      const d = new Date(session.session_date);
      const hour = Number.isNaN(d.getTime()) ? 12 : d.getHours();
      const idx = Math.min(TODAY_SLOTS.length - 1, Math.max(0, Math.floor(hour / 4)));
      accumulateSessionIntoBucket(raw[idx], session);
    }

    return finalizeBuckets(raw);
  }

  let dayCount = 7;
  if (period === 'month') {
    dayCount = Math.max(7, now.getDate());
  } else if (period === 'all') {
    dayCount = 30;
  }

  const map = new Map<
    string,
    VolumeTierBucket & { _scoreSum: number; _scoredCount: number }
  >();
  const ordered: Array<VolumeTierBucket & { _scoreSum: number; _scoredCount: number }> = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const key = localDayKey(d);
    const entry = {
      key,
      axisLabel: period === 'week' ? weekdayLabel(key) : formatShortMonthDay(key),
      tooltipTitle: formatDayTooltip(key),
      count: 0,
      mastered: 0,
      developing: 0,
      needsWork: 0,
      unscored: 0,
      minutes: 0,
      avgAccuracy: null as number | null,
      _scoreSum: 0,
      _scoredCount: 0,
    };
    map.set(key, entry);
    ordered.push(entry);
  }

  for (const session of sessions) {
    const key = localDayKey(session.session_date);
    const bucket = map.get(key);
    if (!bucket) continue;
    accumulateSessionIntoBucket(bucket, session);
  }

  return finalizeBuckets(ordered);
};

/**
 * Stacked Score-Tier Bars (Mastered ≥80% green, Developing 60–79% amber,
 * Needs Work <60% rose) + Bright Cyan/Sky (#38bdf8) Accuracy Trend Line.
 */
function PracticeVolumeChart({
  buckets,
  period,
  isLoading,
}: {
  buckets: VolumeTierBucket[];
  period: PeriodKey;
  isLoading: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (isLoading) {
    return <div className="h-48 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-pulse" />;
  }

  const totalSessions = buckets.reduce((sum, b) => sum + b.count, 0);
  if (buckets.length === 0 || totalSessions === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 text-center">
        <p className="text-xs font-medium text-zinc-400">
          No sessions recorded in {PERIOD_LABELS[period].toLowerCase()}
        </p>
        <p className="text-[11px] text-zinc-600">
          Stacked score-tier volume and accuracy trend appear here as athletes train.
        </p>
      </div>
    );
  }

  const peak = Math.max(...buckets.map((b) => b.count), 1);
  const totalCols = buckets.length;

  const accuracyPoints = buckets
    .map((bucket, idx) =>
      bucket.avgAccuracy !== null
        ? {
            idx,
            key: bucket.key,
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
    if (totalCols <= 8) return true;
    if (totalCols <= 16) return idx % 2 === 0 || idx === totalCols - 1;
    return idx % 5 === 0 || idx === totalCols - 1;
  };

  return (
    <div
      className="relative rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
      onMouseLeave={() => setHoveredIdx(null)}
      role="img"
      aria-label={`Practice volume for ${PERIOD_LABELS[period]}. ${totalSessions} sessions in total.`}
    >
      {/* Interactive Floating Tooltip */}
      {activeBucket && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-white/15 bg-[#0d0d14]/95 px-3.5 py-2.5 text-xs shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl whitespace-nowrap"
          style={{
            left: `${Math.min(86, Math.max(14, activeLeftPct))}%`,
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-4">
            <span className="font-bold text-white">{activeBucket.tooltipTitle}</span>
            <span className="text-[11px] font-semibold text-zinc-400">
              {activeBucket.minutes}m practiced
            </span>
          </div>
          <div className="mb-1.5 flex items-center gap-3 text-[11px]">
            <span className="text-zinc-300">
              <span className="font-bold text-white">{activeBucket.count}</span>{' '}
              {activeBucket.count === 1 ? 'session' : 'sessions'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              {activeBucket.avgAccuracy !== null ? (
                <>
                  <span className="font-bold text-sky-400">{activeBucket.avgAccuracy}%</span> avg
                  accuracy
                </>
              ) : (
                <span className="text-zinc-500">Not scored</span>
              )}
            </span>
          </div>
          {activeBucket.count > 0 && (
            <div className="flex items-center gap-2.5 border-t border-white/10 pt-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-sm bg-emerald-400" />
                Mastered: <strong className="text-white">{activeBucket.mastered}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-sm bg-amber-400" />
                Developing: <strong className="text-white">{activeBucket.developing}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-rose-300">
                <span className="h-1.5 w-1.5 rounded-sm bg-rose-500" />
                Needs Work: <strong className="text-white">{activeBucket.needsWork}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          {/* Horizontal grid lines for 100%, 50%, 0% accuracy */}
          <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6 flex flex-col justify-between">
            <div className="border-b border-dashed border-white/[0.06]" />
            <div className="border-b border-dashed border-white/[0.06]" />
            <div className="border-b border-white/[0.06]" />
          </div>

          {/* Stacked Score-Tier Bars */}
          <div
            className={`relative flex h-40 items-end ${
              totalCols > 16 ? 'gap-1' : totalCols > 8 ? 'gap-1.5' : 'gap-2'
            }`}
          >
            {buckets.map((bucket, idx) => {
              const heightPct = Math.max(
                (bucket.count / peak) * 100,
                bucket.count > 0 ? 8 : 2
              );
              const isHovered = hoveredIdx === idx;
              const total = bucket.count || 1;
              const masteredPct = (bucket.mastered / total) * 100;
              const developingPct = (bucket.developing / total) * 100;
              const needsWorkPct = (bucket.needsWork / total) * 100;
              const unscoredPct = (bucket.unscored / total) * 100;

              return (
                <div
                  key={bucket.key}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(idx)}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 focus:outline-none cursor-pointer"
                >
                  <span
                    className={`h-3.5 text-[10px] font-bold transition-colors ${
                      isHovered ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {bucket.count === 0 || (totalCols > 16 && !isHovered) ? '' : bucket.count}
                  </span>

                  <div className="relative flex w-full flex-1 items-end">
                    {bucket.count === 0 ? (
                      <div
                        title={`${bucket.tooltipTitle}: no sessions`}
                        className={`w-full rounded-t-md transition-colors ${
                          isHovered ? 'bg-white/[0.12]' : 'bg-white/[0.04]'
                        }`}
                        style={{ height: '2%' }}
                      />
                    ) : (
                      <div
                        title={`${bucket.tooltipTitle}: ${bucket.count} session${
                          bucket.count === 1 ? '' : 's'
                        }${
                          bucket.avgAccuracy !== null
                            ? `, ${bucket.avgAccuracy}% avg accuracy`
                            : ''
                        }`}
                        className={`flex w-full flex-col overflow-hidden rounded-t-md transition-all ${
                          isHovered ? 'ring-1 ring-white/40 brightness-110' : ''
                        }`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {bucket.mastered > 0 && (
                          <div
                            className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500/85"
                            style={{ height: `${masteredPct}%` }}
                          />
                        )}
                        {bucket.developing > 0 && (
                          <div
                            className="w-full bg-gradient-to-b from-amber-400 to-amber-500/85"
                            style={{ height: `${developingPct}%` }}
                          />
                        )}
                        {bucket.needsWork > 0 && (
                          <div
                            className="w-full bg-gradient-to-b from-rose-400 to-rose-500/85"
                            style={{ height: `${needsWorkPct}%` }}
                          />
                        )}
                        {bucket.unscored > 0 && (
                          <div
                            className="w-full bg-indigo-400/50"
                            style={{ height: `${unscoredPct}%` }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <span
                    className={`h-4 text-[10px] transition-colors truncate ${
                      isHovered ? 'font-bold text-white' : 'text-zinc-500'
                    }`}
                  >
                    {shouldShowXLabel(idx) ? bucket.axisLabel : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overlaid Bright Cyan/Sky (#38bdf8) Avg Accuracy Trend Line + Nodes */}
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
                    stroke="#38bdf8"
                    strokeWidth="2.25"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                    className="drop-shadow-[0_0_8px_rgba(56,189,248,0.75)]"
                  />
                </svg>
              )}

              {accuracyPoints.map((pt) => {
                const isHovered = hoveredIdx === pt.idx;
                return (
                  <div
                    key={pt.key}
                    style={{
                      left: `${pt.xPct}%`,
                      top: `${pt.yPct}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform ${
                      isHovered
                        ? 'h-3 w-3 scale-125 border-white bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,1)]'
                        : 'h-2 w-2 border-[#0a0a0f] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Y-Axis (Accuracy %) */}
        <div className="flex flex-col justify-between pt-4 pb-5 text-right text-[10px] font-medium text-sky-400/80 select-none">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      </div>
    </div>
  );
}
