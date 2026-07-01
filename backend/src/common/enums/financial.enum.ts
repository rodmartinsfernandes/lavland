export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  PIX = 'PIX',
  OTHER = 'OTHER',
}

export enum CardType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum RevenueSource {
  DAILY_SALES = 'DAILY_SALES',
  MAXPAN = 'MAXPAN',
  CASH = 'CASH',
  CARD = 'CARD',
  PIX = 'PIX',
  OTHER = 'OTHER',
}

export enum ExpenseType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
}

export enum PayableStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum MachineType {
  WASHER = 'WASHER',
  DRYER = 'DRYER',
}

export enum MachineStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum RecurrenceInterval {
  MONTHLY = 'MONTHLY',
}
