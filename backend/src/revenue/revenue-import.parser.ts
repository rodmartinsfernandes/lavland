import {
  CardType,
  PaymentMethod,
  RevenueSource,
} from '../common/enums/financial.enum';
import type { RevenueImportParseResult } from './revenue-import.types';
import {
  buildHeaderMap,
  findHeaderRow,
  getCell,
  normalizeHeader,
  parseAmount,
  parseExcelDate,
  parseInstallments,
  sheetToMatrix,
} from './revenue-import.utils';
import {
  isStoneSalesFormat,
  parseStoneSalesFile,
  buildStoneImportTemplate,
} from './stone-import.parser';

export type { ParsedRevenueRow, RevenueImportParseResult } from './revenue-import.types';
export { buildStoneImportTemplate };

const DATE_HEADERS = new Set([
  'data',
  'date',
  'dia',
  'data_venda',
  'data_da_venda',
]);
const AMOUNT_HEADERS = new Set([
  'valor',
  'amount',
  'valor_total',
  'valor_bruto',
  'valor_da_venda',
]);
const PAYMENT_HEADERS = new Set([
  'forma_pagamento',
  'forma_de_pagamento',
  'pagamento',
  'payment_method',
  'metodo',
  'forma',
  'modalidade',
  'meio_de_pagamento',
]);
const SOURCE_HEADERS = new Set(['origem', 'source']);
const CATEGORY_HEADERS = new Set(['categoria', 'category']);
const NOTE_HEADERS = new Set(['observacao', 'obs', 'note', 'observacoes']);
const CARD_TYPE_HEADERS = new Set([
  'tipo_cartao',
  'card_type',
  'modalidade',
]);
const INSTALLMENTS_HEADERS = new Set([
  'parcelas',
  'installments',
  'qtd_parcelas',
  'numero_de_parcelas',
]);

const SUMMARY_PAYMENT_COLUMNS: {
  keys: string[];
  method: PaymentMethod;
  cardType?: CardType;
}[] = [
  { keys: ['dinheiro', 'cash', 'especie', 'dinheiro_recebido'], method: PaymentMethod.CASH },
  { keys: ['cartao_debito', 'debito'], method: PaymentMethod.CARD, cardType: CardType.DEBIT },
  { keys: ['cartao_credito', 'credito'], method: PaymentMethod.CARD, cardType: CardType.CREDIT },
  { keys: ['cartao', 'card'], method: PaymentMethod.CARD, cardType: CardType.CREDIT },
  { keys: ['pix'], method: PaymentMethod.PIX },
  { keys: ['outro', 'outros', 'other'], method: PaymentMethod.OTHER },
];

function isGenericDetailedFormat(headerMap: Map<string, number>) {
  const hasDate = [...DATE_HEADERS].some((key) => headerMap.has(key));
  const hasAmount = [...AMOUNT_HEADERS].some((key) => headerMap.has(key));
  const hasPayment = [...PAYMENT_HEADERS].some((key) => headerMap.has(key));
  return hasDate && hasAmount && hasPayment;
}

function isGenericSummaryFormat(headerMap: Map<string, number>) {
  const hasDate = [...DATE_HEADERS].some((key) => headerMap.has(key));
  const hasSummaryPayment = SUMMARY_PAYMENT_COLUMNS.some((column) =>
    column.keys.some((key) => headerMap.has(key)),
  );
  return hasDate && hasSummaryPayment;
}

function parsePaymentDetails(value: unknown) {
  const normalized = normalizeHeader(value);
  if (!normalized) {
    return null;
  }

  if (['dinheiro', 'cash', 'especie'].includes(normalized)) {
    return { paymentMethod: PaymentMethod.CASH };
  }
  if (['cartao_debito', 'debito'].includes(normalized)) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.DEBIT,
      installments: 1,
    };
  }
  if (['cartao_credito', 'credito'].includes(normalized)) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.CREDIT,
      installments: 1,
    };
  }
  if (['cartao', 'card'].includes(normalized)) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.CREDIT,
      installments: 1,
    };
  }
  if (normalized === 'pix') {
    return { paymentMethod: PaymentMethod.PIX };
  }
  if (['outro', 'outros', 'other'].includes(normalized)) {
    return { paymentMethod: PaymentMethod.OTHER };
  }

  const upper = String(value).trim().toUpperCase();
  if (Object.values(PaymentMethod).includes(upper as PaymentMethod)) {
    return {
      paymentMethod: upper as PaymentMethod,
      ...(upper === PaymentMethod.CARD
        ? { cardType: CardType.CREDIT, installments: 1 }
        : {}),
    };
  }

  return null;
}

function parseCardType(value: unknown): CardType | undefined {
  const normalized = normalizeHeader(value);
  if (!normalized) {
    return undefined;
  }
  if (['debito', 'debit'].includes(normalized)) {
    return CardType.DEBIT;
  }
  if (['credito', 'credit'].includes(normalized)) {
    return CardType.CREDIT;
  }
  return undefined;
}

function parseSource(value: unknown): RevenueSource {
  const normalized = normalizeHeader(value);
  if (!normalized) {
    return RevenueSource.DAILY_SALES;
  }

  if (['stone', 'lista_de_vendas', 'relatorio_stone'].includes(normalized)) {
    return RevenueSource.DAILY_SALES;
  }
  if (['maxpan', 'faturamento_maxpan', 'faturamento'].includes(normalized)) {
    return RevenueSource.MAXPAN;
  }
  if (['vendas_do_dia', 'vendas', 'daily_sales', 'venda'].includes(normalized)) {
    return RevenueSource.DAILY_SALES;
  }

  const upper = String(value).trim().toUpperCase();
  if (Object.values(RevenueSource).includes(upper as RevenueSource)) {
    return upper as RevenueSource;
  }

  return RevenueSource.DAILY_SALES;
}

function parseGenericFile(matrix: (string | number | null)[][]): RevenueImportParseResult {
  const located =
    findHeaderRow(matrix, (headerMap) =>
      isGenericDetailedFormat(headerMap) || isGenericSummaryFormat(headerMap),
    ) ??
    findHeaderRow(matrix, (headerMap) =>
      [...DATE_HEADERS].some((key) => headerMap.has(key)),
    );

  if (!located) {
    return {
      format: 'detailed',
      rows: [],
      errors: [{ row: 1, message: 'Planilha vazia ou sem cabeçalho reconhecido' }],
    };
  }

  const { headerRowIndex, headerMap } = located;
  const format = isGenericSummaryFormat(headerMap) ? 'summary' : 'detailed';
  const errors: RevenueImportParseResult['errors'] = [];
  const rows: RevenueImportParseResult['rows'] = [];

  const dateIndex = [...DATE_HEADERS]
    .map((key) => headerMap.get(key))
    .find((index) => index !== undefined);

  if (dateIndex === undefined) {
    return {
      format,
      rows: [],
      errors: [
        {
          row: headerRowIndex + 1,
          message: 'Coluna "Data" não encontrada na planilha',
        },
      ],
    };
  }

  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const rowNumber = i + 1;
    const hasValues = row.some((cell) => String(cell ?? '').trim().length > 0);
    if (!hasValues) {
      continue;
    }

    const date = parseExcelDate(getCell(row, dateIndex));
    if (!date) {
      errors.push({
        row: rowNumber,
        message: `Data inválida: ${String(getCell(row, dateIndex) ?? '')}`,
      });
      continue;
    }

    if (format === 'summary') {
      for (const column of SUMMARY_PAYMENT_COLUMNS) {
        const paymentIndex = column.keys
          .map((key) => headerMap.get(key))
          .find((index) => index !== undefined);

        const amount = parseAmount(getCell(row, paymentIndex));
        if (!amount || amount <= 0) {
          continue;
        }

        rows.push({
          rowNumber,
          date,
          amount,
          paymentMethod: column.method,
          cardType: column.cardType,
          installments: column.cardType ? 1 : undefined,
          source: RevenueSource.DAILY_SALES,
          note: 'Importado da planilha (resumo do dia)',
        });
      }
      continue;
    }

    const amountIndex = [...AMOUNT_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const paymentIndex = [...PAYMENT_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const sourceIndex = [...SOURCE_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const categoryIndex = [...CATEGORY_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const noteIndex = [...NOTE_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const cardTypeIndex = [...CARD_TYPE_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);
    const installmentsIndex = [...INSTALLMENTS_HEADERS]
      .map((key) => headerMap.get(key))
      .find((index) => index !== undefined);

    const amount = parseAmount(getCell(row, amountIndex));
    if (!amount || amount <= 0) {
      errors.push({
        row: rowNumber,
        message: 'Valor inválido ou ausente',
      });
      continue;
    }

    const paymentDetails = parsePaymentDetails(getCell(row, paymentIndex));
    if (!paymentDetails) {
      errors.push({
        row: rowNumber,
        message: 'Forma de pagamento inválida ou ausente',
      });
      continue;
    }

    const category = String(getCell(row, categoryIndex) ?? '').trim();
    const note = String(getCell(row, noteIndex) ?? '').trim();
    const cardType =
      parseCardType(getCell(row, cardTypeIndex)) ?? paymentDetails.cardType;
    const installments =
      installmentsIndex !== undefined
        ? parseInstallments(getCell(row, installmentsIndex))
        : paymentDetails.installments;

    rows.push({
      rowNumber,
      date,
      amount,
      paymentMethod: paymentDetails.paymentMethod,
      cardType,
      installments,
      source: parseSource(getCell(row, sourceIndex)),
      category: category || undefined,
      note: note || 'Importado da planilha',
    });
  }

  return { format, rows, errors };
}

export function parseRevenueImportFile(buffer: Buffer): RevenueImportParseResult {
  const matrix = sheetToMatrix(buffer);

  const stoneHeader = findHeaderRow(matrix, isStoneSalesFormat);
  if (stoneHeader) {
    return parseStoneSalesFile(matrix);
  }

  return parseGenericFile(matrix);
}

export function buildRevenueImportTemplate() {
  return buildStoneImportTemplate();
}
