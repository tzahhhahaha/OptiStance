import React, { useState } from 'react';
import {
  History,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Camera,
  Activity,
  Award,
  MessageSquare,
  Download,
  Maximize2,
  X,
  Eye,
} from 'lucide-react';
import { PracticeSession, MASTERY_THRESHOLD } from '../types';

interface SessionHistoryScreenProps {
  sessions: PracticeSession[];
  onStartPracticeWithPoseId: (poseId: string) => void;
  /** Send the athlete to the pose gallery. Used by the empty state. */
  onBrowseLibrary: () => void;
}

const formatAngleLabel = (key: string): string => {
  const known: Record<string, string> = {
    armSpread: 'Arm Spread',
    elbowAngle: 'Elbow Angle',
    leftElbow: 'Left Elbow',
    rightElbow: 'Right Elbow',
    leftShoulder: 'Left Shoulder',
    rightShoulder: 'Right Shoulder',
    torsoAngle: 'Torso Lean',
    standingLeg: 'Standing Leg',
    liftedLeg: 'Lifted Leg',
    leftKnee: 'Left Knee',
    rightKnee: 'Right Knee',
    hipSplit: 'Split Angle',
    legSpread: 'Leg Spread',
  };
  return (
    known[key] ??
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
};

const deriveIcuTier = (session: PracticeSession): { label: string; badgeClass: string } => {
  if (session.icuTier) {
    const t = session.icuTier;
    if (/elite|master|gold|competition/i.test(t)) {
      return {
        label: t,
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    }
    if (/silver|solid|developing|intermediate/i.test(t)) {
      return {
        label: t,
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    }
    return {
      label: t,
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    };
  }

  if (session.accuracyScore >= 90) {
    return {
      label: 'ICU Competition Ready',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
  }
  if (session.accuracyScore >= MASTERY_THRESHOLD) {
    return {
      label: 'Mastered Standard',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    };
  }
  if (session.accuracyScore >= 65) {
    return {
      label: 'Developing Form',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  return {
    label: 'Needs Calibration',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };
};

const getSessionDisplayName = (session: PracticeSession) =>
  session.source === 'upload' ? 'Uploaded Image' : session.poseName;

export const SessionHistoryScreen: React.FC<SessionHistoryScreenProps> = ({
  sessions,
  onStartPracticeWithPoseId,
  onBrowseLibrary,
}) => {
  const [selectedPoseFilter, setSelectedPoseFilter] = useState<string>('All');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [showRawBySession, setShowRawBySession] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    poseName: string;
    accuracy: number;
    timestamp: string;
  } | null>(null);

  const posesInHistory = Array.from(new Set(sessions.map(getSessionDisplayName)));

  // Render an ISO timestamp as a friendly local date/time; fall back to the raw
  // value for legacy human-readable timestamps.
  const formatTimestamp = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      }
    }
    return value;
  };

  const filteredSessions = sessions.filter((s) =>
    selectedPoseFilter === 'All' ? true : getSessionDisplayName(s) === selectedPoseFilter
  );

  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((acc, curr) => acc + curr.accuracyScore, 0) / sessions.length)
    : 0;

  const measuredIcuSessions = sessions.filter((session) => session.icuScore != null);
  const avgIcuScore = measuredIcuSessions.length
    ? (
        measuredIcuSessions.reduce((total, session) => total + (session.icuScore ?? 0), 0) /
        measuredIcuSessions.length
      ).toFixed(1)
    : null;

  const totalTimeMinutes = Math.round(
    sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60
  );

  const handleDownloadSnapshot = (url: string, poseName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `optistance-${poseName.toLowerCase().replace(/\s+/g, '-')}-snapshot.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
            <p className="text-2xl md:text-3xl font-black text-emerald-400 font-mono my-1">
              {avgIcuScore ? `${avgIcuScore} / 10` : 'Not measured'}
            </p>
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
              Pick a pose from the library and scan it to start building your history.
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
          const isMastered = session.accuracyScore >= MASTERY_THRESHOLD;
          const isExpanded = expandedSessionId === session.id;
          const tier = deriveIcuTier(session);
          const angleEntries = session.measuredAngles
            ? Object.entries(session.measuredAngles).filter(
                ([, val]) => typeof val === 'number' && !Number.isNaN(val)
              )
            : [];
          const hasPhoto = Boolean(session.capturedImage || session.rawImage);
          const showRaw = Boolean(showRawBySession[session.id]);
          const activePhotoUrl = showRaw
            ? session.rawImage || session.capturedImage
            : session.capturedImage || session.rawImage;
          const sessionDisplayName = getSessionDisplayName(session);

          return (
            <div
              key={session.id}
              className={`bg-[#0d0d12]/80 rounded-3xl border shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all overflow-hidden ${
                isExpanded
                  ? 'border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              {/* Main Summary Row */}
              <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-base md:text-lg text-white">
                        {sessionDisplayName}
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 uppercase tracking-wider font-mono">
                        ICU: {session.icuScore != null ? `${session.icuScore}/10` : 'Not measured'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${tier.badgeClass}`}
                      >
                        {tier.label}
                      </span>
                      {session.baseLeg && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 uppercase tracking-wider">
                          {session.baseLeg === 'left' ? 'Left Base' : 'Right Base'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formatTimestamp(session.timestamp)}
                      </span>
                      {angleEntries.length > 0 && (
                        <span className="flex items-center gap-1 text-indigo-300/90 font-semibold">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          {angleEntries.length} Joint Angles
                        </span>
                      )}
                    </div>

                    {/* Preview of Top Correction / Feedback */}
                    <div className="space-y-1 pt-0.5">
                      {session.corrections.slice(0, isExpanded ? 0 : 2).map((corr, idx) => (
                        <p key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                          {isHigh ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="truncate">{corr}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.06] shrink-0">
                  <div className="text-left md:text-right">
                    <p
                      className={`text-2xl md:text-3xl font-black font-mono ${
                        isHigh
                          ? 'text-emerald-400'
                          : isMastered
                          ? 'text-indigo-400'
                          : 'text-white'
                      }`}
                    >
                      {session.accuracyScore}%
                    </p>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                      Form Accuracy
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      aria-expanded={isExpanded}
                      className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                        isExpanded
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartPracticeWithPoseId(session.poseId)}
                      className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 text-xs font-bold uppercase tracking-wider active:scale-95 transition-all shadow-sm"
                    >
                      Repractice
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Telemetry & Snapshot Detail Panel */}
              {isExpanded && (
                <div className="px-5 pb-6 md:px-6 md:pb-6 pt-4 border-t border-white/[0.08] bg-black/30 space-y-5 animate-fade-in">
                  <div
                    className={`grid grid-cols-1 ${
                      hasPhoto ? 'lg:grid-cols-12' : ''
                    } gap-5 items-start`}
                  >
                    {/* Left Column: Captured Snapshot */}
                    {hasPhoto && activePhotoUrl && (
                      <div className="lg:col-span-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-400" />
                            Captured Pose Snapshot
                          </span>
                          {session.capturedImage && session.rawImage && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowRawBySession((prev) => ({
                                  ...prev,
                                  [session.id]: !prev[session.id],
                                }))
                              }
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              {showRaw ? 'Show Skeleton Overlay' : 'Show Clean Photo'}
                            </button>
                          )}
                        </div>

                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[4/3] group">
                          <img
                            src={activePhotoUrl}
                            alt={`${sessionDisplayName} capture`}
                            className="w-full h-full object-contain bg-black"
                          />
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxImage({
                                  url: activePhotoUrl,
                                  poseName: sessionDisplayName,
                                  accuracy: session.accuracyScore,
                                  timestamp: formatTimestamp(session.timestamp),
                                })
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white border border-white/15 text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                              Fullscreen
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadSnapshot(activePhotoUrl, sessionDisplayName)
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white border border-white/15 text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Right Column: AI Coaching Summary, Joint Angles & Corrections */}
                    <div
                      className={`${
                        hasPhoto ? 'lg:col-span-7' : 'col-span-1'
                      } space-y-4`}
                    >
                      {/* AI Coaching Feedback Summary */}
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-300 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                            AI Coaching Telemetry Summary
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tier.badgeClass}`}
                          >
                            {tier.label}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-200 leading-relaxed">
                          {session.feedbackSummary ||
                            (session.corrections.length > 0
                              ? session.corrections.join(' · ')
                              : 'Form evaluated against ICU biomechanical joint standards.')}
                        </p>
                      </div>

                      {/* Measured Joint Angles Grid */}
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                            Measured Joint Angles (Degrees)
                          </span>
                          {session.baseLeg && (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                              Base Leg: {session.baseLeg === 'left' ? 'Left' : 'Right'}
                            </span>
                          )}
                        </div>

                        {angleEntries.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {angleEntries.map(([key, value]) => (
                              <div
                                key={key}
                                className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-2"
                              >
                                <span className="text-[11px] text-zinc-400 font-medium truncate">
                                  {formatAngleLabel(key)}
                                </span>
                                <span className="text-xs font-black font-mono text-white shrink-0">
                                  {Math.round(value)}°
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic">
                            Joint angle breakdown was not recorded for this session.
                          </p>
                        )}
                      </div>

                      {/* Detailed Corrections Checklist */}
                      {session.corrections.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            Form Calibration Checklist
                          </span>
                          <div className="space-y-1.5">
                            {session.corrections.map((corr, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-zinc-200 flex items-start gap-2 leading-relaxed"
                              >
                                {isHigh ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                )}
                                <span>{corr}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen Snapshot Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#0d0d12] border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h3 className="text-sm md:text-base font-extrabold text-white">
                  {lightboxImage.poseName} · {lightboxImage.accuracy}% Accuracy
                </h3>
                <p className="text-xs text-zinc-400">{lightboxImage.timestamp}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadSnapshot(lightboxImage.url, lightboxImage.poseName)
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Save Image
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  aria-label="Close Fullscreen Snapshot"
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.poseName}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
