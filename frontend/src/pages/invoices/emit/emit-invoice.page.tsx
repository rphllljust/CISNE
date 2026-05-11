import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEmitInvoice } from '@/features/invoices/api/invoices.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Input,
  PageHeader
} from '@/shared/ui';

import '../../pages.css';

export function EmitInvoicePage(): React.JSX.Element {
  const navigate = useNavigate();
  const emitMutation = useEmitInvoice();

  const [serviceOrderId, setServiceOrderId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const invoice = await emitMutation.mutateAsync({
      serviceOrderId,
      discountAmount: parseFloat(discountAmount) || 0,
      taxAmount: parseFloat(taxAmount) || 0,
      dueDate: dueDate || undefined,
      description: description || undefined
    });
    void navigate(`/invoices/${invoice.id}/print`);
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Financeiro"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Notas Fiscais', to: appRoutes.invoices },
              { label: 'Emitir Nota Fiscal' }
            ]}
          />
        }
        title="Emitir Nota Fiscal"
        subtitle="Gere uma nova nota fiscal a partir de uma ordem de servico concluida."
      />

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1.25rem' }}>
          <Input
            label="ID da Ordem de Servico *"
            value={serviceOrderId}
            onChange={(e) => setServiceOrderId(e.target.value)}
            placeholder="Cole o UUID da ordem de servico"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Desconto (R$)"
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
            <Input
              label="Imposto (R$)"
              type="number"
              min="0"
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
            />
          </div>
          <Input
            label="Data de vencimento"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>
              Observacoes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              placeholder="Observacoes adicionais da nota fiscal..."
            />
          </div>

          {emitMutation.isError && (
            <Alert variant="danger" message={getApiErrorMessage(emitMutation.error)} />
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => void navigate(appRoutes.invoices)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!serviceOrderId || emitMutation.isPending}>
              {emitMutation.isPending ? 'Emitindo...' : 'Emitir Nota Fiscal'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
