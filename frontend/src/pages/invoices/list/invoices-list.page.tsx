import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { type InvoiceStatus, useInvoices } from '@/features/invoices/api/invoices.api';
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

const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Rascunho',
  ISSUED: 'Emitida',
  CANCELED: 'Cancelada'
};

const statusTone: Record<InvoiceStatus, string> = {
  DRAFT: 'gray',
  ISSUED: 'green',
  CANCELED: 'red'
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function InvoicesListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({ page, limit: 20, search: search || undefined, status: status || undefined }),
    [page, search, status]
  );

  const invoicesQuery = useInvoices(filter);
  const rows = invoicesQuery.data?.items ?? [];
  const meta = invoicesQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Financeiro"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Notas Fiscais' }
            ]}
          />
        }
        title="Notas Fiscais"
        subtitle="Acompanhe, emita e gerencie notas fiscais vinculadas as ordens de servico."
        actions={
          <Link to={appRoutes.invoiceNew}>
            <Button>Emitir Nota Fiscal</Button>
          </Link>
        }
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>
            Limpar
          </Button>
        }
      >
        <Input
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Numero da nota, cliente ou ordem"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Todos os status' },
            { value: 'DRAFT', label: 'Rascunho' },
            { value: 'ISSUED', label: 'Emitida' },
            { value: 'CANCELED', label: 'Cancelada' }
          ]}
        />
      </FilterBar>

      {invoicesQuery.isError ? (
        <Alert
          variant="danger"
          title="Nao foi possivel carregar as notas fiscais"
          message={getApiErrorMessage(invoicesQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void invoicesQuery.refetch()}>Tentar novamente</Button>}
        />
      ) : null}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={invoicesQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.invoices}/${row.id}`)}
        emptyMessage="Nenhuma nota fiscal encontrada."
        columns={[
          {
            key: 'invoiceNumber',
            title: 'Nota #',
            width: '130px',
            render: (row) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {row.invoiceNumber}
              </span>
            )
          },
          {
            key: 'client',
            title: 'Cliente',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.client?.name ?? '-'}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.client?.taxId ?? ''}</span>
              </div>
            )
          },
          {
            key: 'order',
            title: 'Ordem de Servico',
            width: '160px',
            render: (row) => row.serviceOrder ? (
              <Link
                to={`${appRoutes.serviceOrders}/${row.serviceOrderId}`}
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: '0.845rem', color: 'var(--primary)' }}
              >
                #{row.serviceOrder.orderNumber}
              </Link>
            ) : <span style={{ color: 'var(--text-muted)' }}>-</span>
          },
          {
            key: 'netAmount',
            title: 'Total',
            width: '120px',
            align: 'right',
            render: (row) => (
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.netAmount)}</span>
            )
          },
          {
            key: 'status',
            title: 'Status',
            width: '120px',
            render: (row) => (
              <StatusBadge label={statusLabel[row.status]} tone={statusTone[row.status] as 'gray' | 'green' | 'red'} />
            )
          },
          {
            key: 'issueDate',
            title: 'Emitida em',
            width: '150px',
            render: (row) => (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                {row.issueDate ? formatDateTime(row.issueDate) : '-'}
              </span>
            )
          },
          {
            key: 'actions',
            title: '',
            width: '80px',
            align: 'right',
            render: (row) => (
              <Link to={`${appRoutes.invoices}/${row.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="secondary">Ver</Button>
              </Link>
            )
          }
        ]}
      />

      <Pagination meta={meta} loading={invoicesQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}
