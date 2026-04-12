import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DashboardOverview } from '@/entities/dashboard/types';
import { Card } from '@/shared/ui/card';

interface StatusChartProps {
  data: DashboardOverview['charts']['byStatus'];
}

export function StatusDistributionChart({ data }: StatusChartProps): React.JSX.Element {
  return (
    <Card title="Distribuicao de status" subtitle="Carga atual por etapa da ordem de servico">
      <div style={{ width: '100%', height: 280, marginTop: 8 }}>
        <ResponsiveContainer>
          <BarChart data={data} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                boxShadow: 'var(--shadow-sm)'
              }}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            />
            <Bar dataKey="total" fill="var(--primary)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

