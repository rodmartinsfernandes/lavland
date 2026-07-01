'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { notifyError, toast } from '@/lib/notifications';
import { useAuth } from '@/context/auth-context';
import { useLaundry } from '@/context/laundry-context';
import type { LaundryFeeConfig } from '@/lib/revenue-fees';
import { PageHeader, Alert } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { LaundryFilter } from '@/components/ui/laundry-filter';

const DEFAULT_FEES: Omit<LaundryFeeConfig, 'laundryId'> = {
  debitRate: 1.45,
  credit1xRate: 2.1,
  creditInstallmentsRate: 2.34,
  pixRate: 0,
  cashRate: 0,
  anticipationRate: 1.29,
  applyAnticipation: false,
};

export default function TaxasPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { laundryId, loading: laundryLoading } = useLaundry();

  const [debitRate, setDebitRate] = useState(String(DEFAULT_FEES.debitRate));
  const [credit1xRate, setCredit1xRate] = useState(String(DEFAULT_FEES.credit1xRate));
  const [creditInstallmentsRate, setCreditInstallmentsRate] = useState(
    String(DEFAULT_FEES.creditInstallmentsRate),
  );
  const [pixRate, setPixRate] = useState(String(DEFAULT_FEES.pixRate));
  const [cashRate, setCashRate] = useState(String(DEFAULT_FEES.cashRate));
  const [anticipationRate, setAnticipationRate] = useState(
    String(DEFAULT_FEES.anticipationRate),
  );
  const [applyAnticipation, setApplyAnticipation] = useState(
    DEFAULT_FEES.applyAnticipation,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) router.replace('/operador');
  }, [isAdmin, router]);

  const loadFees = useCallback(async () => {
    if (!laundryId) return;
    setLoading(true);
    try {
      const data = await api<LaundryFeeConfig>(`/fees?laundryId=${laundryId}`);
      setDebitRate(String(data.debitRate));
      setCredit1xRate(String(data.credit1xRate));
      setCreditInstallmentsRate(String(data.creditInstallmentsRate));
      setPixRate(String(data.pixRate));
      setCashRate(String(data.cashRate));
      setAnticipationRate(String(data.anticipationRate));
      setApplyAnticipation(data.applyAnticipation);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar taxas');
    } finally {
      setLoading(false);
    }
  }, [laundryId]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!laundryId) return;

    setSubmitting(true);
    try {
      await api('/fees', {
        method: 'PUT',
        body: JSON.stringify({
          laundryId,
          debitRate: Number(debitRate),
          credit1xRate: Number(credit1xRate),
          creditInstallmentsRate: Number(creditInstallmentsRate),
          pixRate: Number(pixRate),
          cashRate: Number(cashRate),
          anticipationRate: Number(anticipationRate),
          applyAnticipation,
        }),
      });
      toast.success('Taxas salvas com sucesso.');
      setError('');
    } catch (err) {
      notifyError(err, 'Erro ao salvar taxas');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return null;
  if (laundryLoading || loading) {
    return <p className="text-[var(--muted)]">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxas"
        description="Configure as taxas por forma de pagamento. Usadas no cadastro manual e na importação Stone."
      />

      {error ? <Alert>{error}</Alert> : null}

      <FilterBar>
        <LaundryFilter />
      </FilterBar>

      <Card>
        <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Cartão Stone
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Percentual descontado do valor bruto em cada venda.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Débito (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={debitRate}
              onChange={(e) => setDebitRate(e.target.value)}
              required
            />
            <Input
              label="Crédito à vista (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={credit1xRate}
              onChange={(e) => setCredit1xRate(e.target.value)}
              required
            />
            <Input
              label="Crédito parcelado — 2x ou mais (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={creditInstallmentsRate}
              onChange={(e) => setCreditInstallmentsRate(e.target.value)}
              required
            />
            <Input
              label="Antecipação automática (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={anticipationRate}
              onChange={(e) => setAnticipationRate(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={applyAnticipation}
              onChange={(e) => setApplyAnticipation(e.target.checked)}
              className="rounded border-[#cbd5e1]"
            />
            Somar taxa de antecipação automática no cálculo do cartão
          </label>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Pix e dinheiro
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Deixe em 0% se não houver taxa. Útil para taxas de conta digital
              ou outros custos.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pix (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={pixRate}
              onChange={(e) => setPixRate(e.target.value)}
              required
            />
            <Input
              label="Dinheiro (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={cashRate}
              onChange={(e) => setCashRate(e.target.value)}
              required
            />
          </div>

          <Button type="submit" loading={submitting}>
            Salvar taxas
          </Button>
        </form>
      </Card>
    </div>
  );
}
