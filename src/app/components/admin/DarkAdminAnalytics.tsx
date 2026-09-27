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
import { supabaseGetUsers, supabaseGetSessions, supabaseGetStunts } from '../../../services/supabaseApi';
import type { SessionWithRelations } from '../../../services/supabaseService';
import type { Stunt } from '../../../types/supabase';
import { MASTERY_THRESHOLD } from '../../types';
import {
  PERIOD_LABELS,
  activeUserCount,
  bucketSessionsByDay,
  isEmptySeries,
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

export default function DarkAdminAnalytics() {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [sessions, setSessions] = useState<SessionWithRelations[] | null>(null);
  const [accounts, setAccounts] = useState<RankableAccount[]>([]);
  const [stuntNames, setStuntNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [users, allSessions, stunts] = await Promise.all([
        supabaseGetUsers(),
        supabaseGetSessions(),
        supabaseGetStunts().catch(() => [] as Stunt[]),
      ]);

      setAccounts(
        users.map((u) => ({ id: u.id, name: u.fullName, isActive: u.isActive }))
      );
      setSessions(allSessions);
      setStuntNames(new Map(stunts.map((s) => [s.id, s.name])));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load analytics. Check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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

  const topStunts = useMemo(
    () => (sessions ? rollUpByStunt(inPeriod, MASTERY_THRESHOLD).slice(0, 5) : []),
    [sessions, inPeriod]
  );

  const buckets = useMemo(
    () => (sessions ? bucketSessionsByDay(sessions, 7) : []),
    [sessions]
  );

  const hasData = sessions !== null && sessions.length > 0;

  const exportCsv = () => {
    if (!sessions) return;
    const lines: (string | number | null)[][] = [
      ['OptiStance analytics export', new Date().toISOString()],
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
      ['Stunt', 'Attempts', 'Average accuracy'],
      ...topStunts.map((s) => [
        stuntNames.get(s.stuntId) ?? s.stuntId,
        s.attempts,
        s.avgAccuracy === null ? null : `${s.avgAccuracy}%`,
      ]),
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
          <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
            Practice Volume
          </h4>
          <p className="text-xs text-zinc-500 mb-4">Last 7 days, all athletes</p>
          <PracticeVolumeChart buckets={buckets} isLoading={isLoading} />
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
            Top Stunts by Attempts
          </h4>
          <p className="text-xs text-zinc-500 mb-4">{PERIOD_LABELS[period]}</p>
          {isLoading ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : topStunts.length === 0 ? (
            <p className="text-xs text-zinc-500 leading-relaxed">
              No attempts in this period.
              {period !== 'all' && ' Try widening the period to see all-time stunt attempts.'}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {topStunts.map((stunt, index) => {
                const peak = topStunts[0].attempts || 1;
                return (
                  <li key={stunt.stuntId} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-[10px] font-bold text-zinc-600">
                      {index + 1}
                    </span>
                    <Dumbbell className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200">
                      {stuntNames.get(stunt.stuntId) ?? stunt.stuntId}
                    </span>
                    <div className="hidden w-24 shrink-0 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                      <div
                        className="h-1.5 rounded-full bg-indigo-500/70"
                        style={{ width: `${Math.max((stunt.attempts / peak) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-bold text-white tabular-nums">
                      {stunt.attempts}
                    </span>
                  </li>
                );
              })}
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
                    <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Last Active</th>
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
                        {athlete.lastSessionAt ? formatDate(athlete.lastSessionAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            athlete.isActive ? 'text-emerald-400' : 'text-zinc-500'
                          }`}
                        >
                          {athlete.isActive ? 'Active' : 'Deactivated'}
                        </span>
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
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase ${
                        athlete.isActive ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {athlete.isActive ? 'Active' : 'Removed'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    <span className="font-bold text-white">{athlete.sessions}</span> sessions
                    {' · '}
                    {athlete.avgAccuracy === null ? (
                      <span className="text-zinc-500">not scored</span>
                    ) : (
                      <span className="font-bold text-emerald-400">{athlete.avgAccuracy}%</span>
                    )}
                    {athlete.lastSessionAt && (
                      <span> · {formatDate(athlete.lastSessionAt)}</span>
                    )}
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

/** Seven-day volume bars. Replaces a box that only ever said "No recorded volume". */
function PracticeVolumeChart({
  buckets,
  isLoading,
}: {
  buckets: ReturnType<typeof bucketSessionsByDay>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-40 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-pulse" />;
  }

  if (buckets.length === 0 || isEmptySeries(buckets)) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 text-center">
        <p className="text-xs font-medium text-zinc-400">No sessions in the last 7 days</p>
        <p className="text-[11px] text-zinc-600">Practice volume appears here as athletes train.</p>
      </div>
    );
  }

  const peak = Math.max(...buckets.map((b) => b.count), 1);
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div
      className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
      role="img"
      aria-label={`Practice volume over the last 7 days. ${total} sessions in total.`}
    >
      <div className="flex h-32 items-end gap-2">
        {buckets.map((bucket) => (
          <div key={bucket.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400">
              {bucket.count === 0 ? '' : bucket.count}
            </span>
            <div
              title={`${weekdayLabel(bucket.day)}: ${bucket.count} session${
                bucket.count === 1 ? '' : 's'
              }`}
              className={`w-full rounded-t-md ${
                bucket.count === 0
                  ? 'bg-white/[0.04]'
                  : 'bg-gradient-to-t from-emerald-500/60 to-emerald-400'
              }`}
              style={{ height: `${Math.max((bucket.count / peak) * 100, bucket.count > 0 ? 6 : 2)}%` }}
            />
            <span className="text-[10px] text-zinc-500">{weekdayLabel(bucket.day)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
