'use client';

import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import { Select } from '@/components/ui/select';

export function LaundrySelect({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  const { isAdmin } = useAuth();
  const { laundries } = useLaundry();

  const selected = laundries.find((item) => item.id === value);

  if (!isAdmin) {
    return (
      <div className="block space-y-1.5">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Unidade
        </span>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm font-medium text-[var(--foreground)]">
          {selected?.name ?? '—'}
        </div>
      </div>
    );
  }

  return (
    <Select
      label="Unidade"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={laundries.map((laundry) => ({
        value: laundry.id,
        label: laundry.name,
      }))}
      required={required}
    />
  );
}
