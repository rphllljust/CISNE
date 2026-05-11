import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
}

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  const base =
    variant === 'outline'
      ? 'inline-flex items-center rounded border px-2 py-1 text-xs'
      : 'inline-flex items-center rounded px-2 py-1 text-xs';

  return (
    <span className={`${base} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
