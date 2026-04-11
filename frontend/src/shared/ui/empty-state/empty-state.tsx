import { Inbox } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import './empty-state.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn('empty-state-v2', className)} role="status" aria-live="polite">
      <div className="empty-state-v2-icon" aria-hidden="true">
        {icon ?? <Inbox size={18} />}
      </div>
      <h3 className="empty-state-v2-title">{title}</h3>
      {description ? <p className="empty-state-v2-description">{description}</p> : null}
      {action ? <div className="empty-state-v2-action">{action}</div> : null}
    </div>
  );
}

