import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning';
}

export function Alert({
  variant = 'default',
  className = '',
  children,
  ...props
}: AlertProps): React.JSX.Element {
  const tone =
    variant === 'destructive'
      ? 'border:1px solid #fecaca;background:#fef2f2;color:#7f1d1d;'
      : variant === 'warning'
      ? 'border:1px solid #fde68a;background:#fffbeb;color:#78350f;'
      : 'border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;';

  return (
    <div className={className} style={{ padding: '0.75rem 1rem', borderRadius: 8, ...parseStyle(tone) }} {...props}>
      {children}
    </div>
  );
}

export function AlertTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h4 style={{ margin: 0, fontWeight: 700 }} {...props}>
      {children}
    </h4>
  );
}

export function AlertDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return (
    <p style={{ margin: '0.35rem 0 0' }} {...props}>
      {children}
    </p>
  );
}

function parseStyle(input: string): React.CSSProperties {
  const out: Record<string, string> = {};
  input
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [k, v] = part.split(':');
      if (k && v) out[k.trim()] = v.trim();
    });
  return out as React.CSSProperties;
}
