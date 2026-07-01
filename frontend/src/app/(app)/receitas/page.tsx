'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, apiUpload, downloadFile } from '@/lib/api';
import { formatDate, todayIsoDate, toAmount } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import {
  calculateRevenueFees,
  payloadToPaymentKind,
  paymentKindToPayload,
  revenuePaymentKindLabels,
  type LaundryFeeConfig,
  type RevenuePaymentKind,
} from '@/lib/revenue-fees';
import {
  cardTypeLabels,
  labelOf,
  paymentMethodLabels,
  revenueSourceLabels,
} from '@/lib/labels';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type { PaginatedMeta, PaginatedResponse, Revenue } from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LaundrySelect } from '@/components/ui/laundry-select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  DateRangeFilter,
  getMonthDateRange,
} from '@/components/ui/date-range-filter';
import { RowActions } from '@/components/ui/row-actions';
import { confirmDelete, notifyError, toast } from '@/lib/notifications';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 20;

interface RevenueImportResult {
  format: 'stone' | 'detailed' | 'summary';
  created: number;
  skipped: number;
  replaced: number;
  totalAmount: number;
  totalNetAmount: number;
  dates: string[];
  errors: { row: number; message: string }[];
}

export default function ReceitasPage() {
  const { isAdmin } = useAuth();
  const { laundryId, laundries, loading: laundryLoading, error: laundryError } = useLaundry();
  const [items, setItems] = useState<Revenue[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [importing, setImporting] = useState(false);

  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const [date, setDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [paymentKind, setPaymentKind] = useState<RevenuePaymentKind>('PIX');
  const [installments, setInstallments] = useState('2');
  const [fees, setFees] = useState<LaundryFeeConfig | null>(null);
  const [source, setSource] = useState('DAILY_SALES');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [formLaundryId, setFormLaundryId] = useState('');
  const [importLaundryId, setImportLaundryId] = useState('');

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
    setAmount('');
    setPaymentKind('PIX');
    setInstallments('2');
    setSource('DAILY_SALES');
    setCategory('');
    setNote('');
    setFormLaundryId(laundryId ?? '');
  };

  const loadFees = useCallback(async (targetLaundryId: string) => {
    if (!targetLaundryId) return;
    try {
      const data = await api<LaundryFeeConfig>(
        `/fees?laundryId=${targetLaundryId}`,
      );
      setFees(data);
    } catch {
      setFees(null);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!laundryId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        laundryId,
        limit: String(PAGE_SIZE),
        page: String(page),
        startDate: appliedStart,
        endDate: appliedEnd,
      });
      const response = await api<PaginatedResponse<Revenue>>(
        `/revenues?${params}`,
      );
      setItems(response.data);
      setMeta(response.meta);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [laundryId, appliedStart, appliedEnd, page]);

  useEffect(() => {
    if (appliedStart && appliedEnd) loadItems();
  }, [loadItems, appliedStart, appliedEnd]);

  useEffect(() => {
    if (laundryId) {
      setImportLaundryId((current) => current || laundryId);
    }
  }, [laundryId]);

  useEffect(() => {
    if (showForm && formLaundryId) {
      loadFees(formLaundryId);
    }
  }, [showForm, formLaundryId, loadFees]);

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(item: Revenue) {
    setEditingId(item.id);
    setDate(item.date.slice(0, 10));
    setAmount(String(toAmount(item.grossAmount ?? item.amount)));
    setPaymentKind(
      payloadToPaymentKind(
        item.paymentMethod,
        item.cardType,
        item.installments,
      ),
    );
    setInstallments(String(Math.max(2, item.installments ?? 2)));
    setSource(item.source);
    setCategory(item.category ?? '');
    setNote(item.note ?? '');
    setFormLaundryId(item.laundry?.id ?? laundryId ?? '');
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('Excluir esta receita?'))) return;
    try {
      await api(`/revenues/${id}`, { method: 'DELETE' });
      toast.success('Receita excluída.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao excluir');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formLaundryId) return;

    setSubmitting(true);
    const payment = paymentKindToPayload(
      paymentKind,
      Number(installments) || 2,
    );
    const payload = {
      date,
      amount: Number(amount),
      ...payment,
      source,
      category: category || undefined,
      note: note || undefined,
      laundryId: formLaundryId,
    };

    try {
      if (editingId) {
        await api(`/revenues/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/revenues', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      resetForm();
      toast.success(editingId ? 'Receita atualizada.' : 'Receita cadastrada.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (!importLaundryId || !importFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('laundryId', importLaundryId);
      formData.append('replaceExisting', String(replaceExisting));

      const result = await apiUpload<RevenueImportResult>('/revenues/import', formData);
      const warnings =
        result.errors.length > 0
          ? ` ${result.errors.length} linha(s) com aviso.`
          : '';

      setImportFile(null);
      toast.success(
        `Importação concluída: ${result.created} receita(s). Bruto ${formatCurrency(result.totalAmount)} · Líquido ${formatCurrency(result.totalNetAmount)}.${result.replaced ? ` ${result.replaced} substituída(s).` : ''}${result.skipped ? ` ${result.skipped} duplicada(s) ignorada(s).` : ''}${warnings}`,
      );
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao importar planilha');
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadFile(
        '/revenues/import/template',
        'exemplo-lista-vendas-stone.xlsx',
      );
    } catch (err) {
      notifyError(err, 'Erro ao baixar modelo');
    }
  }

  if (laundryLoading) return <p className="text-[var(--muted)]">Carregando...</p>;
  if (laundryError) return <Alert>{laundryError}</Alert>;

  const grossPreview = Number(amount) || 0;
  const feePreview =
    fees && grossPreview > 0
      ? calculateRevenueFees(
          grossPreview,
          paymentKind,
          fees,
          Number(installments) || 2,
        )
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receitas"
        description="Cadastre vendas, faturamento MaxPan e outros recebimentos."
        actionLabel={showForm || showImport ? undefined : 'Nova receita'}
        onAction={openCreate}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowImport((current) => !current);
            setShowForm(false);
          }}
        >
          {showImport ? 'Fechar importação' : 'Importar Excel'}
        </Button>
      </div>

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
      />

      {showImport ? (
        <FormCard
          title="Importar vendas Stone (Excel)"
          onClose={() => {
            setShowImport(false);
            setImportFile(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Envie o relatório <strong>Lista de vendas</strong> exportado da
              Stone (XLS ou CSV). O LavLand lê cada transação, ignora vendas
              canceladas/contestadas e calcula o valor líquido com as taxas
              configuradas em Taxas.
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Stone → Vendas → Baixar relatório → Lista de vendas → XLS
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Ver exemplo do formato Stone
            </button>
            <form onSubmit={handleImport} className="space-y-4">
              <LaundrySelect
                value={importLaundryId}
                onChange={setImportLaundryId}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Arquivo (.xlsx, .xls, .csv)
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--brand)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-hover)]"
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-[#cbd5e1]"
                />
                Substituir vendas importadas do mesmo dia (Stone / vendas do dia)
              </label>
              <Button type="submit" loading={importing} disabled={!importFile}>
                Importar vendas
              </Button>
            </form>
          </div>
        </FormCard>
      ) : null}

      {showForm ? (
        <FormCard
          title={editingId ? 'Editar receita' : 'Nova receita'}
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
            <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Valor bruto (R$)" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Select
              label="Forma de pagamento"
              value={paymentKind}
              onChange={(e) => setPaymentKind(e.target.value as RevenuePaymentKind)}
              options={Object.entries(revenuePaymentKindLabels).map(([value, label]) => ({ value, label }))}
            />
            {paymentKind === 'CREDIT_INSTALLMENTS' ? (
              <Input
                label="Parcelas"
                type="number"
                min="2"
                max="24"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                required
              />
            ) : null}
            <Select label="Origem da receita" value={source} onChange={(e) => setSource(e.target.value)} options={Object.entries(revenueSourceLabels).map(([value, label]) => ({ value, label }))} />
            <Input label="Categoria (opcional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            {feePreview ? (
              <div className="md:col-span-2 rounded-lg bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
                <p>
                  Taxa: <strong>{feePreview.feeRate.toFixed(2)}%</strong>
                  {' · '}
                  Desconto: <strong className="text-amber-700">-{formatCurrency(feePreview.feeAmount)}</strong>
                  {' · '}
                  Líquido: <strong className="text-emerald-700">{formatCurrency(feePreview.netAmount)}</strong>
                </p>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Textarea label="Observação" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                {editingId ? 'Atualizar' : 'Salvar receita'}
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Carregando receitas...</p>
        ) : items.length === 0 ? (
          <div className="p-5"><EmptyState message="Nenhuma receita no período." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  {isAdmin && laundries.length > 1 ? (
                    <th className="px-4 py-3 font-medium">Unidade</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Bruto</th>
                  <th className="px-4 py-3 font-medium">Taxa</th>
                  <th className="px-4 py-3 font-medium">Líquido</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const gross = toAmount(item.grossAmount ?? item.amount);
                  const net = toAmount(item.netAmount ?? item.amount);
                  const fee = toAmount(item.feeAmount ?? gross - net);
                  const paymentLabel =
                    item.paymentMethod === 'CARD'
                      ? `${labelOf(paymentMethodLabels, item.paymentMethod)} · ${labelOf(cardTypeLabels, item.cardType ?? 'CREDIT')}${item.installments && item.installments > 1 ? ` ${item.installments}x` : ''}`
                      : labelOf(paymentMethodLabels, item.paymentMethod);

                  return (
                  <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3">{formatDate(item.date)}</td>
                    {isAdmin && laundries.length > 1 ? (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.laundry?.name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">{formatCurrency(gross)}</td>
                    <td className="px-4 py-3 text-amber-700">
                      {fee > 0 ? `-${formatCurrency(fee)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-700">{formatCurrency(net)}</td>
                    <td className="px-4 py-3">{paymentLabel}</td>
                    <td className="px-4 py-3">{labelOf(revenueSourceLabels, item.source)}</td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openEdit(item)}
                        onDelete={isAdmin ? () => handleDelete(item.id) : undefined}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </div>
  );
}
