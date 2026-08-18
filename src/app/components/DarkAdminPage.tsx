import React, { useState } from 'react';
import { X, BarChart3, Users, Zap, Settings, LogOut, Bell, ChevronRight, ArrowUpRight } from 'lucide-react';
import DarkAdminUsers from './admin/DarkAdminUsers';
import DarkAdminContent from './admin/DarkAdminContent';
import DarkAdminAnalytics from './admin/DarkAdminAnalytics';
import DarkAdminSettings from './admin/DarkAdminSettings';

interface DarkAdminPageProps {
  onBack: () => void;
  isAdmin: boolean;
  userName?: string;
  userRole?: string;
}

export function DarkAdminPage({ onBack, isAdmin, userName = 'Admin', userRole = 'admin' }: DarkAdminPageProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'analytics' | 'settings'>('dashboard');
  const [notifications, setNotifications] = useState(3);

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-[#050507] min-h-screen flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md">
          <div className="bg-[#0d0d12]/90 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto mb-6 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <X className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Access Denied</h2>
            <p className="text-sm text-zinc-400 text-center mb-6">
              Your account ({userName}) does not have administrator privileges.
            </p>
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Athletes', icon: Users },
    { id: 'content', label: 'Stunts', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: ArrowUpRight },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 bg-[#050507] min-h-screen overflow-hidden z-50">
      {/* Immersive Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-rose-500/10 to-transparent rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#0a0a0f]/60 backdrop-blur-xl border-r border-white/[0.05] flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">OptiStances</h1>
                <p className="text-xs text-zinc-500 font-medium">Admin Console</p>
              </div>
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Profile Card */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-rose-500/10 backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{userName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{userRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id as any;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-rose-500/10 text-white border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.05]">
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all border border-rose-500/20 font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-16 bg-[#0a0a0f]/40 backdrop-blur-xl border-b border-white/[0.05] px-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>

            {/* Notifications & Time */}
            <div className="flex items-center gap-4">
              <button className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-zinc-300 transition-all">
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-medium">Last sync</p>
                <p className="text-xs text-white font-bold">Just now</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {activeTab === 'dashboard' && <DarkAdminDashboard />}
              {activeTab === 'users' && <DarkAdminUsers />}
              {activeTab === 'content' && <DarkAdminContent />}
              {activeTab === 'analytics' && <DarkAdminAnalytics />}
              {activeTab === 'settings' && <DarkAdminSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Overview Component
function DarkAdminDashboard() {
  const stats = [
    { label: 'Active Athletes', value: '47', trend: '+12%', icon: '👥' },
    { label: 'Sessions Today', value: '156', trend: '+23%', icon: '🎯' },
    { label: 'Avg Accuracy', value: '82.5%', trend: '+4.2%', icon: '📊' },
    { label: 'Stunts Mastered', value: '312', trend: '+8%', icon: '⭐' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] hover:border-white/[0.15] transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400 font-medium">{stat.label}</p>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white font-mono">{stat.value}</p>
              <span className="text-xs text-emerald-400 font-bold">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full py-2 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium transition-all border border-indigo-500/30">
              + Add Athlete
            </button>
            <button className="w-full py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-medium transition-all border border-rose-500/30">
              + Create Stunt
            </button>
            <button className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-all border border-amber-500/30">
              Export Report
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08]">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Performance Trend</h3>
          <div className="h-40 bg-white/[0.02] rounded-xl border border-white/[0.05] flex items-center justify-center">
            <p className="text-sm text-zinc-500">📈 Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DarkAdminPage;
