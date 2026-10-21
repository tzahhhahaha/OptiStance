import React, { useState } from 'react';
import { Search, Sparkles, Target, Lock, X } from 'lucide-react';
import { Pose, PoseCategory, PoseDifficulty, MASTERY_THRESHOLD } from '../types';
import { PoseList } from './PoseList';
import { translate as t } from '../utils/localization';

interface PoseLibraryScreenProps {
  poses: Pose[];
  isVerified: boolean;
  isAdmin?: boolean;
  onSelectPose: (pose: Pose) => void;
  onStartPractice: (pose: Pose) => void;
}

export const PoseLibraryScreen: React.FC<PoseLibraryScreenProps> = ({
  poses,
  isVerified,
  isAdmin = false,
  onSelectPose,
  onStartPractice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  // Pose the user tapped that is gated behind verification.
  const [lockedPose, setLockedPose] = useState<Pose | null>(null);

  const categories: (string | PoseCategory)[] = ['All', 'Pom Motion', 'Stunts', 'Jumps'];
  const difficulties: (string | PoseDifficulty)[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const normalize = (text: string) => text.toLowerCase().replace(/[-_\s]+/g, ' ');

  const filteredPoses = poses.filter((pose) => {
    const trimmed = searchQuery.trim().toLowerCase();
    const normalizedQ = normalize(trimmed);

    const matchesSearch =
      !trimmed ||
      pose.name.toLowerCase().includes(trimmed) ||
      normalize(pose.name).includes(normalizedQ) ||
      pose.description.toLowerCase().includes(trimmed) ||
      pose.category.toLowerCase().includes(trimmed) ||
      pose.difficulty.toLowerCase().includes(trimmed);

    const matchesCategory = selectedCategory === 'All' || pose.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || pose.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Calculate high-level stats
  const totalPoses = poses.length;
  const masteredCount = poses.filter((p) => p.masteryPercentage >= MASTERY_THRESHOLD).length;
  const avgMastery = Math.round(
    poses.reduce((acc, curr) => acc + curr.masteryPercentage, 0) / (totalPoses || 1)
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32">
      {/* Hero Welcome Banner - Immersive UI */}
      <div className="relative rounded-3xl overflow-hidden mb-8 p-6 md:p-8 bg-gradient-to-br from-indigo-950/60 via-[#0d0d12]/90 to-rose-950/40 border border-white/10 backdrop-blur-2xl shadow-[0_0_60px_rgba(99,102,241,0.15)]">
        {/* Background glow flares */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-rose-500/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>ICU Kinematic Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
              {t('Master Every Stunt & Motion')}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Landmark-based pose estimates for practice feedback. ICU compliance still requires qualified coach review.
            </p>
          </div>

          {/* Quick Stats Bento in Hero */}
          <div className="grid grid-cols-3 gap-3 bg-white/[0.03] border border-white/10 backdrop-blur-xl p-4 rounded-2xl">
            <div className="text-center px-2">
              <p className="text-xl md:text-2xl font-black text-white font-mono">{totalPoses}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">{t('Total Poses')}</p>
            </div>
            <div className="text-center px-2 border-x border-white/10">
              <p className="text-xl md:text-2xl font-black text-emerald-400 font-mono">{masteredCount}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">{t('Mastered')}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xl md:text-2xl font-black text-indigo-300 font-mono">{avgMastery}%</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">{t('Avg Form')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search poses (e.g., T-Motion, High V, Liberty, Half-T)...')}
            className="w-full pl-12 pr-11 py-3.5 rounded-2xl bg-[#0f0f13]/80 border border-white/10 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-sm text-white placeholder:text-zinc-600 backdrop-blur-xl shadow-inner transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0 mr-1">
            {t('Category')}:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {t(cat)}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0 mr-1">
            {t('Level')}:
          </span>
          {difficulties.map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                selectedDifficulty === diff
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {t(diff)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Poses */}
      {filteredPoses.length === 0 ? (
        <div className="text-center py-16 bg-[#0f0f13]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          <Target className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-white mb-1">{t('No poses found')}</h3>
          <p className="text-sm text-zinc-500">
            {t('Try adjusting your search query or filters.')}
          </p>
        </div>
      ) : (
        <PoseList
          poses={filteredPoses}
          isVerified={isVerified}
          isAdmin={isAdmin}
          onSelectPose={onSelectPose}
          onStartPractice={onStartPractice}
          onLockedPoseClick={(pose) => setLockedPose(pose)}
        />
      )}

      {/* Verification required modal (gated pose tapped while unverified) */}
      {lockedPose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setLockedPose(null)}
        >
          <div
            className="relative w-full max-w-sm bg-[#0e0e14] border border-white/10 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLockedPose(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            {lockedPose.isLocked ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest mb-3">
                  <Lock className="w-3 h-3" />
                  <span>{t('Currently Unavailable')}</span>
                </div>
                <h3 className="text-lg font-black text-white mb-2">{t('Pose Currently Unavailable')}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed mb-5">
                  <span className="font-semibold text-white">{lockedPose.name}</span> has been temporarily locked by your admin. Please check back later or choose another active pose.
                </p>
                <button
                  onClick={() => setLockedPose(null)}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all"
                >
                  {t('Got it')}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black text-white mb-2">{t('Verification Required')}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                  <span className="font-semibold text-zinc-200">{lockedPose.name}</span> is an{' '}
                  {lockedPose.difficulty.toLowerCase()} pose. Verify your athlete account to unlock Intermediate and
                  Advanced poses in the gallery and AI camera.
                </p>
                <button
                  onClick={() => setLockedPose(null)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all"
                >
                  {t('Got it')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

