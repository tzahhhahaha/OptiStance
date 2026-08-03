import { Home, History, ShieldCheck, Target, Users, LogOut } from 'lucide-react';
import type { UserRole } from '../../services/api';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole | null;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, userRole, userName, onLogout }: SidebarProps) {
  const athleteLinks = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'practice', label: 'Practice', icon: Target },
    { id: 'history', label: 'History', icon: History },
  ];

  const adminLinks = [
    { id: 'admin/users', label: 'Manage Users', icon: Users },
    { id: 'admin/thresholds', label: 'Pose Thresholds', icon: ShieldCheck },
  ];

  // Admins should not see practice-specific links in the sidebar — show admin links only.
  const links = userRole === 'SystemManager' ? adminLinks : athleteLinks;

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-purple-100 bg-gradient-to-b from-purple-700 to-purple-900 p-5 text-white lg:flex">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-purple-200">OptiStance</p>
        <h2 className="mt-2 text-xl font-semibold">{userName || 'Cheer Athlete'}</h2>
        <p className="text-sm text-purple-200">{userRole === 'SystemManager' ? 'System Manager' : 'Athlete'}</p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = currentPage === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                active ? 'bg-white text-purple-800 shadow-sm' : 'bg-white/10 text-purple-50 hover:bg-white/20'
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        {userRole && window.localStorage.getItem('optistance_impersonate') ? (
          <div className="mb-3">
            <button
              onClick={() => {
                window.localStorage.removeItem('optistance_impersonate');
                window.dispatchEvent(new Event('optistance:impersonate'));
              }}
              className="mb-2 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-purple-50 hover:bg-white/20"
            >
              Exit impersonation
            </button>
          </div>
        ) : null}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-medium text-purple-50 hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
