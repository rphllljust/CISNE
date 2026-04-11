import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { serviceOrderStatusLabel, serviceOrderStatusTone } from '@/entities/service-order/status-map';
import type { Priority } from '@/entities/service-order/types';
import { useServiceOrders } from '@/features/service-orders/api/service-orders.api';
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
  Select,
  Skeleton,
  StatusBadge
} from '@/shared/ui';

import '../../pages.css';

const priorityLabel: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

const priorityClass: Record<Priority, string> = {
  LOW: 'priority-badge priority-low',
  MEDIUM: 'priority-badge priority-medium',
  HIGH: 'priority-badge priority-high',
  CRITICAL: 'priority-badge priority-critical'
};

export function ServiceOrdersListPage(): React.JSX.Element {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined
    }),
    [page, priority, search, status]
  );

  const serviceOrdersQuery = useServiceOrders(filter);
  const rows = serviceOrdersQuery.data?.items ?? [];
  const meta = serviceOrdersQuery.data?.meta;

  function handleClear(): void {
    setSearch('');
    setStatus('');
    setPriority('');
    setPage(1);
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Service Orders' }
            ]}
          />
        }
        title="Service Orders"
        subtitle="Operational command center with advanced filtering, SLA context and status control."
        actions={
          <Link to={appRoutes.serviceOrderNew}>
            <Button>New Service Order</Button>
          </Link>
        }
      />

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={() => setPage(1)}>Apply filters</Button>
          </>
        }
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          label="Search"
          placeholder="Order title, description or ID"
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            ...Object.entries(serviceOrderStatusLabel).map(([value, label]) => ({ value, label }))
          ]}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          options={[
            { value: '', label: 'All priorities' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' }
          ]}
        />
      </FilterBar>

      {serviceOrdersQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      ) : serviceOrdersQuery.isError ? (
        <Alert
          variant="danger"
          title="Unable to load service orders"
          message={getApiErrorMessage(serviceOrdersQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void serviceOrdersQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => void navigate(`${appRoutes.serviceOrders}/${row.id}`)}
          caption="Click a row to open the order timeline and actions."
          emptyMessage="No service order found for the selected filters."
          columns={[
            {
              key: 'orderNumber',
              title: 'Order',
              width: '110px',
              render: (row) => (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  #{row.orderNumber}
                </span>
              )
            },
            {
              key: 'title',
              title: 'Service Order',
              render: (row) => (
                <div style={{ display: 'grid', gap: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem' }}>{row.title}</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.description.slice(0, 60)}</span>
                </div>
              )
            },
            {
              key: 'priority',
              title: 'Priority',
              width: '120px',
              render: (row) => <span className={priorityClass[row.priority]}>{priorityLabel[row.priority]}</span>
            },
            {
              key: 'status',
              title: 'Status',
              width: '140px',
              render: (row) => (
                <StatusBadge label={serviceOrderStatusLabel[row.status]} tone={serviceOrderStatusTone[row.status]} />
              )
            },
            {
              key: 'openedAt',
              title: 'Opened',
              width: '150px',
              render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{formatDateTime(row.openedAt)}</span>
            },
            {
              key: 'slaDueAt',
              title: 'SLA due',
              width: '150px',
              render: (row) => (
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: row.slaBreached ? 'var(--danger)' : 'var(--text-soft)',
                    fontWeight: row.slaBreached ? 600 : 400
                  }}
                >
                  {formatDateTime(row.slaDueAt)}
                </span>
              )
            },
            {
              key: 'actions',
              title: 'Actions',
              width: '160px',
              align: 'right',
              render: (row) => (
                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                  <Link to={`${appRoutes.serviceOrders}/${row.id}`} onClick={(event) => event.stopPropagation()}>
                    <Button size="sm" variant="secondary">
                      View
                    </Button>
                  </Link>
                  <Link to={`${appRoutes.serviceOrders}/${row.id}/edit`} onClick={(event) => event.stopPropagation()}>
                    <Button size="sm">Edit</Button>
                  </Link>
                </div>
              )
            }
          ]}
        />
      )}

      <Pagination meta={meta} loading={serviceOrdersQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

