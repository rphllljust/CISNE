import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ClientAddress, ClientContract } from '@/entities/client/types';
import { useClientById } from '@/features/clients/api/clients.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import { Alert, Breadcrumbs, Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '@/shared/ui';

import '../../pages.css';

function AddressCard({ address }: { address: ClientAddress }): React.JSX.Element {
  return (
    <div
      style={{
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        {address.label ? (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            {address.label}
          </span>
        ) : null}
        {address.isPrimary ? <span className="priority-badge priority-medium" style={{ fontSize: '0.6rem' }}>Primary</span> : null}
      </div>
      <p style={{ margin: 0, fontSize: '0.845rem' }}>
        {address.street}, {address.number}
        {address.complement ? `, ${address.complement}` : ''}
      </p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
        {address.district} - {address.city}/{address.state} - {address.zipCode}
      </p>
    </div>
  );
}

function ContractCard({ contract }: { contract: ClientContract }): React.JSX.Element {
  const isActive = !contract.endDate || new Date(contract.endDate) > new Date();

  return (
    <div
      style={{
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{contract.title}</span>
        <StatusBadge label={isActive ? 'Active' : 'Closed'} tone={isActive ? 'green' : 'gray'} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contract.code}</span>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-soft)' }}>
        <span>Start: {formatDateTime(contract.startDate)}</span>
        {contract.endDate ? <span>End: {formatDateTime(contract.endDate)}</span> : null}
      </div>
      {contract.serviceScope ? <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.5 }}>{contract.serviceScope}</p> : null}
    </div>
  );
}

export function ClientDetailPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const clientQuery = useClientById(id);

  if (clientQuery.isLoading) {
    return (
      <section className="page-grid">
        <Skeleton height={72} />
        <div className="detail-grid">
          <Skeleton height={240} />
          <Skeleton height={200} />
        </div>
      </section>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <section className="page-grid">
        <PageHeader title="Perfil do cliente" subtitle="Nao foi possivel carregar os dados do cliente." />
        <Alert
          variant="danger"
          message={getApiErrorMessage(clientQuery.error)}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => void clientQuery.refetch()}>
                Tentar novamente
              </Button>
              <Button variant="secondary" onClick={() => void navigate(-1)}>
                Voltar
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const client = clientQuery.data;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="CRM"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Clientes', to: appRoutes.clients },
              { label: client.name }
            ]}
          />
        }
        title={client.name}
        subtitle={client.legalName ?? (client.type === 'INDIVIDUAL' ? 'Individual' : 'Business')}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge label={client.active ? 'Active' : 'Inactive'} tone={client.active ? 'green' : 'gray'} />
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Voltar
            </Button>
          </div>
        }
      />

      <div className="detail-grid">
        <div className="page-grid">
          <Card title="Dados do perfil">
            <div className="detail-fields">
              <div className="detail-field">
                <span className="detail-field-label">Type</span>
                <span className="detail-field-value">{client.type === 'INDIVIDUAL' ? 'Individual' : 'Business'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Imposto ID</span>
                <span className="detail-field-value" style={{ fontFamily: 'var(--font-mono)' }}>{client.taxId}</span>
              </div>
              {client.contactName ? (
                <div className="detail-field">
                  <span className="detail-field-label">Main contact</span>
                  <span className="detail-field-value">{client.contactName}</span>
                </div>
              ) : null}
              {client.email ? (
                <div className="detail-field">
                  <span className="detail-field-label">Email</span>
                  <span className="detail-field-value">
                    <a href={`mailto:${client.email}`} style={{ color: 'var(--primary)' }}>
                      {client.email}
                    </a>
                  </span>
                </div>
              ) : null}
              {client.phone || client.mobile ? (
                <div className="detail-field">
                  <span className="detail-field-label">Phone</span>
                  <span className="detail-field-value">
                    {client.phone || client.mobile}
                    {client.phone && client.mobile ? ` / ${client.mobile}` : ''}
                  </span>
                </div>
              ) : null}
              <div className="detail-field">
                <span className="detail-field-label">Created</span>
                <span className="detail-field-value">{formatDateTime(client.createdAt)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Updated</span>
                <span className="detail-field-value">{formatDateTime(client.updatedAt)}</span>
              </div>
            </div>

            {client.notes ? (
              <>
                <hr className="section-divider" />
                <div className="detail-field">
                  <span className="detail-field-label">Notes</span>
                  <span className="detail-field-value" style={{ lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {client.notes}
                  </span>
                </div>
              </>
            ) : null}
          </Card>

          {client.addresses.length > 0 ? (
            <Card title="Addresses" subtitle={`${client.addresses.length} address(es) registered`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {client.addresses.map((address) => (
                  <AddressCard key={address.id} address={address} />
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <Card title="Contracts" subtitle={client.contracts.length > 0 ? `${client.contracts.length} linked contract(s)` : 'Nenhum contrato vinculado'}>
          {client.contracts.length === 0 ? (
            <EmptyState
              title="Nenhum contrato vinculado"
              description="This client does not have active or historical contracts yet."
              action={
                <Link to={appRoutes.clients}>
                  <Button variant="secondary" size="sm">
                    Voltar para clientes
                  </Button>
                </Link>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {client.contracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

