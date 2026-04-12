import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { type ArticleStatus, useArticles } from '@/features/knowledge-base/api/knowledge-base.api';
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

const statusTone: Record<ArticleStatus, 'gray' | 'orange' | 'green' | 'blue'> = {
  DRAFT: 'gray', REVIEW: 'orange', PUBLISHED: 'green', ARCHIVED: 'blue'
};

export function KnowledgeBaseListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filter = useMemo(() => ({ page, limit: 20, search: search || undefined, status: status || undefined }), [page, search, status]);
  const articlesQuery = useArticles(filter);
  const rows = articlesQuery.data?.items ?? [];
  const meta = articlesQuery.data?.meta;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Knowledge"
        breadcrumbs={<Breadcrumbs items={[{ label: 'Painel', to: appRoutes.dashboard }, { label: 'Base de Conhecimento' }]} />}
        title="Base de Conhecimento"
        subtitle="Centralized articles, procedures and technical documentation for operations."
        actions={
          <Link to={appRoutes.knowledgeBaseNew}>
            <Button>New Article</Button>
          </Link>
        }
      />

      <FilterBar actions={<Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>Limpar</Button>}>
        <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titulo, conteudo ou tags" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'DRAFT', label: 'Rascunho' },
            { value: 'REVIEW', label: 'Under Review' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' }
          ]}
        />
      </FilterBar>

      {articlesQuery.isError && (
        <Alert variant="danger" message={getApiErrorMessage(articlesQuery.error)}
          action={<Button variant="secondary" size="sm" onClick={() => void articlesQuery.refetch()}>Tentar novamente</Button>} />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={articlesQuery.isLoading}
        onRowClick={(row) => void navigate(`${appRoutes.knowledgeBase}/${row.id}`)}
        emptyMessage="No articles found."
        columns={[
          {
            key: 'title',
            title: 'Article',
            render: (row) => (
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.title}</span>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {row.tags?.map(tag => (
                    <span key={tag} style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '999px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )
          },
          {
            key: 'status',
            title: 'Status',
            width: '130px',
            render: (row) => <StatusBadge label={row.status} tone={statusTone[row.status]} />
          },
          {
            key: 'version',
            title: 'Version',
            width: '80px',
            render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>v{row.version}</span>
          },
          {
            key: 'author',
            title: 'Author',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.845rem', color: 'var(--text-soft)' }}>{row.author?.name ?? '-'}</span>
          },
          {
            key: 'updatedAt',
            title: 'Updated',
            width: '150px',
            render: (row) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(row.updatedAt)}</span>
          }
        ]}
      />

      <Pagination meta={meta} loading={articlesQuery.isLoading} onPageChange={setPage} />
    </section>
  );
}

