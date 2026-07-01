export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface Laundry {
  id: string;
  name: string;
  address?: string;
  cnpj?: string;
  settings?: {
    cardFees?: {
      debit?: number;
      credit1x?: number;
      creditInstallments?: number;
      anticipation?: number;
      applyAnticipation?: boolean;
    };
  } | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Revenue {
  id: string;
  date: string;
  amount: string | number;
  grossAmount?: string | number;
  netAmount?: string | number;
  feeRate?: string | number;
  feeAmount?: string | number;
  paymentMethod: string;
  cardType?: string | null;
  installments?: number | null;
  source: string;
  category?: string;
  note?: string;
  laundry?: { id: string; name: string };
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: string | number;
  type: string;
  paid: boolean;
  paymentMethod?: string;
  note?: string;
  category?: ExpenseCategory;
  machine?: { id: string; name: string; type: string };
  laundry?: { id: string; name: string };
}

export interface Payable {
  id: string;
  description: string;
  amount: string | number;
  dueDate: string;
  status: string;
  isOverdue?: boolean;
  paidAt?: string;
  expenseId?: string;
  note?: string;
  category?: ExpenseCategory | null;
  laundry?: { id: string; name: string };
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  capacity?: string;
  brandModel?: string;
  acquiredAt?: string;
  status: string;
  laundry?: { id: string; name: string };
}

export interface InventoryProduct {
  id: string;
  name: string;
  unit: string;
  unitCost: string | number;
  currentStock: string | number;
  minStock: string | number;
  isLowStock?: boolean;
  laundry?: { id: string; name: string };
}

export interface InventoryMovement {
  id: string;
  type: string;
  quantity: string | number;
  unitCost?: string | number | null;
  note?: string | null;
  createdAt: string;
}

export interface ConsumptionReportItem {
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  totalConsumed: number;
  isLowStock: boolean;
}
