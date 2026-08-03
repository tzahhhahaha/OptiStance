import { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { CameraButton } from './components/CameraButton';
import { HamburgerMenu } from './components/HamburgerMenu';
import { HomePage } from './components/HomePage';
import { PosePage } from './components/PosePage';
import { ProfilePage } from './components/ProfilePage';
import { CameraView } from './components/CameraView';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { SettingsPage } from './components/SettingsPage';
import { AboutPage } from './components/AboutPage';
import { HelpPage } from './components/HelpPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserManagement } from './components/UserManagement';
import { MotionConfig } from './components/MotionConfig';
import { createAthlete, loginUser, type UserRole } from '../services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [showCamera, setShowCamera] = useState(false);
  const [targetPoseName, setTargetPoseName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [originalUserRole, setOriginalUserRole] = useState<UserRole | null>(null);
  const [originalUserName, setOriginalUserName] = useState<string | null>(null);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  const handleCameraClick = (pose?: { name?: string } | null) => {
    setTargetPoseName(pose?.name ?? null);
    setShowCamera(true);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await loginUser(email, password);
      setIsAuthenticated(true);
      setUserName(user.fullName || user.email || 'User');
      setUserRole(user.role);
      setCurrentPage(user.role === 'SystemManager' ? 'admin/users' : 'home');
    } catch (err) {
      console.error('Login failed:', err);
      setIsAuthenticated(true);
      setUserName('Demo Athlete');
      setUserRole('Athlete');
      setCurrentPage('home');
    }
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    try {
      const user = await createAthlete(name, email, password);
      setIsAuthenticated(true);
      setUserName(user.fullName || name);
      setUserRole(user.role);
      setCurrentPage('home');
    } catch (err) {
      console.error('Signup failed:', err);
      setIsAuthenticated(true);
      setUserName(name);
      setUserRole('Athlete');
      setCurrentPage('home');
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setUserName('');
    setUserRole(null);
    setCurrentPage('login');
  };

  const applyImpersonation = async (userId: string | null) => {
    if (!userId) return;
    try {
      const users = await import('../services/api').then((m) => m.getUsers());
      const found = users.find((u: any) => u.id === userId);
      if (!found) return;

      // Save original session if not already saved
      if (!originalUserRole) setOriginalUserRole(userRole);
      if (!originalUserName) setOriginalUserName(userName);

      setImpersonatedUserId(userId);
      setIsAuthenticated(true);
      setUserRole('Athlete');
      setUserName(found.fullName || found.email || 'Athlete');
      setCurrentPage('home');
    } catch (err) {
      console.error('Failed applying impersonation', err);
    }
  };

  useEffect(() => {
    // handle initial impersonation flag on load
    const maybe = window.localStorage.getItem('optistance_impersonate');
    if (maybe) void applyImpersonation(maybe);

    const handler = () => {
      const id = window.localStorage.getItem('optistance_impersonate');
      void applyImpersonation(id);
    };
    window.addEventListener('optistance:impersonate', handler);
    return () => window.removeEventListener('optistance:impersonate', handler);
  }, []);

  const exitImpersonation = () => {
    window.localStorage.removeItem('optistance_impersonate');
    setImpersonatedUserId(null);
    if (originalUserRole) {
      setUserRole(originalUserRole);
      setUserName(originalUserName || 'System Manager');
      setCurrentPage('admin/users');
      setOriginalUserRole(null);
      setOriginalUserName(null);
    } else {
      // fallback: reload to clear transient state
      window.location.reload();
    }
  };

  const handleNavigation = (page: string) => {
    if (page === 'logout') {
      void handleLogout();
    } else {
      setCurrentPage(page);
    }
  };

  if (!isAuthenticated) {
    if (currentPage === 'signup') {
      return (
        <SignupPage
          onSignup={handleSignup}
          onSwitchToLogin={() => setCurrentPage('login')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToSignup={() => setCurrentPage('signup')}
      />
    );
  }

  const renderMainContent = () => {
    if (currentPage === 'settings') {
      return <SettingsPage onBack={() => setCurrentPage('home')} />;
    }
    if (currentPage === 'about') {
      return <AboutPage onBack={() => setCurrentPage('home')} />;
    }
    if (currentPage === 'help') {
      return <HelpPage onBack={() => setCurrentPage('home')} />;
    }
    if (currentPage === 'admin/users') {
      return (
        <ProtectedRoute userRole={userRole} allowedRoles={['SystemManager']}>
          <UserManagement />
        </ProtectedRoute>
      );
    }
    if (currentPage === 'admin/thresholds') {
      return (
        <ProtectedRoute userRole={userRole} allowedRoles={['SystemManager']}>
          <MotionConfig />
        </ProtectedRoute>
      );
    }
    if (currentPage === 'practice') {
      return (
        <ProtectedRoute userRole={userRole} allowedRoles={['SystemManager', 'Athlete']}>
          <HomePage onOpenCamera={handleCameraClick} onNavigate={setCurrentPage} />
        </ProtectedRoute>
      );
    }
    if (currentPage === 'history') {
      return (
        <ProtectedRoute userRole={userRole} allowedRoles={['SystemManager', 'Athlete']}>
          <ProfilePage />
        </ProtectedRoute>
      );
    }
    if (currentPage === 'home') {
      return <HomePage onOpenCamera={handleCameraClick} onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'pose') {
      return <PosePage onOpenCamera={handleCameraClick} />;
    }
    if (currentPage === 'profile') {
      return <ProfilePage />;
    }

    return <HomePage onOpenCamera={handleCameraClick} onNavigate={setCurrentPage} />;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="size-full overflow-auto bg-white">
        <HamburgerMenu onNavigate={handleNavigation} userName={userName} userRole={userRole} />
          {renderMainContent()}

          {/* Hide camera and bottom nav for SystemManager admin pages and library */}
          {userRole !== 'SystemManager' && currentPage !== 'pose' && (
            <>
              <CameraButton onClick={handleCameraClick} />
              <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
          )}

          {showCamera && <CameraView onClose={() => setShowCamera(false)} targetPoseName={targetPoseName} />}
        </div>
    </div>
  );
}