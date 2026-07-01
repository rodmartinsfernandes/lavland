import { LaundryFeeConfig } from '../../generated/prisma/client';
import { toNumber } from '../utils/financial.util';

export interface CardFeeSettings {
  debit: number;
  credit1x: number;
  creditInstallments: number;
  pix: number;
  cash: number;
  anticipation: number;
  applyAnticipation: boolean;
}

export const DEFAULT_CARD_FEE_SETTINGS: CardFeeSettings = {
  debit: 1.45,
  credit1x: 2.1,
  creditInstallments: 2.34,
  pix: 0,
  cash: 0,
  anticipation: 1.29,
  applyAnticipation: false,
};

export function mapFeeConfigToSettings(
  config: LaundryFeeConfig,
): CardFeeSettings {
  return {
    debit: toNumber(config.debitRate),
    credit1x: toNumber(config.credit1xRate),
    creditInstallments: toNumber(config.creditInstallmentsRate),
    pix: toNumber(config.pixRate),
    cash: toNumber(config.cashRate),
    anticipation: toNumber(config.anticipationRate),
    applyAnticipation: config.applyAnticipation,
  };
}

export function parseCardFeeSettings(settings: unknown): CardFeeSettings {
  if (!settings || typeof settings !== 'object') {
    return DEFAULT_CARD_FEE_SETTINGS;
  }

  const cardFees = (settings as Record<string, unknown>).cardFees;
  if (!cardFees || typeof cardFees !== 'object') {
    return DEFAULT_CARD_FEE_SETTINGS;
  }

  const fees = cardFees as Record<string, unknown>;

  return {
    debit: toRate(fees.debit, DEFAULT_CARD_FEE_SETTINGS.debit),
    credit1x: toRate(fees.credit1x, DEFAULT_CARD_FEE_SETTINGS.credit1x),
    creditInstallments: toRate(
      fees.creditInstallments,
      DEFAULT_CARD_FEE_SETTINGS.creditInstallments,
    ),
    pix: toRate(fees.pix, DEFAULT_CARD_FEE_SETTINGS.pix),
    cash: toRate(fees.cash, DEFAULT_CARD_FEE_SETTINGS.cash),
    anticipation: toRate(
      fees.anticipation,
      DEFAULT_CARD_FEE_SETTINGS.anticipation,
    ),
    applyAnticipation: fees.applyAnticipation === true,
  };
}

function toRate(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
