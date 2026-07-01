export interface MonthlyResult {
  period: { startDate: string; endDate: string };
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface CategoryReportItem {
  category?: { id: string; name: string; slug: string };
  total: number;
  count: number;
}

export interface PaymentMethodReportItem {
  paymentMethod: string;
  total: number;
  count: number;
}

export interface ProfitByPeriodItem {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CashFlowReport {
  period: { startDate: string; endDate: string };
  inflows: number;
  outflows: number;
  balance: number;
  details: {
    revenues: number;
    paidExpenses: number;
    paidPayables: number;
  };
}

export interface MachineMaintenanceItem {
  machineId: string;
  name: string;
  type: string;
  status: string;
  totalMaintenanceCost: number;
}
