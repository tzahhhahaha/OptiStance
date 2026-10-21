import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Video,
  VideoOff,
  Sparkles,
  Trophy,
  Lightbulb,
  Target,
  Compass,
  Play,
  Pause,
  ShieldCheck,
  Activity,
  Lock,
} from 'lucide-react';
import { Pose, MASTERY_THRESHOLD } from '../types';
import { translate as t } from '../utils/localization';
import { parseYouTubeUrl } from '../utils/parseYouTubeUrl';

interface PoseDetailScreenProps {
  pose: Pose;
  isAdmin?: boolean;
  onBack: () => void;
  onStartPractice: (pose: Pose) => void;
}

type HeroViewMode = 'photo' | 'video';

export const PoseDetailScreen: React.FC<PoseDetailScreenProps> = ({
  pose,
  isAdmin = false,
  onBack,
  onStartPractice
}) => {
  const [viewMode, setViewMode] = useState<HeroViewMode>('photo');
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const youtubeInfo = pose.videoUrl ? parseYouTubeUrl(pose.videoUrl) : null;
  const hasDemoVideo = Boolean(
    (youtubeInfo?.isValid && youtubeInfo.data) ||
    (pose.videoUrl && pose.videoUrl.trim().length > 0)
  );

  const isMastered = pose.masteryPercentage >= MASTERY_THRESHOLD;
  const isZero = pose.masteryPercentage === 0;

  const idealAngleEntries = Object.entries(pose.idealAngles || {});

  return (
    <div className="min-h-screen bg-[#050507] text-[#E0E0E6] pb-36 font-sans">
      {/* Top App Bar - Immersive UI */}
      <header className="sticky top-0 w-full z-40 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-16 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Library')}</span>
        </button>
        <h1 className="font-extrabold text-sm md:text-base text-white uppercase tracking-[0.2em]">
          {t('Pose Analysis')}
        </h1>
        <div className="w-20" /> {/* Balance spacer */}
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 flex flex-col gap-6">
        {/* Hero Visual Container */}
        <div className="flex flex-col gap-3">
          {/* Mode Switcher Tabs - Streamlined 2-tab layout */}
          <div className="flex items-center justify-between p-1 bg-white/[0.04] border border-white/10 rounded-2xl">
            <button
              onClick={() => setViewMode('photo')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'photo'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t('Stance Photo')}</span>
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                viewMode === 'video'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{t('Video Tutorial')}</span>
              {!hasDemoVideo && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-400 font-semibold">
                  {t('Unavailable')}
                </span>
              )}
            </button>
          </div>

          <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-black/60 aspect-[4/3] border border-white/10">
            {/* View 1: Standard Stance Photo */}
            {viewMode === 'photo' && (
              <>
                <img
                  src={pose.imageUrl}
                  alt={pose.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 right-4 bg-black/70 border border-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('ICU Standards Calibrated')}</span>
                </div>
              </>
            )}

            {/* View 2: Video Tutorial (YouTube Embed OR Direct MP4 Video with Slow-Mo & Scrubbing) */}
            {viewMode === 'video' && (
              <div className="w-full h-full relative bg-[#090910] flex flex-col items-center justify-center overflow-hidden">
                {youtubeInfo?.isValid && youtubeInfo.data ? (
                  /* YouTube Tutorial Embed */
                  <iframe
                    src={youtubeInfo.data.embedUrl}
                    title={`${pose.name} tutorial`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : pose.videoUrl ? (
                  /* Direct MP4 / WebM Video Player */
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el) el.playbackRate = playbackRate;
                      }}
                      src={pose.videoUrl}
                      autoPlay={isPlayingDemo}
                      loop
                      playsInline
                      onTimeUpdate={(e) => {
                        const target = e.currentTarget;
                        if (target.duration) {
                          setVideoProgress((target.currentTime / target.duration) * 100);
                          setVideoDuration(target.duration);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />

                    {/* Demonstration Video Controls Overlay */}
                    <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 flex flex-col gap-2 shadow-2xl">
                      {/* Scrub Slider */}
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={videoProgress}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value);
                            setVideoProgress(pct);
                            if (videoRef.current && videoDuration) {
                              videoRef.current.currentTime = (pct / 100) * videoDuration;
                            }
                          }}
                          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      {/* Playback & Slow-Mo Controls */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (isPlayingDemo) videoRef.current.pause();
                              else void videoRef.current.play();
                              setIsPlayingDemo(!isPlayingDemo);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          {isPlayingDemo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isPlayingDemo ? 'Pause' : 'Play'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {[1.0, 0.5, 0.25].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => {
                                setPlaybackRate(rate);
                                if (videoRef.current) videoRef.current.playbackRate = rate;
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                playbackRate === rate
                                  ? 'bg-amber-500 text-black shadow-sm'
                                  : 'bg-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              {rate === 1.0 ? '1.0x' : `${rate}x Slow`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Demo Unavailable Fallback Screen */
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-[#131320] to-[#07070d]">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 shadow-inner">
                      <VideoOff className="w-7 h-7 text-zinc-500" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">
                      {t('Video Demonstration')}
                    </span>
                    <h3 className="text-base font-bold text-white mb-1.5">
                      {t('Demo Currently Unavailable')}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-4">
                      {t('No video demonstration has been uploaded for this pose yet. Refer to the reference photo and coaching cues below.')}
                    </p>

                    {/* Technique Quick Cue if available */}
                    {(pose.sampleCorrectionMessage || pose.practiceTips?.[0]?.text) && (
                      <div className="max-w-xs w-full bg-indigo-950/40 border border-indigo-500/20 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-left">
                        <span className="text-[9px] font-extrabold text-indigo-300 uppercase tracking-wider block mb-0.5">
                          {t('Key Technique Cue')}
                        </span>
                        <p className="text-[11px] text-zinc-300 font-medium line-clamp-2">
                          {pose.sampleCorrectionMessage || pose.practiceTips[0]?.text}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title and Category Card */}
          <div className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
                  {t(pose.category)}
                </span>
                {pose.isLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                    <Lock className="w-2.5 h-2.5" />
                    {isAdmin ? 'Locked for athletes' : t('Currently Unavailable')}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {pose.name}
              </h2>
            </div>
            <div className="bg-white/5 border border-white/10 text-zinc-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              {t(pose.difficulty)}
            </div>
          </div>
        </div>

        {/* Biomechanical Target Angles Grid */}
        {idealAngleEntries.length > 0 && (
          <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
            <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('Target Joint Kinematics')}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {idealAngleEntries.map(([jointKey, angleVal], idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold text-zinc-400 capitalize tracking-wider mb-1">
                    {jointKey.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {angleVal}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-3">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {t('Description')}
          </h3>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            {pose.description}
          </p>
        </section>

        {/* Practice Tips Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
            {t('Practice Tips & Form Cues')}
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

        {/* Common Pitfalls Card */}
        {pose.commonMistakes && pose.commonMistakes.length > 0 && (
          <section className="bg-[#0d0d12]/80 border border-rose-500/20 rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
            <h3 className="text-[10px] font-extrabold text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('Common Pitfalls to Avoid')}</span>
            </h3>
            <ul className="space-y-2.5">
              {pose.commonMistakes.map((mistake, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-300 bg-rose-950/10 border border-rose-500/15 p-3 rounded-2xl"
                >
                  <span className="text-rose-400 font-black shrink-0">•</span>
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ICU Standard Guideline Citation */}
        {pose.icuStandardGuideline && (
          <section className="bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border border-indigo-500/20 rounded-3xl p-6 backdrop-blur-xl space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.2em]">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{t('Official Rule Standard')}</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed italic">
              &ldquo;{pose.icuStandardGuideline}&rdquo;
            </p>
          </section>
        )}

        {/* Mastery Level Gauge Card */}
        <section className="bg-[#0d0d12]/80 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative overflow-hidden">
          <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] w-full text-left flex items-center gap-2 mb-6">
            <Trophy className="w-3.5 h-3.5 text-indigo-400" />
            {t('Kinematic Mastery Level')}
          </h3>

          {/* Circle Visual */}
          <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                className="stroke-white/10"
                strokeWidth="8"
              />
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
              ? t("You've mastered this pose! Keep practicing to maintain competition-ready perfection.")
              : isZero
              ? t("You haven't practiced this pose yet.")
              : t('Form estimate recorded. Complete more live camera reps to build a reliable trend.')}
          </p>

          {/* Next Goal / Target Milestone */}
          <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t('Next Form Goal')}</p>
                <p className="text-[11px] text-zinc-400">
                  {isMastered
                    ? t('Maintain 5-session streak at 95%+ accuracy')
                    : t('Complete 3 live camera sessions to reach next milestone')}
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
          {pose.isLocked && !isAdmin ? (
            <div className="flex flex-col items-center gap-2">
              <button
                disabled
                className="w-full py-4 px-6 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-sm md:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 cursor-not-allowed opacity-90 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              >
                <Lock className="w-5 h-5 text-amber-300" />
                <span>{t('Currently Unavailable')}</span>
              </button>
              <p className="text-[11px] text-zinc-400 font-medium text-center">
                {t('This pose is currently unavailable. Locked by admin.')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {pose.isLocked && isAdmin && (
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-amber-300" />
                  <span>Admin Access (Locked for athletes)</span>
                </p>
              )}
              <button
                onClick={() => onStartPractice(pose)}
                className="w-full py-4 px-6 rounded-2xl bg-white text-black font-extrabold text-sm md:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-zinc-200 active:scale-[0.98] transition-all relative overflow-hidden group"
              >
                <Video className="w-5 h-5 fill-current" />
                <span>{t('Start Practice Session')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
