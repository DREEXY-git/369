import { describe, it, expect } from 'vitest';
import { selectCanonicalCashflowObligations, type RawCashflowEvent } from '../cashflow-obligation';

// helper: 予定 event を作る
function ev(p: Partial<RawCashflowEvent> & { id: string; type: string; direction: string; amount: number }): RawCashflowEvent {
  return {
    id: p.id,
    type: p.type,
    sourceType: p.sourceType ?? null,
    sourceId: p.sourceId ?? null,
    direction: p.direction,
    amount: p.amount,
    dueAt: p.dueAt ?? new Date('2026-08-01T00:00:00Z'),
    description: p.description ?? null,
  };
}

describe('canonical cashflow selector（F-R7-02 slice1・二重計上と取りこぼしを同時に是正）', () => {
  it('PO の cashflow_expected + payment_expected は 1 行（outflow を二重計上しない）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [
        ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 }),
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 }),
      ],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: 'po:po1', direction: 'outflow', amount: 5000 });
    expect(res.coverageIncomplete).toBe(false);
  });

  it('直接/見積由来 Invoice の payment_expected 入金は 1 行として残る（従来の欠落＝過少計上を是正）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 12000 })],
      invoices: [{ id: 'inv1', status: 'SENT', total: 12000, paidAmount: 0 }],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: 'inv:inv1', direction: 'inflow', amount: 12000 });
  });

  it('InvoiceCandidate→Invoice の 2 表現（cashflow_expected + payment_expected）は lineage で 1 行', () => {
    const res = selectCanonicalCashflowObligations({
      events: [
        ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'cand1', direction: 'inflow', amount: 8000 }),
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 8000 }),
      ],
      invoices: [{ id: 'inv1', status: 'SENT', total: 8000, paidAmount: 0 }],
      candidateInvoiceLinks: [{ candidateId: 'cand1', invoiceId: 'inv1' }],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: 'inv:inv1', amount: 8000 });
  });

  it('同額・同期限でも別 Invoice は 2 行のまま（amount/dueAt で誤結合しない）', () => {
    const due = new Date('2026-08-10T00:00:00Z');
    const res = selectCanonicalCashflowObligations({
      events: [
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invA', direction: 'inflow', amount: 5000, dueAt: due }),
        ev({ id: 'p2', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invB', direction: 'inflow', amount: 5000, dueAt: due }),
      ],
      invoices: [
        { id: 'invA', status: 'SENT', total: 5000, paidAmount: 0 },
        { id: 'invB', status: 'ISSUED', total: 5000, paidAmount: 0 },
      ],
      candidateInvoiceLinks: [],
    });
    expect(res.rows.map((r) => r.key).sort()).toEqual(['inv:invA', 'inv:invB']);
  });

  it('PARTIALLY_PAID は請求総額でなく残額だけを予定に載せる（過大計上を防ぐ＝安全側）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 10000 })],
      invoices: [{ id: 'inv1', status: 'PARTIALLY_PAID', total: 10000, paidAmount: 4000 }],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBe(6000); // 残額 10000-4000
  });

  it('PAID / VOID の Invoice は予定 0 件（完済・無効は載せない）', () => {
    for (const status of ['PAID', 'VOID']) {
      const res = selectCanonicalCashflowObligations({
        events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 10000 })],
        invoices: [{ id: 'inv1', status, total: 10000, paidAmount: status === 'PAID' ? 10000 : 0 }],
        candidateInvoiceLinks: [],
      });
      expect(res.rows).toHaveLength(0);
    }
  });

  it('未正式化 candidate の cashflow_expected はそのまま 1 行（invoice 未紐付け）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'cand9', direction: 'inflow', amount: 3000 })],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.key).toBe('cand:cand9');
  });

  it('未知 source の payment_expected は二重計上を避けて除外し coverageIncomplete（推測しない）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'MysterySource', sourceId: 'x1', direction: 'inflow', amount: 7000 })],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('未知 source でも cashflow_expected は canonical type なので額面通り残す（過少計上を避ける）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'ManualEntry', sourceId: 'm1', direction: 'outflow', amount: 2000 })],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: 'evt:c1', direction: 'outflow', amount: 2000 });
    expect(res.coverageIncomplete).toBe(false);
  });

  it('direction が競合する obligation は載せず conflict + coverageIncomplete（推測で寄せない）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [
        ev({ id: 'a', type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'poX', direction: 'outflow', amount: 1000 }),
        ev({ id: 'b', type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'poX', direction: 'inflow', amount: 1000 }),
      ],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.conflicts).toHaveLength(1);
    expect(res.coverageIncomplete).toBe(true);
  });

  it('Invoice の lifecycle が取得できない場合は原額で載せるが coverageIncomplete（残額不明を隠さない）', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invMissing', direction: 'inflow', amount: 9000 })],
      invoices: [],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBe(9000);
    expect(res.coverageIncomplete).toBe(true);
  });

  it('予定でない type（payment_received 等）が混ざったら除外し coverageIncomplete', () => {
    const res = selectCanonicalCashflowObligations({
      events: [ev({ id: 'r1', type: 'payment_received', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 })],
      invoices: [{ id: 'inv1', status: 'PAID', total: 5000, paidAmount: 5000 }],
      candidateInvoiceLinks: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('空入力は空の canonical set（coverageIncomplete=false・決定論）', () => {
    const res = selectCanonicalCashflowObligations({ events: [], invoices: [], candidateInvoiceLinks: [] });
    expect(res).toEqual({ rows: [], conflicts: [], unsupportedCount: 0, coverageIncomplete: false });
  });
});
