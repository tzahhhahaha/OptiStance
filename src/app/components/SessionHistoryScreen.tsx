import React, { useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { PracticeSession } from '../types';

interface SessionHistoryScreenProps {
  sessions: PracticeSession[];
  onStartPracticeWithPoseId: (poseId: string) => void;
  /** Send the athlete to the pose gallery. Used by the empty state. */
  onBrowseLibrary: () => void;
}

export const SessionHistoryScreen: React.FC<SessionHistoryScreenProps> = ({
  sessions,
  onStartPracticeWithPoseId,
  onBrowseLibrary
}) => {
  const [selectedPoseFilter, setSelectedPoseFilter] = useState<string>('All');


  const posesInHistory = Array.from(new Set(sessions.map((s) => s.poseName)));

  // Render an ISO timestamp as a friendly local date/time; fall back to the raw
  // value for legacy human-readable timestamps.
  const formatTimestamp = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      }
    }
    return value;
  };

  const filteredSessions = sessions.filter((s) =>
    selectedPoseFilter === 'All' ? true : s.poseName === selectedPoseFilter
  );

  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((acc, curr) => acc + curr.accuracyScore, 0) / sessions.length)
    : 0;

  const measuredIcuSessions = sessions.filter((session) => session.icuScore != null);
  const avgIcuScore = measuredIcuSessions.length
    ? (measuredIcuSessions.reduce((total, session) => total + (session.icuScore ?? 0), 0) / measuredIcuSessions.length).toFixed(1)
    : null;

  const totalTimeMinutes = Math.round(
    sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60
  );



  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 pb-28 font-sans">
      {/* Header Banner - Immersive UI */}
      <div className="relative rounded-3xl overflow-hidden mb-8 p-6 md:p-8 bg-gradient-to-r from-indigo-950/60 via-[#0d0d12]/90 to-rose-950/40 border border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Performance Tracking</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-white">
              Session History &amp; Telemetry
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg leading-relaxed">
              Review your historical form calibrations, ICU compliance grade trends, and training session analytics.
            </p>
          </div>


        </div>
      </div>

      {/* Metrics Row - Bento Grid */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0d0d12]/80 p-5 rounded-3xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Logs</p>
            <p className="text-2xl md:text-3xl font-black text-white font-mono my-1">{sessions.length}</p>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Active Athlete
            </span>
          </div>

          <div className="bg-[#0d0d12]/80 p-5 rounded-3xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Accuracy</p>
            <p className="text-2xl md:text-3xl font-black text-indigo-400 font-mono my-1">{avgAccuracy}%</p>
            <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              ICU Calibrated
            </span>
          </div>

          <div className="bg-[#0d0d12]/80 p-5 rounded-3xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Practice Time</p>
            <p className="text-2xl md:text-3xl font-black text-white font-mono my-1">{totalTimeMinutes}m</p>
            <span className="text-[10px] text-zinc-400 font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              Mat Time
            </span>
          </div>

          <div className="bg-[#0d0d12]/80 p-5 rounded-3xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ICU Grade</p>
            <p className="text-2xl md:text-3xl font-black text-emerald-400 font-mono my-1">{avgIcuScore ? `${avgIcuScore} / 10` : 'Not measured'}</p>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {avgIcuScore ? 'Measured sessions' : 'Requires coach review'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0">
          Filter:
        </span>
        <button
          onClick={() => setSelectedPoseFilter('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            selectedPoseFilter === 'All'
              ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
              : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/10'
          }`}
        >
          All Poses
        </button>
        {posesInHistory.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedPoseFilter(name)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedPoseFilter === name
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      )}

      {/* Session Logs List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <History className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2">No Practice Sessions Yet</h3>
            <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Pick a pose from the library and scan it to start building your
              history.
            </p>
            <button
              onClick={onBrowseLibrary}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            >
              Browse Poses
            </button>
          </div>
        ) : null}
        {filteredSessions.map((session) => {
          const isHigh = session.accuracyScore >= 90;
          return (
            <div
              key={session.id}
              className="bg-[#0d0d12]/80 rounded-3xl p-5 md:p-6 border border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-extrabold text-base md:text-lg text-white">
                    {session.poseName}
                  </h3>
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 uppercase tracking-wider font-mono">
                    ICU: {session.icuScore != null ? `${session.icuScore}/10` : 'Not measured'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {formatTimestamp(session.timestamp)}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {session.durationSeconds}s Hold
                  </span>
                </div>

                {/* Feedback Notes */}
                <div className="space-y-1.5 pt-1">
                  {session.corrections.map((corr, idx) => (
                    <p key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                      {isHigh ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span>{corr}</span>
                    </p>
                  ))}
                </div>
              </div>

              {/* Score & Action Button */}
              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                <div className="text-right">
                  <p className="text-2xl md:text-3xl font-black text-white font-mono">
                    {session.accuracyScore}%
                  </p>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                    Form Accuracy
                  </p>
                </div>

                <button
                  onClick={() => onStartPracticeWithPoseId(session.poseId)}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 text-xs font-bold uppercase tracking-wider active:scale-95 transition-all shadow-sm"
                >
                  Repractice
                </button>
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
};
