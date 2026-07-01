export interface LaundryFeeConfig {
  laundryId: string;
  debitRate: number;
  credit1xRate: number;
  creditInstallmentsRate: number;
  pixRate: number;
  cashRate: number;
  anticipationRate: number;
  applyAnticipation: boolean;
}

export type RevenuePaymentKind =
  | 'PIX'
  | 'CASH'
  | 'DEBIT'
  | 'CREDIT_1X'
  | 'CREDIT_INSTALLMENTS';

export const revenuePaymentKindLabels: Record<RevenuePaymentKind, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  DEBIT: 'Débito',
  CREDIT_1X: 'Crédito à vista',
  CREDIT_INSTALLMENTS: 'Crédito parcelado',
};

export function paymentKindToPayload(kind: RevenuePaymentKind, installments: number) {
  switch (kind) {
    case 'PIX':
      return { paymentMethod: 'PIX' as const };
    case 'CASH':
      return { paymentMethod: 'CASH' as const };
    case 'DEBIT':
      return {
        paymentMethod: 'CARD' as const,
        cardType: 'DEBIT' as const,
        installments: 1,
      };
    case 'CREDIT_1X':
      return {
        paymentMethod: 'CARD' as const,
        cardType: 'CREDIT' as const,
        installments: 1,
      };
    case 'CREDIT_INSTALLMENTS':
      return {
        paymentMethod: 'CARD' as const,
        cardType: 'CREDIT' as const,
        installments: Math.max(2, installments),
      };
  }
}

export function payloadToPaymentKind(
  paymentMethod: string,
  cardType?: string | null,
  installments?: number | null,
): RevenuePaymentKind {
  if (paymentMethod === 'PIX') return 'PIX';
  if (paymentMethod === 'CASH') return 'CASH';
  if (paymentMethod === 'CARD' && cardType === 'DEBIT') return 'DEBIT';
  if (paymentMethod === 'CARD' && (installments ?? 1) > 1) {
    return 'CREDIT_INSTALLMENTS';
  }
  if (paymentMethod === 'CARD') return 'CREDIT_1X';
  return 'PIX';
}

export function calculateRevenueFees(
  grossAmount: number,
  kind: RevenuePaymentKind,
  fees: LaundryFeeConfig,
  installments = 2,
) {
  let feeRate = 0;

  switch (kind) {
    case 'PIX':
      feeRate = fees.pixRate;
      break;
    case 'CASH':
      feeRate = fees.cashRate;
      break;
    case 'DEBIT':
      feeRate = fees.debitRate;
      break;
    case 'CREDIT_1X':
      feeRate = fees.credit1xRate;
      break;
    case 'CREDIT_INSTALLMENTS':
      feeRate = fees.creditInstallmentsRate;
      break;
  }

  if (
    (kind === 'DEBIT' ||
      kind === 'CREDIT_1X' ||
      kind === 'CREDIT_INSTALLMENTS') &&
    fees.applyAnticipation
  ) {
    feeRate = Number((feeRate + fees.anticipationRate).toFixed(2));
  }

  const feeAmount = Number(((grossAmount * feeRate) / 100).toFixed(2));
  const netAmount = Number((grossAmount - feeAmount).toFixed(2));

  return { feeRate, feeAmount, netAmount };
}
