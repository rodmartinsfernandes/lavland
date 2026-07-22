'use client';

import { formatCurrency } from '@/lib/format';

interface TrendPoint {
  label: string;
  revenue: number;
  netRevenue: number;
}

interface RevenueTrendChartProps {
  data: TrendPoint[];
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 16, bottom: 36, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.flatMap((item) => [item.revenue, item.netRevenue]),
    1,
  );

  const pointsFor = (key: 'revenue' | 'netRevenue') =>
    data.map((item, index) => {
      const x =
        data.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (data.length - 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        (item[key] / maxValue) * chartHeight;
      return { x, y, value: item[key], label: item.label };
    });

  const grossPoints = pointsFor('revenue');
  const netPoints = pointsFor('netRevenue');
  const grossPath = buildSmoothPath(grossPoints);
  const netPath = buildSmoothPath(netPoints);

  const areaPath =
    netPoints.length > 0
      ? `${netPath} L ${netPoints[netPoints.length - 1].x} ${
          padding.top + chartHeight
        } L ${netPoints[0].x} ${padding.top + chartHeight} Z`
      : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: maxValue * ratio,
    y: padding.top + chartHeight - ratio * chartHeight,
  }));

  const first = data[0];
  const last = data[data.length - 1];
  const change =
    first && first.netRevenue > 0
      ? ((last.netRevenue - first.netRevenue) / first.netRevenue) * 100
      : last?.netRevenue > 0
        ? 100
        : 0;

  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Sem dados de faturamento no período.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Tendência · últimos {data.length} meses
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
            {formatCurrency(last.netRevenue)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Líquido no mês atual · bruto {formatCurrency(last.revenue)}
          </p>
        </div>
        <div
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            change >= 0
              ? 'bg-[var(--success-soft)] text-emerald-700'
              : 'bg-[var(--danger-soft)] text-red-700'
          }`}
        >
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}% no período
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label="Gráfico de tendência de faturamento mensal"
        >
          <defs>
            <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c026d3" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#c026d3" stopOpacity="0.02" />
            </linearGradient>
          </defs>

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

          {areaPath ? <path d={areaPath} fill="url(#revenueArea)" /> : null}

          <path
            d={grossPath}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
          <path
            d={netPath}
            fill="none"
            stroke="#c026d3"
            strokeWidth="2.75"
            strokeLinecap="round"
          />

          {grossPoints.map((point) => (
            <circle
              key={`gross-${point.label}`}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#fff"
              stroke="#a1a1aa"
              strokeWidth="1.5"
            >
              <title>
                {point.label} · bruto {formatCurrency(point.value)}
              </title>
            </circle>
          ))}

          {netPoints.map((point) => (
            <circle
              key={`net-${point.label}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#c026d3"
              stroke="#fff"
              strokeWidth="2"
            >
              <title>
                {point.label} · líquido {formatCurrency(point.value)}
              </title>
            </circle>
          ))}

          {data.map((item, index) => {
            const x =
              data.length === 1
                ? padding.left + chartWidth / 2
                : padding.left + (index / (data.length - 1)) * chartWidth;
            const shortLabel = item.label.slice(0, 5);
            return (
              <text
                key={item.label}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px] font-medium"
              >
                {shortLabel}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-[var(--brand)]" />
          Faturamento líquido
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-[var(--muted-foreground)]" />
          Faturamento bruto
        </span>
      </div>
    </div>
  );
}
