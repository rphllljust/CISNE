import { useMemo, useState } from 'react';

import { useDashboardOverview } from '@/features/dashboard/api/dashboard.api';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { Alert, Breadcrumbs, Button, Input, PageHeader, Skeleton } from '@/shared/ui';
import { KpiCards, StatusDistributionChart, TechnicianProductivityChart } from '@/widgets/charts';

import '@/widgets/charts/charts.css';
import '../pages.css';

export function DashboardPage(): React.JSX.Element {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filter = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined
    }),
    [startDate, endDate]
  );

  const overviewQuery = useDashboardOverview(filter);

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', to: appRoutes.dashboard }]} />}
        title="Operational Dashboard"
        subtitle="Real-time KPI visibility for service execution, SLA and team productivity."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear
            </Button>
            {overviewQuery.isError ? (
              <Button size="sm" onClick={() => void overviewQuery.refetch()}>
                Retry
              </Button>
            ) : null}
          </div>
        }
      />

      {overviewQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={140} />
          <Skeleton height={280} />
        </div>
      ) : overviewQuery.isError ? (
        <Alert
          variant="danger"
          title="Dashboard unavailable"
          message={getApiErrorMessage(overviewQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void overviewQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : overviewQuery.data ? (
        <>
          <KpiCards cards={overviewQuery.data.cards} />
          <div className="chart-grid">
            <StatusDistributionChart data={overviewQuery.data.charts.byStatus} />
            <TechnicianProductivityChart data={overviewQuery.data.charts.byTechnician} />
          </div>
        </>
      ) : null}
    </section>
  );
}

