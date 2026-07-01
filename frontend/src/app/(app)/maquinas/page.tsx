'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/date';
import {
  labelOf,
  machineStatusLabels,
  machineTypeLabels,
} from '@/lib/labels';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type { Machine, PaginatedMeta, PaginatedResponse } from '@/types/entities';
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
import { formatCurrency } from '@/lib/format';
import { toAmount } from '@/lib/date';

const PAGE_SIZE = 20;

export default function MaquinasPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId, laundries, loading: laundryLoading, error: laundryError } = useLaundry();
  const [items, setItems] = useState<Machine[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [maintenanceCosts, setMaintenanceCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('WASHER');
  const [capacity, setCapacity] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [acquiredAt, setAcquiredAt] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [formLaundryId, setFormLaundryId] = useState('');

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  const loadItems = useCallback(async () => {
    if (!laundryId || !isAdmin) return;
    setLoading(true);
    try {
      const [response, maintenance] = await Promise.all([
        api<PaginatedResponse<Machine>>(
          `/machines?laundryId=${laundryId}&limit=${PAGE_SIZE}&page=${page}`,
        ),
        api<{ machineId: string; totalMaintenanceCost: number }[]>(
          `/reports/machine-maintenance?laundryId=${laundryId}`,
        ).catch(() => []),
      ]);
      setItems(response.data);
      setMeta(response.meta);
      setMaintenanceCosts(
        Object.fromEntries(
          maintenance.map((item) => [item.machineId, item.totalMaintenanceCost]),
        ),
      );
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [laundryId, page, isAdmin]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('WASHER');
    setCapacity('');
    setBrandModel('');
    setAcquiredAt('');
    setStatus('ACTIVE');
    setFormLaundryId(laundryId ?? '');
  };

  function openEdit(item: Machine) {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setCapacity(item.capacity ?? '');
    setBrandModel(item.brandModel ?? '');
    setAcquiredAt(item.acquiredAt?.slice(0, 10) ?? '');
    setStatus(item.status);
    setFormLaundryId(item.laundry?.id ?? laundryId ?? '');
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete('Excluir esta máquina?'))) return;
    try {
      await api(`/machines/${id}`, { method: 'DELETE' });
      toast.success('Máquina excluída.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao excluir');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formLaundryId) return;

    setSubmitting(true);
    const payload = {
      name,
      type,
      capacity: capacity || undefined,
      brandModel: brandModel || undefined,
      acquiredAt: acquiredAt || undefined,
      status,
      laundryId: formLaundryId,
    };
    try {
      if (editingId) {
        await api(`/machines/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/machines', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      resetForm();
      toast.success(editingId ? 'Máquina atualizada.' : 'Máquina cadastrada.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return null;

  if (laundryLoading) return <p className="text-[var(--muted)]">Carregando...</p>;
  if (laundryError) return <Alert>{laundryError}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Máquinas"
        description="Cadastro interno de lavadoras e secadoras."
        actionLabel={showForm ? undefined : 'Nova máquina'}
        onAction={() => {
          resetForm();
          setShowForm(true);
        }}
      />

      {error ? <Alert>{error}</Alert> : null}

      <FilterBar>
        <LaundryFilter />
      </FilterBar>

      {showForm ? (
        <FormCard
          title={editingId ? 'Editar máquina' : 'Nova máquina'}
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
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Select
              label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={Object.entries(machineTypeLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Capacidade"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex: 10 kg"
            />
            <Input
              label="Marca / modelo"
              value={brandModel}
              onChange={(e) => setBrandModel(e.target.value)}
            />
            <Input
              label="Data de aquisição"
              type="date"
              value={acquiredAt}
              onChange={(e) => setAcquiredAt(e.target.value)}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={Object.entries(machineStatusLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                {editingId ? 'Atualizar' : 'Salvar máquina'}
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Carregando máquinas...</p>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Nenhuma máquina cadastrada ainda." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  {laundries.length > 1 ? (
                    <th className="px-4 py-3 font-medium">Unidade</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Capacidade</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Aquisição</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Manutenção</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    {laundries.length > 1 ? (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.laundry?.name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {labelOf(machineTypeLabels, item.type)}
                    </td>
                    <td className="px-4 py-3">{item.capacity || '—'}</td>
                    <td className="px-4 py-3">{item.brandModel || '—'}</td>
                    <td className="px-4 py-3">
                      {item.acquiredAt ? formatDate(item.acquiredAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === 'ACTIVE'
                            ? 'success'
                            : item.status === 'MAINTENANCE'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {labelOf(machineStatusLabels, item.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatCurrency(maintenanceCosts[item.id] ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => handleDelete(item.id)}
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
