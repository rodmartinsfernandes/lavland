'use client';

import { useLaundry } from '@/context/laundry-context';
import { Select } from './select';

export function LaundryFilter() {
  const { laundryId, setActiveLaundry, canSwitch, laundries } = useLaundry();

  if (!canSwitch || !laundryId) return null;

  return (
    <Select
      label="Unidade"
      value={laundryId}
      onChange={(e) => setActiveLaundry(e.target.value)}
      options={laundries.map((laundry) => ({
        value: laundry.id,
        label: laundry.name,
      }))}
    />
  );
}
