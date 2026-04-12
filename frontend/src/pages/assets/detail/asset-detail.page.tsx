import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  type CreateMaintenanceInput,
  type MaintenanceType,
  useAssetById,
  useCreateMaintenance
} from '@/features/assets/api/assets.api';
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

const statusLabel = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', MAINTENANCE: 'Manutencao', DECOMMISSIONED: 'Desativado' };
const statusTone = { ACTIVE: 'green', INACTIVE: 'gray', MAINTENANCE: 'orange', DECOMMISSIONED: 'red' } as const;
const conditionLabel = { NEW: 'Novo', GOOD: 'Bom', FAIR: 'Regular', POOR: 'Ruim', CRITICAL: 'Critico' };
const conditionTone = { NEW: 'blue', GOOD: 'green', FAIR: 'orange', POOR: 'red', CRITICAL: 'red' } as const;
const maintTypeLabel: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva', CORRECTIVE: 'Corretiva', INSPECTION: 'Inspecao', CALIBRATION: 'Calibracao'
};
const maintStatusTone = { SCHEDULED: 'blue', IN_PROGRESS: 'orange', COMPLETED: 'green', CANCELLED: 'gray' } as const;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function AssetDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetQuery = useAssetById(id);
  const createMaint = useCreateMaintenance();

  const [showMaint, setShowMaint] = useState(false);
  const [maintForm, setMaintForm] = useState<Omit<CreateMaintenanceInput, 'assetId'>>({
    type: 'PREVENTIVE',
    description: '',
    scheduledAt: '',
    cost: undefined,
    notes: ''
  });

  const asset = assetQuery.data;

  async function handleCreateMaint(): Promise<void> {
    await createMaint.mutateAsync({ assetId: id, ...maintForm });
    setShowMaint(false);
    setMaintForm({ type: 'PREVENTIVE', description: '', scheduledAt: '', notes: '' });
    void assetQuery.refetch();
  }

  if (assetQuery.isLoading) {
    return <section className="page-grid"><Skeleton height={64} /><Skeleton height={240} /></section>;
  }

  if (assetQuery.isError || !asset) {
    return (
      <section className="page-grid">
        <Alert variant="danger" title="Ativo nao encontrado" message={getApiErrorMessage(assetQuery.error)}
          action={<Button variant="secondary" onClick={() => void navigate(appRoutes.assets)}>Voltar</Button>} />
      </section>
    );
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operacoes"
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Painel', to: appRoutes.dashboard },
            { label: 'Ativos', to: appRoutes.assets },
            { label: asset.name }
          ]} />
        }
        title={asset.name}
        subtitle={`Tag: ${asset.assetTag}${asset.serialNumber ? ` - S/N: ${asset.serialNumber}` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <StatusBadge label={statusLabel[asset.status]} tone={statusTone[asset.status]} />
            <StatusBadge label={conditionLabel[asset.condition]} tone={conditionTone[asset.condition]} />
            <Button size="sm" onClick={() => setShowMaint(true)}>Agendar manutencao</Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>DADOS DO ATIVO</h3>
          <dl style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              ['Fabricante', asset.manufacturer],
              ['Modelo', asset.model],
              ['Localizacao', asset.location],
              ['Data de compra', asset.purchaseDate ? formatDateTime(asset.purchaseDate) : null],
              ['Garantia ate', asset.warrantyExpiresAt ? formatDateTime(asset.warrantyExpiresAt) : null],
              ['Proxima manutencao', asset.nextMaintenanceAt ? formatDateTime(asset.nextMaintenanceAt) : null],
              ['Cliente', asset.client?.name],
              ['Fornecedor', asset.supplier?.name],
            ].map(([label, value]) => value ? (
              <div key={String(label)}>
                <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</dt>
                <dd style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value}</dd>
              </div>
            ) : null)}
          </dl>
        </Card>

        {asset.notes && (
          <Card>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>OBSERVACOES</h3>
            <p style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>{asset.notes}</p>
          </Card>
        )}
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>HISTORICO DE MANUTENCAO</h3>
          <Button size="sm" variant="secondary" onClick={() => setShowMaint(true)}>+ Agendar</Button>
        </div>
        {!asset.maintenances?.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ainda nao ha registros de manutencao.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {asset.maintenances.map((m) => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{maintTypeLabel[m.type]}</span>
                    <StatusBadge
                      label={m.status.replace('_', ' ')}
                      tone={maintStatusTone[m.status as keyof typeof maintStatusTone] ?? 'gray'}
                    />
                  </div>
                  <p style={{ fontSize: '0.845rem', color: 'var(--text-soft)', margin: 0 }}>{m.description}</p>
                  {m.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{m.notes}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(m.scheduledAt)}</div>
                  {m.cost != null && <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCurrency(m.cost)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={showMaint}
        title="Agendar manutencao"
        onClose={() => setShowMaint(false)}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Tipo *</label>
            <select
              value={maintForm.type}
              onChange={(e) => setMaintForm(f => ({ ...f, type: e.target.value as MaintenanceType }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem' }}
            >
              {(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION'] as MaintenanceType[]).map(t => (
                <option key={t} value={t}>{maintTypeLabel[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Descricao *</label>
            <textarea
              value={maintForm.description}
              onChange={(e) => setMaintForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Data agendada *</label>
            <input
              type="datetime-local"
              value={maintForm.scheduledAt}
              onChange={(e) => setMaintForm(f => ({ ...f, scheduledAt: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Custo estimado (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maintForm.cost ?? ''}
              onChange={(e) => setMaintForm(f => ({ ...f, cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>
          {createMaint.isError && <Alert variant="danger" message={getApiErrorMessage(createMaint.error)} />}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowMaint(false)}>Cancelar</Button>
            <Button
              disabled={!maintForm.description || !maintForm.scheduledAt || createMaint.isPending}
              onClick={() => void handleCreateMaint()}
            >
              {createMaint.isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

