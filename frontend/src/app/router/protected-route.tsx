import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { UserRole } from '@/entities/auth/types';
import { useAuthStore } from '@/features/auth/model';
import { appRoutes } from '@/shared/constants/routes';

interface ProtectedRouteProps {
  roles?: UserRole[];
  permission?: string;
}

export function ProtectedRoute({ roles, permission }: ProtectedRouteProps): React.JSX.Element {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (status === 'loading') {
    return <div className="app-loading">Carregando sessao...</div>;
  }

  if (status === 'unauthenticated') {
    const searchParams = new URLSearchParams({
      redirectTo: `${location.pathname}${location.search}`
    });

    return <Navigate to={`${appRoutes.login}?${searchParams.toString()}`} replace />;
  }

  if (!hasRole(roles) || !hasPermission(permission)) {
    return <Navigate to={appRoutes.dashboard} replace />;
  }

  return <Outlet />;
}

