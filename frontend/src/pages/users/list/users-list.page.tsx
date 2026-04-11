import { useMemo, useState } from 'react';

import type { UserRole } from '@/entities/auth/types';
import { useUsers } from '@/features/users/api/users.api';
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
  StatusBadge
} from '@/shared/ui';

import '../../pages.css';

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPERATIONS_MANAGER: 'Operations Manager',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Technician',
  ATTENDANT: 'Attendant',
  CLIENT: 'Client'
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function UsersListPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: status || undefined
    }),
    [page, search, status]
  );

  const usersQuery = useUsers(filter);
  const rows = usersQuery.data?.items ?? [];
  const meta = usersQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Administration"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', to: appRoutes.dashboard },
              { label: 'Users and Teams' }
            ]}
          />
        }
        title="Users and Teams"
        subtitle="Manage role assignments, organizational structure and operational capacity."
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>
            Clear
          </Button>
        }
      >
        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' }
          ]}
        />
      </FilterBar>

      {usersQuery.isError ? (
        <Alert
          variant="danger"
          message={getApiErrorMessage(usersQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void usersQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={usersQuery.isLoading}
        emptyMessage="No user found for current filters."
        columns={[
          {
            key: 'fullName',
            title: 'User',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary-text)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {getInitials(row.fullName)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.fullName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</span>
                </div>
              </div>
            )
          },
          {
            key: 'jobTitle',
            title: 'Role / Department',
            render: (row) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: '0.845rem' }}>{row.jobTitle || '-'}</span>
                {row.department ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.department}</span> : null}
              </div>
            )
          },
          {
            key: 'roles',
            title: 'Profiles',
            render: (row) => (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {row.roles.map((role: UserRole) => (
                  <span key={role} className="priority-badge priority-medium" style={{ fontSize: '0.65rem' }}>
                    {roleLabel[role] ?? role}
                  </span>
                ))}
              </div>
            )
          },
          {
            key: 'status',
            title: 'Status',
            width: '110px',
            render: (row) => <StatusBadge label={row.status === 'ACTIVE' ? 'Active' : 'Inactive'} tone={row.status === 'ACTIVE' ? 'green' : 'gray'} />
          },
          {
            key: 'updatedAt',
            title: 'Updated',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{formatDateTime(row.updatedAt)}</span>
          }
        ]}
      />

      <Pagination meta={meta} loading={usersQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

