import { useMutation } from '@tanstack/react-query';
import {
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Activity,
  RefreshCw,
  Target,
  Timer
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { serviceOrderStatusLabel } from '@/entities/service-order/status-map';
import type { Priority, ServiceOrderStatus } from '@/entities/service-order/types';
import { useUsers } from '@/features/users/api/users.api';
import {
  exportServiceOrdersCsv,
  useReportsDashboard,
  useTechnicianEfficiency
} from '@/features/reports/api/reports.api';
import { appRoutes } from '@/shared/constants/routes';
import { getApiErrorMessage } from '@/shared/lib/api-error';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  FilterBar,
  Input,
  PageHeader,
  Select,
  Skeleton
} from '@/shared/ui';
import { MetricCard } from '@/shared/ui/metric-card/metric-card';
import { useToastStore } from '@/shared/ui/toast';

import '../pages.css';

const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Critica' }
];

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatMinutes(value: number): string {
  return `${value.toFixed(2)} min`;
}

export function ReportsPage(): React.JSX.Element {
  const pushToast = useToastStore((state) => state.push);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ServiceOrderStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');

  const filter = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined
    }),
    [endDate, priority, search, startDate, status]
  );

  const reportsQuery = useReportsDashboard(filter);
  const usersQuery = useUsers({ page: 1, limit: 200, status: 'ACTIVE' });
  const technicianQuery = useTechnicianEfficiency(technicianId, filter);

  const exportMutation = useMutation({
    mutationFn: () => exportServiceOrdersCsv(filter),
    onSuccess: (csv) => {
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `relatorio-ordens-servico-${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      pushToast({ type: 'success', message: 'CSV exportado com sucesso.' });
    },
    onError: (error) => {
      pushToast({ type: 'error', message: getApiErrorMessage(error) });
    }
  });

  const statusRows = (reportsQuery.data?.byStatus ?? [])
    .slice()
    .sort((a, b) => b.total - a.total);

  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Analytics"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Relatorios' }
            ]}
          />
        }
        title="Relatorios operacionais"
        subtitle="Dados reais de execucao, SLA e produtividade com exportacao em CSV."
        actions={
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download size={14} />
            {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        }
      />

      <FilterBar
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setStatus('');
                setPriority('');
                setSearch('');
                setTechnicianId('');
              }}
            >
              Limpar
            </Button>
            <Button onClick={() => void reportsQuery.refetch()}>Atualizar</Button>
          </>
        }
      >
        <Input
          label="Busca"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Titulo, descricao ou cliente"
        />
        <Input
          label="Inicio"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Input
          label="Fim"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ServiceOrderStatus | '')}
          options={[
            { value: '', label: 'Todos' },
            ...Object.entries(serviceOrderStatusLabel).map(([value, label]) => ({
              value,
              label
            }))
          ]}
        />
        <Select
          label="Prioridade"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority | '')}
          options={[
            { value: '', label: 'Todas' },
            ...priorityOptions
          ]}
        />
        <Select
          label="Tecnico"
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
          disabled={usersQuery.isLoading}
          options={[
            {
              value: '',
              label: usersQuery.isLoading ? 'Carregando tecnicos...' : 'Selecionar tecnico'
            },
            ...(usersQuery.data?.items ?? [])
              .filter((user) => user.roles.includes('TECHNICIAN'))
              .map((user) => ({
                value: user.id,
                label: user.fullName
              }))
          ]}
        />
      </FilterBar>

      {reportsQuery.isLoading ? (
        <div className="page-grid">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={160} />
        </div>
      ) : reportsQuery.isError ? (
        <Alert
          variant="danger"
          title="Falha ao carregar relatorios"
          message={getApiErrorMessage(reportsQuery.error)}
          action={
            <Button variant="secondary" size="sm" onClick={() => void reportsQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : reportsQuery.data ? (
        <>
          <Card title="Totais operacionais" subtitle="Visao consolidada do periodo filtrado">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16
              }}
            >
              <MetricCard
                label="Total de Ordens"
                value={reportsQuery.data.totals.total}
                variant="info"
                icon={Activity}
              />
              <MetricCard
                label="Concluidas"
                value={reportsQuery.data.totals.completed}
                variant="success"
                icon={CheckCircle2}
              />
              <MetricCard
                label="Em andamento"
                value={reportsQuery.data.totals.inProgress}
                variant="warning"
                icon={Clock}
              />
              <MetricCard
                label="Canceladas"
                value={reportsQuery.data.totals.canceled}
                variant="danger"
                icon={AlertCircle}
              />
            </div>
          </Card>

          <Card title="KPIs de desempenho" subtitle="Metrica calculada em tempo real pelo backend">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}
            >
              <MetricCard
                label="Conformidade SLA"
                value={formatPercent(reportsQuery.data.kpis.slaComplianceRate)}
                variant="success"
                icon={Target}
                trend={reportsQuery.data.kpis.slaComplianceRate >= 90 ? 'up' : 'down'}
                trendValue={`${reportsQuery.data.kpis.slaComplianceRate >= 90 ? '+' : ''}${(reportsQuery.data.kpis.slaComplianceRate - 85).toFixed(1)}%`}
              />
              <MetricCard
                label="Taxa de retrabalho"
                value={formatPercent(reportsQuery.data.kpis.reworkRate)}
                variant={reportsQuery.data.kpis.reworkRate > 10 ? 'danger' : 'success'}
                icon={RefreshCw}
                trend={reportsQuery.data.kpis.reworkRate > 10 ? 'up' : 'down'}
                trendValue={reportsQuery.data.kpis.reworkRate > 10 ? 'Acima' : 'Dentro'}
              />
              <MetricCard
                label="Tempo medio resposta"
                value={formatMinutes(reportsQuery.data.kpis.averageResponseMinutes)}
                variant="info"
                icon={Zap}
              />
              <MetricCard
                label="Acuracia de duracao"
                value={formatPercent(reportsQuery.data.kpis.durationAccuracyPercent)}
                variant="success"
                icon={Timer}
                trend="up"
                trendValue="+2.3%"
              />
            </div>
          </Card>

          <Card title="Distribuicao por status" subtitle="Contagem operacional por estado da OS">
            <div style={{ display: 'grid', gap: 12 }}>
              {statusRows.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Nenhum dado para o filtro selecionado.
                </p>
              ) : (
                statusRows.map((item) => {
                  const total = statusRows.reduce((sum, s) => sum + s.total, 0);
                  const percentage = total > 0 ? (item.total / total) * 100 : 0;

                  let variant: 'success' | 'warning' | 'danger' | 'info' | 'default' = 'default';
                  if (item.status === 'COMPLETED') variant = 'success';
                  else if (item.status === 'IN_PROGRESS') variant = 'info';
                  else if (item.status === 'UNDER_ANALYSIS' || item.status === 'OPEN') variant = 'warning';
                  else if (item.status === 'CANCELED') variant = 'danger';

                  return (
                    <div
                      key={item.status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface) 100%)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          {serviceOrderStatusLabel[item.status]}
                        </p>
                        <div style={{
                          background: 'var(--surface-soft)',
                          height: '6px',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginRight: '12px'
                        }}>
                          <div
                            style={{
                              height: '100%',
                              background: variant === 'success' ? '#22c55e' :
                                          variant === 'info' ? '#3b82f6' :
                                          variant === 'warning' ? '#eab308' :
                                          variant === 'danger' ? '#ef4444' : 'var(--primary)',
                              width: `${percentage}%`,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{item.total}</strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </>
      ) : null}

      {technicianId ? (
        <Card
          title="Eficiencia por tecnico"
          subtitle="Indicadores detalhados para o tecnico selecionado"
        >
          {technicianQuery.isLoading ? (
            <Skeleton height={100} />
          ) : technicianQuery.isError ? (
            <Alert variant="danger" message={getApiErrorMessage(technicianQuery.error)} />
          ) : technicianQuery.data ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}
              >
                <MetricCard
                  label="OS totais"
                  value={technicianQuery.data.totals.totalOrders}
                  variant="info"
                  icon={Activity}
                />
                <MetricCard
                  label="OS concluidas"
                  value={technicianQuery.data.totals.completedOrders}
                  variant="success"
                  icon={CheckCircle2}
                />
                <MetricCard
                  label="Retrabalho"
                  value={technicianQuery.data.totals.reworkCount}
                  variant={technicianQuery.data.totals.reworkCount > 0 ? 'warning' : 'success'}
                  icon={RefreshCw}
                />
                <MetricCard
                  label="SLA violado"
                  value={technicianQuery.data.totals.breachedOrders}
                  variant={technicianQuery.data.totals.breachedOrders > 0 ? 'danger' : 'success'}
                  icon={AlertCircle}
                  trend={technicianQuery.data.totals.breachedOrders > 0 ? 'down' : 'up'}
                  trendValue={`${technicianQuery.data.totals.breachedOrders > 0 ? 'Acima' : 'Dentro'}`}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16
                }}
              >
                <MetricCard
                  label="Tempo medio conclusao"
                  value={formatMinutes(technicianQuery.data.kpis.averageCompletionMinutes)}
                  variant="info"
                  icon={Timer}
                />
                <MetricCard
                  label="Conformidade SLA"
                  value={formatPercent(technicianQuery.data.kpis.slaCompliancePercent)}
                  variant={technicianQuery.data.kpis.slaCompliancePercent >= 90 ? 'success' : 'warning'}
                  icon={Target}
                />
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </section>
  );
}
