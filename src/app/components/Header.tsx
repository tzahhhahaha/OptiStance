import React from 'react';
import { Menu, User, Award } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenMenu?: () => void;
  onOpenDrawer?: () => void;
  onOpenProfile?: () => void;
  totalMastered?: number;
  user?: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'OptiStance',
  onOpenMenu,
  onOpenDrawer,
  onOpenProfile,
  totalMastered,
  user
}) => {
  const handleMenuClick = onOpenMenu || onOpenDrawer;
  const athleteName = user?.name || 'Athlete';
  const athleteRole = user?.role || 'Cheer Athlete';

  return (
    <header className="sticky top-0 w-full z-40 bg-[#050507]/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-18 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3.5">
        <button
          onClick={handleMenuClick}
          aria-label="Open Navigation Menu"
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)] text-white">
            <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                <span>{title}</span>
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                ICU AI
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">Kinematic Pose Telemetry</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {typeof totalMastered === 'number' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalMastered} Mastered</span>
          </div>
        )}

        <button
          onClick={onOpenProfile}
          aria-label="Open Athlete Profile"
          className="flex items-center gap-2.5 py-1.5 px-2.5 sm:px-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-rose-500/20 border border-white/15 flex items-center justify-center text-zinc-200 group-hover:text-white shadow-sm">
            <User className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors hidden sm:inline">
            Profile
          </span>
        </button>
      </div>
    </header>
  );
};
