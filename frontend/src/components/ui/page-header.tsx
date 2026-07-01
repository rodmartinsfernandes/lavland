import { ReactNode } from 'react';
import { Button } from './button';

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}

export function Alert({
  children,
  variant = 'error',
}: {
  children: ReactNode;
  variant?: 'error' | 'info';
}) {
  const styles =
    variant === 'error'
      ? 'border border-red-100 bg-[var(--danger-soft)] text-red-700'
      : 'border border-cyan-100 bg-[var(--accent-soft)] text-cyan-800';

  return (
    <p className={`rounded-xl px-4 py-3 text-sm ${styles}`}>{children}</p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 px-6 py-12 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}
