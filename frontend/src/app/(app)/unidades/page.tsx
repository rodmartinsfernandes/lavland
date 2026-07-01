'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { notifyError, toast } from '@/lib/notifications';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type { Laundry } from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function UnidadesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const {
    laundryId,
    laundries,
    loading: laundryLoading,
    setActiveLaundry,
    refreshLaundries,
  } = useLaundry();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cnpj, setCnpj] = useState('');

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAddress('');
    setCnpj('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: Laundry) => {
    setEditingId(item.id);
    setName(item.name);
    setAddress(item.address ?? '');
    setCnpj(item.cnpj ?? '');
    setShowForm(true);
  };

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSubmitting(true);

      const payload = {
        name,
        address: address || undefined,
        cnpj: cnpj || undefined,
      };

      try {
        if (editingId) {
          await api(`/laundries/${editingId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          toast.success('Unidade atualizada.');
        } else {
          const created = await api<Laundry>('/laundries', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setActiveLaundry(created.id);
          toast.success('Unidade criada e selecionada.');
        }

        setShowForm(false);
        resetForm();
        await refreshLaundries();
        setError('');
      } catch (err) {
        notifyError(err, 'Erro ao salvar unidade');
      } finally {
        setSubmitting(false);
      }
    },
    [
      name,
      address,
      cnpj,
      editingId,
      setActiveLaundry,
      refreshLaundries,
    ],
  );

  if (!isAdmin) return null;

  if (laundryLoading) {
    return <p className="text-[var(--muted)]">Carregando unidades...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades"
        description="Gerencie suas lavanderias. Os dados de receitas, despesas e estoque são separados por unidade."
        actionLabel={showForm ? undefined : 'Nova unidade'}
        onAction={openCreate}
      />

      {error ? <Alert>{error}</Alert> : null}

      <p className="text-sm text-[var(--muted)]">
        A unidade selecionada na barra lateral define onde os lançamentos são
        feitos. As taxas de cada unidade ficam em{' '}
        <Link href="/taxas" className="font-semibold text-[var(--brand)] hover:underline">
          Taxas
        </Link>
        .
      </p>

      {showForm ? (
        <FormCard
          title={editingId ? 'Editar unidade' : 'Nova unidade'}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
            <Input
              label="Nome da unidade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Lavland Kobrasol"
              required
            />
            <Input
              label="Endereço"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
            <Input
              label="CNPJ"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
            <Button type="submit" loading={submitting}>
              {editingId ? 'Salvar alterações' : 'Criar unidade'}
            </Button>
          </form>
        </FormCard>
      ) : null}

      <Card className="overflow-hidden p-0">
        {laundries.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Nenhuma unidade cadastrada. Crie a primeira unidade." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {laundries.map((item) => {
              const isActive = item.id === laundryId;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
                    isActive ? 'bg-[var(--brand-soft)]/30' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--foreground)]">
                        {item.name}
                      </h2>
                      {isActive ? <Badge variant="info">Ativa</Badge> : null}
                    </div>
                    {item.address ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {item.address}
                      </p>
                    ) : null}
                    {item.cnpj ? (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        CNPJ {item.cnpj}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isActive ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setActiveLaundry(item.id);
                          toast.success(`Unidade "${item.name}" selecionada.`);
                        }}
                      >
                        Usar esta unidade
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
