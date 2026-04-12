import { Bell, Clock, FileText, Shield, Tag } from 'lucide-react';

import { appRoutes } from '@/shared/constants/routes';
import { Alert, Breadcrumbs, Card, PageHeader } from '@/shared/ui';

import '../pages.css';

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: 'available' | 'planned';
}

function SettingsSection({ icon, title, description, status = 'planned' }: SettingsSectionProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: 'var(--primary-subtle)',
          borderRadius: 'var(--radius-sm)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--primary)',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</span>
          <span className={`priority-badge ${status === 'available' ? 'priority-medium' : 'priority-low'}`} style={{ fontSize: '0.62rem' }}>
            {status}
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  );
}

export function SettingsPage(): React.JSX.Element {
  return (
    <section className="page-grid">
      <PageHeader
        eyebrow="Administration"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Painel', to: appRoutes.dashboard },
              { label: 'Configura??es' }
            ]}
          />
        }
        title="Platform settings"
        subtitle="Governance rules, operation preferences and configurable reference data."
      />

      <Alert variant="info" message="As configurações são gerenciadas com trilha de auditoria e validação de permissões por perfil." />

      <Card title="Core platform modules" subtitle="Central parameters for operational governance">
        <div style={{ marginTop: 4 }}>
          <SettingsSection icon={<Tag size={16} />} title="Service taxonomy" description="Categories and service types available when creating service orders." status="available" />
          <SettingsSection icon={<Clock size={16} />} title="SLA policies" description="Priority-based deadlines, escalation windows and operation shifts." status="available" />
          <SettingsSection icon={<Bell size={16} />} title="Notification policy" description="Channels, templates and trigger conditions for operation alerts." status="available" />
          <SettingsSection icon={<Shield size={16} />} title="Roles and permissions" description="Granular access control by module, role and operation team." status="available" />
          <SettingsSection icon={<FileText size={16} />} title="Report templates" description="Custom export presets for management and compliance packs." status="planned" />
        </div>
      </Card>
    </section>
  );
}

