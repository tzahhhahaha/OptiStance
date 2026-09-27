import React from 'react';
import { Menu, Award } from 'lucide-react';
import { UserProfile } from '../types';
import { displayRoleLabel } from '../utils/profile';
import { translate as t } from '../utils/localization';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenMenu?: () => void;
  onOpenDrawer?: () => void;
  onOpenProfile?: () => void;
  totalMastered?: number;
  user?: UserProfile;
  /** Reflected on the menu button as aria-expanded. */
  isDrawerOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'OptiStance',
  onOpenMenu,
  onOpenDrawer,
  onOpenProfile,
  totalMastered,
  user,
  isDrawerOpen
}) => {
  const handleMenuClick = onOpenMenu || onOpenDrawer;
  const athleteName = user?.name || 'Athlete';
  const athleteRole = displayRoleLabel(user);
  // Initials rather than a generic glyph — the drawer and profile already show
  // initials, so a silhouette here made the athlete look like two accounts.
  const athleteInitial = athleteName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <header className="sticky top-0 w-full z-40 bg-[#050507]/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 md:px-8 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between transition-all">
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={handleMenuClick}
          aria-label={t('Open Navigation Menu')}
          aria-expanded={isDrawerOpen ?? false}
          className="w-9 h-9 shrink-0 rounded-xl border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)] text-white">
            <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                <span className="truncate">{title === 'OptiStance' ? title : t(title)}</span>
              </h1>
              <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                ICU AI
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-zinc-500">{t('Kinematic Pose Telemetry')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {typeof totalMastered === 'number' && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
            title={`${totalMastered} ${t('poses mastered')}`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            {/* Label drops below md to keep the phone header from crowding. */}
            <span>{totalMastered}<span className="hidden md:inline">&nbsp;{t('Mastered')}</span></span>
          </div>
        )}

        <button
          onClick={onOpenProfile}
          aria-label={`${t('Open Athlete Profile')}${athleteName ? `, ${t('signed in as')} ${athleteName}` : ''}`}
          className="flex items-center gap-2 sm:gap-2.5 py-1.5 pl-1.5 pr-2 sm:px-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group text-left min-w-0"
        >
          <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-rose-500/20 border border-white/15 flex items-center justify-center text-zinc-100 font-bold text-xs group-hover:text-white shadow-sm">
            {athleteInitial}
          </div>
          {/* Name stays visible on phones — it is the only identity cue here,
              and it was hidden below sm before. */}
          <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[7rem] sm:max-w-none">
            {athleteName}
          </span>
          <span className="hidden md:inline text-[9px] uppercase font-bold tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
            {athleteRole}
          </span>
        </button>
      </div>
    </header>
  );
};
