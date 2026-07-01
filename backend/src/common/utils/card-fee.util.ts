import { CardType, PaymentMethod } from '../../generated/prisma/client';
import { CardFeeSettings } from '../types/card-fee.settings';

export function resolveCardFeeRate(
  fees: CardFeeSettings,
  cardType: CardType,
  installments: number,
) {
  if (cardType === CardType.DEBIT) {
    return fees.debit;
  }

  if (installments <= 1) {
    return fees.credit1x;
  }

  return fees.creditInstallments;
}

export function resolvePaymentFeeRate(
  fees: CardFeeSettings,
  paymentMethod: PaymentMethod,
  cardType?: CardType | null,
  installments = 1,
) {
  if (paymentMethod === PaymentMethod.PIX) {
    return fees.pix;
  }

  if (paymentMethod === PaymentMethod.CASH) {
    return fees.cash;
  }

  if (paymentMethod === PaymentMethod.CARD) {
    return resolveCardFeeRate(
      fees,
      cardType ?? CardType.CREDIT,
      installments,
    );
  }

  return 0;
}

export function calculateRevenueFees(
  grossAmount: number,
  paymentMethod: PaymentMethod,
  fees: CardFeeSettings | null,
  cardType?: CardType | null,
  installments = 1,
) {
  if (!fees) {
    return {
      feeRate: 0,
      feeAmount: 0,
      netAmount: grossAmount,
      cardType: paymentMethod === PaymentMethod.CARD ? cardType ?? CardType.CREDIT : null,
      installments: paymentMethod === PaymentMethod.CARD ? Math.max(1, installments) : null,
    };
  }

  const resolvedInstallments = Math.max(1, installments);
  const resolvedCardType =
    paymentMethod === PaymentMethod.CARD ? cardType ?? CardType.CREDIT : null;

  let feeRate = resolvePaymentFeeRate(
    fees,
    paymentMethod,
    resolvedCardType,
    resolvedInstallments,
  );

  if (paymentMethod === PaymentMethod.CARD && fees.applyAnticipation) {
    feeRate = Number((feeRate + fees.anticipation).toFixed(2));
  }

  const feeAmount = Number(((grossAmount * feeRate) / 100).toFixed(2));
  const netAmount = Number((grossAmount - feeAmount).toFixed(2));

  return {
    feeRate,
    feeAmount,
    netAmount,
    cardType: resolvedCardType,
    installments:
      paymentMethod === PaymentMethod.CARD ? resolvedInstallments : null,
  };
}
