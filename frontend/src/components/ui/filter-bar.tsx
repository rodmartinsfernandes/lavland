'use client';

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:flex-wrap sm:items-end">
      {children}
    </div>
  );
}
