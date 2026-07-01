import { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)] ${className}`}
    >
      {children}
    </div>
  );
}

const accentStyles = {
  brand: {
    value: 'text-[var(--brand)]',
    dot: 'bg-[var(--brand)]',
    glow: 'from-[var(--brand-soft)] to-transparent',
  },
  green: {
    value: 'text-[var(--success)]',
    dot: 'bg-[var(--success)]',
    glow: 'from-[var(--success-soft)] to-transparent',
  },
  red: {
    value: 'text-[var(--danger)]',
    dot: 'bg-[var(--danger)]',
    glow: 'from-[var(--danger-soft)] to-transparent',
  },
  amber: {
    value: 'text-[var(--warning)]',
    dot: 'bg-[var(--warning)]',
    glow: 'from-[var(--warning-soft)] to-transparent',
  },
  cyan: {
    value: 'text-[var(--accent)]',
    dot: 'bg-[var(--accent)]',
    glow: 'from-[var(--accent-soft)] to-transparent',
  },
};

export function StatCard({
  title,
  value,
  hint,
  trend,
  accent = 'brand',
}: {
  title: string;
  value: string;
  hint?: string;
  trend?: string;
  accent?: keyof typeof accentStyles;
}) {
  const style = accentStyles[accent];

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.glow} to-transparent`}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
        </div>
        <p className={`mt-3 text-3xl font-bold tracking-tight ${style.value}`}>
          {value}
        </p>
        {hint ? (
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {hint}
          </p>
        ) : null}
        {trend ? (
          <p className="mt-3 inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
            {trend}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
