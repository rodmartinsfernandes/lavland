import * as XLSX from 'xlsx';
import {
  CardType,
  PaymentMethod,
  RevenueSource,
} from '../common/enums/financial.enum';
import type { ParsedRevenueRow, RevenueImportParseResult } from './revenue-import.types';
import {
  buildHeaderMap,
  findHeaderRow,
  getCell,
  normalizeHeader,
  parseAmount,
  parseExcelDate,
  parseInstallments,
} from './revenue-import.utils';

const STONE_DATE_HEADERS = [
  'data_da_venda',
  'data_da_operacao',
  'data_hora',
  'data',
  'date',
];

const STONE_AMOUNT_HEADERS = [
  'valor_bruto',
  'valor_da_venda',
  'valor_total_bruto',
  'valor',
  'amount',
];

const STONE_STATUS_HEADERS = ['situacao', 'status', 'status_da_venda'];
const STONE_PAYMENT_HEADERS = [
  'forma_de_pagamento',
  'meio_de_pagamento',
  'modalidade',
  'pagamento',
];
const STONE_INSTALLMENT_HEADERS = [
  'parcelas',
  'numero_de_parcelas',
  'qtd_parcelas',
  'installments',
];
const STONE_ID_HEADERS = [
  'id_da_transacao',
  'stone_id',
  'id_stone',
  'codigo_da_venda',
];
const STONE_BRAND_HEADERS = ['bandeira', 'brand'];

const INVALID_STONE_STATUS = [
  'cancelada',
  'contestada',
  'devolvida',
  'falha',
  'negada',
  'recusada',
  'chargeback',
  'estornada',
];

export function isStoneSalesFormat(headerMap: Map<string, number>) {
  const markers = [
    'stonecode',
    'situacao',
    'bandeira',
    'modalidade',
    'valor_bruto',
    'data_da_venda',
    'forma_de_pagamento',
    'meio_de_pagamento',
    'id_da_transacao',
  ];

  const matches = markers.filter((key) => headerMap.has(key)).length;
  return matches >= 2;
}

function findColumn(
  headerMap: Map<string, number>,
  candidates: string[],
) {
  return candidates
    .map((key) => headerMap.get(key))
    .find((index) => index !== undefined);
}

function isSkippedStoneStatus(value: unknown) {
  const normalized = normalizeHeader(value);
  if (!normalized) {
    return false;
  }

  return INVALID_STONE_STATUS.some((status) => normalized.includes(status));
}

function parseStonePayment(
  paymentValue: unknown,
  modalityValue: unknown,
  installmentsValue: unknown,
) {
  const paymentText = `${String(paymentValue ?? '')} ${String(modalityValue ?? '')}`;
  const normalized = normalizeHeader(paymentText);

  if (!normalized) {
    return null;
  }

  const installments = parseInstallments(installmentsValue);

  if (normalized.includes('pix')) {
    return { paymentMethod: PaymentMethod.PIX, installments: 1 };
  }

  if (
    normalized.includes('dinheiro') ||
    normalized.includes('especie') ||
    normalized.includes('cash')
  ) {
    return { paymentMethod: PaymentMethod.CASH, installments: 1 };
  }

  if (normalized.includes('debito')) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.DEBIT,
      installments: 1,
    };
  }

  if (
    normalized.includes('credito') ||
    normalized.includes('cartao') ||
    normalized.includes('card')
  ) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.CREDIT,
      installments:
        normalized.includes('parcel') || installments > 1 ? installments : 1,
    };
  }

  if (normalized.includes('voucher')) {
    return {
      paymentMethod: PaymentMethod.CARD,
      cardType: CardType.CREDIT,
      installments: 1,
      noteSuffix: 'Voucher',
    };
  }

  return {
    paymentMethod: PaymentMethod.OTHER,
    installments: 1,
  };
}

export function parseStoneSalesFile(
  matrix: (string | number | null)[][],
): RevenueImportParseResult {
  const located = findHeaderRow(matrix, isStoneSalesFormat);
  if (!located) {
    return {
      format: 'stone',
      rows: [],
      errors: [
        {
          row: 1,
          message:
            'Planilha Stone não reconhecida. Use o relatório Lista de vendas (XLS/CSV).',
        },
      ],
    };
  }

  const { headerRowIndex, headerMap } = located;
  const errors: { row: number; message: string }[] = [];
  const rows: ParsedRevenueRow[] = [];

  const dateIndex = findColumn(headerMap, STONE_DATE_HEADERS);
  const amountIndex = findColumn(headerMap, STONE_AMOUNT_HEADERS);
  const statusIndex = findColumn(headerMap, STONE_STATUS_HEADERS);
  const paymentIndex = findColumn(headerMap, STONE_PAYMENT_HEADERS);
  const installmentsIndex = findColumn(headerMap, STONE_INSTALLMENT_HEADERS);
  const transactionIdIndex = findColumn(headerMap, STONE_ID_HEADERS);
  const brandIndex = findColumn(headerMap, STONE_BRAND_HEADERS);

  if (dateIndex === undefined || amountIndex === undefined) {
    return {
      format: 'stone',
      rows: [],
      errors: [
        {
          row: headerRowIndex + 1,
          message:
            'Colunas obrigatórias da Stone não encontradas (data e valor bruto).',
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

    const statusValue = getCell(row, statusIndex);
    if (isSkippedStoneStatus(statusValue)) {
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

    const amount = parseAmount(getCell(row, amountIndex));
    if (!amount || amount <= 0) {
      continue;
    }

    const paymentValue = getCell(row, paymentIndex);
    const modalityIndex = headerMap.get('modalidade');
    const modalityValue =
      modalityIndex !== undefined && modalityIndex !== paymentIndex
        ? getCell(row, modalityIndex)
        : null;

    const payment = parseStonePayment(
      paymentValue,
      modalityValue,
      getCell(row, installmentsIndex),
    );

    if (!payment) {
      errors.push({
        row: rowNumber,
        message: 'Forma de pagamento não reconhecida',
      });
      continue;
    }

    const transactionId = String(getCell(row, transactionIdIndex) ?? '').trim();
    const brand = String(getCell(row, brandIndex) ?? '').trim();
    const noteParts = ['Importado Stone'];
    if (transactionId) noteParts.push(`ID ${transactionId}`);
    if (brand) noteParts.push(brand);
    if (payment.noteSuffix) noteParts.push(payment.noteSuffix);

    rows.push({
      rowNumber,
      date,
      amount,
      paymentMethod: payment.paymentMethod,
      cardType: payment.cardType,
      installments: payment.installments,
      source: RevenueSource.DAILY_SALES,
      note: noteParts.join(' · '),
    });
  }

  return { format: 'stone', rows, errors };
}

export function buildStoneImportTemplate() {
  const workbook = XLSX.utils.book_new();

  const stoneLista = [
    [
      'Data da venda',
      'Hora',
      'Valor bruto',
      'Valor líquido',
      'Taxa',
      'Forma de pagamento',
      'Modalidade',
      'Parcelas',
      'Bandeira',
      'Situação',
      'Stonecode',
      'ID da transação',
    ],
    [
      '01/07/2026',
      '09:15',
      '45,00',
      '44,35',
      '1,45%',
      'Cartão',
      'Débito',
      '1',
      'Mastercard',
      'Aprovada',
      '604760916',
      'STN123456',
    ],
    [
      '01/07/2026',
      '10:30',
      '120,00',
      '117,48',
      '2,10%',
      'Cartão',
      'Crédito',
      '1',
      'Mastercard',
      'Aprovada',
      '604760916',
      'STN123457',
    ],
    [
      '01/07/2026',
      '14:20',
      '200,00',
      '195,32',
      '2,34%',
      'Cartão',
      'Crédito parcelado',
      '3',
      'Visa',
      'Aprovada',
      '604760916',
      'STN123458',
    ],
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(stoneLista),
    'Lista de vendas',
  );

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
