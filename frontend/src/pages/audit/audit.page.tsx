import { useMemo, useState } from 'react';

import { useAuditLogs } from '@/features/audit/api/audit.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import {
  Alert,
  Breadcrumbs,
  Button,
  DataTable,
  FilterBar,
  Input,
  PageHeader,
  Pagination,
  StatusBadge
} from '@/shared/ui';

import '../pages.css';

type SeverityTone = 'gray' | 'blue' | 'orange' | 'red';

function getSeverityTone(severity: string): SeverityTone {
  if (severity === 'LOW') return 'gray';
  if (severity === 'MEDIUM') return 'blue';
  if (severity === 'HIGH') return 'orange';
  if (severity === 'CRITICAL') return 'red';
  return 'gray';
}

export function AuditPage(): React.JSX.Element {
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({
      page,
      limit: 30,
      resource: resource || undefined,
      action: action || undefined
    }),
    [action, page, resource]
  );

  const auditQuery = useAuditLogs(filter);
  const rows = auditQuery.data?.items ?? [];
  const meta = auditQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Governance"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Audit' }
            ]}
          />
        }
        title="Audit trail"
        subtitle="Immutable history of critical actions and administrative events."
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => { setResource(''); setAction(''); setPage(1); }}>
            Clear
          </Button>
        }
      >
        <Input label="Resource" value={resource} onChange={(event) => setResource(event.target.value)} placeholder="service_order, user..." />
        <Input label="Action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="SERVICE_ORDER_UPDATED..." />
      </FilterBar>

      {auditQuery.isError ? (
        <Alert
          variant="danger"
          message={getApiErrorMessage(auditQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void auditQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={auditQuery.isLoading}
        emptyMessage="No audit entry found."
        columns={[
          {
            key: 'createdAt',
            title: 'Date / Time',
            width: '160px',
            render: (row) => (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                {formatDateTime(row.createdAt)}
              </span>
            )
          },
          {
            key: 'actor',
            title: 'User',
            render: (row) => <span style={{ fontWeight: 500, fontSize: '0.845rem' }}>{row.actor?.fullName ?? 'System'}</span>
          },
          {
            key: 'action',
            title: 'Action',
            render: (row) => (
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                background: 'var(--surface-soft)',
                padding: '2px 6px',
                borderRadius: 4,
                color: 'var(--primary)'
              }}>
                {String(row.action)}
              </code>
            )
          },
          {
            key: 'resource',
            title: 'Resource',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{String(row.resource)}</span>
          },
          {
            key: 'resourceId',
            title: 'ID',
            width: '120px',
            render: (row) => (
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {row.resourceId ? `${String(row.resourceId).slice(0, 8)}...` : '-'}
              </span>
            )
          },
          {
            key: 'severity',
            title: 'Severity',
            width: '110px',
            render: (row) => <StatusBadge label={String(row.severity)} tone={getSeverityTone(String(row.severity))} />
          }
        ]}
      />

      <Pagination meta={meta} loading={auditQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

