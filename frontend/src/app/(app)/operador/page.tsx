'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import { formatDate, toAmount } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { labelOf, paymentMethodLabels } from '@/lib/labels';
import type { Expense, PaginatedResponse, Revenue } from '@/types/entities';
import { PageHeader, Alert } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { getMonthDateRange } from '@/components/ui/date-range-filter';

const quickActions = [
  { href: '/receitas', label: 'Nova receita', description: 'Registrar venda ou recebimento' },
  { href: '/despesas', label: 'Nova despesa', description: 'Lançar gasto do dia' },
  { href: '/estoque', label: 'Movimentar estoque', description: 'Entrada ou saída de insumos' },
];

export default function OperadorPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId } = useLaundry();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (isAdmin) router.replace('/dashboard');
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin || !laundryId) return;

    const range = getMonthDateRange();
    const params = new URLSearchParams({
      laundryId,
      limit: '5',
      page: '1',
      startDate: range.startDate,
      endDate: range.endDate,
    });

    setLoading(true);
    Promise.all([
      api<PaginatedResponse<Revenue>>(`/revenues?${params}`),
      api<PaginatedResponse<Expense>>(`/expenses?${params}`),
    ])
      .then(([rev, exp]) => {
        setRevenues(rev.data);
        setExpenses(exp.data);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
      })
      .finally(() => setLoading(false));
  }, [isAdmin, laundryId]);

  if (isAdmin) return null;

  const monthRevenue = revenues.reduce((sum, item) => sum + toAmount(item.amount), 0);
  const monthExpenses = expenses.reduce((sum, item) => sum + toAmount(item.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do operador"
        description="Atalhos para o dia a dia da lavanderia."
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full transition hover:border-[var(--brand-muted)] hover:shadow-md">
              <p className="font-semibold text-[var(--foreground)]">{action.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{action.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Últimas receitas</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Carregando...</p>
          ) : revenues.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Nenhuma receita recente.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {revenues.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-emerald-700">
                      {formatCurrency(toAmount(item.amount))}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(item.date)} ·{' '}
                      {labelOf(paymentMethodLabels, item.paymentMethod)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/receitas"
            className="mt-4 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Ver todas as receitas
          </Link>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Últimas despesas</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Carregando...</p>
          ) : expenses.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">Nenhuma despesa recente.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {expenses.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{item.description}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(item.date)} · {formatCurrency(toAmount(item.amount))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/despesas"
            className="mt-4 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Ver todas as despesas
          </Link>
        </Card>
      </div>

      {!loading ? (
        <Card>
          <p className="text-xs text-[var(--muted)]">Resumo parcial do mês (últimos lançamentos)</p>
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-[var(--muted)]">Receitas listadas: </span>
              <span className="font-semibold text-emerald-700">
                {formatCurrency(monthRevenue)}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Despesas listadas: </span>
              <span className="font-semibold text-red-600">
                {formatCurrency(monthExpenses)}
              </span>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
