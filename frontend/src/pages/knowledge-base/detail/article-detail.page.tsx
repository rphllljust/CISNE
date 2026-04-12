import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useArticleById, useUpdateArticle } from '@/features/knowledge-base/api/knowledge-base.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  PageHeader,
  Skeleton,
  StatusBadge
} from '@/shared/ui';

import '../../pages.css';

const statusTone = { DRAFT: 'gray', REVIEW: 'orange', PUBLISHED: 'green', ARCHIVED: 'blue' } as const;

export function ArticleDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleQuery = useArticleById(id);
  const updateMutation = useUpdateArticle();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const article = articleQuery.data;

  function startEdit(): void {
    if (!article) return;
    setEditTitle(article.title);
    setEditContent(article.content);
    setIsEditing(true);
  }

  async function handleSalvar(): Promise<void> {
    await updateMutation.mutateAsync({ id, title: editTitle, content: editContent });
    setIsEditing(false);
    void articleQuery.refetch();
  }

  async function handlePublish(): Promise<void> {
    await updateMutation.mutateAsync({ id, status: 'PUBLISHED' });
    void articleQuery.refetch();
  }

  async function handleArchive(): Promise<void> {
    await updateMutation.mutateAsync({ id, status: 'ARCHIVED' });
    void articleQuery.refetch();
  }

  if (articleQuery.isLoading) {
    return <section className="page-grid"><Skeleton height={64} /><Skeleton height={400} /></section>;
  }

  if (articleQuery.isError || !article) {
    return (
      <section className="page-grid">
        <Alert variant="danger" title="Article not found" message={getApiErrorMessage(articleQuery.error)}
          action={<Button variant="secondary" onClick={() => void navigate(appRoutes.knowledgeBase)}>Voltar</Button>} />
      </section>
    );
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Base de Conhecimento"
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Painel', to: appRoutes.dashboard },
            { label: 'Base de Conhecimento', to: appRoutes.knowledgeBase },
            { label: article.title }
          ]} />
        }
        title={isEditing ? 'Editando artigo' : article.title}
        subtitle={`v${article.version} Ã‚Â· ${article.author?.name ?? 'Desconhecido'} Ã‚Â· Atualizado ${formatDateTime(article.updatedAt)}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <StatusBadge label={article.status} tone={statusTone[article.status]} />
            {!isEditing && (
              <>
                <Button size="sm" variant="secondary" onClick={startEdit}>Edit</Button>
                {article.status === 'DRAFT' || article.status === 'REVIEW' ? (
                  <Button size="sm" onClick={() => void handlePublish()} disabled={updateMutation.isPending}>
                    Publish
                  </Button>
                ) : article.status === 'PUBLISHED' ? (
                  <Button size="sm" variant="secondary" onClick={() => void handleArchive()} disabled={updateMutation.isPending}>
                    Archive
                  </Button>
                ) : null}
              </>
            )}
            {isEditing && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => void handleSalvar()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {article.tags && article.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {article.tags.map(tag => (
            <span key={tag} style={{ fontSize: '0.75rem', padding: '2px 10px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '999px' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <Card>
        {isEditing ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.7, fontFamily: 'var(--font-mono)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{ lineHeight: 1.7, color: 'var(--text-soft)', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}
          >
            {article.content}
          </div>
        )}
      </Card>

      {updateMutation.isError && (
        <Alert variant="danger" message={getApiErrorMessage(updateMutation.error)} />
      )}

      {article.publishedAt && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Published at {formatDateTime(article.publishedAt)}
        </p>
      )}
    </section>
  );
}


