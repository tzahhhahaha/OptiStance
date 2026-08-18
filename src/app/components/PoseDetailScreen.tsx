import React from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Video, Sparkles, Trophy, Lightbulb, Target } from 'lucide-react';
import { Pose } from '../types';

interface PoseDetailScreenProps {
  pose: Pose;
  onBack: () => void;
  onStartPractice: (pose: Pose) => void;
}

export const PoseDetailScreen: React.FC<PoseDetailScreenProps> = ({
  pose,
  onBack,
  onStartPractice
}) => {
  const isMastered = pose.masteryPercentage >= 90;
  const isZero = pose.masteryPercentage === 0;

  return (
    <div className="min-h-screen bg-[#050507] text-[#E0E0E6] pb-36 font-sans">
      {/* Top App Bar - Immersive UI */}
      <header className="sticky top-0 w-full z-40 bg-[#050507]/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-18 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Library</span>
        </button>
        <h1 className="font-extrabold text-sm md:text-base text-white uppercase tracking-[0.2em]">
          Pose Analysis
        </h1>
        <div className="w-20" /> {/* Balance spacer */}
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 flex flex-col gap-6">
        {/* Hero Image Container */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-black/60 aspect-[4/3] border border-white/10">
            <img
              src={pose.imageUrl}
              alt={pose.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-4 right-4 bg-black/70 border border-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              ICU Standards Calibrated
            </div>
          </div>

          {/* Title and Category Card */}
          <div className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1.5 block">
                {pose.category}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {pose.name}
              </h2>
            </div>
            <div className="bg-white/5 border border-white/10 text-zinc-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              {pose.difficulty}
            </div>
          </div>
        </div>

        {/* Description Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-3">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Description
          </h3>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            {pose.description}
          </p>
        </section>

        {/* Practice Tips Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
            Practice Tips & Form Cues
          </h3>
          <ul className="space-y-3">
            {pose.practiceTips.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-zinc-200 bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl"
              >
                {tip.type === 'check' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{tip.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Mastery Level Gauge Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative overflow-hidden">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] w-full text-left flex items-center gap-2 mb-6">
            <Trophy className="w-3.5 h-3.5 text-indigo-400" />
            Kinematic Mastery Level
          </h3>

          {/* Circle Visual */}
          <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                className="stroke-white/10"
                strokeWidth="8"
              />
              {/* Progress Ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                className={
                  isMastered
                    ? 'stroke-emerald-400'
                    : isZero
                    ? 'stroke-white/5'
                    : 'stroke-indigo-400'
                }
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * pose.masteryPercentage) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl font-black font-mono ${
                  isMastered
                    ? 'text-emerald-400'
                    : 'text-white'
                }`}
              >
                {pose.masteryPercentage}%
              </span>
            </div>
          </div>

          <p className="text-sm font-medium text-zinc-400 max-w-sm mb-5">
            {isMastered
              ? "You've mastered this pose! Keep practicing to maintain competition-ready perfection."
              : isZero
              ? "You haven't practiced this pose yet."
              : "Sub-degree form detected. Complete more live camera reps to lock in 100% precision."}
          </p>

          {/* Next Goal / Target Milestone */}
          <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Next Form Goal</p>
                <p className="text-[11px] text-zinc-400">
                  {isMastered
                    ? 'Maintain 5-session streak at 95%+ accuracy'
                    : 'Complete 3 live camera sessions to reach next milestone'}
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-300 font-mono">
              +{pose.points} XP
            </span>
          </div>
        </section>
      </main>

      {/* Fixed Bottom Action Bar - Immersive UI */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#050507]/90 backdrop-blur-2xl border-t border-white/[0.08] p-4 pb-[max(16px,env(safe-area-inset-bottom))] flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="w-full max-w-md">
          <button
            onClick={() => onStartPractice(pose)}
            className="w-full py-4 px-6 rounded-2xl bg-white text-black font-extrabold text-sm md:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-zinc-200 active:scale-[0.98] transition-all relative overflow-hidden group"
          >
            <Video className="w-5 h-5 fill-current" />
            <span>Start Practice Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

