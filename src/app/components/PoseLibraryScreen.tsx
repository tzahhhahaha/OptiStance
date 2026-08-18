import React, { useState } from 'react';
import { Search, Play, CheckCircle2, Sparkles, Target, Zap } from 'lucide-react';
import { Pose, PoseCategory, PoseDifficulty } from '../types';

interface PoseLibraryScreenProps {
  poses: Pose[];
  onSelectPose: (pose: Pose) => void;
  onStartPractice: (pose: Pose) => void;
}

export const PoseLibraryScreen: React.FC<PoseLibraryScreenProps> = ({
  poses,
  onSelectPose,
  onStartPractice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const categories: (string | PoseCategory)[] = ['All', 'Pom Motion', 'Stunts', 'Jumps'];
  const difficulties: (string | PoseDifficulty)[] = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredPoses = poses.filter((pose) => {
    const matchesSearch =
      pose.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pose.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pose.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || pose.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || pose.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Calculate high-level stats
  const totalPoses = poses.length;
  const masteredCount = poses.filter((p) => p.masteryPercentage >= 90).length;
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
              Master Every Stunt & Motion
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Calibrated against International Cheer Union angles for sub-degree competition form execution.
            </p>
          </div>

          {/* Quick Stats Bento in Hero */}
          <div className="grid grid-cols-3 gap-3 bg-white/[0.03] border border-white/10 backdrop-blur-xl p-4 rounded-2xl">
            <div className="text-center px-2">
              <p className="text-xl md:text-2xl font-black text-white font-mono">{totalPoses}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Total Poses</p>
            </div>
            <div className="text-center px-2 border-x border-white/10">
              <p className="text-xl md:text-2xl font-black text-emerald-400 font-mono">{masteredCount}</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Mastered</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xl md:text-2xl font-black text-indigo-300 font-mono">{avgMastery}%</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Avg Form</p>
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
            placeholder="Search poses (e.g., T-Motion, High V, Liberty, Half-T)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#0f0f13]/80 border border-white/10 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-sm text-white placeholder:text-zinc-600 backdrop-blur-xl shadow-inner transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0 mr-1">
            Category:
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
              {cat}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] shrink-0 mr-1">
            Level:
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
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Poses */}
      {filteredPoses.length === 0 ? (
        <div className="text-center py-16 bg-[#0f0f13]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          <Target className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-white mb-1">No poses found</h3>
          <p className="text-sm text-zinc-500">
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPoses.map((pose) => {
            const isMastered = pose.masteryPercentage >= 90;
            return (
              <div
                key={pose.id}
                onClick={() => onSelectPose(pose)}
                className="group bg-[#0d0d12]/80 hover:bg-[#121218]/90 rounded-3xl border border-white/[0.08] hover:border-indigo-500/40 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_40px_rgba(99,102,241,0.18)] backdrop-blur-xl"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

