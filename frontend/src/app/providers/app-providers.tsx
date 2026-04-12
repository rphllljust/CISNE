import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ToastVerport } from '@/shared/ui/toast';

import { queryClient } from './query-client';
import { SessionBootstrap } from './session-bootstrap';
import { ThemeSyncProvider } from './theme-sync-provider';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSyncProvider>
        <SessionBootstrap>{children}</SessionBootstrap>
      </ThemeSyncProvider>
      <ToastVerport />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}


