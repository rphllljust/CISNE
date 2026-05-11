import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useCancelInvoice, useInvoiceById } from '@/features/invoices/api/invoices.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge
} from '@/shared/ui';

import '../../pages.css';

const statusLabel = { DRAFT: 'Rascunho', ISSUED: 'Emitida', CANCELED: 'Cancelada' };
const statusTone = { DRAFT: 'gray', ISSUED: 'green', CANCELED: 'red' } as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function InvoiceDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceQuery = useInvoiceById(id);
  const cancelMutation = useCancelInvoice();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const invoice = invoiceQuery.data;

  async function handleCancel(): Promise<void> {
    if (!cancelReason.trim()) return;
    await cancelMutation.mutateAsync({ id, reason: cancelReason });
    setShowCancel(false);
    void invoiceQuery.refetch();
  }

  if (invoiceQuery.isLoading) {
    return (
      <section className="page-grid">
        <Skeleton height={64} />
        <Skeleton height={200} />
        <Skeleton height={120} />
      </section>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <section className="page-grid">
        <Alert
          variant="danger"
          title="Nota fiscal nao encontrada"
          message={getApiErrorMessage(invoiceQuery.error)}
          action={<Button variant="secondary" onClick={() => void navigate(appRoutes.invoices)}>Voltar para notas fiscais</Button>}
        />
      </section>
    );
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
              { label: invoice.invoiceNumber }
            ]}
          />
        }
        title={invoice.invoiceNumber}
        subtitle={`Ordem de Servico #${invoice.serviceOrder?.orderNumber ?? '-'} - ${invoice.client?.name ?? '-'}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge
              label={statusLabel[invoice.status]}
              tone={statusTone[invoice.status]}
            />
            {invoice.status === 'ISSUED' && (
              <Link to={`/invoices/${id}/print`}>
                <Button variant="secondary" size="sm">
                  🖨️ Imprimir NFS-e
                </Button>
              </Link>
            )}
            {invoice.status !== 'CANCELED' && (
              <Button variant="danger" size="sm" onClick={() => setShowCancel(true)}>
                Cancelar Nota Fiscal
              </Button>
            )}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>
            DADOS DO CLIENTE
          </h3>
          <dl style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome</dt>
              <dd style={{ fontWeight: 600 }}>{invoice.client?.name ?? '-'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPF/CNPJ</dt>
              <dd style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>{invoice.client?.taxId ?? '-'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>
            DETALHES DA NOTA FISCAL
          </h3>
          <dl style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emitida em</dt>
              <dd>{invoice.issueDate ? formatDateTime(invoice.issueDate) : '-'}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vencimento</dt>
              <dd>{invoice.dueDate ? formatDateTime(invoice.dueDate) : '-'}</dd>
            </div>
            {invoice.canceledAt && (
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Cancelada em</dt>
                <dd style={{ color: 'var(--danger)' }}>{formatDateTime(invoice.canceledAt)}</dd>
              </div>
            )}
            {invoice.cancellationReason && (
              <div>
                <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo do cancelamento</dt>
                <dd style={{ color: 'var(--text-soft)' }}>{invoice.cancellationReason}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>
          RESUMO FINANCEIRO
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {[
            { label: 'Valor Bruto', value: invoice.grossAmount },
            { label: 'Desconto', value: invoice.discountAmount },
            { label: 'Imposto', value: invoice.taxAmount },
            { label: 'Valor Liquido', value: invoice.netAmount, highlight: true }
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ textAlign: 'center', padding: '1rem', background: highlight ? 'var(--primary-subtle)' : 'var(--surface-raised)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: highlight ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: highlight ? 'var(--primary)' : 'var(--text)' }}>
                {formatCurrency(value)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {invoice.description && (
        <Card>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>DESCRICAO</h3>
          <p style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>{invoice.description}</p>
        </Card>
      )}

      {invoice.serviceOrder && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`${appRoutes.serviceOrders}/${invoice.serviceOrderId}`}>
            <Button variant="secondary">Ver Ordem de Servico #{invoice.serviceOrder.orderNumber}</Button>
          </Link>
        </div>
      )}

      <Modal
        open={showCancel}
        title="Cancelar Nota Fiscal"
        onClose={() => setShowCancel(false)}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ color: 'var(--text-soft)' }}>
            Esta acao nao pode ser desfeita. Informe o motivo do cancelamento da nota <strong>{invoice.invoiceNumber}</strong>.
          </p>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>
              Motivo *
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
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
              placeholder="Descreva o motivo do cancelamento..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCancel(false)}>Voltar</Button>
            <Button
              variant="danger"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => void handleCancel()}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </div>

          {cancelMutation.isError && (
            <Alert variant="danger" message={getApiErrorMessage(cancelMutation.error)} />
          )}
        </div>
      </Modal>
    </section>
  );
}
