'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { confirmAction, notifyError, toast } from '@/lib/notifications';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import { formatDate } from '@/lib/date';
import { labelOf, userRoleLabels } from '@/lib/labels';
import type { AdminUser, UserRole } from '@/types';
import type { PaginatedMeta, PaginatedResponse } from '@/types/entities';
import { PageHeader, Alert, EmptyState } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { LaundryFilter } from '@/components/ui/laundry-filter';

const PAGE_SIZE = 20;

export default function UsuariosPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const router = useRouter();
  const { laundryId, laundries, canSwitch } = useLaundry();

  const [items, setItems] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [operatorLaundryId, setOperatorLaundryId] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<PaginatedResponse<AdminUser>>(
        `/users?limit=${PAGE_SIZE}&page=${page}`,
      );
      setItems(response.data);
      setMeta(response.meta);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [isAdmin, loadItems, page]);

  const visibleItems = canSwitch && laundryId
    ? items.filter(
        (item) => item.role === 'ADMIN' || item.laundryId === laundryId,
      )
    : items;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('OPERATOR');
    setOperatorLaundryId(laundryId ?? '');
    setActive(true);
  };

  function openEdit(item: AdminUser) {
    setEditingId(item.id);
    setName(item.name);
    setEmail(item.email);
    setPassword('');
    setRole(item.role);
    setOperatorLaundryId(item.laundryId ?? laundryId ?? '');
    setActive(item.active);
    setShowForm(true);
  }

  async function toggleActive(item: AdminUser) {
    if (item.id === currentUser?.id) {
      toast.error('Você não pode desativar sua própria conta');
      return;
    }

    const action = item.active ? 'desativar' : 'ativar';
    const confirmed = await confirmAction({
      title: item.active ? 'Desativar usuário?' : 'Ativar usuário?',
      message: `Deseja ${action} o usuário ${item.name}?`,
      confirmLabel: item.active ? 'Desativar' : 'Ativar',
      variant: item.active ? 'danger' : 'default',
    });
    if (!confirmed) return;

    try {
      await api(`/users/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      toast.success(item.active ? 'Usuário desativado.' : 'Usuário ativado.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao atualizar');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSubmitting(true);
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          name,
          role,
          active,
          laundryId: role === 'OPERATOR' ? operatorLaundryId || undefined : null,
        };
        if (password) payload.password = password;
        await api(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/users', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            laundryId:
              role === 'OPERATOR' ? operatorLaundryId || laundryId : undefined,
          }),
        });
      }
      setShowForm(false);
      resetForm();
      toast.success(editingId ? 'Usuário atualizado.' : 'Usuário criado.');
      await loadItems();
    } catch (err) {
      notifyError(err, 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie operadores e administradores do sistema."
        actionLabel={showForm ? undefined : 'Novo usuário'}
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
          title={editingId ? 'Editar usuário' : 'Novo usuário'}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <Input
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {editingId ? (
              <Input label="E-mail" value={email} disabled />
            ) : (
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            <Input
              label={editingId ? 'Nova senha (opcional)' : 'Senha'}
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editingId}
            />
            <Select
              label="Perfil"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={Object.entries(userRoleLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            {role === 'OPERATOR' ? (
              <Select
                label="Unidade"
                value={operatorLaundryId}
                onChange={(e) => setOperatorLaundryId(e.target.value)}
                options={laundries.map((laundry) => ({
                  value: laundry.id,
                  label: laundry.name,
                }))}
                required
              />
            ) : null}
            {editingId ? (
              <label className="flex items-center gap-2 text-sm text-[var(--muted)] md:col-span-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={editingId === currentUser?.id}
                  className="rounded border-[#cbd5e1]"
                />
                Usuário ativo
              </label>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" loading={submitting}>
                {editingId ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </FormCard>
      ) : null}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Carregando usuários...</p>
        ) : visibleItems.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Nenhum usuário nesta unidade." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cadastro</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{item.email}</td>
                    <td className="px-4 py-3">
                      {labelOf(userRoleLabels, item.role)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {item.role === 'OPERATOR'
                        ? laundries.find((l) => l.id === item.laundryId)?.name ??
                          '—'
                        : 'Todas'}
                    </td>
                    <td className="px-4 py-3">
                      {item.active ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="danger">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-sm font-medium text-[var(--brand)] hover:underline"
                        >
                          Editar
                        </button>
                        {item.id !== currentUser?.id ? (
                          <button
                            onClick={() => toggleActive(item)}
                            className="text-sm font-medium text-amber-600 hover:underline"
                          >
                            {item.active ? 'Desativar' : 'Ativar'}
                          </button>
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
    </div>
  );
}
