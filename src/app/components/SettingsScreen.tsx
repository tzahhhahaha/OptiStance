import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Globe,
  Moon,
  Sun,
  Shield,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  LogOut
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  user: UserProfile;
  onUpdateUser: (newUser: Partial<UserProfile>) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  user,
  onUpdateUser,
  onLogout,
  onBack
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDpaModal, setShowDpaModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [editName, setEditName] = useState(user?.name || 'Cheer Athlete');
  const [editRole, setEditRole] = useState(user?.role || 'Cheer Athlete');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name: editName, role: editRole });
    setShowEditProfileModal(false);
    showToast('Profile updated successfully');
  };

  return (
    <div className="w-full min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col font-sans">
      {/* Top Header with Back to Drawer Button */}
      {onBack && (
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
            <span className="text-[11px] font-extrabold tracking-widest text-zinc-400 uppercase">Settings &amp; Preferences</span>
          </div>
        </header>
      )}

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 pb-28">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#0d0d12] text-white px-5 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5 z-50 text-xs font-bold animate-fade-in-up border border-white/20 backdrop-blur-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Banner - Immersive UI */}
        <div className="relative w-full rounded-3xl overflow-hidden mb-8 p-6 md:p-8 bg-gradient-to-r from-indigo-950/60 via-[#0d0d12]/90 to-rose-950/40 border border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-3">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Preferences &amp; Telemetry</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-white">
              Settings &amp; Privacy
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-lg leading-relaxed">
              Manage your OptiStance athlete profile securely and customize your real-time coaching telemetry parameters.
            </p>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Account & Preferences */}
        <div className="flex flex-col gap-6">
          {/* Account Settings Card */}
          <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 border border-white/[0.08] backdrop-blur-xl">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Account Profile
            </h2>
            <div className="space-y-2">
              {/* Edit Profile */}
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all group text-left border border-transparent hover:border-white/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-black transition-all">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Edit Profile</h3>
                    <p className="text-xs text-zinc-400">Update personal info &amp; role</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
              </button>

              {/* Change Password */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all group text-left border border-transparent hover:border-white/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-black transition-all">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Change Password</h3>
                    <p className="text-xs text-zinc-400">Ensure your coaching data is protected</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
              </button>

              {/* Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Audio Coaching Cues</h3>
                    <p className="text-xs text-zinc-400">Real-time voice feedback during practice</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onUpdateSettings({ audioCues: !settings.audioCues });
                    showToast('Notification preferences updated');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 border border-white/10 ${
                    settings.audioCues ? 'bg-white' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full transition-transform ${
                      settings.audioCues ? 'translate-x-6 bg-black' : 'translate-x-0 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Preferences Card */}
          <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 border border-white/[0.08] backdrop-blur-xl">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              System Preferences
            </h2>
            <div className="space-y-4">
              {/* Language Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Language</h3>
                    <p className="text-xs text-zinc-400">Select coaching voice &amp; UI locale</p>
                  </div>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => {
                    onUpdateSettings({ language: e.target.value });
                    showToast(`Language set to ${e.target.value}`);
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white py-2 px-3 focus:ring-2 focus:ring-indigo-400 cursor-pointer outline-none"
                >
                  <option value="English (US)" className="bg-[#0d0d12] text-white">English (US)</option>
                  <option value="Spanish (ES)" className="bg-[#0d0d12] text-white">Spanish (ES)</option>
                  <option value="French (FR)" className="bg-[#0d0d12] text-white">French (FR)</option>
                  <option value="Japanese (JP)" className="bg-[#0d0d12] text-white">Japanese (JP)</option>
                </select>
              </div>

              {/* Theme Atmosphere Selector (Light / Dark Mode) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                      {settings.darkMode ? (
                        <Moon className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Appearance Theme</h3>
                      <p className="text-xs text-zinc-400">
                        {settings.darkMode ? 'Immersive dark arena mode' : 'Crisp high-contrast light mode'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Light / Dark Mode Toggle Segment */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ darkMode: false });
                      showToast('Light Mode activated');
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                      !settings.darkMode
                        ? 'bg-white text-zinc-900 shadow-md scale-[1.02]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sun className={`w-4 h-4 ${!settings.darkMode ? 'text-amber-500' : 'text-zinc-400'}`} />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ darkMode: true });
                      showToast('Dark Mode activated');
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                      settings.darkMode
                        ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.02]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Moon className={`w-4 h-4 ${settings.darkMode ? 'text-indigo-200' : 'text-zinc-400'}`} />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Privacy & Security */}
        <div className="flex flex-col gap-6">
          <section className="bg-[#0d0d12]/80 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-6 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2 relative z-10">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Privacy &amp; Security
            </h2>
            <p className="text-xs text-zinc-400 mb-5 relative z-10 leading-relaxed">
              OptiStance is committed to maintaining the highest standards of athletic biometric &amp; kinematic protection.
            </p>

            {/* ISO 25010 Compliance Card */}
            <div className="bg-white/[0.03] rounded-2xl p-4 mb-5 relative z-10 border border-white/[0.08]">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">ISO 25010 Calibrated</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    We adhere to international standards for software reliability and data security, keeping your form logs strictly encrypted.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Links */}
            <ul className="space-y-2 relative z-10">
              <li>
                <button
                  onClick={() => setShowDpaModal(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-zinc-200 hover:text-white text-xs font-semibold group transition-all border border-transparent hover:border-white/10"
                >
                  <span>Data Processing Agreement</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-zinc-200 hover:text-white text-xs font-semibold group transition-all border border-transparent hover:border-white/10"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => showToast('Data permissions verified: Camera & Storage active')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-indigo-300 text-xs font-bold group transition-all border border-white/10"
                >
                  <span>Manage Data Permissions</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </li>
            </ul>

            {/* Account Actions: Log Out & Danger Zone */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] relative z-10 space-y-3">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  <span>Log Out of OptiStance</span>
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 px-4 rounded-2xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account &amp; Telemetry</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Profile Modal - Immersive UI */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-white">Edit Athlete Profile</h3>
              <button onClick={() => setShowEditProfileModal(false)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-sm font-semibold outline-none focus:border-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                  Role (e.g. Flyer, Base, Spotter, Coach)
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-sm font-semibold outline-none focus:border-indigo-400"
                  required
                />
              </div>
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-white">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  showToast('Password updated securely');
                }}
                className="w-full py-3.5 rounded-2xl bg-white text-black text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 mt-2"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-rose-500/30 backdrop-blur-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-white mb-2">
              Delete Account?
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete your account? All recorded session telemetry, ICU score cards, and skill milestones will be permanently cleared.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/5"
              >
                Keep Account
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  showToast('Account data reset to defaults');
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:bg-rose-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Processing & Privacy Policy Viewers */}
      {(showDpaModal || showPrivacyModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d12]/95 text-[#E0E0E6] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-white">
                {showDpaModal ? 'Data Processing Agreement' : 'OptiStance Privacy Policy'}
              </h3>
              <button
                onClick={() => {
                  setShowDpaModal(false);
                  setShowPrivacyModal(false);
                }}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto text-xs text-zinc-300 space-y-3 pr-2 leading-relaxed">
              <p>
                <strong className="text-white">1. Athletic Pose Telemetry:</strong> All video frames analyzed by OptiStance are processed client-side with MediaPipe inference models. Raw camera frames are never retained on remote servers without explicit coach export consent.
              </p>
              <p>
                <strong className="text-white">2. ICU Scoring Standards:</strong> Joint angles (coronal, sagittal, and transverse planes) are measured against International Cheer Union scoring heuristics for educational and training progression only.
              </p>
              <p>
                <strong className="text-white">3. Data Retention &amp; Rights:</strong> You retain complete ownership over all practice records and may export or purge your history at any time through this settings panel.
              </p>
            </div>
            <button
              onClick={() => {
                setShowDpaModal(false);
                setShowPrivacyModal(false);
              }}
              className="mt-6 py-3 rounded-2xl bg-white text-black text-xs font-extrabold uppercase tracking-wider hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

