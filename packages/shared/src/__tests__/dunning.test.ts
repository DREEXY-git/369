import { describe, it, expect } from 'vitest';
import { buildDunningDraft, isDunningEligible, clampDunningStage, nextDunningStage, dunningStageMeta, MAX_DUNNING_STAGE, type DunningInput } from '../dunning';

function input(overrides: Partial<DunningInput> = {}): DunningInput {
  return {
    customerName: '株式会社サンプル',
    companyName: '株式会社サンプル請求元',
    invoiceNumber: 'INV-2026-201',
    total: 110000,
    paidAmount: 30000,
    outstanding: 80000,
    dueDate: new Date('2026-06-30T00:00:00Z'),
    ...overrides,
  };
}

// 威圧的・法的断定・強制回収を示唆する禁止表現。
const FORBIDDEN = [
  '法的措置', '訴訟', '回収に伺', '取引停止', '至急', '最終通告', '悪質', '債務不履行', '信用問題', '第三者へ共有', '強制', '差押', '内容証明',
];

describe('buildDunningDraft — 安全な督促（お支払い状況の確認）テンプレート', () => {
  it('必須要素を含む（顧客名/請求番号/請求額/入金済/未回収/期日/確認/行き違い/ご確認/お手元の請求書）', () => {
    const { subject, body } = buildDunningDraft(input());
    expect(subject).toContain('INV-2026-201');
    expect(body).toContain('株式会社サンプル 様');
    expect(body).toContain('INV-2026-201');
    expect(body).toContain('110,000円'); // ご請求金額
    expect(body).toContain('30,000円'); // 入金済額
    expect(body).toContain('80,000円'); // 未回収額
    expect(body).toContain('お支払期日');
    expect(body).toContain('お支払い状況の確認');
    expect(body).toContain('行き違い');
    expect(body).toContain('ご容赦');
    expect(body).toContain('ご確認をお願いいたします');
    expect(body).toContain('お手元の請求書をご確認');
  });

  it('威圧的・法的断定・強制回収の表現を一切含まない', () => {
    const { subject, body } = buildDunningDraft(input());
    for (const w of FORBIDDEN) {
      expect(subject.includes(w)).toBe(false);
      expect(body.includes(w)).toBe(false);
    }
  });

  it('顧客名が無ければ「ご担当者」、期日が無ければ「別途ご相談」', () => {
    expect(buildDunningDraft(input({ customerName: null })).body).toContain('ご担当者 様');
    expect(buildDunningDraft(input({ dueDate: null })).body).toContain('別途ご相談');
  });
});

describe('P3-Q2C-C — 督促の多段（stage）', () => {
  it('clamp / next / meta が 1..3 に収まる', () => {
    expect(clampDunningStage(undefined)).toBe(1);
    expect(clampDunningStage(0)).toBe(1);
    expect(clampDunningStage(2)).toBe(2);
    expect(clampDunningStage(9)).toBe(MAX_DUNNING_STAGE);
    expect(nextDunningStage(0)).toBe(1); // 未送信 → 第1段
    expect(nextDunningStage(1)).toBe(2); // 1回送信済み → 第2段
    expect(nextDunningStage(5)).toBe(MAX_DUNNING_STAGE);
    expect(dunningStageMeta(1).label).toBe('やんわり確認');
    expect(dunningStageMeta(3).label).toBe('最終確認');
  });

  it('段数が上がると件名・書き出しが変わるが、必須要素と安全性は全段で維持される', () => {
    const s1 = buildDunningDraft(input({ stage: 1 }));
    const s2 = buildDunningDraft(input({ stage: 2 }));
    const s3 = buildDunningDraft(input({ stage: 3 }));
    expect(s1.subject).not.toBe(s2.subject);
    expect(s2.subject).not.toBe(s3.subject);
    expect(s3.subject).toContain('最終');
    for (const d of [s1, s2, s3]) {
      // 必須要素は全段で維持。
      expect(d.body).toContain('INV-2026-201');
      expect(d.body).toContain('80,000円');
      expect(d.body).toContain('行き違い');
      expect(d.body).toContain('ご確認をお願いいたします');
      // 威圧・法的断定・強制回収は全段で一切なし。
      for (const w of FORBIDDEN) {
        expect(d.subject.includes(w)).toBe(false);
        expect(d.body.includes(w)).toBe(false);
      }
    }
  });
});

describe('isDunningEligible — 督促対象判定', () => {
  it('未完済かつ未回収かつ receivable open/overdue（または未連携）は対象', () => {
    expect(isDunningEligible('SENT', 0, 100000, 'open')).toBe(true);
    expect(isDunningEligible('PARTIALLY_PAID', 40000, 100000, 'overdue')).toBe(true);
    expect(isDunningEligible('ISSUED', 0, 100000, null)).toBe(true);
  });

  it('DRAFT / PAID / VOID は対象外', () => {
    expect(isDunningEligible('DRAFT', 0, 100000, 'open')).toBe(false);
    expect(isDunningEligible('PAID', 100000, 100000, 'collected')).toBe(false);
    expect(isDunningEligible('VOID', 0, 100000, 'open')).toBe(false);
  });

  it('全額入金済み・receivable collected は対象外', () => {
    expect(isDunningEligible('SENT', 100000, 100000, 'open')).toBe(false);
    expect(isDunningEligible('SENT', 0, 100000, 'collected')).toBe(false);
  });
});
