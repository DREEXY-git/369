import * as React from 'react';
import { cn } from '@/lib/utils';

// 依存ライブラリ無しの軽量チャート群（純SVG / RSCで描画可能）。

// ---- 横棒リスト（ランキング・ステージ別など）----
export function BarList({
  data,
  valueFormat = (v: number) => String(v),
  className,
}: {
  data: { label: string; value: number }[];
  valueFormat?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn('space-y-2.5', className)}>
      {data.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">データがありません</div>
      ) : (
        data.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-foreground/80">{d.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{valueFormat(d.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---- 折れ線＋エリア（推移）----
export function TrendChart({
  data,
  height = 120,
  className,
  valueFormat = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  valueFormat?: (v: number) => string;
}) {
  const w = 100;
  const pad = 6;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const area =
    pts.length > 0
      ? `M0 ${height} ${pts.map((p) => `L${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')} L${w} ${height} Z`
      : '';
  const last = data[data.length - 1];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(243 75% 59%)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="hsl(243 75% 59%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area ? <path d={area} fill="url(#trend-fill)" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="hsl(243 75% 59%)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === pts.length - 1 ? 2.4 : 1.6}
            fill="hsl(243 75% 59%)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className={cn(n > 6 && i % 2 === 1 && 'hidden sm:inline')}>
            {d.label}
          </span>
        ))}
      </div>
      {last ? (
        <div className="mt-1 text-xs text-muted-foreground">
          最新: <span className="font-semibold text-foreground">{valueFormat(last.value)}</span>
        </div>
      ) : null}
    </div>
  );
}

// ---- ドーナツ（構成比）----
export function Donut({
  segments,
  size = 132,
  thickness = 16,
  centerLabel,
  centerSub,
  className,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: React.ReactNode;
  centerSub?: React.ReactNode;
  className?: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = (s.value / total) * circ;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-acc}
                strokeLinecap="butt"
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        {centerLabel ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold tabular-nums">{centerLabel}</div>
            {centerSub ? <div className="text-[10px] text-muted-foreground">{centerSub}</div> : null}
          </div>
        ) : null}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="truncate text-foreground/80">{s.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
