import React, { ReactNode } from 'react';
import { Users, Settings, Award } from 'lucide-react';

interface AdminWorkspaceProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function AdminWorkspace({ children, onNavigate, currentPage }: AdminWorkspaceProps) {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-72 flex-col p-5 text-white" style={{ background: '#6B06C3' }}>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">OptiStance</p>
          <h2 className="mt-2 text-xl font-semibold">Admin Console</h2>
          <p className="text-sm text-white/80">System Manager</p>
        </div>

        <nav className="flex flex-col gap-2">
          <button
            onClick={() => onNavigate('admin/users')}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
              currentPage === 'admin/users' ? 'bg-white text-purple-800 shadow-sm' : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <Users className="h-4 w-4" />
            Manage Users
          </button>

          <button
            onClick={() => onNavigate('admin/thresholds')}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
              currentPage === 'admin/thresholds' ? 'bg-white text-purple-800 shadow-sm' : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <Settings className="h-4 w-4" />
            Pose Thresholds
          </button>

          <button
            onClick={() => onNavigate('admin/analytics')}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
              currentPage === 'admin/analytics' ? 'bg-white text-purple-800 shadow-sm' : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <Award className="h-4 w-4" />
            Analytics
          </button>
        </nav>

        <div className="mt-auto text-sm text-white/80">Manage athletes, thresholds and practice data</div>
      </aside>

      <main className="flex-1 lg:pl-72 bg-gradient-to-b from-purple-50 to-white min-h-screen p-6">{children}</main>
    </div>
  );
}
