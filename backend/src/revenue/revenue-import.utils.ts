import * as XLSX from 'xlsx';

export function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildHeaderMap(row: (string | number | null)[]) {
  const headerMap = new Map<string, number>();
  row.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key) {
      headerMap.set(key, index);
    }
  });
  return headerMap;
}

export function findHeaderRow(
  matrix: (string | number | null)[][],
  matcher: (headerMap: Map<string, number>) => boolean,
) {
  let best:
    | {
        headerRowIndex: number;
        headerMap: Map<string, number>;
        score: number;
      }
    | undefined;

  for (let i = 0; i < Math.min(matrix.length, 30); i += 1) {
    const row = matrix[i];
    const hasValues = row.some((cell) => String(cell ?? '').trim().length > 0);
    if (!hasValues) {
      continue;
    }

    const headerMap = buildHeaderMap(row);
    if (!matcher(headerMap)) {
      continue;
    }

    const score = row.filter((cell) => String(cell ?? '').trim().length > 0).length;
    if (!best || score > best.score) {
      best = { headerRowIndex: i, headerMap, score };
    }
  }

  return best
    ? { headerRowIndex: best.headerRowIndex, headerMap: best.headerMap }
    : null;
}

export function parseExcelDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const brDateTime = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/,
    );
    if (brDateTime) {
      return `${brDateTime[3]}-${brDateTime[2].padStart(2, '0')}-${brDateTime[1].padStart(2, '0')}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }

  return null;
}

export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/[R$\s%]/gi, '').trim();
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(amount.toFixed(2));
}

export function parseInstallments(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function getCell(row: (string | number | null)[], index?: number) {
  if (index === undefined) {
    return null;
  }
  return row[index] ?? null;
}

export function sheetToMatrix(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
}
