import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { type ProblemStatus, type RiskLevel, useProblems } from '@/features/itsm/api/itsm.api';
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

const statusTone: Record<ProblemStatus, 'red' | 'orange' | 'blue' | 'green' | 'gray'> = {
  OPEN: 'red', INVESTIGATING: 'orange', KNOWN_ERROR: 'blue', RESOLVED: 'green', CLOSED: 'gray'
};
const riskTone: Record<RiskLevel, 'green' | 'orange' | 'red' | 'red'> = {
  LOW: 'green', MEDIUM: 'orange', HIGH: 'red', CRITICAL: 'red'
};

export function ProblemsListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(() => ({ page, limit: 20, search: search || undefined, status: status || undefined }), [page, search, status]);
  const problemsQuery = useProblems(filter);
  const rows = problemsQuery.data?.items ?? [];
  const meta = problemsQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="ITSM"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Painel', to: appRoutes.dashboard }, { label: 'ITSM' }, { label: 'Problemas' }]} />}
        title="Problem Records"
        subtitle="Acompanhe causas raiz, contornos e erros conhecidos de incidentes operacionais."
        actions={<Button onClick={() => void navigate(appRoutes.itsmProblemNew)}>New Problem</Button>}
      />

      <FilterBar actions={<Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>Limpar</Button>}>
        <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titulo ou descricao" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'OPEN', label: 'Aberto' },
            { value: 'INVESTIGATING', label: 'Investigating' },
            { value: 'KNOWN_ERROR', label: 'Known Error' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' }
          ]}
        />
      </FilterBar>

      {problemsQuery.isError && (
        <Alert variant="danger" message={getApiErrorMessage(problemsQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void problemsQuery.refetch()}>Tentar novamente</Button>} />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={problemsQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.itsmProblems}/${row.id}`)}
        emptyMessage="Nenhum problema encontrado."
        columns={[
          {
            key: 'title',
            title: 'Problem',
            render: (row) => (
              <div style={{ display: 'grid', gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.title}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{row.description.slice(0, 70)}</span>
              </div>
            )
          },
          {
            key: 'status',
            title: 'Status',
            width: '140px',
            render: (row) => <StatusBadge label={row.status.replace('_', ' ')} tone={statusTone[row.status]} />
          },
          {
            key: 'riskLevel',
            title: 'Risk',
            width: '100px',
            render: (row) => <StatusBadge label={row.riskLevel} tone={riskTone[row.riskLevel]} />
          },
          {
            key: 'assignedTo',
            title: 'Assigned',
            width: '160px',
            render: (row) => <span style={{ fontSize: '0.845rem', color: 'var(--text-soft)' }}>{row.assignedTo?.name ?? '-'}</span>
          },
          {
            key: 'createdAt',
            title: 'Created',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(row.createdAt)}</span>
          }
        ]}
      />

      <Pagination meta={meta} loading={problemsQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

