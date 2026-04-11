import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import './alert.css';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  title?: string;
  message: string;
  variant?: AlertVariant;
  action?: React.ReactNode;
  className?: string;
}

const iconMap: Record<AlertVariant, React.ComponentType<{ size?: number }>> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle
};

export function Alert({ title, message, variant = 'info', action, className }: AlertProps): React.JSX.Element {
  const Icon = iconMap[variant];

  return (
    <div className={cn('alert', `alert-${variant}`, className)} role="alert">
      <div className="alert-icon" aria-hidden="true">
        <Icon size={16} />
      </div>
      <div className="alert-content">
        {title ? <p className="alert-title">{title}</p> : null}
        <p className="alert-message">{message}</p>
      </div>
      {action ? <div className="alert-action">{action}</div> : null}
    </div>
  );
}

