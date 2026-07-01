import type { PaginatedMeta } from '@/types/entities';

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginatedMeta | null;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        {meta.total} registro{meta.total !== 1 ? 's' : ''} · página {meta.page} de{' '}
        {meta.totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          className="rounded-xl border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          className="rounded-xl border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
