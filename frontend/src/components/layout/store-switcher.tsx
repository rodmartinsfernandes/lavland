'use client';

import { useLaundry } from '@/context/laundry-context';

export function StoreSwitcher() {
  const {
    laundries,
    laundryId,
    laundryName,
    loading,
    canSwitch,
    isAdmin,
    setActiveLaundry,
  } = useLaundry();

  if (loading) {
    return (
      <div className="mx-3 mb-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-xs text-[var(--muted)]">
        Carregando unidade...
      </div>
    );
  }

  if (!laundryId) return null;

  if (!isAdmin || !canSwitch) {
    return (
      <div className="mx-3 mb-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Unidade
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">
          {laundryName}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <label className="block space-y-1.5">
        <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Unidade ativa
        </span>
        <select
          value={laundryId}
          onChange={(e) => setActiveLaundry(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
        >
          {laundries.map((laundry) => (
            <option key={laundry.id} value={laundry.id}>
              {laundry.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
