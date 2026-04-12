import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { serviceOrderStatusLabel, serviceOrderStatusTone } from '@/entities/service-order/status-map';
import type { Priority } from '@/entities/service-order/types';
import {
  transitionServiceOrderStatus,
  useAllowedTransitions,
  useServiceOrderById
} from '@/features/service-orders/api/service-orders.api';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import { queryKeys } from '@/shared/constants/query-keys';
import { appRoutes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/lib/date';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Drawer,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge
} from '@/shared/ui';
import { useToastStore } from '@/shared/ui/toast';

import '../../pages.css';

const priorityLabel: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

const priorityClass: Record<Priority, string> = {
  LOW: 'priority-badge priority-low',
  MEDIUM: 'priority-badge priority-medium',
  HIGH: 'priority-badge priority-high',
  CRITICAL: 'priority-badge priority-critical'
};

export function ServiceOrderDetailPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const serviceOrderQuery = useServiceOrderById(id);

  const transitionMutation = useMutation({
    mutationFn: async ({ toStatus, reason }: { toStatus: string; reason?: string }) =>
      transitionServiceOrderStatus(id, toStatus, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.serviceOrderById(id) });
      await queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      pushToast({ type: 'success', message: 'Status atualizado com sucesso.' });
      setDrawerOpen(false);
    },
    onError: (error) => {
      pushToast({ type: 'error', message: getApiErrorMessage(error) });
    }
  });

  if (serviceOrderQuery.isLoading) {
    return (
      <section className="page-grid">
        <Skeleton height={72} />
        <div className="detail-grid">
          <Skeleton height={360} />
          <Skeleton height={220} />
        </div>
      </section>
    );
  }

  if (serviceOrderQuery.isError || !serviceOrderQuery.data) {
    return (
      <section className="page-grid">
        <PageHeader title="Service Order" subtitle="Nao foi possivel carregar os dados da ordem de servico." />
        <Alert
          variant="danger"
          message={getApiErrorMessage(serviceOrderQuery.error)}
          action={
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Voltar
            </Button>
          }
        />
      </section>
    );
  }

  const order = serviceOrderQuery.data;

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operations"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Ordens de Servico', to: appRoutes.serviceOrders },
              { label: `OS #${order.orderNumber}` }
            ]}
          />
        }
        title={`OS #${order.orderNumber}`}
        subtitle={order.title}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge label={serviceOrderStatusLabel[order.status]} tone={serviceOrderStatusTone[order.status]} />
            <Link to={`${appRoutes.serviceOrders}/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <Button variant="secondary" onClick={() => void navigate(-1)}>
              Voltar
            </Button>
          </div>
        }
      />

      <div className="detail-grid">
        <div className="page-grid">
          <Card title="Operational Summary">
            <div className="detail-fields">
              <div className="detail-field">
                <span className="detail-field-label">Status</span>
                <span className="detail-field-value">
                  <StatusBadge label={serviceOrderStatusLabel[order.status]} tone={serviceOrderStatusTone[order.status]} />
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Priority</span>
                <span className="detail-field-value">
                  <span className={priorityClass[order.priority]}>{priorityLabel[order.priority]}</span>
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">SLA breached</span>
                <span className="detail-field-value" style={{ color: order.slaBreached ? 'var(--danger)' : 'var(--success)' }}>
                  {order.slaBreached ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Opened at</span>
                <span className="detail-field-value">{formatDateTime(order.openedAt)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Start</span>
                <span className="detail-field-value">{formatDateTime(order.startedAt) || '-'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">SLA due</span>
                <span className="detail-field-value">{formatDateTime(order.slaDueAt) || '-'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Concluída em</span>
                <span className="detail-field-value">{formatDateTime(order.completedAt) || '-'}</span>
              </div>
            </div>

            <hr className="section-divider" />

            <div className="detail-field">
              <span className="detail-field-label">Description</span>
              <span className="detail-field-value" style={{ lineHeight: 1.6 }}>{order.description}</span>
            </div>
          </Card>

          <Card title="Linha do tempo de status" subtitle="Historico imutavel de transicoes desta ordem de servico.">
            <div className="timeline">
              {order.statusHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma transicao de status registrada.</p>
              ) : (
                order.statusHistory.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <div />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <StatusBadge
                          label={item.fromStatus ? serviceOrderStatusLabel[item.fromStatus] : 'Created'}
                          tone={item.fromStatus ? serviceOrderStatusTone[item.fromStatus] : 'gray'}
                        />
                        <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <StatusBadge
                          label={serviceOrderStatusLabel[item.toStatus]}
                          tone={serviceOrderStatusTone[item.toStatus]}
                        />
                      </div>
                      <p className="timeline-time">{formatDateTime(item.changedAt)}</p>
                      {item.reason ? <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', marginTop: 2 }}>{item.reason}</p> : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card title="Order Actions" subtitle="Context actions for this operational flow.">
          <div className="page-grid">
            <Button onClick={() => setDrawerOpen(true)}>Abrir painel de status</Button>
            <Link to={`${appRoutes.serviceOrders}/${id}/edit`}>
              <Button variant="secondary" style={{ width: '100%' }}>
                Edit order details
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Transicao de status"
        subtitle="Apply the next valid transition based on backend business rules."
        footer={
          <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
            Close
          </Button>
        }
      >
        <ServiceOrderTransitionActions
          serviceOrderStatus={order.status}
          loading={transitionMutation.isPending}
          onTransition={(toStatus) => transitionMutation.mutate({ toStatus })}
        />
      </Drawer>
    </section>
  );
}

interface ServiceOrderTransitionActionsProps {
  serviceOrderStatus: string;
  loading: boolean;
  onTransition: (toStatus: string) => void;
}

function ServiceOrderTransitionActions({
  serviceOrderStatus,
  loading,
  onTransition
}: ServiceOrderTransitionActionsProps): React.JSX.Element {
  const [selectedStatus, setSelectedStatus] = useState('');
  const transitionsQuery = useAllowedTransitions(serviceOrderStatus);
  const options = transitionsQuery.data ?? [];

  if (transitionsQuery.isLoading) {
    return <Skeleton height={40} />;
  }

  if (transitionsQuery.isError || options.length === 0) {
    return (
      <Alert
        variant={transitionsQuery.isError ? 'danger' : 'warning'}
        message={transitionsQuery.isError ? 'Falha ao carregar as transicoes.' : 'Nenhuma transicao disponivel para o status atual.'}
      />
    );
  }

  return (
    <div className="page-grid">
      <Select
        label="Move to"
        disabled={loading}
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
        options={[
          { value: '', label: 'Select next status...' },
          ...options.map((status) => ({
            value: status,
            label: serviceOrderStatusLabel[status as keyof typeof serviceOrderStatusLabel] ?? status
          }))
        ]}
      />

      <Button
        disabled={!selectedStatus || loading}
        onClick={() => {
          if (!selectedStatus) {
            return;
          }

          onTransition(selectedStatus);
          setSelectedStatus('');
        }}
      >
        {loading ? 'Updating...' : 'Confirm transition'}
      </Button>
    </div>
  );
}

