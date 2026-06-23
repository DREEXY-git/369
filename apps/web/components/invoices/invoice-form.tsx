'use client';

import { useState } from 'react';
import { formatJpy } from '@hokko/shared';
import { Button, Input, Select } from '@/components/ui';
import { createInvoiceAction } from '@/app/(app)/invoices/actions';

interface Row {
  name: string;
  qty: string;
  unitPrice: string;
}
const emptyRow = (): Row => ({ name: '', qty: '1', unitPrice: '' });

export function InvoiceForm({
  customers,
  deals,
  defaultDue,
}: {
  customers: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  defaultDue: string;
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [tax, setTax] = useState('10');

  const subtotal = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
  const taxAmount = Math.round((subtotal * (Number(tax) || 0)) / 100);
  const total = subtotal + taxAmount;
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const itemsJson = JSON.stringify(
    rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name, qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0 })),
  );

  return (
    <form action={createInvoiceAction} className="space-y-4">
      <input type="hidden" name="items" value={itemsJson} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">顧客</label>
          <Select name="customerId" defaultValue="">
            <option value="">（未選択）</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">案件</label>
            <Select name="dealId" defaultValue="">
              <option value="">（未選択）</option>
              {deals.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">支払期日</label>
            <Input name="dueDate" type="date" defaultValue={defaultDue} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">明細（数量 × 単価）</label>
          <Button type="button" variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>＋ 行を追加</Button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-6" placeholder="品目" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="数量" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
              <Input className="col-span-3" type="number" placeholder="単価" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} />
              <button type="button" className="col-span-1 text-muted-foreground hover:text-red-600" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="md:w-1/3">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">税率(%)</label>
        <Input name="taxRate" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-secondary/40 p-3">
        <div className="flex flex-col items-end gap-0.5 text-sm">
          <div>小計: <span className="font-medium">{formatJpy(subtotal)}</span></div>
          <div>消費税: <span className="font-medium">{formatJpy(taxAmount)}</span></div>
          <div className="text-base font-bold">合計(税込): {formatJpy(total)}</div>
        </div>
      </div>

      <Button type="submit" className="w-full">請求書を作成（下書き）</Button>
    </form>
  );
}
