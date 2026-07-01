'use client';

import { Input } from './input';
import { Button } from './button';
import { FilterBar } from './filter-bar';
import { LaundryFilter } from './laundry-filter';

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  children,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApply: () => void;
  children?: React.ReactNode;
}) {
  return (
    <FilterBar>
      <LaundryFilter />
      <Input
        label="Data inicial"
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
      />
      <Input
        label="Data final"
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
      />
      {children}
      <Button type="button" onClick={onApply}>
        Filtrar
      </Button>
    </FilterBar>
  );
}

export function getMonthDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return {
    startDate: `${year}-${month}-01`,
    endDate: end.toISOString().slice(0, 10),
  };
}
