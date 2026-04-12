import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateArticle } from '@/features/knowledge-base/api/knowledge-base.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Button, Card, Input, PageHeader } from '@/shared/ui';

import '../../pages.css';

export function CreateArticlePage(): React.JSX.Element {
  const navigate = useNavigate();
  const createMutation = useCreateArticle();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const article = await createMutation.mutateAsync({ title, content, tags: tags.length ? tags : undefined });
    void navigate(`${appRoutes.knowledgeBase}/${article.id}`);
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Base de Conhecimento"
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Painel', to: appRoutes.dashboard },
            { label: 'Base de Conhecimento', to: appRoutes.knowledgeBase },
            { label: 'New Article' }
          ]} />
        }
        title="New Article"
        subtitle="Crie um artigo da base de conhecimento para referencia operacional."
      />

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1.25rem' }}>
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            required
          />
          <Input
            label="Tags (comma-separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. network, hardware, procedure"
          />
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Write the article content here..."
            />
          </div>

          {createMutation.isError && <Alert variant="danger" message={getApiErrorMessage(createMutation.error)} />}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => void navigate(appRoutes.knowledgeBase)}>Cancelar</Button>
            <Button type="submit" disabled={!title || !content || createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar como rascunho'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
