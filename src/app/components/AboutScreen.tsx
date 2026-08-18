import React from 'react';
import {
  ArrowLeft,
  Info,
  Cpu,
  Star,
  Video,
  History,
  Share2,
  Trophy,
  Heart,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { TabType } from './BottomNavBar';

interface AboutScreenProps {
  onBack: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onNavigateTab }) => {
  return (
    <div className="min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col font-sans">
      {/* Header Section */}
      <header className="sticky top-0 w-full z-40 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-16 flex items-center justify-between transition-all">
        <button
          onClick={onBack}
          aria-label="Back to Navigation Drawer"
          className="flex items-center gap-2 py-2 px-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-200 hover:text-white transition-all group active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-bold tracking-wide">Back to Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-widest text-zinc-400 uppercase">About OptiStance</span>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-28 overflow-y-auto">
        {/* About Card */}
        <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 md:p-8 col-span-1 md:col-span-2 relative overflow-hidden border border-white/10 backdrop-blur-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-3">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Platform Overview</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
            About OptiStance
          </h2>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-2xl">
            OptiStance is engineered for high-intensity cheerleading telemetry and stunt safety. Born from the need to bridge the gap between traditional coaching and modern motion tracking, it provides a comprehensive real-time biomechanical analysis suite to perfect form, ensure flyer safety, and hit routine milestones flawlessly.
          </p>
        </section>

        {/* Technology Core Card */}
        <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 border border-white/[0.08] backdrop-blur-xl">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-5 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Technology Core
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">MediaPipe Pose Detection</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                  Real-time kinematic analysis utilizing cutting-edge ML inference models for sub-millimeter joint vector tracking.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">ICU Standards Compliance</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                  Automated scoring heuristics calibrated against official International Cheer Union Level 1–6 competition rubrics.
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* Key Features Card */}
        <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 border border-white/[0.08] backdrop-blur-xl">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-5 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-rose-400" />
            Key Capabilities
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => onNavigateTab('camera')}
              className="bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                  Live Kinematic Video Analysis
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold group-hover:text-indigo-400">Open &rarr;</span>
            </button>
            <button
              onClick={() => onNavigateTab('history')}
              className="bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                  Practice Session History &amp; Telemetry
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold group-hover:text-emerald-400">Open &rarr;</span>
            </button>
            <button
              onClick={() => onNavigateTab('history')}
              className="bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                  Coach Export &amp; Scorecard Reports
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold group-hover:text-amber-400">Open &rarr;</span>
            </button>
            <button
              onClick={() => onNavigateTab('library')}
              className="bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                  Interactive Cheer Pose Library
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold group-hover:text-rose-400">Open &rarr;</span>
            </button>
          </div>
        </section>

        {/* Built With Card */}
        <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 col-span-1 md:col-span-2 border border-white/[0.08] backdrop-blur-xl text-center">
          <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Engineered Stack
          </h2>
          <div className="flex flex-wrap justify-center gap-2.5">
            <span className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-2xl text-xs font-semibold">
              React 19
            </span>
            <span className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-2xl text-xs font-semibold">
              MediaPipe ML
            </span>
            <span className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-2xl text-xs font-semibold">
              Tailwind CSS v4
            </span>
            <span className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-2xl text-xs font-semibold">
              TensorFlow.js Kinematics
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center bg-[#0d0d12]/60 border-t border-white/[0.06] mt-auto">
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 font-medium">
          Made with <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> by OptiStance Athletics
        </p>
      </footer>
    </div>
  );
};

