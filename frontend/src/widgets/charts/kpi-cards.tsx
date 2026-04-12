import { AlertTriangle, CheckCircle2, Circle, Clock, Shield, ShieldOff } from 'lucide-react';

import type { DashboardCards } from '@/entities/dashboard/types';

import './kpi-cards.css';

interface KpiCardsProps {
  cards: DashboardCards;
}

interface KpiCardConfig {
  key: keyof DashboardCards;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: 'blue' | 'amber' | 'green' | 'red' | 'teal' | 'orange';
}

const cardMap: KpiCardConfig[] = [
  { key: 'totalOpen', label: 'Ordens Abertas', description: 'Aguardando triagem', icon: Circle, tone: 'blue' },
  { key: 'totalInProgress', label: 'Em Andamento', description: 'Execucao em campo', icon: Clock, tone: 'amber' },
  { key: 'totalCompleted', label: 'Concluido', description: 'Encerradas no periodo atual', icon: CheckCircle2, tone: 'green' },
  { key: 'totalOverdue', label: 'Atrasadas', description: 'Risco operacional', icon: AlertTriangle, tone: 'red' },
  { key: 'slaComplied', label: 'SLA cumprido', description: 'Dentro da meta', icon: Shield, tone: 'teal' },
  { key: 'slaViolated', label: 'SLA violado', description: 'Fora da meta', icon: ShieldOff, tone: 'orange' }
];

export function KpiCards({ cards }: KpiCardsProps): React.JSX.Element {
  return (
    <div className="kpi-grid">
      {cardMap.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className={`kpi-card kpi-card-${item.tone}`}>
            <div className="kpi-header">
              <span className="kpi-label">{item.label}</span>
              <span className={`kpi-icon kpi-icon-${item.tone}`}>
                <Icon size={16} />
              </span>
            </div>
            <p className="kpi-value">{cards[item.key].toLocaleString('pt-BR')}</p>
            <p className="kpi-description">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}


