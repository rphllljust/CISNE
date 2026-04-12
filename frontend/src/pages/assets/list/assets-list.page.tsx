import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { type AssetCondition, type AssetStatus, useAssets } from '@/features/assets/api/assets.api';
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

const statusLabel: Record<AssetStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Maintenance',
  DECOMMISSIONED: 'Decommissioned'
};
const statusTone: Record<AssetStatus, 'green' | 'gray' | 'orange' | 'red'> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  MAINTENANCE: 'orange',
  DECOMMISSIONED: 'red'
};
const conditionLabel: Record<AssetCondition, string> = {
  NEW: 'New', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor', CRITICAL: 'Critical'
};
const conditionTone: Record<AssetCondition, 'green' | 'blue' | 'orange' | 'red' | 'gray'> = {
  NEW: 'blue', GOOD: 'green', FAIR: 'orange', POOR: 'red', CRITICAL: 'red'
};

export function AssetsListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(
    () => ({ page, limit: 20, search: search || undefined, status: status || undefined, condition: condition || undefined }),
    [page, search, status, condition]
  );

  const assetsQuery = useAssets(filter);
  const rows = assetsQuery.data?.items ?? [];
  const meta = assetsQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Painel', to: appRoutes.dashboard }, { label: 'Ativos' }]} />
        }
        title="Ativos"
        subtitle="Acompanhe ciclo de vida dos equipamentos, agenda de manutencao e inventario."
        actions={
          <Link to={appRoutes.assetNew}>
            <Button>New Asset</Button>
          </Link>
        }
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setCondition(''); setPage(1); }}>
            Limpar
          </Button>
        }
      >
        <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, patrimonio ou numero de serie" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Todos statuses' },
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
            { value: 'MAINTENANCE', label: 'Maintenance' },
            { value: 'DECOMMISSIONED', label: 'Decommissioned' }
          ]}
        />
        <Select
          label="Condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          options={[
            { value: '', label: 'Todos conditions' },
            { value: 'NEW', label: 'New' },
            { value: 'GOOD', label: 'Good' },
            { value: 'FAIR', label: 'Fair' },
            { value: 'POOR', label: 'Poor' },
            { value: 'CRITICAL', label: 'Critical' }
          ]}
        />
      </FilterBar>

      {assetsQuery.isError && (
        <Alert variant="danger" title="Nao foi possivel carregar os ativos" message={getApiErrorMessage(assetsQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void assetsQuery.refetch()}>Tentar novamente</Button>} />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={assetsQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.assets}/${row.id}`)}
        emptyMessage="Nenhum ativo encontrado."
        columns={[
          {
            key: 'assetTag',
            title: 'Tag',
            width: '110px',
            render: (row) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.assetTag}</span>
            )
          },
          {
            key: 'name',
            title: 'Asset',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.name}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{[row.manufacturer, row.model].filter(Boolean).join(' Ã‚Â· ')}</span>
              </div>
            )
          },
          {
            key: 'status',
            title: 'Status',
            width: '140px',
            render: (row) => <StatusBadge label={statusLabel[row.status]} tone={statusTone[row.status]} />
          },
          {
            key: 'condition',
            title: 'Condition',
            width: '120px',
            render: (row) => <StatusBadge label={conditionLabel[row.condition]} tone={conditionTone[row.condition]} />
          },
          {
            key: 'location',
            title: 'Location',
            render: (row) => <span style={{ fontSize: '0.845rem', color: 'var(--text-soft)' }}>{row.location ?? '-'}</span>
          },
          {
            key: 'nextMaintenanceAt',
            title: 'Next Maintenance',
            width: '160px',
            render: (row) => (
              <span style={{ fontSize: '0.8rem', color: row.nextMaintenanceAt && new Date(row.nextMaintenanceAt) < new Date() ? 'var(--danger)' : 'var(--text-soft)' }}>
                {row.nextMaintenanceAt ? formatDateTime(row.nextMaintenanceAt) : '-'}
              </span>
            )
          },
          {
            key: 'actions',
            title: '',
            width: '80px',
            align: 'right',
            render: (row) => (
              <Link to={`${appRoutes.assets}/${row.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="secondary">Ver</Button>
              </Link>
            )
          }
        ]}
      />

      <Pagination meta={meta} loading={assetsQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}



