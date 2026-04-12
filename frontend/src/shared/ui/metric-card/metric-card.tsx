import { TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | null;
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ComponentType<{ size?: number }>;
}

const variantStyles = {
  default: {
    bg: 'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface) 100%)',
    border: 'var(--border)',
    accent: 'var(--primary)'
  },
  success: {
    bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%)',
    border: 'rgba(34, 197, 94, 0.2)',
    accent: '#22c55e'
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(234, 179, 8, 0.02) 100%)',
    border: 'rgba(234, 179, 8, 0.2)',
    accent: '#eab308'
  },
  danger: {
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)',
    border: 'rgba(239, 68, 68, 0.2)',
    accent: '#ef4444'
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)',
    border: 'rgba(59, 130, 246, 0.2)',
    accent: '#3b82f6'
  }
};

export function MetricCard({
  label,
  value,
  subtitle,
  trend,
  trendValue,
  variant = 'default',
  icon: Icon
}: MetricCardProps): React.JSX.Element {
  const style = variantStyles[variant];

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = style.accent;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${style.accent}20`;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = style.border;
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Gradient accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${style.accent} 0%, transparent 100%)`
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              margin: '0 0 4px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {label}
          </p>
        </div>
        {Icon && (
          <div
            style={{
              color: style.accent,
              opacity: 0.6
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <h3
          style={{
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {value}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: '4px 0 0 0'
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Trend */}
      {trend && trendValue && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px'
          }}
        >
          {trend === 'up' ? (
            <TrendingUp size={14} style={{ color: '#22c55e' }} />
          ) : (
            <TrendingDown size={14} style={{ color: '#ef4444' }} />
          )}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: trend === 'up' ? '#22c55e' : '#ef4444'
            }}
          >
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
