'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { toAmount, formatDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { labelOf, movementTypeLabels } from '@/lib/labels';
import { downloadCsv } from '@/lib/csv';
import { buildInventoryCsv } from '@/lib/inventory-export';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type {
  ConsumptionReportItem,
  InventoryMovement,
  InventoryProduct,
  PaginatedMeta,
  PaginatedResponse,
} from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { LaundrySelect } from '@/components/ui/laundry-select';
import { FilterBar } from '@/components/ui/filter-bar';
import { LaundryFilter } from '@/components/ui/laundry-filter';
import { confirmDelete, notifyError, toast } from '@/lib/notifications';
import { Pagination } from '@/components/ui/pagination';
import { getMonthDateRange } from '@/components/ui/date-range-filter';

const PAGE_SIZE = 20;

export default function EstoquePage() {
  const { isAdmin } = useAuth();
  const { laundryId, laundries, loading: laundryLoading, error: laundryError } = useLaundry();
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [consumption, setConsumption] = useState<ConsumptionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showMovementForm, setShowMovementForm] = useState<string | null>(null);
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [appliedHistoryStart, setAppliedHistoryStart] = useState('');
  const [appliedHistoryEnd, setAppliedHistoryEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('un');
  const [unitCost, setUnitCost] = useState('');
  const [minStock, setMinStock] = useState('0');
  const [formLaundryId, setFormLaundryId] = useState('');

  const [movementType, setMovementType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [movementCost, setMovementCost] = useState('');
  const [movementNote, setMovementNote] = useState('');

  const loadItems = useCallback(async () => {
    if (!laundryId) return;
    setLoading(true);
    try {
      const [products, consumptionReport] = await Promise.all([
        api<PaginatedResponse<InventoryProduct>>(
          `/inventory/products?laundryId=${laundryId}&limit=${PAGE_SIZE}&page=${page}${lowStockOnly ? '&lowStockOnly=true' : ''}`,
        ),
        isAdmin
          ? api<ConsumptionReportItem[]>(
              `/inventory/reports/consumption?laundryId=${laundryId}`,
            )
          : Promise.resolve([]),
      ]);
      setItems(products.data);
      setMeta(products.meta);
      setConsumption(consumptionReport);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [laundryId, lowStockOnly, page, isAdmin]);

  const loadMovements = useCallback(async (productId: string) => {
    setLoadingHistory(true);
    try {
      const response = await api<PaginatedResponse<InventoryMovement>>(
        `/inventory/products/${productId}/movements?limit=50`,
      );
      setMovements(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar histórico');
      setMovements([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (historyProductId) {
      loadMovements(historyProductId);
    } else {
      setMovements([]);
    }
  }, [historyProductId, loadMovements]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setName('');
    setUnit('un');
    setUnitCost('');
    setMinStock('0');
    setFormLaundryId(laundryId ?? '');
  };

  function openEditProduct(item: InventoryProduct) {
    setEditingProductId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setUnitCost(String(toAmount(item.unitCost)));
    setMinStock(String(toAmount(item.minStock)));
    setFormLaundryId(item.laundry?.id ?? laundryId ?? '');
    setShowProductForm(true);
    setShowMovementForm(null);
    setHistoryProductId(null);
  }

  function openHistory(item: InventoryProduct) {
    const range = getMonthDateRange();
    setHistoryProductId(item.id);
    setHistoryTypeFilter('');
    setHistoryStartDate(range.startDate);
    setHistoryEndDate(range.endDate);
    setAppliedHistoryStart('');
    setAppliedHistoryEnd('');
    setShowProductForm(false);
    setShowMovementForm(null);
  }

  function handleExportCsv() {
    const content = buildInventoryCsv(items, consumption);
    downloadCsv(`estoque-${new Date().toISOString().slice(0, 10)}.csv`, content);
  }

  async function handleDeleteProduct(id: string) {
    if (!(await confirmDelete('Excluir este produto?'))) return;
    try {
      await api(`/inventory/products/${id}`, { method: 'DELETE' });
      if (historyProductId === id) setHistoryProductId(null);
      toast.success('Produto excluído.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao excluir');
    }
  }

  async function handleProductSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formLaundryId) return;

    setSubmitting(true);
    const payload = {
      name,
      unit,
      unitCost: Number(unitCost),
      minStock: Number(minStock),
      laundryId: formLaundryId,
    };
    try {
      if (editingProductId) {
        await api(`/inventory/products/${editingProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/inventory/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowProductForm(false);
      resetProductForm();
      toast.success(editingProductId ? 'Produto atualizado.' : 'Produto cadastrado.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMovement(event: FormEvent, productId: string) {
    event.preventDefault();

    setSubmitting(true);
    try {
      await api(`/inventory/products/${productId}/movements`, {
        method: 'POST',
        body: JSON.stringify({
          type: movementType,
          quantity: Number(quantity),
          unitCost: movementCost ? Number(movementCost) : undefined,
          note: movementNote || undefined,
        }),
      });
      setShowMovementForm(null);
      setQuantity('');
      setMovementCost('');
      setMovementNote('');
      await loadItems();
      if (historyProductId === productId) {
        await loadMovements(productId);
      }
      toast.success(
        movementType === 'IN' ? 'Entrada registrada.' : 'Saída registrada.',
      );
    } catch (err) {
      notifyError(err, 'Erro ao registrar movimento');
    } finally {
      setSubmitting(false);
    }
  }

  const historyProduct = items.find((item) => item.id === historyProductId);

  const filteredMovements = movements.filter((movement) => {
    if (historyTypeFilter && movement.type !== historyTypeFilter) return false;
    const date = movement.createdAt.slice(0, 10);
    if (appliedHistoryStart && date < appliedHistoryStart) return false;
    if (appliedHistoryEnd && date > appliedHistoryEnd) return false;
    return true;
  });

  if (laundryLoading) return <p className="text-[var(--muted)]">Carregando...</p>;
  if (laundryError) return <Alert>{laundryError}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description={
          isAdmin
            ? 'Controle insumos, entradas, saídas e alertas de estoque baixo.'
            : 'Registre entradas e saídas de insumos.'
        }
        actionLabel={showProductForm || !isAdmin ? undefined : 'Novo produto'}
        onAction={() => {
          resetProductForm();
          setShowProductForm(true);
          setShowMovementForm(null);
          setHistoryProductId(null);
        }}
      />

      {error ? <Alert>{error}</Alert> : null}

      <FilterBar>
        <LaundryFilter />
      </FilterBar>

      {!loading && items.length > 0 && isAdmin ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-[#cbd5e1]"
            />
            Apenas estoque baixo
          </label>
          <Button variant="secondary" onClick={handleExportCsv}>
            Exportar CSV
          </Button>
        </div>
      ) : null}

      {showProductForm && isAdmin ? (
        <FormCard
          title={editingProductId ? 'Editar produto' : 'Novo produto'}
          onClose={() => {
            setShowProductForm(false);
            resetProductForm();
          }}
        >
          <form
            onSubmit={handleProductSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <LaundrySelect
              value={formLaundryId}
              onChange={setFormLaundryId}
            />
            <Input
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Unidade de medida"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg, L, un..."
              required
            />
            <Input
              label="Custo unitário (R$)"
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              required
            />
            <Input
              label="Estoque mínimo"
              type="number"
              min="0"
              step="0.001"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                {editingProductId ? 'Salvar alterações' : 'Salvar produto'}
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      {showMovementForm ? (
        <FormCard
          title="Registrar movimentação"
          onClose={() => setShowMovementForm(null)}
        >
          <form
            onSubmit={(e) => handleMovement(e, showMovementForm)}
            className="grid gap-4 md:grid-cols-2"
          >
            <Select
              label="Tipo"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              options={Object.entries(movementTypeLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Quantidade"
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {movementType === 'IN' ? (
              <Input
                label="Custo unitário (opcional)"
                type="number"
                min="0"
                step="0.01"
                value={movementCost}
                onChange={(e) => setMovementCost(e.target.value)}
              />
            ) : null}
            <Input
              label="Observação"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
            />
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                Registrar
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      {historyProductId && historyProduct && isAdmin ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Histórico — {historyProduct.name}
            </h2>
            <button
              onClick={() => setHistoryProductId(null)}
              className="text-sm text-[var(--muted)] hover:underline"
            >
              Fechar
            </button>
          </div>
          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select
                label="Tipo"
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos' },
                  ...Object.entries(movementTypeLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <Input
                label="Data inicial"
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
              />
              <Input
                label="Data final"
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setAppliedHistoryStart(historyStartDate);
                  setAppliedHistoryEnd(historyEndDate);
                }}
              >
                Filtrar histórico
              </Button>
            </div>
          </div>
          {loadingHistory ? (
            <p className="p-4 text-sm text-[var(--muted)]">Carregando movimentações...</p>
          ) : filteredMovements.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">
              Nenhuma movimentação no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Quantidade</th>
                    <th className="px-4 py-3 font-medium">Custo unit.</th>
                    <th className="px-4 py-3 font-medium">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-t border-[var(--border-subtle)]">
                      <td className="px-4 py-3">
                        {formatDate(movement.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={movement.type === 'IN' ? 'success' : 'danger'}
                        >
                          {labelOf(movementTypeLabels, movement.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {toAmount(movement.quantity)} {historyProduct.unit}
                      </td>
                      <td className="px-4 py-3">
                        {movement.unitCost != null
                          ? formatCurrency(toAmount(movement.unitCost))
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {movement.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Carregando estoque...</p>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Nenhum produto cadastrado ainda." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  {isAdmin && laundries.length > 1 ? (
                    <th className="px-4 py-3 font-medium">Unidade</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Mínimo</th>
                  <th className="px-4 py-3 font-medium">Custo unit.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3 font-medium">
                      {item.name}{' '}
                      <span className="text-[var(--muted-foreground)]">({item.unit})</span>
                    </td>
                    {isAdmin && laundries.length > 1 ? (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.laundry?.name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {toAmount(item.currentStock)}
                    </td>
                    <td className="px-4 py-3">{toAmount(item.minStock)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(toAmount(item.unitCost))}
                    </td>
                    <td className="px-4 py-3">
                      {item.isLowStock ? (
                        <Badge variant="danger">Estoque baixo</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            setShowMovementForm(item.id);
                            setShowProductForm(false);
                            setHistoryProductId(null);
                            setMovementType('IN');
                          }}
                          className="text-sm font-medium text-[var(--brand)] hover:underline"
                        >
                          Movimentar
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => openHistory(item)}
                              className="text-sm font-medium text-[var(--brand)] hover:underline"
                            >
                              Histórico
                            </button>
                            <RowActions
                              onEdit={() => openEditProduct(item)}
                              onDelete={() => handleDeleteProduct(item.id)}
                            />
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      {isAdmin ? (
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Consumo de insumos
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Total de saídas registradas por produto.
          </p>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-[var(--muted)]">Carregando...</p>
        ) : consumption.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted-foreground)]">Sem dados de consumo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Estoque atual</th>
                  <th className="px-4 py-3 font-medium">Total consumido</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {consumption.map((item) => (
                  <tr key={item.productId} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3 font-medium">
                      {item.name}{' '}
                      <span className="text-[var(--muted-foreground)]">({item.unit})</span>
                    </td>
                    <td className="px-4 py-3">{item.currentStock}</td>
                    <td className="px-4 py-3">{item.totalConsumed}</td>
                    <td className="px-4 py-3">
                      {item.isLowStock ? (
                        <Badge variant="danger">Estoque baixo</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      ) : null}
    </div>
  );
}
