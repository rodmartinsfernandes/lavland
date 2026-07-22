'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLaundry } from '@/context/laundry-context';
import { formatCurrency } from '@/lib/format';
import { getMonthDateRange } from '@/components/ui/date-range-filter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface RevenueProjection {
  startDate: string;
  endDate: string;
  daysElapsed: number;
  daysInPeriod: number;
  daysRemaining: number;
  currentGross: number;
  currentNet: number;
  dailyAverageGross: number;
  dailyAverageNet: number;
  projectedGross: number;
  projectedNet: number;
  comparisonNet: number;
  paceVsComparison: number;
  series: {
    day: number;
    date: string;
    actualGross: number | null;
    actualNet: number | null;
    projectedGross: number;
    projectedNet: number;
  }[];
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function formatShortDate(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export function RevenueProjectionChart() {
  const { laundryId } = useLaundry();
  const defaults = getMonthDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [appliedStart, setAppliedStart] = useState(defaults.startDate);
  const [appliedEnd, setAppliedEnd] = useState(defaults.endDate);
  const [data, setData] = useState<RevenueProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({
      startDate: appliedStart,
      endDate: appliedEnd,
    });
    if (laundryId) params.set('laundryId', laundryId);

    setLoading(true);
    api<RevenueProjection>(`/dashboard/revenue-projection?${params}`)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erro ao carregar projeção',
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [appliedStart, appliedEnd, laundryId]);

  function handleSimulate() {
    if (!startDate || !endDate) {
      setError('Informe data inicial e final');
      return;
    }
    if (endDate < startDate) {
      setError('A data final deve ser maior ou igual à data inicial');
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleResetMonth() {
    const range = getMonthDateRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setAppliedStart(range.startDate);
    setAppliedEnd(range.endDate);
  }

  if (loading && !data) {
    return <p className="text-sm text-[var(--muted)]">Calculando projeção...</p>;
  }

  if (error && !data) {
    return (
      <p className="rounded-xl border border-red-100 bg-[var(--danger-soft)] px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const width = 720;
  const height = 280;
  const padding = { top: 28, right: 20, bottom: 36, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    data.projectedNet,
    data.comparisonNet,
    data.currentNet,
    ...data.series.map((item) => item.projectedNet),
    1,
  );

  const xForDay = (day: number) =>
    data.daysInPeriod <= 1
      ? padding.left + chartWidth / 2
      : padding.left + ((day - 1) / (data.daysInPeriod - 1)) * chartWidth;

  const yForValue = (value: number) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  const actualPoints = data.series
    .filter((item) => item.actualNet !== null)
    .map((item) => ({
      x: xForDay(item.day),
      y: yForValue(item.actualNet ?? 0),
    }));

  const projectedPoints = data.series.map((item) => ({
    x: xForDay(item.day),
    y: yForValue(item.projectedNet),
  }));

  const projectionTail = data.series
    .filter((item) => item.day >= data.daysElapsed)
    .map((item) => ({
      x: xForDay(item.day),
      y: yForValue(item.projectedNet),
    }));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: maxValue * ratio,
    y: padding.top + chartHeight - ratio * chartHeight,
  }));

  const tickIndexes = [
    1,
    Math.ceil(data.daysInPeriod / 4),
    Math.ceil(data.daysInPeriod / 2),
    Math.ceil((data.daysInPeriod * 3) / 4),
    data.daysInPeriod,
  ].filter((day, index, list) => day >= 1 && list.indexOf(day) === index);

  const comparisonY = yForValue(data.comparisonNet);
  const progress =
    data.projectedNet > 0
      ? Math.min((data.currentNet / data.projectedNet) * 100, 100)
      : 0;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          label="Data inicial"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Data final"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" onClick={handleSimulate} loading={loading}>
            Simular
          </Button>
          <Button type="button" variant="secondary" onClick={handleResetMonth}>
            Mês atual
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-[var(--danger-soft)] px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Já faturado
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
            {formatCurrency(data.currentNet)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Em {data.daysElapsed} de {data.daysInPeriod} dias · média{' '}
            {formatCurrency(data.dailyAverageNet)}/dia
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--brand-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
            Projeção do período
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--brand)]">
            {formatCurrency(data.projectedNet)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {formatShortDate(data.startDate)} até {formatShortDate(data.endDate)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            vs período anterior
          </p>
          <p
            className={`mt-1 text-xl font-bold ${
              data.paceVsComparison >= 0
                ? 'text-emerald-700'
                : 'text-red-700'
            }`}
          >
            {data.paceVsComparison >= 0 ? '+' : ''}
            {data.paceVsComparison.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Período anterior: {formatCurrency(data.comparisonNet)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-[var(--muted)]">
          <span>Progresso da projeção</span>
          <span>
            {progress.toFixed(0)}% · faltam {data.daysRemaining} dia
            {data.daysRemaining === 1 ? '' : 's'}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            className="brand-gradient h-full rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label="Projeção de faturamento do período"
        >
          {yTicks.map((tick) => (
            <g key={tick.ratio}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#e4e4e7"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[var(--muted)] text-[10px]"
              >
                {tick.value >= 1000
                  ? `${(tick.value / 1000).toFixed(tick.value >= 10000 ? 0 : 1)}k`
                  : tick.value.toFixed(0)}
              </text>
            </g>
          ))}

          {data.comparisonNet > 0 ? (
            <g>
              <line
                x1={padding.left}
                y1={comparisonY}
                x2={width - padding.right}
                y2={comparisonY}
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={width - padding.right}
                y={comparisonY - 6}
                textAnchor="end"
                className="fill-[#0891b2] text-[10px] font-semibold"
              >
                Período anterior
              </text>
            </g>
          ) : null}

          <path
            d={buildLinePath(projectedPoints)}
            fill="none"
            stroke="#d4d4d8"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {projectionTail.length > 1 ? (
            <path
              d={buildLinePath(projectionTail)}
              fill="none"
              stroke="#c026d3"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
              opacity="0.55"
            />
          ) : null}

          <path
            d={buildLinePath(actualPoints)}
            fill="none"
            stroke="#c026d3"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {actualPoints.length > 0 ? (
            <circle
              cx={actualPoints[actualPoints.length - 1].x}
              cy={actualPoints[actualPoints.length - 1].y}
              r="5"
              fill="#c026d3"
              stroke="#fff"
              strokeWidth="2"
            >
              <title>Atual · {formatCurrency(data.currentNet)}</title>
            </circle>
          ) : null}

          <circle
            cx={xForDay(data.daysInPeriod)}
            cy={yForValue(data.projectedNet)}
            r="5"
            fill="#fff"
            stroke="#c026d3"
            strokeWidth="2.5"
          >
            <title>Projeção · {formatCurrency(data.projectedNet)}</title>
          </circle>

          {tickIndexes.map((day) => {
            const point = data.series[day - 1];
            return (
              <text
                key={day}
                x={xForDay(day)}
                y={height - 12}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px] font-medium"
              >
                {point ? formatShortDate(point.date) : `Dia ${day}`}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-[var(--brand)]" />
          Acumulado real
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-[var(--brand)] opacity-60" />
          Projeção até a data final
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-[var(--accent)]" />
          Período anterior equivalente
        </span>
      </div>
    </div>
  );
}
