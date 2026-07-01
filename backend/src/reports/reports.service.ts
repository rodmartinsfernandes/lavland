import { Injectable } from '@nestjs/common';
import { PayableStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildDateRange } from '../common/dto/date-filter.dto';
import {
  getCurrentMonthRange,
  toNumber,
} from '../common/utils/financial.util';
import { ReportFilterDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyResult(filters: ReportFilterDto) {
    const range = this.resolveRange(filters);

    const [revenue, expenses] = await Promise.all([
      this.prisma.revenue.aggregate({
        where: this.buildWhere(range, filters.laundryId),
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: this.buildWhere(range, filters.laundryId),
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = toNumber(revenue._sum.amount ?? 0);
    const totalExpenses = toNumber(expenses._sum.amount ?? 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      period: {
        startDate: range.gte,
        endDate: range.lte,
      },
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin:
        totalRevenue > 0
          ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
          : 0,
    };
  }

  async getExpensesByCategory(filters: ReportFilterDto) {
    const range = this.resolveRange(filters);
    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: this.buildWhere(range, filters.laundryId),
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: grouped.map((item) => item.categoryId) } },
      select: { id: true, name: true, slug: true },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    return grouped
      .map((item) => ({
        category: categoryMap.get(item.categoryId),
        total: toNumber(item._sum.amount ?? 0),
        count: item._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getRevenueByPaymentMethod(filters: ReportFilterDto) {
    const range = this.resolveRange(filters);
    const grouped = await this.prisma.revenue.groupBy({
      by: ['paymentMethod'],
      where: this.buildWhere(range, filters.laundryId),
      _sum: { amount: true },
      _count: { _all: true },
    });

    return grouped
      .map((item) => ({
        paymentMethod: item.paymentMethod,
        total: toNumber(item._sum.amount ?? 0),
        count: item._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getProfitByPeriod(filters: ReportFilterDto) {
    const range = this.resolveRange(filters);

    const [revenues, expenses] = await Promise.all([
      this.prisma.revenue.findMany({
        where: this.buildWhere(range, filters.laundryId),
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: this.buildWhere(range, filters.laundryId),
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const dailyMap = new Map<
      string,
      { date: string; revenue: number; expenses: number; profit: number }
    >();

    for (const revenue of revenues) {
      const key = revenue.date.toISOString().slice(0, 10);
      const current = dailyMap.get(key) ?? {
        date: key,
        revenue: 0,
        expenses: 0,
        profit: 0,
      };
      current.revenue += toNumber(revenue.amount);
      dailyMap.set(key, current);
    }

    for (const expense of expenses) {
      const key = expense.date.toISOString().slice(0, 10);
      const current = dailyMap.get(key) ?? {
        date: key,
        revenue: 0,
        expenses: 0,
        profit: 0,
      };
      current.expenses += toNumber(expense.amount);
      dailyMap.set(key, current);
    }

    return Array.from(dailyMap.values())
      .map((item) => ({
        ...item,
        profit: item.revenue - item.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCashFlow(filters: ReportFilterDto) {
    const range = this.resolveRange(filters);

    const [revenues, expenses, payablesPaid] = await Promise.all([
      this.prisma.revenue.findMany({
        where: this.buildWhere(range, filters.laundryId),
        select: { date: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          ...this.buildWhere(range, filters.laundryId),
          paid: true,
        },
        select: { date: true, amount: true },
      }),
      this.prisma.payable.findMany({
        where: {
          status: PayableStatus.PAID,
          paidAt: { gte: range.gte, lte: range.lte },
          ...(filters.laundryId && { laundryId: filters.laundryId }),
        },
        select: { paidAt: true, amount: true },
      }),
    ]);

    const inflows = revenues.reduce(
      (sum, item) => sum + toNumber(item.amount),
      0,
    );
    const outflows =
      expenses.reduce((sum, item) => sum + toNumber(item.amount), 0) +
      payablesPaid.reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
      period: {
        startDate: range.gte,
        endDate: range.lte,
      },
      inflows,
      outflows,
      balance: inflows - outflows,
      details: {
        revenues: inflows,
        paidExpenses: expenses.reduce(
          (sum, item) => sum + toNumber(item.amount),
          0,
        ),
        paidPayables: payablesPaid.reduce(
          (sum, item) => sum + toNumber(item.amount),
          0,
        ),
      },
    };
  }

  async getMachineMaintenanceReport(laundryId?: string) {
    const machines = await this.prisma.machine.findMany({
      where: laundryId ? { laundryId } : undefined,
      include: {
        expenses: {
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return machines.map((machine) => ({
      machineId: machine.id,
      name: machine.name,
      type: machine.type,
      status: machine.status,
      totalMaintenanceCost: machine.expenses.reduce(
        (sum, expense) => sum + toNumber(expense.amount),
        0,
      ),
    }));
  }

  private resolveRange(filters: ReportFilterDto) {
    const customRange = buildDateRange(filters.startDate, filters.endDate);

    if (customRange) {
      return customRange;
    }

    const current = getCurrentMonthRange();
    return { gte: current.start, lte: current.end };
  }

  private buildWhere(
    range: { gte?: Date; lte?: Date },
    laundryId?: string,
  ) {
    return {
      date: range,
      ...(laundryId && { laundryId }),
    };
  }
}
