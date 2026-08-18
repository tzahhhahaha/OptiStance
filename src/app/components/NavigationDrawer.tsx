import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Settings,
  Info,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { TabType } from './BottomNavBar';
import { UserProfile } from '../types';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: UserProfile;
  onLogout?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  user,
  onLogout
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isOpen) return null;

  const isAdmin = user.role === 'SystemManager' || user.role === 'admin';

  const supportAndSettingsItems: { id: TabType | 'admin'; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'settings',
      label: 'Settings & Privacy',
      description: 'Audio cues, camera & preferences',
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'support',
      label: 'Help & Tutorials',
      description: 'Guides, FAQs & coach support desk',
      icon: <HelpCircle className="w-4 h-4" />
    },
    {
      id: 'about',
      label: 'About OptiStance',
      description: 'Platform technology & ICU compliance',
      icon: <Info className="w-4 h-4" />
    }
  ];

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      onSelectTab('library');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel - Immersive UI sidebar */}
      <div className="relative w-full max-w-[320px] bg-[#09090d]/95 border-r border-white/[0.08] backdrop-blur-2xl text-[#E0E0E6] h-full shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col z-10 animate-fade-in-up">
        {/* Drawer Header */}
        <div className="p-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-white block">OPTISTANCE</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Kinematic HUD</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Athlete Profile Card */}
          <button
            onClick={() => {
              onSelectTab('profile');
              onClose();
            }}
            className="w-full text-left bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-2xl p-3 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/30 to-rose-500/30 border border-white/20 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {(user?.name || 'Athlete').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate text-white group-hover:text-indigo-300 transition-colors">
                    {user?.name || 'Athlete'}
                  </p>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate">{user?.role || 'Cheer Athlete'}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Admin Section */}
          {isAdmin && (
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold block mb-2 px-2">
                Admin
              </span>
              <button
                onClick={() => {
                  onSelectTab('admin' as any);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left group bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-gradient-to-r hover:from-indigo-600/30 hover:to-purple-600/30 text-indigo-300 hover:text-indigo-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold tracking-tight block truncate">Admin Console</span>
                    <span className="text-[10px] truncate block text-indigo-300/70">Immersive admin dashboard</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-2 text-indigo-400" />
              </button>
            </div>
          )}

          {/* Preferences & Support Section */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold block mb-2 px-2">
              Preferences &amp; Support
            </span>
            <div className="space-y-1">
              {supportAndSettingsItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id as TabType);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left group ${
                      isActive
                        ? 'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-black text-white' : 'bg-white/5 border border-white/10 text-zinc-300 group-hover:text-indigo-400'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold tracking-tight block truncate">{item.label}</span>
                        <span className={`text-[10px] truncate block ${isActive ? 'text-zinc-600 font-normal' : 'text-zinc-500'}`}>
                          {item.description}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ml-2 ${isActive ? 'text-black/60' : 'text-zinc-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer - Log Out Button */}
        <div className="p-4 border-t border-white/[0.06] bg-black/40">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/20 hover:border-rose-500/40 text-rose-300 hover:text-rose-200 transition-all font-bold text-xs group"
          >
            <LogOut className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f14] border border-white/10 rounded-3xl p-6 max-w-xs w-full shadow-2xl shadow-black/80 text-center animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Sign Out of OptiStance?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Your offline training telemetry and pose history will remain safely stored on this device.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


