import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import type { DashboardOverview } from '@/entities/dashboard/types';
import { Card } from '@/shared/ui/card';

interface ProductivityChartProps {
  data: DashboardOverview['charts']['byTechnician'];
}

const PALETTE = ['#0f62fe', '#06b6d4', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];

export function TechnicianProductivityChart({ data }: ProductivityChartProps): React.JSX.Element {
  const topData = data.slice(0, 6).map((item) => ({
    name: item.technicianName,
    value: item.total
  }));

  return (
    <Card title="Technician productivity" subtitle="Top 6 service throughput in selected period">
      <div style={{ width: '100%', height: 280, marginTop: 8 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={topData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3}>
              {topData.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={PALETTE[index % PALETTE.length] ?? PALETTE[0]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                boxShadow: 'var(--shadow-sm)'
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-soft)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

