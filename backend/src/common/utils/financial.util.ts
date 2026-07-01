export function toNumber(value: { toNumber(): number } | number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value.toNumber();
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getCurrentMonthRange(reference = new Date()) {
  return getMonthRange(reference.getFullYear(), reference.getMonth() + 1);
}

export function getPreviousMonthRange(reference = new Date()) {
  const date = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return getMonthRange(date.getFullYear(), date.getMonth() + 1);
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
