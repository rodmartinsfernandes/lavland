function parseCalendarDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day);
}

export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string) {
  const calendarDate = parseCalendarDate(value);
  if (calendarDate) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(calendarDate);
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

export function toAmount(value: string | number) {
  return typeof value === 'number' ? value : Number(value);
}
