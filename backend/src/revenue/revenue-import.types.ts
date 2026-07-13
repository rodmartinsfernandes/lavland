import {
  CardType,
  PaymentMethod,
  RevenueSource,
} from '../common/enums/financial.enum';

export interface ParsedRevenueRow {
  rowNumber: number;
  date: string;
  amount: number;
  netAmount?: number;
  paymentMethod: PaymentMethod;
  cardType?: CardType;
  installments?: number;
  source: RevenueSource;
  category?: string;
  note?: string;
}

export interface RevenueImportParseResult {
  format: 'stone' | 'detailed' | 'summary';
  rows: ParsedRevenueRow[];
  errors: { row: number; message: string }[];
}
