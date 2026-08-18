import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, message }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { title: 'Initializing OptiStance Engine', detail: 'Connecting MediaPipe Pose ML' },
    { title: 'Loading Biomechanics Models', detail: 'Calibrating joint vector kinematics' },
    { title: 'Syncing ICU Competition Rubrics', detail: 'Level 1-6 stunt safety protocols' },
    { title: 'Ready to Perform', detail: 'Starting high-frequency telemetry' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }
        // progressive acceleration
        const increment = Math.floor(Math.random() * 12) + 8;
        const next = Math.min(prev + increment, 100);

        if (next > 75) setStepIndex(3);
        else if (next > 45) setStepIndex(2);
        else if (next > 15) setStepIndex(1);
        else setStepIndex(0);

        return next;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-[#E0E0E6] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Background kinetic atmosphere */}
      <div className="fixed -top-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="fixed -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-rose-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          </div>
          <span className="text-xs font-black tracking-[0.25em] uppercase text-white">
            OptiStance
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
          <Activity className="w-3 h-3 text-indigo-400 animate-spin" />
          <span>v2.4 TELEMETRY</span>
        </div>
      </header>

      {/* Center Biomechanical Radar Animation */}
      <main className="relative z-10 flex flex-col items-center my-auto w-full max-w-sm">
        {/* Animated Rings & Wireframe Visual */}
        <div className="relative w-48 h-48 flex items-center justify-center mb-8">
          {/* Outer rotating dashed ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/30 animate-spin"
            style={{ animationDuration: '14s' }}
          />

          {/* Middle glow ring */}
          <div
            className="absolute inset-3 rounded-full border border-white/10 shadow-[0_0_40px_rgba(99,102,241,0.25)] animate-pulse"
          />

          {/* Inner radar sweep line */}
          <div
            className="absolute inset-6 rounded-full border border-indigo-500/20 flex items-center justify-center overflow-hidden"
          >
            <div
              className="absolute w-full h-1/2 top-0 bg-gradient-to-b from-transparent to-indigo-500/20 origin-bottom animate-spin"
              style={{ animationDuration: '3s' }}
            />
          </div>

          {/* Center Stance Stunt Joint Node representation */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/40 via-purple-600/30 to-rose-600/40 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)]">
              <Cpu className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          {/* Orbiting tracking points */}
          <div
            className="absolute w-full h-full animate-spin"
            style={{ animationDuration: '6s' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e] absolute top-1 left-1/2 -translate-x-1/2" />
          </div>
          <div
            className="absolute w-full h-full animate-spin"
            style={{ animationDuration: '8s', animationDirection: 'reverse' }}
          >
            <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8] absolute bottom-2 left-1/2 -translate-x-1/2" />
          </div>
        </div>

        {/* Status Text & Message */}
        <div className="text-center w-full px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{message || 'Biomechanical Engine'}</span>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight mb-1">
            {steps[stepIndex]?.title}
          </h2>
          <p className="text-xs text-zinc-400 font-medium h-5">
            {steps[stepIndex]?.detail}
          </p>
        </div>

        {/* Progress Bar & Numerical Counter */}
        <div className="w-full mt-6">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="flex items-center gap-1 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              CALIBRATING SENSORS
            </span>
            <span className="text-indigo-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 p-0.5 overflow-hidden backdrop-blur-md">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full flex items-center justify-between text-[10px] text-zinc-500 font-mono z-10 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ICU LEVEL 1-6 CERTIFIED</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
          <span>60 FPS ML INFERENCE</span>
        </div>
      </footer>
    </div>
  );
};
