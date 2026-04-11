import './filter-bar.css';

interface FilterBarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps): React.JSX.Element {
  return (
    <section className="filter-bar">
      <div className="filter-grid">{children}</div>
      {actions ? <div className="filter-actions">{actions}</div> : null}
    </section>
  );
}


