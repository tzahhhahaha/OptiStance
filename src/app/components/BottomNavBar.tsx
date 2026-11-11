import React from 'react';
import { BookOpen, Camera, History } from 'lucide-react';
import { translate as t } from '../utils/localization';

export type TabType = 'library' | 'camera' | 'history' | 'profile' | 'support' | 'settings' | 'about';

interface BottomNavBarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#050507]/90 backdrop-blur-2xl border-t border-white/[0.08] px-6 safe-bottom-nav pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.85)] will-change-transform transform-gpu"
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Library Tab (Left) */}
        <button
          onClick={() => onSelectTab('library')}
          className={`min-h-[48px] min-w-[64px] flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-2xl transition-all relative group focus:outline-none ${
            currentTab === 'library'
              ? 'text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
          }`}
          aria-label={t('Pose Library')}
        >
          <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'library' ? 'bg-white/10 text-white shadow-inner scale-105' : 'group-hover:bg-white/5'}`}>
            <BookOpen className="w-5 h-5" strokeWidth={currentTab === 'library' ? 2.5 : 1.8} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide">{t('Library')}</span>
          {currentTab === 'library' && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8] absolute -bottom-1 animate-pulse" />
          )}
        </button>

        {/* Center Prominent AI Scan Camera Button */}
        <button
          onClick={() => onSelectTab('camera')}
          className="relative -top-5 group flex flex-col items-center focus:outline-none active:scale-95 transition-transform"
          aria-label={t('Start AI Scan')}
        >
          <div className="relative p-1">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.6)] group-hover:scale-105 transition-all duration-300 border-4 border-[#050507]">
              <Camera className="w-6 h-6" strokeWidth={2.4} />
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.2em] mt-0.5 group-hover:text-white transition-colors">
            {t('AI Scan')}
          </span>
        </button>

        {/* History Tab (Right) */}
        <button
          onClick={() => onSelectTab('history')}
          className={`min-h-[48px] min-w-[64px] flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-2xl transition-all relative group focus:outline-none ${
            currentTab === 'history'
              ? 'text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
          }`}
          aria-label={t('Session History')}
        >
          <div className={`p-1.5 rounded-xl transition-all ${currentTab === 'history' ? 'bg-white/10 text-white shadow-inner scale-105' : 'group-hover:bg-white/5'}`}>
            <History className="w-5 h-5" strokeWidth={currentTab === 'history' ? 2.5 : 1.8} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide">{t('History')}</span>
          {currentTab === 'history' && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8] absolute -bottom-1 animate-pulse" />
          )}
        </button>
      </div>
    </nav>
  );
};


