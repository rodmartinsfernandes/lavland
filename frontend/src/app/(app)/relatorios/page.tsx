'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import { formatCurrency } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { labelOf, paymentMethodLabels } from '@/lib/labels';
import type {
  CashFlowReport,
  CategoryReportItem,
  MachineMaintenanceItem,
  MonthlyResult,
  PaymentMethodReportItem,
  ProfitByPeriodItem,
} from '@/types/reports';
import { PageHeader, Alert } from '@/components/ui/page-header';
import { Card, StatCard } from '@/components/ui/card';
import {
  DateRangeFilter,
  getMonthDateRange,
} from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { buildReportsCsv } from '@/lib/report-export';

export default function RelatoriosPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId } = useLaundry();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [monthly, setMonthly] = useState<MonthlyResult | null>(null);
  const [categories, setCategories] = useState<CategoryReportItem[]>([]);
  const [payments, setPayments] = useState<PaymentMethodReportItem[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [machines, setMachines] = useState<MachineMaintenanceItem[]>([]);
  const [profitByPeriod, setProfitByPeriod] = useState<ProfitByPeriodItem[]>([]);

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  useEffect(() => {
    const range = getMonthDateRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setAppliedStart(range.startDate);
    setAppliedEnd(range.endDate);
  }, []);

  useEffect(() => {
    if (!isAdmin || !appliedStart || !appliedEnd) return;

    const params = new URLSearchParams({
      startDate: appliedStart,
      endDate: appliedEnd,
    });
    if (laundryId) params.set('laundryId', laundryId);

    setLoading(true);
    Promise.all([
      api<MonthlyResult>(`/reports/monthly-result?${params}`),
      api<CategoryReportItem[]>(`/reports/expenses-by-category?${params}`),
      api<PaymentMethodReportItem[]>(
        `/reports/revenue-by-payment-method?${params}`,
      ),
      api<CashFlowReport>(`/reports/cash-flow?${params}`),
      api<MachineMaintenanceItem[]>(
        `/reports/machine-maintenance${laundryId ? `?laundryId=${laundryId}` : ''}`,
      ),
      api<ProfitByPeriodItem[]>(`/reports/profit-by-period?${params}`),
    ])
      .then(([monthlyResult, cat, pay, flow, mach, profit]) => {
        setMonthly(monthlyResult);
        setCategories(cat);
        setPayments(pay);
        setCashFlow(flow);
        setMachines(mach);
        setProfitByPeriod(profit);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
      })
      .finally(() => setLoading(false));
  }, [isAdmin, appliedStart, appliedEnd, laundryId]);

  if (!isAdmin) return null;

  function handleExportCsv() {
    const content = buildReportsCsv({
      period: { start: appliedStart, end: appliedEnd },
      monthly,
      cashFlow,
      profitByPeriod,
      categories,
      payments,
      machines,
    });
    downloadCsv(`relatorio-${appliedStart}-${appliedEnd}.csv`, content);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análise financeira detalhada da lavanderia."
      />

      {error ? <Alert>{error}</Alert> : null}

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={() => {
          setAppliedStart(startDate);
          setAppliedEnd(endDate);
        }}
      />

      {!loading && monthly ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-[var(--muted)]">Carregando relatórios...</p>
      ) : (
        <>
          {monthly ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Receita total"
                value={formatCurrency(monthly.totalRevenue)}
                accent="green"
              />
              <StatCard
                title="Despesas totais"
                value={formatCurrency(monthly.totalExpenses)}
                accent="red"
              />
              <StatCard
                title="Lucro líquido"
                value={formatCurrency(monthly.netProfit)}
                accent="brand"
              />
              <StatCard
                title="Margem"
                value={`${monthly.profitMargin.toFixed(1)}%`}
                accent="amber"
              />
            </div>
          ) : null}

          {cashFlow ? (
            <Card>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Fluxo de caixa
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Entradas</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(cashFlow.inflows)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Saídas</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(cashFlow.outflows)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Saldo</p>
                  <p className="text-lg font-semibold text-[var(--brand)]">
                    {formatCurrency(cashFlow.balance)}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <ProfitChart data={profitByPeriod} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportTable
              title="Despesas por categoria"
              headers={['Categoria', 'Total', 'Qtd']}
              rows={categories.map((item) => [
                item.category?.name ?? '—',
                formatCurrency(item.total),
                String(item.count),
              ])}
            />
            <ReportTable
              title="Receitas por pagamento"
              headers={['Forma', 'Total', 'Qtd']}
              rows={payments.map((item) => [
                labelOf(paymentMethodLabels, item.paymentMethod),
                formatCurrency(item.total),
                String(item.count),
              ])}
            />
          </div>

          <ReportTable
            title="Manutenção por máquina"
            headers={['Máquina', 'Tipo', 'Status', 'Custo total']}
            rows={machines.map((item) => [
              item.name,
              item.type,
              item.status,
              formatCurrency(item.totalMaintenanceCost),
            ])}
          />
        </>
      )}
    </div>
  );
}

function ProfitChart({ data }: { data: ProfitByPeriodItem[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Lucro por dia
        </h2>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">Sem dados no período.</p>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((item) => [
      Math.abs(item.revenue),
      Math.abs(item.expenses),
      Math.abs(item.profit),
    ]),
    1,
  );

  return (
    <Card>
      <h2 className="text-base font-semibold text-[var(--foreground)]">Lucro por dia</h2>
      <div className="mt-6 overflow-x-auto pb-2">
        <div
          className="flex items-end gap-1"
          style={{ minWidth: `${data.length * 40}px` }}
        >
          {data.map((item) => (
            <div
              key={item.date}
              className="flex min-w-8 flex-1 flex-col items-center"
            >
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                <div
                  className="w-2 rounded-t bg-emerald-500"
                  style={{
                    height: `${(item.revenue / maxValue) * 100}%`,
                  }}
                  title={`Receita: ${formatCurrency(item.revenue)}`}
                />
                <div
                  className="w-2 rounded-t bg-red-400"
                  style={{
                    height: `${(item.expenses / maxValue) * 100}%`,
                  }}
                  title={`Despesas: ${formatCurrency(item.expenses)}`}
                />
                <div
                  className={`w-2 rounded-t ${
                    item.profit >= 0 ? 'brand-gradient' : 'bg-amber-500'
                  }`}
                  style={{
                    height: `${(Math.abs(item.profit) / maxValue) * 100}%`,
                  }}
                  title={`Lucro: ${formatCurrency(item.profit)}`}
                />
              </div>
              <p className="mt-2 text-[10px] text-[var(--muted)]">
                {formatDate(item.date).slice(0, 5)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Receitas
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          Despesas
        </span>
        <span className="flex items-center gap-2">
          <span className="brand-gradient h-2 w-2 rounded-full" />
          Lucro
        </span>
      </div>
    </Card>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-[var(--muted-foreground)]">Sem dados no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-[var(--border-subtle)]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
