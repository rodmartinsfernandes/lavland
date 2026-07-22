'use client';

import { formatCurrency } from '@/lib/format';

export interface MonthRevenueProjection {
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  currentGross: number;
  currentNet: number;
  dailyAverageGross: number;
  dailyAverageNet: number;
  projectedGross: number;
  projectedNet: number;
  previousMonthNet: number;
  paceVsPreviousMonth: number;
  series: {
    day: number;
    actualGross: number | null;
    actualNet: number | null;
    projectedGross: number;
    projectedNet: number;
  }[];
}

interface RevenueProjectionChartProps {
  data: MonthRevenueProjection;
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

export function RevenueProjectionChart({ data }: RevenueProjectionChartProps) {
  const width = 720;
  const height = 280;
  const padding = { top: 28, right: 20, bottom: 36, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    data.projectedNet,
    data.previousMonthNet,
    data.currentNet,
    ...data.series.map((item) => item.projectedNet),
    1,
  );

  const xForDay = (day: number) =>
    data.daysInMonth <= 1
      ? padding.left + chartWidth / 2
      : padding.left + ((day - 1) / (data.daysInMonth - 1)) * chartWidth;

  const yForValue = (value: number) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  const actualPoints = data.series
    .filter((item) => item.actualNet !== null)
    .map((item) => ({
      x: xForDay(item.day),
      y: yForValue(item.actualNet ?? 0),
      day: item.day,
      value: item.actualNet ?? 0,
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

  const dayTicks = [1, 8, 15, 22, data.daysInMonth].filter(
    (day, index, list) => day <= data.daysInMonth && list.indexOf(day) === index,
  );

  const previousY = yForValue(data.previousMonthNet);
  const progress =
    data.projectedNet > 0
      ? Math.min((data.currentNet / data.projectedNet) * 100, 100)
      : 0;

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Já faturado
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
            {formatCurrency(data.currentNet)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Em {data.daysElapsed} de {data.daysInMonth} dias · média{' '}
            {formatCurrency(data.dailyAverageNet)}/dia
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--brand-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
            Projeção do mês
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--brand)]">
            {formatCurrency(data.projectedNet)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Se mantiver o ritmo atual até o dia {data.daysInMonth}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            vs mês anterior
          </p>
          <p
            className={`mt-1 text-xl font-bold ${
              data.paceVsPreviousMonth >= 0
                ? 'text-emerald-700'
                : 'text-red-700'
            }`}
          >
            {data.paceVsPreviousMonth >= 0 ? '+' : ''}
            {data.paceVsPreviousMonth.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Mês anterior: {formatCurrency(data.previousMonthNet)}
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
          aria-label="Projeção de faturamento do mês atual"
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

          {data.previousMonthNet > 0 ? (
            <g>
              <line
                x1={padding.left}
                y1={previousY}
                x2={width - padding.right}
                y2={previousY}
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={width - padding.right}
                y={previousY - 6}
                textAnchor="end"
                className="fill-[#0891b2] text-[10px] font-semibold"
              >
                Mês anterior
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
              <title>
                Hoje · {formatCurrency(data.currentNet)}
              </title>
            </circle>
          ) : null}

          <circle
            cx={xForDay(data.daysInMonth)}
            cy={yForValue(data.projectedNet)}
            r="5"
            fill="#fff"
            stroke="#c026d3"
            strokeWidth="2.5"
          >
            <title>
              Projeção · {formatCurrency(data.projectedNet)}
            </title>
          </circle>

          {dayTicks.map((day) => (
            <text
              key={day}
              x={xForDay(day)}
              y={height - 12}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px] font-medium"
            >
              Dia {day}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-[var(--brand)]" />
          Acumulado real
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-[var(--brand)] opacity-60" />
          Projeção até o fim do mês
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-[var(--accent)]" />
          Total do mês anterior
        </span>
      </div>
    </div>
  );
}
