import { Outlet } from 'react-router-dom';

import { AppShell } from '@/widgets/layout';

export function AppShellLayout(): React.JSX.Element {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}


