import { describe, it, expect } from 'vitest';
import {
  selectCanonicalCashflowObligations,
  resolveCanonicalObligationIdentity,
  CASHFLOW_OBLIGATION_IDENTITY_VERSION,
  type RawCashflowEvent,
  type InvoiceLifecycleInput,
  type CandidateRow,
  type CashflowObligationNamespace,
} from '../cashflow-obligation';

const T = 'tenant-1';

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

// helper: selector を default tenant で実行（tenantId は明示上書き可）
function run(input: { tenantId?: string; events: RawCashflowEvent[]; invoices: InvoiceLifecycleInput[]; candidates: CandidateRow[] }) {
  const { tenantId = T, ...rest } = input;
  return selectCanonicalCashflowObligations({ tenantId, ...rest });
}

// helper: 期待 identity key（成功前提）
function keyOf(ns: CashflowObligationNamespace, sourceId: string, tenant: string = T): string {
  const r = resolveCanonicalObligationIdentity(tenant, ns, sourceId);
  if (!r.ok) throw new Error(`unexpected identity failure: ${r.reason}`);
  return r.key;
}

describe('canonical obligation identity resolver（P5-FIN-001 §12.1/§12.2）', () => {
  it('encoding 確定: JSON.stringify(["cashflow-obligation","v1",tenantId,namespace,sourceId]) の厳密一致', () => {
    const r = resolveCanonicalObligationIdentity(T, 'po', 'po1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.key).toBe(JSON.stringify(['cashflow-obligation', 'v1', T, 'po', 'po1']));
    // version が固定値 "v1" であること（後方互換の identity 形式版）
    expect(CASHFLOW_OBLIGATION_IDENTITY_VERSION).toBe('v1');
    // identity は正確に 5 要素の tuple で、amount/dueAt/description/direction/lifecycle を含まない
    expect(JSON.parse(r.key)).toEqual(['cashflow-obligation', 'v1', T, 'po', 'po1']);
  });

  it('決定論: 同じ tuple は常に同じ key、異なる tuple は異なる key', () => {
    expect(keyOf('inv', 'x')).toBe(keyOf('inv', 'x'));
    // namespace 違い / sourceId 違いはすべて別 key
    const keys = new Set([keyOf('inv', 'x'), keyOf('po', 'x'), keyOf('cand', 'x'), keyOf('evt', 'x'), keyOf('inv', 'y')]);
    expect(keys.size).toBe(5);
  });

  it('tenant 分離: 別 tenant の同一 (namespace, sourceId) は別 identity', () => {
    expect(keyOf('inv', 'inv1', 'tenant-A')).not.toBe(keyOf('inv', 'inv1', 'tenant-B'));
  });

  it('空 tenant fail-closed: 空 / null / undefined tenantId は identity を発行せず { ok:false, reason }', () => {
    for (const bad of ['', null as unknown as string, undefined as unknown as string]) {
      const r = resolveCanonicalObligationIdentity(bad, 'inv', 'inv1');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('empty-tenantId');
    }
  });

  it('空 sourceId fail-closed: 空 sourceId は identity を発行せず { ok:false, reason }', () => {
    const r = resolveCanonicalObligationIdentity(T, 'inv', '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('empty-sourceId');
  });

  it('delimiter injection: 区切り文字を含む id でも別債務が同一 identity に化けない（構造化 encoding）', () => {
    const k1 = keyOf('inv', 'a');
    // sourceId に JSON 区切り文字を注入して別 tuple を騙ろうとしても衝突しない
    const injected = keyOf('inv', 'a","evt","b');
    const k3 = keyOf('evt', 'b');
    expect(new Set([k1, injected, k3]).size).toBe(3);
    // 構造化されているため厳密に元の tuple へ復元でき、区切り文字の混入は無効化される
    expect(JSON.parse(injected)).toEqual(['cashflow-obligation', 'v1', T, 'inv', 'a","evt","b']);
    // tenantId 側の区切り注入でも別 tenant を騙れない
    expect(keyOf('inv', 'x', 'tenant","other')).not.toBe(keyOf('inv', 'x', 'other'));
  });

  it('trim / Unicode 正規化をしない: 前後空白や結合文字違いは別 identity', () => {
    expect(keyOf('inv', 'x')).not.toBe(keyOf('inv', ' x '));
    // NFC 合成済み U+00E9（é 単一コードポイント）と NFD 分解 'e' + U+0301（結合アクセント）は
    // 正規化せず別 identity。コードポイントで厳密に別文字列を構成し literal 依存を排除する。
    const nfc = String.fromCharCode(0x00e9);
    const nfd = 'e' + String.fromCharCode(0x0301);
    expect(nfc).not.toBe(nfd); // 前提: 2 つは別文字列
    expect(keyOf('inv', nfc)).not.toBe(keyOf('inv', nfd));
  });

  it('amount / dueAt / description / direction / lifecycle は identity に影響しない（resolver は 3 要素のみ）', () => {
    // resolver は tenantId / namespace / sourceId だけを受け、他要素を受け取らない設計
    expect(keyOf('inv', 'inv1')).toBe(keyOf('inv', 'inv1'));
  });
});

describe('canonical cashflow selector（F-R7-02 slice1・二重計上と取りこぼしを同時に是正）', () => {
  it('PO の cashflow_expected + payment_expected は 1 行（outflow を二重計上しない）', () => {
    const res = run({
      events: [
        ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 }),
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'po1', direction: 'outflow', amount: 5000 }),
      ],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: keyOf('po', 'po1'), direction: 'outflow', amount: 5000 });
    expect(res.coverageIncomplete).toBe(false);
  });

  it('PurchaseOrder は po / PurchaseOrder.id、Invoice は inv / Invoice.id', () => {
    const res = run({
      events: [
        ev({ id: 'a', type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'poA', direction: 'outflow', amount: 1000 }),
        ev({ id: 'b', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invB', direction: 'inflow', amount: 2000 }),
      ],
      invoices: [{ id: 'invB', status: 'SENT', total: 2000, paidAmount: 0 }],
      candidates: [],
    });
    expect(res.rows.map((r) => r.key).sort()).toEqual([keyOf('inv', 'invB'), keyOf('po', 'poA')].sort());
  });

  it('直接/見積由来 Invoice の payment_expected 入金は 1 行として残る（従来の欠落＝過少計上を是正）', () => {
    const res = run({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 12000 })],
      invoices: [{ id: 'inv1', status: 'SENT', total: 12000, paidAmount: 0 }],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: keyOf('inv', 'inv1'), direction: 'inflow', amount: 12000 });
  });

  it('candidate→invoice: 正式化済み candidate と直接 Invoice は同一 identity へ収束し 1 行', () => {
    const res = run({
      events: [
        ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'cand1', direction: 'inflow', amount: 8000 }),
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 8000 }),
      ],
      invoices: [{ id: 'inv1', status: 'SENT', total: 8000, paidAmount: 0 }],
      candidates: [{ id: 'cand1', invoiceId: 'inv1' }],
    });
    expect(res.rows).toHaveLength(1);
    // candidate.id ではなく invoiceId ベースの inv identity へ収束する
    expect(res.rows[0]!).toMatchObject({ key: keyOf('inv', 'inv1'), amount: 8000 });
  });

  it('同額・同期限でも別 Invoice は 2 行のまま（amount/dueAt で誤結合しない＝別正本 ID は別 identity）', () => {
    const due = new Date('2026-08-10T00:00:00Z');
    const res = run({
      events: [
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invA', direction: 'inflow', amount: 5000, dueAt: due }),
        ev({ id: 'p2', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invB', direction: 'inflow', amount: 5000, dueAt: due }),
      ],
      invoices: [
        { id: 'invA', status: 'SENT', total: 5000, paidAmount: 0 },
        { id: 'invB', status: 'ISSUED', total: 5000, paidAmount: 0 },
      ],
      candidates: [],
    });
    expect(res.rows.map((r) => r.key).sort()).toEqual([keyOf('inv', 'invA'), keyOf('inv', 'invB')].sort());
  });

  it('tenant 分離: 同一 sourceId でも別 tenant では別 identity key になる', () => {
    const events = [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 })];
    const invoices: InvoiceLifecycleInput[] = [{ id: 'inv1', status: 'SENT', total: 5000, paidAmount: 0 }];
    const a = run({ tenantId: 'tenant-A', events, invoices, candidates: [] });
    const b = run({ tenantId: 'tenant-B', events, invoices, candidates: [] });
    expect(a.rows[0]!.key).toBe(keyOf('inv', 'inv1', 'tenant-A'));
    expect(b.rows[0]!.key).toBe(keyOf('inv', 'inv1', 'tenant-B'));
    expect(a.rows[0]!.key).not.toBe(b.rows[0]!.key);
  });

  it('空 tenant: tenantId 空なら全 event が identity 非発行で fail-closed（rows 0・coverageIncomplete）', () => {
    const res = run({
      tenantId: '',
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 })],
      invoices: [{ id: 'inv1', status: 'SENT', total: 5000, paidAmount: 0 }],
      candidates: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('delimiter injection（selector 経由）: sourceId に区切り文字を含んでも tuple が保たれ別 key', () => {
    const res = run({
      events: [
        ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv","evt","x', direction: 'inflow', amount: 1000 }),
        ev({ id: 'p2', type: 'cashflow_expected', sourceType: 'ManualEntry', sourceId: 'x', direction: 'inflow', amount: 1000 }),
      ],
      invoices: [{ id: 'inv","evt","x', status: 'SENT', total: 1000, paidAmount: 0 }],
      candidates: [],
    });
    const keys = res.rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length); // 衝突なし
    expect(keys).toContain(keyOf('inv', 'inv","evt","x'));
  });

  it('PARTIALLY_PAID は請求総額でなく残額だけを予定に載せる（過大計上を防ぐ＝安全側）', () => {
    const res = run({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 10000 })],
      invoices: [{ id: 'inv1', status: 'PARTIALLY_PAID', total: 10000, paidAmount: 4000 }],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBe(6000); // 残額 10000-4000
  });

  it('PAID / VOID の Invoice は予定 0 件（完済・無効は載せない）', () => {
    for (const status of ['PAID', 'VOID']) {
      const res = run({
        events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 10000 })],
        invoices: [{ id: 'inv1', status, total: 10000, paidAmount: status === 'PAID' ? 10000 : 0 }],
        candidates: [],
      });
      expect(res.rows).toHaveLength(0);
    }
  });

  it('reversal / reopen でも identity は不変（lifecycle / amount は identity 構成要素でない）', () => {
    // 同一 Invoice source を SENT → PARTIALLY_PAID（reopen 相当）へ動かしても identity key は変わらない
    const issued = run({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 10000 })],
      invoices: [{ id: 'inv1', status: 'SENT', total: 10000, paidAmount: 0 }],
      candidates: [],
    });
    const reopened = run({
      events: [ev({ id: 'p2', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 6000, dueAt: new Date('2026-09-01T00:00:00Z'), description: 'reopened' })],
      invoices: [{ id: 'inv1', status: 'PARTIALLY_PAID', total: 10000, paidAmount: 4000 }],
      candidates: [],
    });
    expect(issued.rows[0]!.key).toBe(keyOf('inv', 'inv1'));
    expect(reopened.rows[0]!.key).toBe(keyOf('inv', 'inv1'));
    expect(issued.rows[0]!.key).toBe(reopened.rows[0]!.key);
    // 金額は lifecycle を正本に残額へ更新されるが identity は不変
    expect(issued.rows[0]!.amount).toBe(10000);
    expect(reopened.rows[0]!.amount).toBe(6000);
  });

  it('tenant内に実在する未正式化 candidate の cashflow_expected はそのまま 1 行（cand / candidate id）', () => {
    const res = run({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'cand9', direction: 'inflow', amount: 3000 })],
      invoices: [],
      candidates: [{ id: 'cand9', invoiceId: null }],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.key).toBe(keyOf('cand', 'cand9'));
    expect(res.coverageIncomplete).toBe(false);
  });

  it('B-S1-01: tenant内に実在しない candidate（orphan）の inflow は加算せず除外＋coverageIncomplete（偽の余裕を作らない）', () => {
    const res = run({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'ghost', direction: 'inflow', amount: 3000 })],
      invoices: [],
      candidates: [], // ghost は実在しない
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('B-S1-01: orphan candidate の outflow は evt / FinanceEvent.id で保守的に個別計上＋coverageIncomplete', () => {
    const res = run({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'InvoiceCandidate', sourceId: 'ghost', direction: 'outflow', amount: 3000 })],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: keyOf('evt', 'c1'), direction: 'outflow', amount: 3000 });
    expect(res.coverageIncomplete).toBe(true);
  });

  it('未知 source の payment_expected は identity を発行せず unsupportedCount++・coverageIncomplete（推測しない）', () => {
    const res = run({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'MysterySource', sourceId: 'x1', direction: 'inflow', amount: 7000 })],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('未知 source でも cashflow_expected は evt / FinanceEvent.id で額面通り残す（過少計上を避ける）', () => {
    const res = run({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'ManualEntry', sourceId: 'm1', direction: 'outflow', amount: 2000 })],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!).toMatchObject({ key: keyOf('evt', 'c1'), direction: 'outflow', amount: 2000 });
    expect(res.coverageIncomplete).toBe(false);
  });

  it('direction が競合する obligation は載せず conflict + coverageIncomplete（推測で寄せない）', () => {
    const res = run({
      events: [
        ev({ id: 'a', type: 'cashflow_expected', sourceType: 'PurchaseOrder', sourceId: 'poX', direction: 'outflow', amount: 1000 }),
        ev({ id: 'b', type: 'payment_expected', sourceType: 'PurchaseOrder', sourceId: 'poX', direction: 'inflow', amount: 1000 }),
      ],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0]!.key).toBe(keyOf('po', 'poX'));
    expect(res.coverageIncomplete).toBe(true);
  });

  it('B-S1-01: lifecycle 不明の Invoice inflow は加算せず除外＋coverageIncomplete（原額を載せると偽の余裕＝危険方向）', () => {
    const res = run({
      events: [ev({ id: 'p1', type: 'payment_expected', sourceType: 'Invoice', sourceId: 'invMissing', direction: 'inflow', amount: 9000 })],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
  });

  it('B-S1-01: lifecycle 不明でも outflow は保守的に残す（過少計上＝ショート見逃しを避ける）＋coverageIncomplete', () => {
    const res = run({
      events: [ev({ id: 'c1', type: 'cashflow_expected', sourceType: 'Invoice', sourceId: 'invMissing', direction: 'outflow', amount: 9000 })],
      invoices: [],
      candidates: [],
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.amount).toBe(9000);
    expect(res.rows[0]!.key).toBe(keyOf('inv', 'invMissing'));
    expect(res.coverageIncomplete).toBe(true);
  });

  it('予定でない type（payment_received 等）が混ざったら除外し coverageIncomplete', () => {
    const res = run({
      events: [ev({ id: 'r1', type: 'payment_received', sourceType: 'Invoice', sourceId: 'inv1', direction: 'inflow', amount: 5000 })],
      invoices: [{ id: 'inv1', status: 'PAID', total: 5000, paidAmount: 5000 }],
      candidates: [],
    });
    expect(res.rows).toHaveLength(0);
    expect(res.coverageIncomplete).toBe(true);
    expect(res.unsupportedCount).toBe(1);
  });

  it('空入力は空の canonical set（coverageIncomplete=false・決定論）', () => {
    const res = run({ events: [], invoices: [], candidates: [] });
    expect(res).toEqual({ rows: [], conflicts: [], unsupportedCount: 0, coverageIncomplete: false });
  });
});
