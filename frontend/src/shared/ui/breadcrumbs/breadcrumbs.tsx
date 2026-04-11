import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';

import './breadcrumbs.css';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className={cn('breadcrumbs', className)} aria-label="Caminho da pagina">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link to={item.to} className="breadcrumbs-link">
                  {item.label}
                </Link>
              ) : (
                <span className={cn('breadcrumbs-current', isLast && 'breadcrumbs-current-active')}>
                  {item.label}
                </span>
              )}

              {!isLast ? <ChevronRight size={12} className="breadcrumbs-separator" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

