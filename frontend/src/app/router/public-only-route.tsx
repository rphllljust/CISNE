import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/model';
import { appRoutes } from '@/shared/constants/routes';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps): React.JSX.Element {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Navigate to={appRoutes.dashboard} replace />;
  }

  return <>{children}</>;
}


