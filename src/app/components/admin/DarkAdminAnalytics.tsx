import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, Target, Calendar, Download, AlertCircle } from 'lucide-react';
import { analyticsService } from '../../../services/supabaseService';

const UNAVAILABLE_ANALYTICS = [
  { label: 'Weekly Active Users', value: 'Not measured', change: 'Unavailable', icon: Users, color: 'from-indigo-500 to-indigo-600' },
  { label: 'Total Sessions', value: 'Not measured', change: 'Unavailable', icon: Activity, color: 'from-emerald-500 to-emerald-600' },
  { label: 'Avg Accuracy', value: 'Not measured', change: 'Unavailable', icon: Target, color: 'from-amber-500 to-amber-600' },
  { label: 'Compliance Rate', value: 'Not measured', change: 'Unavailable', icon: TrendingUp, color: 'from-rose-500 to-rose-600' },
];

const PERIODS = ['Today', 'This Week', 'This Month', 'All Time'] as const;
type Period = (typeof PERIODS)[number];

export default function DarkAdminAnalytics() {
  const [activePeriod, setActivePeriod] = useState<Period>('This Week');
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  const [analyticsAvailable, setAnalyticsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await analyticsService.getLatestAnalytics();
        if (cancelled) return;
        setLiveAnalytics(snapshot);
        // A successful fetch means the backend is configured; a null snapshot
        // simply means no snapshot has been generated yet.
        setAnalyticsAvailable(true);
      } catch {
        if (cancelled) return;
        setAnalyticsAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Analytics cards – prefer live backend data, fall back to the display
  // defaults when the backend is not available.
  const analyticsData = liveAnalytics
    ? [
        { label: 'Weekly Active Users', value: liveAnalytics.active_users == null ? 'Not measured' : String(liveAnalytics.active_users), change: 'Measured', icon: Users, color: 'from-indigo-500 to-indigo-600' },
        { label: 'Total Sessions', value: liveAnalytics.total_sessions == null ? 'Not measured' : String(liveAnalytics.total_sessions), change: 'Measured', icon: Activity, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Avg Accuracy', value: liveAnalytics.avg_accuracy == null ? 'Not measured' : `${liveAnalytics.avg_accuracy}%`, change: 'Measured', icon: Target, color: 'from-amber-500 to-amber-600' },
        { label: 'Compliance Rate', value: liveAnalytics.compliance_rate == null ? 'Not measured' : `${liveAnalytics.compliance_rate}%`, change: 'Measured', icon: TrendingUp, color: 'from-rose-500 to-rose-600' },
      ]
    : UNAVAILABLE_ANALYTICS;

  const exportCsv = () => {
    const header = 'Metric,Value';
    const rows = analyticsData.map((item) => `${item.label},${item.value}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optistance-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Performance Analytics</h3>
          <p className="text-sm text-zinc-400 mt-1">Real-time insights and squad performance metrics</p>
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-white font-bold transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Live data status */}
      {analyticsAvailable === false && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <AlertCircle className="w-4 h-4" />
          Live analytics unavailable (Supabase not configured) — no performance figures are shown.
        </div>
      )}
      {analyticsAvailable === true && !liveAnalytics && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-400 text-xs font-bold">
          <Calendar className="w-4 h-4" />
          No analytics snapshots recorded yet — performance figures are unavailable.
        </div>
      )}

      {/* Time Period Selector */}
      <div className="flex gap-2">
        {PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              period === activePeriod
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-white/[0.05] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.1]'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all group overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {item.change}
                </span>
              </div>
              <p className="text-sm text-zinc-400 font-medium mb-1">{item.label}</p>
              <p className="text-3xl font-black text-white font-mono">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Trend Chart */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Practice Volume — {activePeriod}</h4>
          <div className="h-40 bg-white/[0.02] rounded-xl border border-white/[0.05] flex items-end justify-around px-4 py-4">
            <span className="text-xs text-zinc-500">No recorded practice volume</span>
          </div>
        </div>

        {/* Top Stunts */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Top Stunts by Attempts</h4>
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">No stunt attempt data available.</p>
          </div>
        </div>
      </div>

      {/* Athlete Performance Table */}
      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
        <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Top Athletes</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Athlete</th>
                <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Sessions</th>
                <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Avg Accuracy</th>
                <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Mastered</th>
                <th className="px-4 py-3 text-left font-bold text-white text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">
                  No athlete performance data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}