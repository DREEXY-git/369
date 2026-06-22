'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LEAD_STAGE_LABEL } from '@/components/badges';
import type { LeadStage } from '@hokko/shared';

export interface MapLead {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stage: LeadStage;
  priority: number;
  industry: string;
  city: string;
  source: string;
}

const STAGE_COLOR: Record<string, string> = {
  NEW: '#94a3b8',
  ANALYZED: '#38bdf8',
  DRAFTED: '#3b82f6',
  PENDING_APPROVAL: '#f59e0b',
  READY: '#6366f1',
  SENT: '#a855f7',
  REPLIED: '#22c55e',
  APPOINTMENT: '#16a34a',
  WON: '#15803d',
  LOST: '#ef4444',
  UNSUBSCRIBED: '#dc2626',
};

export function DemoMap({ leads, isGoogle }: { leads: MapLead[]; isGoogle: boolean }) {
  const [hover, setHover] = useState<MapLead | null>(null);
  if (leads.length === 0) {
    return <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">表示するリードがありません</div>;
  }

  const lats = leads.map((l) => l.lat);
  const lngs = leads.map((l) => l.lng);
  const minLat = Math.min(...lats) - 0.005;
  const maxLat = Math.max(...lats) + 0.005;
  const minLng = Math.min(...lngs) - 0.005;
  const maxLng = Math.max(...lngs) + 0.005;
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng || 1)) * 100;
  const y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat || 1)) * 100;

  return (
    <div>
      <div
        className="relative h-[460px] w-full overflow-hidden rounded-lg border"
        style={{
          backgroundColor: '#eef2f7',
          backgroundImage:
            'linear-gradient(#dde5ef 1px, transparent 1px), linear-gradient(90deg, #dde5ef 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/80 px-2 py-1 text-[10px] text-slate-500">
          {isGoogle ? 'Google Maps（帰属表示必須）' : 'デモ地図（非Google / OpenStreetMap系相当）'}・札幌市
        </div>

        {leads.map((l) => (
          <Link
            key={l.id}
            href={`/leadmap/leads/${l.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x(l.lng)}%`, top: `${y(l.lat)}%` }}
            onMouseEnter={() => setHover(l)}
            onMouseLeave={() => setHover((h) => (h?.id === l.id ? null : h))}
          >
            <span
              className="block rounded-full border-2 border-white shadow"
              style={{
                width: l.priority >= 75 ? 16 : 12,
                height: l.priority >= 75 ? 16 : 12,
                backgroundColor: STAGE_COLOR[l.stage] ?? '#94a3b8',
              }}
            />
          </Link>
        ))}

        {hover ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-white px-2 py-1 text-xs shadow-lg"
            style={{ left: `${x(hover.lng)}%`, top: `${y(hover.lat)- 2}%` }}
          >
            <div className="font-medium">{hover.name}</div>
            <div className="text-muted-foreground">
              {hover.industry}・優先度{hover.priority}・{LEAD_STAGE_LABEL[hover.stage]?.text}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {Object.entries(STAGE_COLOR).map(([stage, color]) => (
          <span key={stage} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {LEAD_STAGE_LABEL[stage as LeadStage]?.text ?? stage}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        ※ Google由来データは Google Maps 上にのみ帰属表示付きで表示します。デモデータ(source=DEMO)は非Google地図に表示しています。
      </p>
    </div>
  );
}
