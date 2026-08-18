import React from 'react';
import { TrendingUp, Users, Activity, Target, Calendar, Download } from 'lucide-react';

export default function DarkAdminAnalytics() {
  const analyticsData = [
    { label: 'Weekly Active Users', value: '234', change: '+18%', icon: Users, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Total Sessions', value: '1,247', change: '+42%', icon: Activity, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Avg Accuracy', value: '84.2%', change: '+3.8%', icon: Target, color: 'from-amber-500 to-amber-600' },
    { label: 'Compliance Rate', value: '92.1%', change: '+5.2%', icon: TrendingUp, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">Performance Analytics</h3>
          <p className="text-sm text-zinc-400 mt-1">Real-time insights and squad performance metrics</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-white font-bold transition-all flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Time Period Selector */}
      <div className="flex gap-2">
        {['Today', 'This Week', 'This Month', 'All Time'].map((period) => (
          <button
            key={period}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              period === 'This Week'
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
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Weekly Trend</h4>
          <div className="h-40 bg-white/[0.02] rounded-xl border border-white/[0.05] flex items-end justify-around px-4 py-4">
            {[65, 78, 72, 85, 91, 88, 92].map((value, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div
                  className="w-8 rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ height: `${value * 1.5}px` }}
                />
                <span className="text-xs text-zinc-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Stunts */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Top Stunts by Attempts</h4>
          <div className="space-y-3">
            {[
              { name: 'Liberty', attempts: 342, color: 'from-rose-500' },
              { name: 'Scorpion', attempts: 298, color: 'from-indigo-500' },
              { name: 'High V', attempts: 512, color: 'from-emerald-500' },
              { name: 'Heel Stretch', attempts: 187, color: 'from-amber-500' },
            ].map((stunt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 w-8">{idx + 1}</span>
                <span className="text-sm font-bold text-white flex-1">{stunt.name}</span>
                <div className="w-24 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${stunt.color}`}
                    style={{ width: `${(stunt.attempts / 512) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-zinc-400 w-10 text-right">{stunt.attempts}</span>
              </div>
            ))}
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
              {[
                { name: 'Sarah Johnson', sessions: 24, accuracy: 87, mastered: 8, status: 'Active' },
                { name: 'Emma Davis', sessions: 18, accuracy: 92, mastered: 6, status: 'Active' },
                { name: 'Jessica Lee', sessions: 42, accuracy: 95, mastered: 12, status: 'Active' },
                { name: 'Nicole Chen', sessions: 15, accuracy: 78, mastered: 4, status: 'Active' },
              ].map((athlete, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-bold text-white">{athlete.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{athlete.sessions}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${athlete.accuracy}%` }}
                        />
                      </div>
                      <span className="text-white font-bold text-xs">{athlete.accuracy}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-bold">{athlete.mastered}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30">
                      {athlete.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
