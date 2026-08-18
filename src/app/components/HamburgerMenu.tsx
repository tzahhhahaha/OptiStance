import { Menu, Settings, Info, HelpCircle, LogOut, X, Home, Lock, Shield } from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '../../services/api';

export interface HamburgerMenuProps {
  onNavigate: (page: string) => void;
  userName?: string;
  userRole?: UserRole | null;
}

export function HamburgerMenu({ onNavigate, userName = 'Juan Dela Cruz', userRole = null }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = userRole === 'SystemManager';

  const menuItems = isAdmin
    ? [
        { id: 'admin', icon: Shield, label: 'Admin Console', description: 'Access immersive admin dashboard', color: 'purple' },
        { id: 'library', icon: Home, label: 'Return to App', description: 'Switch to main app view', color: 'blue' },
        { id: 'logout', icon: LogOut, label: 'Logout', description: 'Sign out of admin console', color: 'red' },
      ]
    : [
        { id: 'settings', icon: Settings, label: 'Settings & Privacy', description: 'Account security settings (ISO 25010)', color: 'purple' },
        { id: 'about', icon: Info, label: 'About the App', description: 'ICU Standards at MediaPipe Pose', color: 'blue' },
        { id: 'help', icon: HelpCircle, label: 'Help & Support', description: 'Tutorials for camera and image upload', color: 'green' },
        { id: 'logout', icon: LogOut, label: 'Logout', description: 'Secure logout from app', color: 'red' },
      ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-colors z-40 border border-purple-100"
        aria-label="Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 top-0 bottom-0 w-80 bg-gradient-to-b from-purple-50 to-white shadow-2xl overflow-y-auto">
            {/* OptiStances Branding */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 text-white sticky top-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-purple-200">OptiStances</p>
                  <h2 className="text-2xl font-bold mt-1">Menu</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* User Profile Info */}
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <div className="font-semibold text-white">{userName}</div>
                  <div className="text-sm text-purple-100">Level 5 Cheerleader</div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const colorClass = item.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                  item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                  item.color === 'green' ? 'bg-green-100 text-green-600' :
                                  'bg-red-100 text-red-600';
                return (
                  <button
                    key={item.label}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all text-left mb-2"
                    onClick={() => {
                      onNavigate(item.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
