import type { ReactNode } from 'react';
import type { UserRole } from '../../services/api';

interface ProtectedRouteProps {
  userRole: UserRole | null;
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ userRole, allowedRoles, children }: ProtectedRouteProps) {
  if (!userRole) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-purple-700">Please sign in to access this area.</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Access denied</p>
          <p className="mt-1 text-sm text-red-600">This section is restricted to the approved role.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
