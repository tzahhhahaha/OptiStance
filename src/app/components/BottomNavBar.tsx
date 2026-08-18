import React from 'react';
import { BookOpen, Camera, History } from 'lucide-react';

export type TabType = 'library' | 'camera' | 'history' | 'profile' | 'support' | 'settings' | 'about';

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#050507]/90 backdrop-blur-2xl border-t border-white/[0.08] px-6 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.85)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Library Tab (Left) */}
        <button
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all relative group ${
            currentTab === 'library'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          aria-label="Pose Library"
        >
          <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'library' ? 'bg-white/10 text-white shadow-inner' : 'group-hover:bg-white/5'}`}>
            <BookOpen className="w-5 h-5" strokeWidth={currentTab === 'library' ? 2.5 : 1.8} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide">Library</span>
          {currentTab === 'library' && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8] absolute -bottom-1" />
          )}
        </button>

        {/* Center Prominent AI Scan Camera Button */}
        <button
          onClick={() => onSelectTab('camera')}
          className="relative -top-5 group flex flex-col items-center focus:outline-none"
          aria-label="Start AI Scan"
        >
          <div className="relative p-1">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-15 h-15 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)] group-hover:scale-105 active:scale-95 transition-all duration-300 border-4 border-white">
              <Camera className="w-6 h-6" strokeWidth={2.4} />
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.2em] mt-0.5 group-hover:text-white transition-colors">
            AI Scan
          </span>
        </button>

        {/* History Tab (Right) */}
        <button
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all relative group ${
            currentTab === 'history'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          aria-label="Session History"
        >
          <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'history' ? 'bg-white/10 text-white shadow-inner' : 'group-hover:bg-white/5'}`}>
            <History className="w-5 h-5" strokeWidth={currentTab === 'history' ? 2.5 : 1.8} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide">History</span>
          {currentTab === 'history' && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8] absolute -bottom-1" />
          )}
        </button>
      </div>
    </nav>
  );
};


