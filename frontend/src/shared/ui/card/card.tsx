import { cn } from '@/shared/lib/cn';

import './card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function Card({ title, subtitle, className, children, ...props }: CardProps): React.JSX.Element {
  return (
    <section className={cn('card', className)} {...props}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}


