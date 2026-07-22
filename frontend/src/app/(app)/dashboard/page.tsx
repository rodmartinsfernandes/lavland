'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import { Card, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { LaundryFilter } from '@/components/ui/laundry-filter';
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import type { DashboardSummary } from '@/types';
import type { InventoryProduct, PaginatedResponse, Payable } from '@/types/entities';
import { RevenueTrendChart } from '@/components/charts/revenue-trend-chart';

const quickLinks = [
  { href: '/receitas', label: 'Nova receita' },
  { href: '/despesas', label: 'Nova despesa' },
  { href: '/contas', label: 'Contas a pagar' },
  { href: '/estoque', label: 'Estoque' },
];

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId } = useLaundry();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<InventoryProduct[]>([]);
  const [upcomingPayables, setUpcomingPayables] = useState<Payable[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/operador');
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const params = laundryId ? `?laundryId=${laundryId}` : '';
    const payablesParams = new URLSearchParams({ limit: '5', status: 'PENDING' });
    if (laundryId) payablesParams.set('laundryId', laundryId);
    const lowStockParams = new URLSearchParams({
      limit: '10',
      lowStockOnly: 'true',
    });
    if (laundryId) lowStockParams.set('laundryId', laundryId);

    setLoading(true);
    Promise.all([
      api<DashboardSummary>(`/dashboard/summary${params}`),
      laundryId
        ? api<PaginatedResponse<InventoryProduct>>(
            `/inventory/products?${lowStockParams}`,
          ).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }))
        : Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      api<PaginatedResponse<Payable>>(`/payables?${payablesParams}`).catch(() => ({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
      })),
    ])
      .then(([summary, lowStock, payables]) => {
        setData(summary);
        setLowStockProducts(lowStock.data);
        setUpcomingPayables(payables.data);
        setError('');
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : 'Erro ao carregar dashboard',
        );
      })
      .finally(() => setLoading(false));
  }, [isAdmin, laundryId]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Resumo financeiro da lavanderia."
        />
        <FilterBar>
          <LaundryFilter />
        </FilterBar>
        <p className="text-[var(--muted)]">Carregando indicadores...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Resumo financeiro da lavanderia."
        />
        <FilterBar>
          <LaundryFilter />
        </FilterBar>
        <p className="rounded-xl border border-red-100 bg-[var(--danger-soft)] px-4 py-3 text-red-700">
          {error || 'Dados indisponíveis'}
        </p>
      </div>
    );
  }

  const maxChartValue = Math.max(
    ...data.charts.revenueVsExpenses.flatMap((item) => [
      item.revenue,
      item.expenses,
    ]),
    1,
  );

  const maxCategoryValue = Math.max(
    ...data.charts.expensesByCategory.map((item) => item.amount),
    1,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Resumo de ${formatMonth(data.period.year, data.period.month)}`}
      />

      <FilterBar>
        <LaundryFilter />
      </FilterBar>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-sm)] transition hover:border-[var(--brand-muted)] hover:bg-[var(--brand-soft)]/30 hover:text-[var(--brand)]"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Receita do mês"
          value={formatCurrency(data.currentMonth.netRevenue)}
          hint={`Bruto: ${formatCurrency(data.currentMonth.revenue)} · Taxas cartão: ${formatCurrency(data.currentMonth.cardFees)}`}
          trend={`${formatPercent(data.comparison.netRevenueChange)} vs mês anterior (líquido)`}
          accent="green"
        />
        <StatCard
          title="Despesas do mês"
          value={formatCurrency(data.currentMonth.expensesTotal)}
          hint={`Pago: ${formatCurrency(data.currentMonth.expensesPaid)} · A pagar: ${formatCurrency(data.currentMonth.expensesToPay)}`}
          trend={`${formatPercent(data.comparison.expensesChange)} vs mês anterior (pago)`}
          accent="red"
        />
        <StatCard
          title="Lucro líquido"
          value={formatCurrency(data.currentMonth.netProfit)}
          trend={`${formatPercent(data.comparison.netProfitChange)} vs mês anterior`}
          accent="brand"
        />
        <StatCard
          title="Margem de lucro"
          value={`${data.currentMonth.profitMargin.toFixed(1)}%`}
          hint={`Lucro anterior: ${formatCurrency(data.previousMonth.netProfit)}`}
          accent="cyan"
        />
      </div>

      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Despesas do mês — detalhamento
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-muted)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Total previsto
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {formatCurrency(data.currentMonth.expensesTotal)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Pago + a pagar no mês
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--success-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Já pago
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(data.currentMonth.expensesPaid)}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Despesas lançadas no mês
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--warning-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              A pagar
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatCurrency(data.currentMonth.expensesToPay)}
            </p>
            <p className="mt-1 text-xs text-amber-600">
              {data.currentMonth.expensesToPayCount} conta
              {data.currentMonth.expensesToPayCount === 1 ? '' : 's'} com
              vencimento no mês
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Contas a pagar
            </h2>
            <Link
              href="/contas"
              className="text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[var(--warning-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Pendentes
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {data.payables.pending}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--danger-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Vencidas
              </p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {data.payables.overdue}
              </p>
            </div>
          </div>
          {upcomingPayables.length > 0 ? (
            <div className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Próximos vencimentos
              </p>
              {upcomingPayables.map((payable) => (
                <div
                  key={payable.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                >
                  <span className="truncate font-medium text-[var(--foreground)]">
                    {payable.description}
                  </span>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="font-semibold text-[var(--foreground)]">
                      {formatCurrency(Number(payable.amount))}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(payable.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Estoque baixo
            </h2>
            <Link
              href="/estoque"
              className="text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              Ver estoque
            </Link>
          </div>
          <div className="mt-5 space-y-2">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum produto com estoque baixo.
              </p>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-[var(--foreground)]">
                    {product.name}{' '}
                    <span className="text-[var(--muted-foreground)]">
                      ({product.unit})
                    </span>
                  </span>
                  <Badge variant="danger">
                    {Number(product.currentStock)} / {Number(product.minStock)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Tendência de faturamento mensal
        </h2>
        <div className="mt-5">
          <RevenueTrendChart data={data.charts.monthlyRevenueTrend} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Despesas por categoria
          </h2>
          <div className="mt-5 space-y-4">
            {data.charts.expensesByCategory.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Sem despesas no período
              </p>
            ) : (
              data.charts.expensesByCategory.map((item) => (
                <div key={item.category}>
                  <div className="mb-1.5 flex justify-between text-xs font-medium text-[var(--muted)]">
                    <span>{item.category}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="brand-gradient h-full rounded-full transition-all"
                      style={{
                        width: `${(item.amount / maxCategoryValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Lucro mensal (últimos 6 meses)
          </h2>
          <div className="mt-5 space-y-4">
            {data.charts.revenueVsExpenses.map((item) => {
              const profit = item.revenue - item.expenses;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-xs font-medium text-[var(--muted)]">
                    <span>{item.label}</span>
                    <span
                      className={
                        profit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }
                    >
                      {formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className={`h-full rounded-full ${
                        profit >= 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
                      }`}
                      style={{
                        width: `${(Math.abs(profit) / maxChartValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Receitas x Despesas (últimos 6 meses)
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {data.charts.revenueVsExpenses.map((item) => (
            <div key={item.label} className="text-center">
              <p className="mb-3 text-xs font-semibold text-[var(--muted)]">
                {item.label}
              </p>
              <div className="flex h-32 items-end justify-center gap-1.5">
                <div
                  className="w-4 rounded-t-lg bg-[var(--success)]"
                  style={{
                    height: `${(item.revenue / maxChartValue) * 100}%`,
                  }}
                  title={`Receita: ${formatCurrency(item.revenue)}`}
                />
                <div
                  className="w-4 rounded-t-lg bg-[var(--danger)]/70"
                  style={{
                    height: `${(item.expenses / maxChartValue) * 100}%`,
                  }}
                  title={`Despesas: ${formatCurrency(item.expenses)}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-5 text-xs font-medium text-[var(--muted)]">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
            Receitas
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/70" />
            Despesas
          </span>
        </div>
      </Card>
    </div>
  );
}
