import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

import { httpClient } from '@/shared/api/http-client';
import { Alert, Button, Card, PageHeader, Skeleton, StatusBadge } from '@/shared/ui';

interface ServiceOrderData {
  id: string;
  orderNumber: number;
  title: string;
  description?: string | null;
  status: string;
  estimatedValue?: number | null;
  client: { name: string; taxId: string };
}

interface InvoiceData {
  id: string;
  invoiceNumber: number;
  grossAmount: number;
  discountAmount?: number | null;
  taxAmount?: number | null;
  netAmount: number;
}

interface EmitNfseResponse {
  id: string;
  numero?: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function NfseEmitPage() {
  const { serviceOrderId, invoiceId } = useParams<{ serviceOrderId: string; invoiceId: string }>();
  const navigate = useNavigate();

  const { data: so, isLoading: soLoading, isError: soError } = useQuery({
    queryKey: ['service-order', serviceOrderId],
    queryFn: async (): Promise<ServiceOrderData> => {
      const { data } = await httpClient.get<ServiceOrderData>(`/service-orders/${serviceOrderId}`);
      return data;
    }
  });

  const { data: invoice, isLoading: invoiceLoading, isError: invoiceError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async (): Promise<InvoiceData> => {
      const { data } = await httpClient.get<InvoiceData>(`/invoices/${invoiceId}`);
      return data;
    }
  });

  const emitMutation = useMutation({
    mutationFn: async (): Promise<EmitNfseResponse> => {
      const { data } = await httpClient.post<EmitNfseResponse>('/nfse/emitir', {
        serviceOrderId,
        invoiceId
      });
      return data;
    },
    onSuccess: (data) => {
      navigate(`/nfse/${data.id}`, {
        state: { success: true, message: data.numero ? `NFS-e #${data.numero} emitida com sucesso` : 'NFS-e emitida com sucesso' }
      });
    }
  });

  if (soLoading || invoiceLoading) {
    return (
      <section className="page-grid">
        <Skeleton height={64} />
        <Skeleton height={200} />
        <Skeleton height={120} />
      </section>
    );
  }

  if (soError || invoiceError || !so || !invoice) {
    return (
      <section className="page-grid">
        <PageHeader title="Emitir NFS-e" subtitle="Nao foi possivel carregar os dados necessarios." />
        <Alert
          variant="danger"
          title="Erro ao carregar dados"
          message={soError ? 'Ordem de servico nao encontrada' : 'Fatura nao encontrada'}
          action={
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Voltar
            </Button>
          }
        />
      </section>
    );
  }

  const canEmit = so.status === 'COMPLETED';

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Fiscal"
        title="Emitir NFS-e"
        subtitle={`Ordem de Servico #${so.orderNumber} - ${so.client.name}`}
        actions={
          <Button variant="secondary" onClick={() => void navigate(-1)}>
            Voltar
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card title={`Ordem de Servico #${so.orderNumber}`} subtitle={so.title}>
          <div className="detail-fields">
            <div className="detail-field">
              <span className="detail-field-label">Cliente</span>
              <span className="detail-field-value">{so.client.name}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">CPF/CNPJ</span>
              <span className="detail-field-value" style={{ fontFamily: 'var(--font-mono)' }}>{so.client.taxId}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Status</span>
              <span className="detail-field-value">
                <StatusBadge label={so.status} tone={so.status === 'COMPLETED' ? 'green' : 'blue'} />
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Valor estimado</span>
              <span className="detail-field-value">{formatCurrency(so.estimatedValue ?? 0)}</span>
            </div>
          </div>
        </Card>

        <Card title={`Fatura #${invoice.invoiceNumber}`}>
          <div className="detail-fields">
            <div className="detail-field">
              <span className="detail-field-label">Valor bruto</span>
              <span className="detail-field-value">{formatCurrency(invoice.grossAmount)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Descontos</span>
              <span className="detail-field-value">-{formatCurrency(invoice.discountAmount ?? 0)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Impostos</span>
              <span className="detail-field-value">{formatCurrency(invoice.taxAmount ?? 0)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Valor liquido</span>
              <span className="detail-field-value" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(invoice.netAmount)}</span>
            </div>
          </div>
        </Card>
      </div>

      {!canEmit && (
        <Alert
          variant="warning"
          title="Nao e possivel emitir NFS-e"
          message="A Ordem de Servico deve estar com status COMPLETED para emitir NFS-e."
        />
      )}

      <Card title="Informacoes Fiscais" subtitle="Dados que serao enviados a SEFAZ">
        <div className="detail-fields">
          <div className="detail-field">
            <span className="detail-field-label">Tomador (CPF/CNPJ)</span>
            <span className="detail-field-value" style={{ fontFamily: 'var(--font-mono)' }}>{so.client.taxId}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Codigo de Servico</span>
            <span className="detail-field-value" style={{ fontFamily: 'var(--font-mono)' }}>0101 (Analise e desenvolvimento)</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Aliquota ISS</span>
            <span className="detail-field-value" style={{ fontFamily: 'var(--font-mono)' }}>5% (LC 116/2003)</span>
          </div>
          <div className="detail-field">
            <span className="detail-field-label">Discriminacao</span>
            <span className="detail-field-value">{so.description || so.title}</span>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button
          onClick={() => void emitMutation.mutate()}
          disabled={!canEmit || emitMutation.isPending}
        >
          {emitMutation.isPending ? 'Emitindo...' : 'Emitir NFS-e'}
        </Button>
        <Button variant="secondary" onClick={() => void navigate(-1)}>
          Cancelar
        </Button>
      </div>

      {emitMutation.isError && (
        <Alert
          variant="danger"
          title="Erro na emissao"
          message={emitMutation.error instanceof Error ? emitMutation.error.message : 'Erro ao emitir NFS-e. Tente novamente.'}
        />
      )}
    </section>
  );
}

