import { useNavigate, useParams } from 'react-router-dom';

import { type ContractStatus, useSupplierById } from '@/features/suppliers/api/suppliers.api';
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

const contractStatusTone: Record<ContractStatus, 'gray' | 'blue' | 'green' | 'orange' | 'red'> = {
  DRAFT: 'gray', ACTIVE: 'green', SUSPENDED: 'orange', EXPIRED: 'red', CANCELLED: 'red'
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function SupplierDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplierQuery = useSupplierById(id);
  const supplier = supplierQuery.data;

  if (supplierQuery.isLoading) {
    return <section className="page-grid"><Skeleton height={64} /><Skeleton height={200} /></section>;
  }

  if (supplierQuery.isError || !supplier) {
    return (
      <section className="page-grid">
        <Alert variant="danger" title="Supplier not found" message={getApiErrorMessage(supplierQuery.error)}
          action={<Button variant="secondary" onClick={() => void navigate(appRoutes.suppliers)}>Voltar</Button>} />
      </section>
    );
  }

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Procurement"
        breadcrumbs={
          <Breadcrumbs items={[
            { label: 'Painel', to: appRoutes.dashboard },
            { label: 'Fornecedores', to: appRoutes.suppliers },
            { label: supplier.name }
          ]} />
        }
        title={supplier.name}
        subtitle={supplier.taxId ? `Imposto ID: ${supplier.taxId}` : 'Supplier details and contracts'}
        actions={
          <StatusBadge label={supplier.active ? 'Active' : 'Inactive'} tone={supplier.active ? 'green' : 'gray'} />
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>CONTACT</h3>
          <dl style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              ['Name', supplier.contactName],
              ['E-mail', supplier.contactEmail],
              ['Phone', supplier.contactPhone],
              ['Address', supplier.address],
            ].map(([label, val]) => val ? (
              <div key={String(label)}>
                <dt style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</dt>
                <dd style={{ fontSize: '0.875rem', fontWeight: 500 }}>{val}</dd>
              </div>
            ) : null)}
          </dl>
        </Card>

        {supplier.notes && (
          <Card>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>OBSERVACOES</h3>
            <p style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>{supplier.notes}</p>
          </Card>
        )}
      </div>

      <Card>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>CONTRACTS</h3>
        {!supplier.contracts?.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhum contrato cadastrado.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {supplier.contracts.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title}</span>
                    <StatusBadge label={c.status} tone={contractStatusTone[c.status]} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDateTime(c.startDate)} {c.endDate ? `â†’ ${formatDateTime(c.endDate)}` : ''}
                  </div>
                  {c.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{c.notes}</p>}
                </div>
                {c.value != null && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(c.value)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

