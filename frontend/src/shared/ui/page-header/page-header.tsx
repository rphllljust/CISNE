import type { PropsWithChildren } from 'react';

import './page-header.css';

interface PageHeaderProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  breadcrumbs?: React.ReactNode;
  meta?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumbs,
  meta
}: PageHeaderProps): React.JSX.Element {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {breadcrumbs ? <div className="page-header-breadcrumbs">{breadcrumbs}</div> : null}
        {eyebrow ? <span className="page-header-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {meta ? <div className="page-header-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}


