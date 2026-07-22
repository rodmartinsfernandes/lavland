import { Injectable } from '@nestjs/common';
import { PayableStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  toNumber,
} from '../common/utils/financial.util';
import { PayablesService } from '../payables/payables.service';
import { DashboardFilterDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payablesService: PayablesService,
  ) {}

  async getSummary(filters: DashboardFilterDto) {
    const current = getCurrentMonthRange();
    const previous = getPreviousMonthRange();
    const laundryFilter = filters.laundryId
      ? { laundryId: filters.laundryId }
      : {};

    await this.payablesService.syncOverdueStatus(filters.laundryId);

    const [
      currentRevenue,
      currentNetRevenue,
      currentCardFees,
      currentExpenses,
      previousRevenue,
      previousNetRevenue,
      previousExpenses,
      payablesToPay,
      pendingPayables,
      overduePayables,
      revenueVsExpenses,
      expensesByCategory,
      monthRevenueProjection,
    ] = await Promise.all([
      this.sumRevenues(current.start, current.end, laundryFilter),
      this.sumNetRevenues(current.start, current.end, laundryFilter),
      this.sumCardFees(current.start, current.end, laundryFilter),
      this.sumExpenses(current.start, current.end, laundryFilter),
      this.sumRevenues(previous.start, previous.end, laundryFilter),
      this.sumNetRevenues(previous.start, previous.end, laundryFilter),
      this.sumExpenses(previous.start, previous.end, laundryFilter),
      this.sumPayablesToPay(current.start, current.end, laundryFilter),
      this.prisma.payable.count({
        where: { status: PayableStatus.PENDING, ...laundryFilter },
      }),
      this.prisma.payable.count({
        where: { status: PayableStatus.OVERDUE, ...laundryFilter },
      }),
      this.getRevenueVsExpensesChart(laundryFilter),
      this.getExpensesByCategoryChart(current.start, current.end, laundryFilter),
      this.getMonthRevenueProjection(current.start, laundryFilter),
    ]);

    const expensesPaid = currentExpenses;
    const expensesToPay = payablesToPay.amount;
    const expensesTotal = expensesPaid + expensesToPay;

    const netProfit = currentNetRevenue - currentExpenses;
    const previousNetProfit = previousNetRevenue - previousExpenses;
    const profitMargin =
      currentNetRevenue > 0 ? (netProfit / currentNetRevenue) * 100 : 0;

    return {
      period: {
        year: current.start.getFullYear(),
        month: current.start.getMonth() + 1,
      },
      currentMonth: {
        revenue: currentRevenue,
        netRevenue: currentNetRevenue,
        cardFees: currentCardFees,
        expenses: expensesPaid,
        expensesPaid,
        expensesToPay,
        expensesTotal,
        expensesToPayCount: payablesToPay.count,
        netProfit,
        profitMargin: Number(profitMargin.toFixed(2)),
      },
      previousMonth: {
        revenue: previousRevenue,
        netRevenue: previousNetRevenue,
        expenses: previousExpenses,
        netProfit: previousNetProfit,
      },
      comparison: {
        revenueChange: this.percentChange(previousRevenue, currentRevenue),
        netRevenueChange: this.percentChange(
          previousNetRevenue,
          currentNetRevenue,
        ),
        expensesChange: this.percentChange(previousExpenses, currentExpenses),
        netProfitChange: this.percentChange(previousNetProfit, netProfit),
      },
      payables: {
        pending: pendingPayables,
        overdue: overduePayables,
      },
      charts: {
        revenueVsExpenses,
        expensesByCategory,
        monthRevenueProjection,
      },
    };
  }

  private async sumRevenues(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const result = await this.prisma.revenue.aggregate({
      where: {
        date: { gte: start, lte: end },
        ...laundryFilter,
      },
      _sum: { amount: true },
    });

    return toNumber(result._sum.amount ?? 0);
  }

  private async sumExpenses(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const result = await this.prisma.expense.aggregate({
      where: {
        date: { gte: start, lte: end },
        ...laundryFilter,
      },
      _sum: { amount: true },
    });

    return toNumber(result._sum.amount ?? 0);
  }

  private async sumNetRevenues(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const revenues = await this.prisma.revenue.findMany({
      where: {
        date: { gte: start, lte: end },
        ...laundryFilter,
      },
      select: { amount: true, netAmount: true },
    });

    return revenues.reduce(
      (total, item) =>
        total + toNumber(item.netAmount ?? item.amount ?? 0),
      0,
    );
  }

  private async sumCardFees(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const result = await this.prisma.revenue.aggregate({
      where: {
        date: { gte: start, lte: end },
        paymentMethod: 'CARD',
        ...laundryFilter,
      },
      _sum: { feeAmount: true },
    });

    return toNumber(result._sum.feeAmount ?? 0);
  }

  private async sumPayablesToPay(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const result = await this.prisma.payable.aggregate({
      where: {
        dueDate: { gte: start, lte: end },
        status: { in: [PayableStatus.PENDING, PayableStatus.OVERDUE] },
        ...laundryFilter,
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      amount: toNumber(result._sum.amount ?? 0),
      count: result._count,
    };
  }

  private buildMonthWindows(count: number) {
    const now = new Date();
    const months: { label: string; start: Date; end: Date }[] = [];

    for (let i = count - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      months.push({
        label: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        start,
        end,
      });
    }

    return months;
  }

  private async getRevenueVsExpensesChart(laundryFilter: {
    laundryId?: string;
  }) {
    const months = this.buildMonthWindows(6);

    return Promise.all(
      months.map(async (month) => ({
        label: month.label,
        revenue: await this.sumRevenues(month.start, month.end, laundryFilter),
        expenses: await this.sumExpenses(month.start, month.end, laundryFilter),
      })),
    );
  }

  private async getMonthRevenueProjection(
    monthStart: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysElapsed = Math.min(
      Math.max(now.getDate(), 1),
      daysInMonth,
    );
    const daysRemaining = Math.max(daysInMonth - daysElapsed, 0);

    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const previousStart = new Date(year, month - 1, 1);
    const previousEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const revenues = await this.prisma.revenue.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        ...laundryFilter,
      },
      select: { date: true, amount: true, netAmount: true },
      orderBy: { date: 'asc' },
    });

    const dailyGross = new Map<number, number>();
    const dailyNet = new Map<number, number>();

    for (const item of revenues) {
      const day = Number(item.date.toISOString().slice(8, 10));
      const gross = toNumber(item.amount);
      const net = toNumber(item.netAmount ?? item.amount);
      dailyGross.set(day, (dailyGross.get(day) ?? 0) + gross);
      dailyNet.set(day, (dailyNet.get(day) ?? 0) + net);
    }

    let runningGross = 0;
    let runningNet = 0;
    const series: {
      day: number;
      actualGross: number | null;
      actualNet: number | null;
      projectedGross: number;
      projectedNet: number;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      runningGross += dailyGross.get(day) ?? 0;
      runningNet += dailyNet.get(day) ?? 0;

      series.push({
        day,
        actualGross:
          day <= daysElapsed ? Number(runningGross.toFixed(2)) : null,
        actualNet: day <= daysElapsed ? Number(runningNet.toFixed(2)) : null,
        projectedGross: 0,
        projectedNet: 0,
      });
    }

    const currentPoint = series[daysElapsed - 1];
    const currentGross = currentPoint?.actualGross ?? 0;
    const currentNet = currentPoint?.actualNet ?? 0;
    const dailyAverageGross = Number((currentGross / daysElapsed).toFixed(2));
    const dailyAverageNet = Number((currentNet / daysElapsed).toFixed(2));
    const projectedGross = Number(
      (dailyAverageGross * daysInMonth).toFixed(2),
    );
    const projectedNet = Number((dailyAverageNet * daysInMonth).toFixed(2));

    for (const point of series) {
      point.projectedGross = Number(
        (dailyAverageGross * point.day).toFixed(2),
      );
      point.projectedNet = Number((dailyAverageNet * point.day).toFixed(2));
    }

    const previousMonthNet = await this.sumNetRevenues(
      previousStart,
      previousEnd,
      laundryFilter,
    );

    return {
      daysElapsed,
      daysInMonth,
      daysRemaining,
      currentGross,
      currentNet,
      dailyAverageGross,
      dailyAverageNet,
      projectedGross,
      projectedNet,
      previousMonthNet,
      paceVsPreviousMonth: this.percentChange(previousMonthNet, projectedNet),
      series,
    };
  }

  private async getExpensesByCategoryChart(
    start: Date,
    end: Date,
    laundryFilter: { laundryId?: string },
  ) {
    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        date: { gte: start, lte: end },
        ...laundryFilter,
      },
      _sum: { amount: true },
    });

    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        id: { in: grouped.map((item) => item.categoryId) },
      },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    return grouped
      .map((item) => ({
        category: categoryMap.get(item.categoryId) ?? 'Sem categoria',
        amount: toNumber(item._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private percentChange(previous: number, current: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}
