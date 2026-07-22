export type UserRole = 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  laundryId?: string | null;
}

export interface AdminUser extends User {
  active: boolean;
  laundryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface DashboardSummary {
  period: { year: number; month: number };
  currentMonth: {
    revenue: number;
    netRevenue: number;
    cardFees: number;
    expenses: number;
    expensesPaid: number;
    expensesToPay: number;
    expensesTotal: number;
    expensesToPayCount: number;
    netProfit: number;
    profitMargin: number;
  };
  previousMonth: {
    revenue: number;
    netRevenue: number;
    expenses: number;
    netProfit: number;
  };
  comparison: {
    revenueChange: number;
    netRevenueChange: number;
    expensesChange: number;
    netProfitChange: number;
  };
  payables: {
    pending: number;
    overdue: number;
  };
  charts: {
    revenueVsExpenses: {
      label: string;
      revenue: number;
      expenses: number;
    }[];
    expensesByCategory: {
      category: string;
      amount: number;
    }[];
    monthRevenueProjection: {
      daysElapsed: number;
      daysInMonth: number;
      daysRemaining: number;
      currentGross: number;
      currentNet: number;
      dailyAverageGross: number;
      dailyAverageNet: number;
      projectedGross: number;
      projectedNet: number;
      previousMonthNet: number;
      paceVsPreviousMonth: number;
      series: {
        day: number;
        actualGross: number | null;
        actualNet: number | null;
        projectedGross: number;
        projectedNet: number;
      }[];
    };
  };
}
