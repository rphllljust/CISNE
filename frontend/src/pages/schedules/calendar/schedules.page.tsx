import { CalendarClock, CheckCircle2, Route, Timer } from 'lucide-react';

import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Card, PageHeader } from '@/shared/ui';

import '../../pages.css';

interface CapabilityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function CapabilityItem({ icon, title, description }: CapabilityItemProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-soft)',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-soft)', lineHeight: 1.45 }}>{description}</p>
      </div>
    </div>
  );
}

export function SchedulesPage(): React.JSX.Element {
  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Operacoes de Campo"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Agenda' }
            ]}
          />
        }
        title="Agenda operacional"
        subtitle="Planejamento diario, semanal e mensal das cargas de tecnicos e equipes."
      />

      <Alert variant="info" message="A grade de calendario esta pronta para integracao com FullCalendar e politicas de conflito." />

      <Card title="Recursos de agendamento" subtitle="Base pronta para producao para gestao de rotas e visitas">
        <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
          <CapabilityItem icon={<CalendarClock size={15} />} title="Reagendamento com historico" description="Toda alteracao de data mantem trilha imutavel e contexto de responsavel." />
          <CapabilityItem icon={<CheckCircle2 size={15} />} title="Confirmacao de visita" description="Confirmacao do atendimento pelo tecnico com carimbo de tempo." />
          <CapabilityItem icon={<Timer size={15} />} title="Check-in e check-out" description="Registros de execucao em campo para medir ciclo e atrasos." />
          <CapabilityItem icon={<Route size={15} />} title="Janelas de rota e atendimento" description="Janelas planejadas alinhadas ao SLA e a carga regional." />
        </div>
      </Card>
    </section>
  );
}
