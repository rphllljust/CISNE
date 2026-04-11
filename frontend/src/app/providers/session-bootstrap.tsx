import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/model';

interface SessionBootstrapProps {
  children: React.ReactNode;
}

export function SessionBootstrap({ children }: SessionBootstrapProps): React.JSX.Element {
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  return <>{children}</>;
}


