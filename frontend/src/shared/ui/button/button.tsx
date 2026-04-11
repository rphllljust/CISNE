import { cn } from '@/shared/lib/cn';

import './button.css';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  return <button type={type} className={cn('btn', `btn-${variant}`, `btn-${size}`, className)} {...props} />;
}


