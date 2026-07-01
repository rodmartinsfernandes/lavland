'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDate, todayIsoDate, toAmount } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { expenseTypeLabels, labelOf, paymentMethodLabels } from '@/lib/labels';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type { Expense, ExpenseCategory, Machine, PaginatedMeta, PaginatedResponse } from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LaundrySelect } from '@/components/ui/laundry-select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter, getMonthDateRange } from '@/components/ui/date-range-filter';
import { RowActions } from '@/components/ui/row-actions';
import { confirmDelete, notifyError, toast } from '@/lib/notifications';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 20;

export default function DespesasPage() {
  const { isAdmin } = useAuth();
  const { laundryId, laundries, loading: laundryLoading, error: laundryError } = useLaundry();
  const [items, setItems] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [date, setDate] = useState(todayIsoDate());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('VARIABLE');
  const [paid, setPaid] = useState('false');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [note, setNote] = useState('');
  const [formLaundryId, setFormLaundryId] = useState('');

  useEffect(() => {
    const range = getMonthDateRange();
    setFilterStart(range.startDate);
    setFilterEnd(range.endDate);
    setAppliedStart(range.startDate);
    setAppliedEnd(range.endDate);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setDate(todayIsoDate());
    setDescription('');
    setAmount('');
    setType('VARIABLE');
    setPaid('false');
    setPaymentMethod('');
    setMachineId('');
    setNote('');
    setFormLaundryId(laundryId ?? '');
    if (categories[0]) setCategoryId(categories[0].id);
  };

  const loadMachines = useCallback(async (targetLaundryId: string) => {
    if (!targetLaundryId) {
      setMachines([]);
      return;
    }
    try {
      const mach = await api<PaginatedResponse<Machine>>(
        `/machines?laundryId=${targetLaundryId}&limit=100`,
      );
      setMachines(mach.data);
    } catch {
      setMachines([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!laundryId || !appliedStart || !appliedEnd) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ laundryId, limit: String(PAGE_SIZE), page: String(page), startDate: appliedStart, endDate: appliedEnd });
      const [expenses, cats] = await Promise.all([
        api<PaginatedResponse<Expense>>(`/expenses?${params}`),
        api<PaginatedResponse<ExpenseCategory>>('/expense-categories?limit=100'),
      ]);
      setItems(expenses.data);
      setMeta(expenses.meta);
      setCategories(cats.data);
      if (cats.data[0]) setCategoryId((c) => c || cats.data[0].id);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [laundryId, appliedStart, appliedEnd, page]);

  useEffect(() => {
    if (showForm && formLaundryId) {
      loadMachines(formLaundryId);
    }
  }, [showForm, formLaundryId, loadMachines]);

  useEffect(() => { loadData(); }, [loadData]);

  function openEdit(item: Expense) {
    setEditingId(item.id);
    setDate(item.date.slice(0, 10));
    setDescription(item.description);
    setAmount(String(toAmount(item.amount)));
    setType(item.type);
    setPaid(item.paid ? 'true' : 'false');
    setPaymentMethod(item.paymentMethod ?? '');
    setCategoryId(item.category?.id ?? categoryId);
    setMachineId(item.machine?.id ?? '');
    setNote(item.note ?? '');
    setFormLaundryId(item.laundry?.id ?? laundryId ?? '');
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('Excluir esta despesa?'))) return;
    try {
      await api(`/expenses/${id}`, { method: 'DELETE' });
      toast.success('Despesa excluída.');
      await loadData();
    } catch (err) {
      notifyError(err, 'Erro ao excluir');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formLaundryId || !categoryId) return;
    setSubmitting(true);
    const payload = {
      date, description, amount: Number(amount), type,
      paid: paid === 'true',
      paymentMethod: paymentMethod || undefined,
      categoryId, machineId: machineId || undefined,
      note: note || undefined, laundryId: formLaundryId,
    };
    try {
      if (editingId) {
        await api(`/expenses/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/expenses', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      toast.success(editingId ? 'Despesa atualizada.' : 'Despesa cadastrada.');
      await loadData();
    } catch (err) {
      notifyError(err, 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  if (laundryLoading) return <p className="text-[var(--muted)]">Carregando...</p>;
  if (laundryError) return <Alert>{laundryError}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader title="Despesas" description="Controle todos os gastos da lavanderia por categoria."
        actionLabel={showForm ? undefined : 'Nova despesa'} onAction={() => { resetForm(); setShowForm(true); }} />
      {error ? <Alert>{error}</Alert> : null}
      <DateRangeFilter startDate={filterStart} endDate={filterEnd} onStartDateChange={setFilterStart}
        onEndDateChange={setFilterEnd} onApply={() => { setAppliedStart(filterStart); setAppliedEnd(filterEnd); setPage(1); }} />
      {showForm ? (
        <FormCard title={editingId ? 'Editar despesa' : 'Nova despesa'} onClose={() => { setShowForm(false); resetForm(); }}>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <LaundrySelect
              value={formLaundryId}
              onChange={(id) => {
                setFormLaundryId(id);
                setMachineId('');
              }}
            />
            <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Valor (R$)" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))} />
            <Select label="Pago?" value={paid} onChange={(e) => setPaid(e.target.value)} options={[{ value: 'false', label: 'Não' }, { value: 'true', label: 'Sim' }]} />
            <Select label="Forma de pagamento" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              options={[{ value: '', label: 'Não informado' }, ...Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))]} />
            <Select label="Máquina (opcional)" value={machineId} onChange={(e) => setMachineId(e.target.value)}
              options={[{ value: '', label: 'Nenhuma' }, ...machines.map((m) => ({ value: m.id, label: m.name }))]} />
            <div className="md:col-span-2"><Textarea label="Observação" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div className="md:col-span-2"><Button type="submit" loading={submitting}>{editingId ? 'Atualizar' : 'Salvar despesa'}</Button></div>
          </form>
        </FormCard>
      ) : null}
      <Card className="overflow-hidden p-0">
        {loading ? <p className="p-5 text-sm text-[var(--muted)]">Carregando...</p> : items.length === 0 ? (
          <div className="p-5"><EmptyState message="Nenhuma despesa no período." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  {isAdmin && laundries.length > 1 ? (
                    <th className="px-4 py-3 font-medium">Unidade</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3">{formatDate(item.date)}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    {isAdmin && laundries.length > 1 ? (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.laundry?.name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">{item.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-red-600">{formatCurrency(toAmount(item.amount))}</td>
                    <td className="px-4 py-3"><Badge variant={item.paid ? 'success' : 'warning'}>{item.paid ? 'Pago' : 'Pendente'}</Badge></td>
                    <td className="px-4 py-3"><RowActions onEdit={() => openEdit(item)} onDelete={isAdmin ? () => handleDelete(item.id) : undefined} /></td>
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
