import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useClients } from '@/features/clients/api/clients.api';
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

export function ClientsListPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      active: active === '' ? undefined : active === 'true'
    }),
    [active, page, search]
  );

  const clientsQuery = useClients(filter);
  const rows = clientsQuery.data?.items ?? [];
  const meta = clientsQuery.data?.meta;

  function handleLimpar(): void {
    setSearch('');
    setActive('');
    setPage(1);
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="CRM"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Clientes' }
            ]}
          />
        }
        title="Clientes"
        subtitle="Gerencie perfis de clientes, contatos e historico de contratos para planejamento operacional."
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={handleLimpar}>
            Limpar
          </Button>
        }
      >
        <Input
          label="Buscar"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, tax ID or main contact"
        />
        <Select
          label="Status"
          value={active}
          onChange={(event) => setActive(event.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' }
          ]}
        />
      </FilterBar>

      {clientsQuery.isError ? (
        <Alert
          variant="danger"
          message={getApiErrorMessage(clientsQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void clientsQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={clientsQuery.isLoading}
        emptyMessage="Nenhum cliente encontrado para os filtros atuais."
        columns={[
          {
            key: 'name',
            title: 'Client',
            render: (row) => (
              <Link to={`${appRoutes.clients}/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>
                {row.name}
              </Link>
            )
          },
          {
            key: 'taxId',
            title: 'Imposto ID',
            width: '140px',
            render: (row) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-soft)' }}>{row.taxId || '-'}</span>
            )
          },
          {
            key: 'contactName',
            title: 'Main contact',
            render: (row) => <span style={{ fontSize: '0.845rem' }}>{row.contactName || '-'}</span>
          },
          {
            key: 'active',
            title: 'Status',
            width: '110px',
            render: (row) => <StatusBadge label={row.active ? 'Active' : 'Inactive'} tone={row.active ? 'green' : 'gray'} />
          },
          {
            key: 'updatedAt',
            title: 'Updated',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(row.updatedAt)}</span>
          }
        ]}
      />

      <Pagination meta={meta} loading={clientsQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

