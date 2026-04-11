import { useEffect } from 'react';

import { useUiStore } from '@/shared/lib/ui.store';

interface ThemeSyncProps {
  children: React.ReactNode;
}

export function ThemeSyncProvider({ children }: ThemeSyncProps): React.JSX.Element {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <>{children}</>;
}


