import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { type ChangeStatus, type ChangeType, type RiskLevel, useChanges } from '@/features/itsm/api/itsm.api';
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

const statusTone: Record<ChangeStatus, 'gray' | 'orange' | 'green' | 'blue' | 'red'> = {
  DRAFT: 'gray', PENDING_APPROVAL: 'orange', APPROVED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green', CANCELLED: 'gray', FAILED: 'red'
};
const typeTone: Record<ChangeType, 'green' | 'blue' | 'red'> = {
  STANDARD: 'green', NORMAL: 'blue', EMERGENCY: 'red'
};
const riskTone: Record<RiskLevel, 'green' | 'orange' | 'red'> = {
  LOW: 'green', MEDIUM: 'orange', HIGH: 'red', CRITICAL: 'red'
};

export function ChangesListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(() => ({ page, limit: 20, search: search || undefined, status: status || undefined, type: type || undefined }), [page, search, status, type]);
  const changesQuery = useChanges(filter);
  const rows = changesQuery.data?.items ?? [];
  const meta = changesQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="ITSM"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Painel', to: appRoutes.dashboard }, { label: 'ITSM' }, { label: 'Mudancas' }]} />}
        title="Solicitacoes de Mudanca"
        subtitle="Gerencie mudancas padrao, normais e emergenciais com avaliacao de risco e aprovacoes."
        actions={<Button onClick={() => void navigate(appRoutes.itsmChangeNew)}>Nova Solicitacao de Mudanca</Button>}
      />

      <FilterBar actions={<Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setType(''); setPage(1); }}>Limpar</Button>}>
        <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titulo ou descricao" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'DRAFT', label: 'Rascunho' },
            { value: 'PENDING_APPROVAL', label: 'Pendente de Aprovacao' },
            { value: 'APPROVED', label: 'Aprovado' },
            { value: 'IN_PROGRESS', label: 'Em andamento' },
            { value: 'COMPLETED', label: 'Concluido' },
            { value: 'FAILED', label: 'Falhou' }
          ]}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: '', label: 'Todos os tipos' },
            { value: 'STANDARD', label: 'Padrao' },
            { value: 'NORMAL', label: 'Normal' },
            { value: 'EMERGENCY', label: 'Emergencial' }
          ]}
        />
      </FilterBar>

      {changesQuery.isError && (
        <Alert variant="danger" message={getApiErrorMessage(changesQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void changesQuery.refetch()}>Tentar novamente</Button>} />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={changesQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.itsmChanges}/${row.id}`)}
        emptyMessage="Nenhuma solicitacao de mudanca encontrada."
        columns={[
          {
            key: 'title',
            title: 'Solicitacao de Mudanca',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.title}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.description.slice(0, 70)}</span>
              </div>
            )
          },
          {
            key: 'type',
            title: 'Tipo',
            width: '120px',
            render: (row) => <StatusBadge label={row.type} tone={typeTone[row.type]} />
          },
          {
            key: 'status',
            title: 'Status',
            width: '150px',
            render: (row) => <StatusBadge label={row.status.replace('_', ' ')} tone={statusTone[row.status]} />
          },
          {
            key: 'riskLevel',
            title: 'Risco',
            width: '100px',
            render: (row) => <StatusBadge label={row.riskLevel} tone={riskTone[row.riskLevel]} />
          },
          {
            key: 'scheduledAt',
            title: 'Agendado',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>{row.scheduledAt ? formatDateTime(row.scheduledAt) : '-'}</span>
          },
          {
            key: 'assignedTo',
            title: 'Responsavel',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.845rem', color: 'var(--text-soft)' }}>{row.assignedTo?.name ?? '-'}</span>
          }
        ]}
      />

      <Pagination meta={meta} loading={changesQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

