import React from 'react';

interface DivProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: DivProps): React.JSX.Element {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: DivProps): React.JSX.Element {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: DivProps): React.JSX.Element {
  return (
    <h3 className={className} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: DivProps): React.JSX.Element {
  return (
    <p className={className} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: DivProps): React.JSX.Element {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
