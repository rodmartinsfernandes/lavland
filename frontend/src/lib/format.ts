export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyInput(value: number) {
  if (!value || value <= 0) return '';
  return formatCurrency(value);
}

export function maskCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return formatCurrency(Number(digits) / 100);
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}
