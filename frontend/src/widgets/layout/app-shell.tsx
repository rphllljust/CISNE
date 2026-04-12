import { Activity, Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/model';
import { appRoutes } from '@/shared/constants/routes';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/shared/lib/ui.store';
import { Button } from '@/shared/ui/button';
import { ToggleThemeButton } from '@/shared/ui/toggle-theme';
import { navigationItems } from '@/widgets/navigation/navigation-items';

import './app-shell.css';

interface AppShellProps {
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPERACOES_MANAGER: 'Gerente de Operacoes',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Tecnico',
  ATTENDANT: 'Atendente',
  CLIENT: 'Cliente'
};

function getPageTitle(pathname: string): string {
  const match = navigationItems.find((item) => {
    if (item.path === '/') {
      return pathname === '/';
    }

    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  });

  if (!match) {
    if (pathname === appRoutes.profile) {
      return 'Perfil';
    }

    return env.appName;
  }

  return match.label;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const hasRole = useAuthStore((state) => state.hasRole);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  const items = navigationItems.filter((item) => hasRole(item.roles));
  const operationsItems = items.filter((item) => item.section !== 'ADMIN');
  const adminItems = items.filter((item) => item.section === 'ADMIN');

  const initials = user ? getInitials(user.fullName) : '?';
  const primaryRole = user?.roles[0] ? (roleLabel[user.roles[0]] ?? user.roles[0]) : '';

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', sidebarOpen && 'sidebar-open')}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Activity size={18} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">{env.appName}</span>
            <span className="sidebar-logo-version">Suite Operacional</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav scroll-soft">
          {operationsItems.length > 0 ? <p className="sidebar-section-label">OPERACOES</p> : null}
          {operationsItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn('sidebar-item', isActive && 'sidebar-item-active')}
              >
                <span className="sidebar-item-icon">
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {adminItems.length > 0 ? (
            <>
              <p className="sidebar-section-label" style={{ marginTop: 8 }}>
                ADMIN
              </p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn('sidebar-item', isActive && 'sidebar-item-active')}
                  >
                    <span className="sidebar-item-icon">
                      <Icon size={16} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          ) : null}
        </nav>

        <Link className="sidebar-user" to={appRoutes.profile} onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.fullName ?? 'Usuario'}</span>
            <span className="sidebar-user-role">{primaryRole}</span>
          </div>
        </Link>
      </aside>

      <div className={cn('overlay', sidebarOpen && 'overlay-visible')} onClick={() => setSidebarOpen(false)} />

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu-button"
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </Button>
            <div className="topbar-context">
              <span className="topbar-context-label">Tela atual</span>
              <span className="topbar-context-title">{getPageTitle(location.pathname)}</span>
            </div>
          </div>

          <div className="topbar-right">
            <ToggleThemeButton />
            <Link to={appRoutes.profile} className="topbar-user topbar-user-link">
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.fullName ?? 'Usuario'}</span>
                <span className="topbar-user-role">{primaryRole}</span>
              </div>
              <div className="topbar-avatar" aria-hidden="true">
                {initials}
              </div>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}


