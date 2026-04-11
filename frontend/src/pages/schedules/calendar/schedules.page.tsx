import { CalendarClock, CheckCircle2, Route, Timer } from 'lucide-react';

import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Card, PageHeader } from '@/shared/ui';

import '../../pages.css';

interface CapabilityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function CapabilityItem({ icon, title, description }: CapabilityItemProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-soft)',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>{description}</p>
      </div>
    </div>
  );
}

export function SchedulesPage(): React.JSX.Element {
  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Field Operations"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Scheduling' }
            ]}
          />
        }
        title="Operational scheduling"
        subtitle="Daily, weekly and monthly workload planning for technicians and teams."
      />

      <Alert variant="info" message="Calendar grid integration is prepared for FullCalendar timeline and conflict policies." />

      <Card title="Scheduling capabilities" subtitle="Production-ready foundations for route and visit management">
        <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
          <CapabilityItem icon={<CalendarClock size={15} />} title="Rescheduling with history" description="Every date change keeps immutable trail and ownership context." />
          <CapabilityItem icon={<CheckCircle2 size={15} />} title="Visit confirmation" description="Service confirmation by technician with operation timestamp." />
          <CapabilityItem icon={<Timer size={15} />} title="Check-in and check-out" description="Field execution timestamps to measure cycle time and delay." />
          <CapabilityItem icon={<Route size={15} />} title="Route and attendance windows" description="Planned time windows aligned to SLA and regional workload." />
        </div>
      </Card>
    </section>
  );
}

