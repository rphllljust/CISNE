import React from 'react';

type ButtonVariant = 'default' | 'outline' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'btn btn-primary',
  outline: 'btn btn-secondary',
  destructive: 'btn btn-danger'
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'btn-md',
  sm: 'btn-sm',
  lg: 'btn-md',
  icon: 'btn-sm'
};

export function Button({
  asChild = false,
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  const classes = `${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: `${classes} ${child.props.className ?? ''}`.trim()
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
