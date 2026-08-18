import React, { useState } from 'react';
import {
  User,
  Award,
  Trophy,
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  Edit3,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  Play,
  Share2,
  Lock,
  Star,
  Camera,
  X
} from 'lucide-react';
import { UserProfile, Pose, PracticeSession } from '../types';

interface ProfileScreenProps {
  user: UserProfile;
  poses: Pose[];
  sessions: PracticeSession[];
  onUpdateUser: (newUser: Partial<UserProfile>) => void;
  onStartPracticeWithPoseId: (poseId: string) => void;
  onNavigateToSettings?: () => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'precision' | 'streak' | 'endurance' | 'mastery';
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  poses,
  sessions,
  onUpdateUser,
  onStartPracticeWithPoseId,
  onNavigateToSettings
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'achievements'>('overview');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit profile form state
  const [editName, setEditName] = useState(user.name || '');
  const [editRole, setEditRole] = useState(user.role || 'Cheer Athlete');
  const [editEmail, setEditEmail] = useState(user.email || '');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onUpdateUser({
      name: editName.trim(),
      role: editRole.trim(),
      email: editEmail.trim()
    });

    setShowEditModal(false);
    showToast('Athlete profile updated successfully!');
  };

  // Telemetry & Progress Calculations
  const totalMastered = poses.filter((p) => p.masteryPercentage >= 80).length;
  const avgAccuracy =
    sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.accuracyScore, 0) / sessions.length)
      : Math.round(poses.reduce((acc, p) => acc + p.masteryPercentage, 0) / poses.length);

  const totalPracticeMins =
    user.totalPracticeMinutes ||
    Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60) + 120;

  const totalSessionsCount = Math.max(user.totalSessions, sessions.length);

  // Achievements Definition with dynamic progress
  const achievements: Achievement[] = [
    {
      id: 'precision_master',
      title: 'ICU Precision Master',
      description: 'Score 90%+ kinematic accuracy in any stunt routine',
      category: 'precision',
      tier: 'gold',
      icon: '🏆',
      unlocked: sessions.some((s) => s.accuracyScore >= 90) || avgAccuracy >= 85,
      unlockedDate: 'Unlocked Today',
      progress: Math.min(avgAccuracy, 90),
      maxProgress: 90,
      xpReward: 500
    },
    {
      id: 'liberty_specialist',
      title: 'Liberty Specialist',
      description: 'Master the iconic Liberty flyer pose with 85%+ stability',
      category: 'mastery',
      tier: 'gold',
      icon: '🎯',
      unlocked: (poses.find((p) => p.id === 'liberty')?.masteryPercentage || 0) >= 80,
      unlockedDate: 'Unlocked',
      progress: poses.find((p) => p.id === 'liberty')?.masteryPercentage || 0,
      maxProgress: 85,
      xpReward: 400
    },
    {
      id: 'five_day_streak',
      title: 'Consistency Dynamo',
      description: 'Maintain a 5-day active training & biomechanical scan streak',
      category: 'streak',
      tier: 'silver',
      icon: '🔥',
      unlocked: true,
      unlockedDate: 'Active',
      progress: 5,
      maxProgress: 5,
      xpReward: 350
    },
    {
      id: 'stability_star',
      title: 'Zero-Wobble Core',
      description: 'Maintain steady stunt balance without red-zone joint drift',
      category: 'precision',
      tier: 'diamond',
      icon: '⚡',
      unlocked: true,
      unlockedDate: 'Unlocked',
      progress: 10,
      maxProgress: 10,
      xpReward: 600
    },
    {
      id: 'centurion_scans',
      title: 'Centurion Telemetry',
      description: 'Log 25 full biomechanical AI vision camera scans',
      category: 'endurance',
      tier: 'diamond',
      icon: '🚀',
      unlocked: totalSessionsCount >= 25,
      unlockedDate: totalSessionsCount >= 25 ? 'Unlocked' : undefined,
      progress: Math.min(totalSessionsCount, 25),
      maxProgress: 25,
      xpReward: 750
    },
    {
      id: 'grand_champion',
      title: 'Grand Stunt Champion',
      description: 'Master all 8 stunt poses in the OptiStance syllabus',
      category: 'mastery',
      tier: 'diamond',
      icon: '🌟',
      unlocked: totalMastered >= 8,
      progress: totalMastered,
      maxProgress: 8,
      xpReward: 1000
    },
    {
      id: 'stamina_elite',
      title: 'Endurance Pro',
      description: 'Log over 150 minutes of active kinematic stunt practice',
      category: 'endurance',
      tier: 'silver',
      icon: '⏱️',
      unlocked: totalPracticeMins >= 150,
      unlockedDate: totalPracticeMins >= 150 ? 'Unlocked' : undefined,
      progress: Math.min(totalPracticeMins, 150),
      maxProgress: 150,
      xpReward: 450
    },
    {
      id: 'safety_first',
      title: 'ICU Protocol Guardian',
      description: 'Execute 10 stunt routines meeting full ICU angle standards',
      category: 'precision',
      tier: 'bronze',
      icon: '🛡️',
      unlocked: true,
      unlockedDate: 'Unlocked',
      progress: 10,
      maxProgress: 10,
      xpReward: 250
    }
  ];

  const filteredAchievements = achievements.filter((ach) => {
    if (achievementFilter === 'unlocked') return ach.unlocked;
    if (achievementFilter === 'locked') return !ach.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-8 animate-fade-in text-[#E0E0E6]">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500/90 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Athlete Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0e0e14]/90 border border-white/[0.08] p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Avatar & Core Identity */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-rose-500 p-0.5 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                <div className="w-full h-full bg-[#09090e] rounded-[22px] flex items-center justify-center text-white font-black text-2xl md:text-3xl shadow-inner">
                  {(user.name || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-[#09090e]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {user.name || 'Alex Morgan'}
                </h1>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  {user.role || 'Cheer Athlete'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-medium mb-2">
                {user.email || 'athlete@optistance.app'}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">5-Day</span> Streak
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300">
                  <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-bold">{unlockedCount}</span> Badges Unlocked
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => onStartPracticeWithPoseId('liberty')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white text-xs font-extrabold shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Quick Practice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Overview & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'progress'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-4 h-4 text-purple-400" />
            <span>Pose Progress ({totalMastered}/{poses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'achievements'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Achievements ({unlockedCount}/{achievements.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & TELEMETRY STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Average Accuracy */}
            <div className="p-5 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Kinematic Accuracy</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{avgAccuracy}%</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">ICU Rubric Evaluation</p>
            </div>

            {/* Metric 2: Poses Mastered */}
            <div className="p-5 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Poses Mastered</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{totalMastered}</span>
                <span className="text-xs text-zinc-400">/ {poses.length}</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">&gt;80% Proficiency Score</p>
            </div>

            {/* Metric 3: Total Practice Sessions */}
            <div className="p-5 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Recorded Sessions</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{totalSessionsCount}</span>
                <span className="text-xs text-purple-300 font-medium">Scans</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">AI Motion Telemetry</p>
            </div>

            {/* Metric 4: Total Practice Time */}
            <div className="p-5 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Mat Practice Time</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{totalPracticeMins}</span>
                <span className="text-xs text-zinc-400">mins</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">High-Frequency Tracking</p>
            </div>
          </div>

          {/* Biomechanical Skill Matrix & Top Stunt Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stunt Proficiency Radar / Progress Bar List */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span>Top Stunt Kinematics</span>
                  </h3>
                  <p className="text-xs text-zinc-400">Real-time angle precision across syllabus</p>
                </div>
                <button
                  onClick={() => setActiveTab('progress')}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                {poses.slice(0, 4).map((pose) => (
                  <div
                    key={pose.id}
                    onClick={() => onStartPracticeWithPoseId(pose.id)}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-xs">
                          {pose.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {pose.name}
                          </p>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                            {pose.category} • {pose.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white">{pose.masteryPercentage}%</span>
                        <span className="block text-[9px] text-zinc-500">
                          {pose.masteryPercentage >= 80 ? 'Mastered' : 'In Progress'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pose.masteryPercentage >= 80
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${pose.masteryPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Badges Showcase */}
            <div className="p-6 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Featured Badges</span>
                  </h3>
                  <span className="text-xs font-extrabold text-amber-400">
                    {unlockedCount}/{achievements.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {achievements.slice(0, 3).map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shadow-inner shrink-0">
                        {ach.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{ach.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{ach.description}</p>
                      </div>
                      {ach.unlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-500">
                          {ach.progress}/{ach.maxProgress}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('achievements')}
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all text-center"
              >
                View All Trophies &amp; Badges
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSE & STUNT MASTERY PROGRESS */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c0c12]/90 border border-white/[0.08] p-5 rounded-3xl">
            <div>
              <h2 className="text-lg font-black text-white">Stunt &amp; Pose Syllabus Progress</h2>
              <p className="text-xs text-zinc-400">
                Track your joint angle precision and ICU rubric scores for every stunt.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                {totalMastered} Mastered
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                {poses.length - totalMastered} In Progress
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {poses.map((pose) => {
              const isMastered = pose.masteryPercentage >= 80;
              return (
                <div
                  key={pose.id}
                  className="p-5 rounded-3xl bg-[#0c0c12]/90 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {pose.name}
                          </h4>
                          {isMastered && (
                            <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                          {pose.category} • {pose.difficulty}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-lg font-black ${
                            isMastered ? 'text-emerald-400' : 'text-indigo-400'
                          }`}
                        >
                          {pose.masteryPercentage}%
                        </span>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Mastery</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {pose.description}
                    </p>

                    {/* Progress Track */}
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMastered
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500'
                        }`}
                        style={{ width: `${pose.masteryPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="text-[10px] text-zinc-500 font-mono">
                      <span>ICU Benchmark: </span>
                      <span className="text-zinc-300 font-bold">{pose.points} pts</span>
                    </div>

                    <button
                      onClick={() => onStartPracticeWithPoseId(pose.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Train Stunt</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACHIEVEMENTS & TROPHIES SHOWCASE */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {/* Header Banner & Level Bar */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-rose-950/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <div className="w-full h-full bg-[#0b0b10] rounded-[14px] flex items-center justify-center text-amber-400 text-2xl">
                  🏆
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">Cheer Honors &amp; Trophies</h2>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Level 4 Elite
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Complete telemetry challenges, master stunts, and unlock ICU badges.
                </p>
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl">
              {(['all', 'unlocked', 'locked'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAchievementFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    achievementFilter === filter
                      ? 'bg-white/10 text-white shadow-inner'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAchievements.map((ach) => {
              const tierBorder =
                ach.tier === 'diamond'
                  ? 'border-cyan-500/30 bg-cyan-950/10'
                  : ach.tier === 'gold'
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : ach.tier === 'silver'
                  ? 'border-slate-400/30 bg-slate-900/20'
                  : 'border-orange-500/20 bg-orange-950/10';

              return (
                <div
                  key={ach.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${tierBorder} ${
                    ach.unlocked ? 'opacity-100' : 'opacity-70 grayscale-[30%]'
                  }`}
                >
                  {/* Tier Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                      {ach.icon}
                    </div>

                    {ach.unlocked ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] font-bold">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{ach.title}</h4>
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{ach.description}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                      <span>Progress</span>
                      <span className="text-white font-bold">
                        {ach.progress} / {ach.maxProgress}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full ${
                          ach.unlocked
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                            : 'bg-indigo-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                      <span className="uppercase tracking-wider font-extrabold text-amber-400 font-mono">
                        +{ach.xpReward} XP
                      </span>
                      <span className="text-zinc-500 capitalize">{ach.tier} Tier</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-black text-white">Edit Athlete Profile</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Update your display name, specialty role, and email address.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none rounded-xl text-xs text-white"
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Cheer Specialty / Role
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none rounded-xl text-xs text-white"
                  placeholder="e.g. Top Flyer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none rounded-xl text-xs text-white"
                  placeholder="athlete@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
