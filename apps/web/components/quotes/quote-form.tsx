'use client';

import { useState } from 'react';
import { computeQuoteTotals, formatJpy, isLowMargin, QUOTE_AUTO_APPROVE_LIMIT } from '@hokko/shared';
import { Button, Input, Select, Badge } from '@/components/ui';
import { createQuoteAction } from '@/app/(app)/quotes/actions';

interface Row {
  name: string;
  qty: string;
  unitPrice: string;
  unitCost: string;
}

const emptyRow = (): Row => ({ name: '', qty: '1', unitPrice: '', unitCost: '' });

export function QuoteForm({
  customers,
  deals,
}: {
  customers: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('10');

  const subtotal = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
  const cost = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);
  const totals = computeQuoteTotals(subtotal, cost, Number(discount) || 0, Number(tax) || 10);
  const low = isLowMargin(totals.grossMarginRate);
  const loss = totals.grossMargin < 0;
  const needsApproval = totals.total >= QUOTE_AUTO_APPROVE_LIMIT || low;

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name, qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0, unitCost: Number(r.unitCost) || 0 })),
  );

  return (
    <form action={createQuoteAction} className="space-y-4">
      <input type="hidden" name="items" value={itemsJson} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">件名</label>
          <Input name="title" defaultValue="" placeholder="〇〇案件 御見積" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">顧客</label>
            <Select name="customerId" defaultValue="">
              <option value="">（未選択）</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">案件</label>
            <Select name="dealId" defaultValue="">
              <option value="">（未選択）</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">明細（数量 × 単価／原価）</label>
          <Button type="button" variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>＋ 行を追加</Button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-5" placeholder="品名" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="数量" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="単価" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="原価" value={r.unitCost} onChange={(e) => setRow(i, { unitCost: e.target.value })} />
              <button type="button" className="col-span-1 text-muted-foreground hover:text-red-600" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:w-1/2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">値引き率(%)</label>
          <Input name="discountRate" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">税率(%)</label>
          <Input name="taxRate" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
      </div>

      {/* ライブ計算プレビュー */}
      <div className="rounded-lg border bg-secondary/40 p-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
          <Line label="小計" value={formatJpy(subtotal)} />
          <Line label="値引後" value={formatJpy(totals.discountedSubtotal)} />
          <Line label="原価" value={formatJpy(cost)} />
          <Line label="消費税" value={formatJpy(totals.tax)} />
          <Line label="合計(税込)" value={formatJpy(totals.total)} strong />
          <Line label="粗利" value={formatJpy(totals.grossMargin)} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={loss ? 'red' : low ? 'amber' : 'green'}>粗利率 {totals.grossMarginRate}%</Badge>
          {loss ? <span className="text-xs text-red-600">⚠️ 赤字見積です。原価・値引きを見直してください。</span> : low ? <span className="text-xs text-amber-700">⚠️ 低粗利（15%未満）。発行には承認が必要です。</span> : null}
          {needsApproval ? <Badge tone="amber">発行に承認が必要</Badge> : <Badge tone="slate">承認不要で下書き作成</Badge>}
        </div>
      </div>

      <Button type="submit" className="w-full">{needsApproval ? '見積を作成（承認申請つき）' : '見積を作成'}</Button>
    </form>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-bold' : ''}>{value}</span>
    </div>
  );
}
