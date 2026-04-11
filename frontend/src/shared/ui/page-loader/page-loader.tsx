import { Skeleton } from '@/shared/ui/skeleton';

export function PageLoader(): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, padding: '4px 0' }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Skeleton width={220} height={22} />
          <Skeleton width={340} height={14} />
        </div>
        <Skeleton width={100} height={36} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={100} />
        ))}
      </div>
      <Skeleton height={280} />
    </div>
  );
}

