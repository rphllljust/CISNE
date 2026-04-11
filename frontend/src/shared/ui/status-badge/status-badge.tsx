import { cn } from '@/shared/lib/cn';

import './status-badge.css';

type BadgeTone = 'blue' | 'orange' | 'green' | 'red' | 'gray';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = 'gray' }: StatusBadgeProps): React.JSX.Element {
  return <span className={cn('badge', `badge-${tone}`)}>{label}</span>;
}


