function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(...cells: (string | number)[]) {
  return cells.map(escapeCsv).join(';');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\ufeff${content}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
