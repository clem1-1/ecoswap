import type { ReactNode } from 'react';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'teal';

const styles: Record<Variant, { bg: string; color: string }> = {
  default:  { bg: 'var(--surface-muted)',  color: 'var(--muted)' },
  success:  { bg: 'var(--success-bg)',     color: 'var(--success)' },
  warning:  { bg: 'var(--warning-bg)',     color: 'var(--warning)' },
  danger:   { bg: 'var(--danger-bg)',      color: 'var(--danger)' },
  teal:     { bg: 'rgba(20,184,166,0.12)', color: 'var(--accent-teal)' },
};

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const s = styles[variant];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}
