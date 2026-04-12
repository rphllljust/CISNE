import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useSuppliers } from '@/features/suppliers/api/suppliers.api';
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

export function SuppliersListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({ page, limit: 20, search: search || undefined, active: active === '' ? undefined : active === 'true' }),
    [page, search, active]
  );

  const suppliersQuery = useSuppliers(filter);
  const rows = suppliersQuery.data?.items ?? [];
  const meta = suppliersQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Procurement"
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Painel', to: appRoutes.dashboard }, { label: 'Fornecedores' }]} />
        }
        title="Fornecedores"
        subtitle="Gerencie perfis de fornecedores, contatos e contratos."
        actions={
          <Link to={appRoutes.supplierNew}>
            <Button>New Supplier</Button>
          </Link>
        }
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => { setSearch(''); setActive(''); setPage(1); }}>Limpar</Button>
        }
      >
        <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, tax ID or contact" />
        <Select
          label="Status"
          value={active}
          onChange={(e) => setActive(e.target.value)}
          options={[{ value: '', label: 'All' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
        />
      </FilterBar>

      {suppliersQuery.isError && (
        <Alert variant="danger" title="Nao foi possivel carregar os fornecedores" message={getApiErrorMessage(suppliersQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void suppliersQuery.refetch()}>Tentar novamente</Button>} />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={suppliersQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.suppliers}/${row.id}`)}
        emptyMessage="Nenhum fornecedor encontrado."
        columns={[
          {
            key: 'name',
            title: 'Supplier',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.name}</span>
                {row.taxId && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.taxId}</span>}
              </div>
            )
          },
          {
            key: 'contact',
            title: 'Contact',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontSize: '0.845rem' }}>{row.contactName ?? '-'}</span>
                {row.contactEmail && <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.contactEmail}</span>}
              </div>
            )
          },
          {
            key: 'contactPhone',
            title: 'Phone',
            width: '140px',
            render: (row) => <span style={{ fontSize: '0.845rem', color: 'var(--text-soft)' }}>{row.contactPhone ?? '-'}</span>
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

      <Pagination meta={meta} loading={suppliersQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}
