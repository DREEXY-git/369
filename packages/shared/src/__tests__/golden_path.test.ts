import { describe, it, expect } from 'vitest';
import { computeGoldenPath, GOLDEN_PATH_LOW_MARGIN_THRESHOLD, type GoldenPathInput } from '../golden-path';

// 空の案件（顧客のみ未紐付け）を起点に、各シナリオを部分上書きで作る。
function base(overrides: Partial<GoldenPathInput> = {}): GoldenPathInput {
  return {
    hasCustomer: false,
    productUsageCount: 0,
    logisticsTaskCount: 0,
    staffCount: 0,
    riskCount: 0,
    costRecorded: false,
    revenue: 0,
    cost: 0,
    grossSnapshotCount: 0,
    bridged: false,
    invoiceCandidateStatus: null,
    invoiceStatus: null,
    paidAmount: 0,
    invoiceTotal: 0,
    ...overrides,
  };
}

describe('computeGoldenPath — step status & next action', () => {
  it('empty project: next action is the first required step (customer), 0% done', () => {
    const r = computeGoldenPath(base());
    expect(r.doneCount).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.nextActionKey).toBe('customer');
    expect(r.steps.find((s) => s.key === 'customer')!.status).toBe('current');
    expect(r.steps.find((s) => s.key === 'assets')!.status).toBe('todo');
  });

  it('advances next action as steps complete', () => {
    const r = computeGoldenPath(base({ hasCustomer: true, productUsageCount: 2 }));
    expect(r.steps.find((s) => s.key === 'customer')!.status).toBe('done');
    expect(r.steps.find((s) => s.key === 'assets')!.status).toBe('done');
    expect(r.nextActionKey).toBe('logistics');
  });

  it('risk is optional and never blocks the next action', () => {
    const r = computeGoldenPath(base({ hasCustomer: true, productUsageCount: 1, logisticsTaskCount: 1, staffCount: 1 }));
    const risk = r.steps.find((s) => s.key === 'risk')!;
    expect(risk.optional).toBe(true);
    expect(risk.status).toBe('optional');
    expect(r.nextActionKey).toBe('cost'); // risk を飛ばして cost が次
  });

  it('bridge → formalize → send → payment → collected progression', () => {
    const ready = base({
      hasCustomer: true, productUsageCount: 1, logisticsTaskCount: 1, staffCount: 1,
      costRecorded: true, revenue: 100000, cost: 60000, grossSnapshotCount: 1,
    });
    expect(computeGoldenPath(ready).nextActionKey).toBe('bridge');
    expect(computeGoldenPath({ ...ready, bridged: true }).nextActionKey).toBe('formalize');
    expect(computeGoldenPath({ ...ready, bridged: true, invoiceCandidateStatus: 'draft', invoiceStatus: 'ISSUED' }).nextActionKey).toBe('send');
    expect(computeGoldenPath({ ...ready, bridged: true, invoiceStatus: 'SENT' }).nextActionKey).toBe('payment');
    expect(computeGoldenPath({ ...ready, bridged: true, invoiceStatus: 'PARTIALLY_PAID', paidAmount: 40000, invoiceTotal: 100000 }).nextActionKey).toBe('collected');
  });

  it('fully collected project: no next action, 100%, fullyCollected', () => {
    const r = computeGoldenPath(base({
      hasCustomer: true, productUsageCount: 1, logisticsTaskCount: 1, staffCount: 1,
      costRecorded: true, revenue: 100000, cost: 60000, grossSnapshotCount: 1,
      bridged: true, invoiceCandidateStatus: 'sent', invoiceStatus: 'PAID', paidAmount: 110000, invoiceTotal: 110000,
    }));
    expect(r.nextActionKey).toBeNull();
    expect(r.doneCount).toBe(r.totalCount);
    expect(r.percent).toBe(100);
    expect(r.fullyCollected).toBe(true);
  });
});

describe('computeGoldenPath — low margin warning', () => {
  it('warns when revenue>0 and margin below threshold', () => {
    const r = computeGoldenPath(base({ revenue: 100000, cost: 95000 })); // 5%
    expect(r.marginPercent).toBeLessThan(GOLDEN_PATH_LOW_MARGIN_THRESHOLD);
    expect(r.lowMarginWarning).toBe(true);
  });
  it('no warning for healthy margin', () => {
    const r = computeGoldenPath(base({ revenue: 100000, cost: 50000 })); // 50%
    expect(r.lowMarginWarning).toBe(false);
  });
  it('no warning when revenue is zero (not yet entered)', () => {
    const r = computeGoldenPath(base({ revenue: 0, cost: 0 }));
    expect(r.lowMarginWarning).toBe(false);
  });
});
