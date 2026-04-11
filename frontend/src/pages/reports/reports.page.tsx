import { BarChart2, Download, FileText, Users } from 'lucide-react';

import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Card, PageHeader } from '@/shared/ui';

import '../pages.css';

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  formats: string[];
}

function ReportCard({ icon, title, description, formats }: ReportCardProps): React.JSX.Element {
  return (
    <div
      style={{
        background: 'var(--surface-soft)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          {icon}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 3px' }}>{title}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>{description}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {formats.map((f) => (
            <span key={f} className="priority-badge priority-low" style={{ fontSize: '0.62rem' }}>
              {f}
            </span>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            cursor: 'not-allowed'
          }}
        >
          <Download size={12} />
          Coming soon
        </div>
      </div>
    </div>
  );
}

export function ReportsPage(): React.JSX.Element {
  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Analytics"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Reports' }
            ]}
          />
        }
        title="Reports and exports"
        subtitle="Consolidated operational insights with advanced filters and governance trail."
      />

      <Alert variant="info" message="PDF and XLSX exports will be enabled with asynchronous processing queue." />

      <Card title="Available report packs" subtitle="Structured exports for operations, SLA and productivity">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 8 }}>
          <ReportCard icon={<FileText size={16} />} title="Service orders" description="Volume, status, SLA and average completion time by period." formats={['PDF', 'Excel']} />
          <ReportCard icon={<Users size={16} />} title="Technician productivity" description="Completed orders, cycle time and SLA compliance by technician." formats={['PDF', 'Excel']} />
          <ReportCard icon={<BarChart2 size={16} />} title="SLA analytics" description="Compliance ratio, violation hotspots and trend by priority/client." formats={['PDF']} />
          <ReportCard icon={<FileText size={16} />} title="Client history" description="Recurring issues, response speed and service distribution by client." formats={['Excel']} />
        </div>
      </Card>
    </section>
  );
}

