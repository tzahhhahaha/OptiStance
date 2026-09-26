import React from 'react';
import { CheckCircle2, Lock, Play } from 'lucide-react';
import { Pose, MASTERY_THRESHOLD } from '../types';

interface PoseCardProps {
  pose: Pose;
  isLocked: boolean;
  onSelect: (pose: Pose) => void;
  onStartPractice: (pose: Pose) => void;
  onLockedClick: (pose: Pose) => void;
}

/**
 * A single pose card in the gallery. When `isLocked` (unverified athlete +
 * non-beginner pose), a semi-transparent overlay dims the card and shows a
 * lock + "Verify to Unlock". The overlay is `pointer-events-none` — clicks
 * fall through to the card, which routes them to `onLockedClick` so the
 * gallery can explain what verification unlocks.
 */
export const PoseCard: React.FC<PoseCardProps> = ({
  pose,
  isLocked,
  onSelect,
  onStartPractice,
  onLockedClick
}) => {
  const isMastered = pose.masteryPercentage >= MASTERY_THRESHOLD;

  const handleClick = () => {
    if (isLocked) {
      onLockedClick(pose);
    } else {
      onSelect(pose);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative bg-[#0d0d12]/80 hover:bg-[#121218]/90 rounded-3xl border border-white/[0.08] hover:border-indigo-500/40 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_40px_rgba(99,102,241,0.18)] backdrop-blur-xl"
    >
      {/* Pose Image with Aspect Ratio */}
      <div className="relative aspect-[4/3] bg-black/40 overflow-hidden">
        <img
          src={pose.imageUrl}
          alt={pose.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-transparent to-transparent opacity-90" />

        {/* Difficulty Tag */}
        <div className="absolute top-3 right-3 bg-black/70 border border-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-zinc-200">
          {pose.difficulty}
        </div>

        {/* Category Pill on Image */}
        <div className="absolute bottom-3 left-3 bg-black/60 border border-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-semibold text-white tracking-wide">
          {pose.category}
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
              {pose.name}
            </h3>
            {isMastered && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mastered
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
            {pose.description}
          </p>
        </div>

        {/* Mastery Ring & Action */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mini Progress Circle */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-white/10"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className={
                    isMastered
                      ? 'stroke-emerald-400'
                      : pose.masteryPercentage > 0
                      ? 'stroke-indigo-400'
                      : 'stroke-transparent'
                  }
                  strokeWidth="3"
                  strokeDasharray="88"
                  strokeDashoffset={88 - (88 * pose.masteryPercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-white font-mono">
                {pose.masteryPercentage}%
              </span>
            </div>
            <span className="text-xs font-medium text-zinc-400">
              {pose.masteryPercentage === 100
                ? '100% Form'
                : pose.masteryPercentage === 0
                ? 'Not practiced'
                : `${pose.masteryPercentage}% Form`}
            </span>
          </div>

          {isLocked ? (
            <span className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked</span>
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartPractice(pose);
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Practice</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification lock overlay — dims the whole card. pointer-events-none so
          clicks pass through to the card handler above. */}
      {isLocked && (
        <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
            <Lock className="w-6 h-6 text-amber-300" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white">
            Verify to Unlock
          </span>
          <span className="text-[10px] text-zinc-300/80 font-medium">Intermediate & Advanced poses</span>
        </div>
      )}
    </div>
  );
};