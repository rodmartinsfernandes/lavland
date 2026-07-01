import { Card } from './card';

export function FormCard({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <Card className="mb-6">
      <div className="mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            Fechar
          </button>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
