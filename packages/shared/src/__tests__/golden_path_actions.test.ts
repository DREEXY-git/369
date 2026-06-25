import { describe, it, expect } from 'vitest';
import {
  getGoldenPathActionForReason,
  buildGoldenPathActionLinks,
  visibleGoldenPathActions,
} from '../golden-path-actions';
import type { AttentionReasonCode } from '../golden-path-dashboard';

const ctx = { eventId: 'e1', invoiceId: 'inv1' };

describe('getGoldenPathActionForReason — reason ごとの是正アクション', () => {
  it('finance 系（延滞/未回収/未送信）は請求書へ・requiresFinance=true', () => {
    for (const r of ['overdue_receivable', 'unpaid', 'unsent_invoice'] as AttentionReasonCode[]) {
      const a = getGoldenPathActionForReason(r, ctx);
      expect(a.href).toBe('/invoices/inv1');
      expect(a.requiresFinance).toBe(true);
      expect(a.actionLabel.length).toBeGreaterThan(0);
    }
  });

  it('invoiceId が無ければ案件の財務サマリーへフォールバック', () => {
    const a = getGoldenPathActionForReason('overdue_receivable', { eventId: 'e1', invoiceId: null });
    expect(a.href).toBe('/operations/events/e1#finance-summary');
  });

  it('低粗利は案件の #finance-summary・requiresFinance=true', () => {
    const a = getGoldenPathActionForReason('low_margin', ctx);
    expect(a.href).toBe('/operations/events/e1#finance-summary');
    expect(a.requiresFinance).toBe(true);
  });

  it('非 finance 系は各アンカー/承認へ・requiresFinance=false', () => {
    expect(getGoldenPathActionForReason('high_risk', ctx)).toMatchObject({ href: '/operations/events/e1#risks', requiresFinance: false });
    expect(getGoldenPathActionForReason('overdue_logistics', ctx)).toMatchObject({ href: '/operations/events/e1#logistics', requiresFinance: false });
    expect(getGoldenPathActionForReason('approval_pending', ctx)).toMatchObject({ href: '/approvals', requiresFinance: false });
    expect(getGoldenPathActionForReason('unbridged', ctx)).toMatchObject({ href: '/operations/events/e1#golden-path', requiresFinance: false });
  });

  it('各アクションは必要情報（reason/label/actionLabel/href/requiresFinance）を持つ', () => {
    const a = getGoldenPathActionForReason('high_risk', ctx);
    expect(a.reason).toBe('high_risk');
    expect(typeof a.label).toBe('string');
    expect(typeof a.actionLabel).toBe('string');
    expect(typeof a.href).toBe('string');
    expect(typeof a.requiresFinance).toBe('boolean');
  });
});

describe('buildGoldenPathActionLinks — kpi の理由群 → アクション一覧', () => {
  it('attentionReasons の順序通りにアクションを生成', () => {
    const kpi = { id: 'e1', invoiceId: 'inv1', attentionReasons: ['overdue_receivable', 'high_risk', 'approval_pending'] as AttentionReasonCode[] };
    const actions = buildGoldenPathActionLinks(kpi);
    expect(actions.map((a) => a.reason)).toEqual(['overdue_receivable', 'high_risk', 'approval_pending']);
  });

  it('理由が無ければ空配列', () => {
    expect(buildGoldenPathActionLinks({ id: 'e1', invoiceId: null, attentionReasons: [] })).toEqual([]);
  });
});

describe('visibleGoldenPathActions — finance 権限ゲート', () => {
  const kpi = { id: 'e1', invoiceId: 'inv1', attentionReasons: ['high_risk', 'unsent_invoice', 'overdue_logistics'] as AttentionReasonCode[] };

  it('canViewFinance=true なら全アクション表示', () => {
    const actions = visibleGoldenPathActions(buildGoldenPathActionLinks(kpi), true);
    expect(actions.map((a) => a.reason)).toEqual(['high_risk', 'unsent_invoice', 'overdue_logistics']);
  });

  it('canViewFinance=false なら finance 系（unsent_invoice）を除外、非 finance は残す', () => {
    const actions = visibleGoldenPathActions(buildGoldenPathActionLinks(kpi), false);
    expect(actions.map((a) => a.reason)).toEqual(['high_risk', 'overdue_logistics']);
    expect(actions.every((a) => !a.requiresFinance)).toBe(true);
  });
});

describe('actionLabel は実行性を含む（Phase 1-14 インライン是正）', () => {
  it('解消・完了・申請・記録・進む など対処につながる文言', () => {
    expect(getGoldenPathActionForReason('high_risk', ctx).actionLabel).toContain('解消');
    expect(getGoldenPathActionForReason('overdue_logistics', ctx).actionLabel).toContain('完了');
    expect(getGoldenPathActionForReason('unsent_invoice', ctx).actionLabel).toContain('申請');
    expect(getGoldenPathActionForReason('overdue_receivable', ctx).actionLabel).toContain('記録');
    expect(getGoldenPathActionForReason('unpaid', ctx).actionLabel).toContain('記録');
    expect(getGoldenPathActionForReason('unbridged', ctx).actionLabel).toContain('進む');
  });

  it('低粗利は実行ではなく「見直す」導線（finance・#finance-summary）', () => {
    const a = getGoldenPathActionForReason('low_margin', ctx);
    expect(a.actionLabel).toContain('見直す');
    expect(a.href).toContain('#finance-summary');
    expect(a.requiresFinance).toBe(true);
  });

  it('finance 権限なしでは finance 系アクション（記録/申請/見直す）が出ない', () => {
    const all: AttentionReasonCode[] = ['overdue_receivable', 'unpaid', 'unsent_invoice', 'low_margin', 'high_risk', 'overdue_logistics', 'approval_pending', 'unbridged'];
    const visible = visibleGoldenPathActions(buildGoldenPathActionLinks({ id: 'e1', invoiceId: 'inv1', attentionReasons: all }), false);
    expect(visible.some((a) => a.requiresFinance)).toBe(false);
    // 非 finance（解消/完了/承認/Bridge）は残る
    expect(visible.map((a) => a.reason)).toEqual(['high_risk', 'overdue_logistics', 'approval_pending', 'unbridged']);
  });
});
