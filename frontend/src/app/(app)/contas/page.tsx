'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatDate, todayIsoDate, toAmount } from '@/lib/date';
import { formatCurrency, formatCurrencyInput, maskCurrencyInput, parseCurrencyInput } from '@/lib/format';
import { labelOf, payableStatusLabels, paymentMethodLabels } from '@/lib/labels';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type {
  ExpenseCategory,
  PaginatedMeta,
  PaginatedResponse,
  Payable,
} from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { LaundrySelect } from '@/components/ui/laundry-select';
import { confirmDelete, notifyError, toast } from '@/lib/notifications';
import { Pagination } from '@/components/ui/pagination';
import { DateRangeFilter, getMonthDateRange } from '@/components/ui/date-range-filter';

const PAGE_SIZE = 20;

function statusVariant(status: string, isOverdue?: boolean) {
  if (status === 'PAID') return 'success';
  if (status === 'OVERDUE' || isOverdue) return 'danger';
  return 'warning';
}

export default function ContasPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId, laundries, loading: laundryLoading, error: laundryError } = useLaundry();
  const [items, setItems] = useState<Payable[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('36');
  const [payTarget, setPayTarget] = useState<Payable | null>(null);
  const [payDate, setPayDate] = useState(todayIsoDate());
  const [payMethod, setPayMethod] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [formLaundryId, setFormLaundryId] = useState('');

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  useEffect(() => {
    const range = getMonthDateRange();
    setFilterStart(range.startDate);
    setFilterEnd(range.endDate);
    setAppliedStart(range.startDate);
    setAppliedEnd(range.endDate);
  }, []);

  const loadData = useCallback(async () => {
    if (!laundryId || !isAdmin || !appliedStart || !appliedEnd) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        laundryId,
        limit: String(PAGE_SIZE),
        page: String(page),
        startDate: appliedStart,
        endDate: appliedEnd,
      });
      if (statusFilter) params.set('status', statusFilter);
      const [payables, cats] = await Promise.all([
        api<PaginatedResponse<Payable>>(`/payables?${params}`),
        api<PaginatedResponse<ExpenseCategory>>(
          '/expense-categories?limit=100',
        ),
      ]);
      setItems(payables.data);
      setMeta(payables.meta);
      setCategories(cats.data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [laundryId, statusFilter, page, isAdmin, appliedStart, appliedEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setDueDate(todayIsoDate());
    setCategoryId('');
    setNote('');
    setIsRecurring(false);
    setInstallments('36');
    setFormLaundryId(laundryId ?? '');
  }

  function openEdit(item: Payable) {
    setEditingId(item.id);
    setDescription(item.description);
    setAmount(formatCurrencyInput(toAmount(item.amount)));
    setDueDate(item.dueDate.slice(0, 10));
    setCategoryId(item.category?.id ?? '');
    setNote(item.note ?? '');
    setFormLaundryId(item.laundry?.id ?? laundryId ?? '');
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('Excluir esta conta?'))) return;
    try {
      await api(`/payables/${id}`, { method: 'DELETE' });
      toast.success('Conta excluída.');
      await loadData();
    } catch (err) {
      notifyError(err, 'Erro ao excluir');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formLaundryId) return;

    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount < 0.01) {
      toast.error('Informe um valor válido');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api(`/payables/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            description,
            amount: parsedAmount,
            dueDate,
            categoryId: categoryId || undefined,
            note: note || undefined,
            laundryId: formLaundryId,
          }),
        });
      } else if (isRecurring) {
        await api('/payables/recurring', {
          method: 'POST',
          body: JSON.stringify({
            description,
            amount: parsedAmount,
            firstDueDate: dueDate,
            installments: Number(installments),
            interval: 'MONTHLY',
            categoryId: categoryId || undefined,
            note: note || undefined,
            laundryId: formLaundryId,
          }),
        });
      } else {
        await api('/payables', {
          method: 'POST',
          body: JSON.stringify({
            description,
            amount: parsedAmount,
            dueDate,
            categoryId: categoryId || undefined,
            note: note || undefined,
            laundryId: formLaundryId,
          }),
        });
      }
      setShowForm(false);
      resetForm();
      if (editingId) {
        toast.success('Conta atualizada.');
      } else if (isRecurring) {
        toast.success(`${installments} parcelas criadas.`);
      } else {
        toast.success('Conta cadastrada.');
      }
      await loadData();
    } catch (err) {
      notifyError(err, 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsPaid(event: FormEvent) {
    event.preventDefault();
    if (!payTarget) return;

    setPaySubmitting(true);
    try {
      await api(`/payables/${payTarget.id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          paidDate: payDate,
          paymentMethod: payMethod || undefined,
        }),
      });
      setPayTarget(null);
      setPayMethod('');
      setPayDate(todayIsoDate());
      toast.success('Baixa registrada. Despesa gerada automaticamente.');
      await loadData();
    } catch (err) {
      notifyError(err, 'Erro ao dar baixa');
    } finally {
      setPaySubmitting(false);
    }
  }

  function openPayForm(item: Payable) {
    setPayTarget(item);
    setPayDate(todayIsoDate());
    setPayMethod('');
    setShowForm(false);
    setError('');
  }

  if (!isAdmin) return null;

  if (laundryLoading) return <p className="text-[var(--muted)]">Carregando...</p>;
  if (laundryError) return <Alert>{laundryError}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a pagar"
        description="Planeje vencimentos e dê baixa para gerar a despesa automaticamente."
        actionLabel={showForm ? undefined : 'Nova conta'}
        onAction={() => {
          resetForm();
          setPayTarget(null);
          setShowForm(true);
        }}
      />

      {error ? <Alert>{error}</Alert> : null}

      <DateRangeFilter
        startDate={filterStart}
        endDate={filterEnd}
        onStartDateChange={setFilterStart}
        onEndDateChange={setFilterEnd}
        onApply={() => {
          setAppliedStart(filterStart);
          setAppliedEnd(filterEnd);
          setPage(1);
        }}
      >
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Todos' },
            ...Object.entries(payableStatusLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </DateRangeFilter>

      {payTarget ? (
        <FormCard
          title={`Dar baixa — ${payTarget.description}`}
          onClose={() => setPayTarget(null)}
        >
          <form onSubmit={markAsPaid} className="grid gap-4 md:grid-cols-2">
            <p className="text-sm text-[var(--muted)] md:col-span-2">
              Valor: {formatCurrency(toAmount(payTarget.amount))} · Vencimento:{' '}
              {formatDate(payTarget.dueDate)}
            </p>
            <Input
              label="Data do pagamento"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
            <Select
              label="Forma de pagamento"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              options={[
                { value: '', label: 'Não informado' },
                ...Object.entries(paymentMethodLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" loading={paySubmitting}>
                Confirmar baixa
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPayTarget(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      {showForm ? (
        <FormCard
          title={editingId ? 'Editar conta' : 'Nova conta a pagar'}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <LaundrySelect
              value={formLaundryId}
              onChange={setFormLaundryId}
            />
            <Input
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <Input
              label="Valor"
              value={amount}
              onChange={(e) => setAmount(maskCurrencyInput(e.target.value))}
              placeholder="R$ 0,00"
              inputMode="numeric"
              required
            />
            <Input
              label={isRecurring ? 'Primeiro vencimento' : 'Vencimento'}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            {!editingId ? (
              <>
                <label className="flex items-center gap-2 text-sm text-[var(--muted)] md:col-span-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-[#cbd5e1]"
                  />
                  Gerar parcelas recorrentes (ex.: aluguel 36 meses)
                </label>
                {isRecurring ? (
                  <>
                    <Input
                      label="Número de parcelas"
                      type="number"
                      min="2"
                      max="120"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      required
                    />
                    <Select
                      label="Intervalo"
                      value="MONTHLY"
                      onChange={() => {}}
                      options={[{ value: 'MONTHLY', label: 'Mensal' }]}
                    />
                  </>
                ) : null}
              </>
            ) : null}
            <Select
              label="Categoria (opcional)"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Selecione (recomendado)' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Observação"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                {editingId
                  ? 'Atualizar'
                  : isRecurring
                    ? `Gerar ${installments} parcelas`
                    : 'Salvar conta'}
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Carregando contas...</p>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Nenhuma conta a pagar cadastrada." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  {laundries.length > 1 ? (
                    <th className="px-4 py-3 font-medium">Unidade</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t border-[var(--border-subtle)] ${
                      item.isOverdue || item.status === 'OVERDUE'
                        ? 'bg-red-50/40'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">{item.description}</td>
                    {laundries.length > 1 ? (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.laundry?.name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(toAmount(item.amount))}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusVariant(item.status, item.isOverdue)}
                      >
                        {labelOf(payableStatusLabels, item.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        paidLabel={
                          item.status === 'PAID' ? 'Despesa gerada' : undefined
                        }
                        onPay={
                          item.status !== 'PAID'
                            ? () => openPayForm(item)
                            : undefined
                        }
                        onEdit={
                          item.status !== 'PAID'
                            ? () => openEdit(item)
                            : undefined
                        }
                        onDelete={
                          item.status !== 'PAID'
                            ? () => handleDelete(item.id)
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </div>
  );
}
