import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

import './drawer.css';

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  width?: 'sm' | 'md' | 'lg';
}

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
  width = 'md'
}: DrawerProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className={cn('drawer-panel', `drawer-width-${width}`, className)}>
        <header className="drawer-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar painel lateral">
            <X size={16} />
          </Button>
        </header>

        <div className="drawer-content scroll-soft">{children}</div>

        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}

