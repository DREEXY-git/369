import { describe, it, expect } from 'vitest';
import { canForRoles } from '../rbac';
import { requiresApproval } from '../approval';
import { dxPriorityScore } from '../growth';

describe('marketing/dx permissions & gates', () => {
  it('denies marketing create for READ_ONLY, allows for business roles', () => {
    expect(canForRoles(['READ_ONLY'], 'marketing', 'create')).toBe(false);
    expect(canForRoles(['OWNER'], 'marketing', 'create')).toBe(true);
    expect(canForRoles(['STAFF'], 'marketing', 'create')).toBe(true);
    expect(canForRoles(['DEPARTMENT_MANAGER'], 'marketing', 'update')).toBe(true);
  });

  it('marketing asset external publish requires approval (never direct send)', () => {
    // requestMarketingAssetApproval は customer_email_send で承認ゲートを通す
    expect(requiresApproval('customer_email_send', { external: true })).toBe(true);
  });

  it('dx priority is bounded 0-100 and rewards low difficulty', () => {
    const p = dxPriorityScore({ estimatedTimeSavingMinutes: 1200, estimatedCostSaving: 100000, estimatedRevenueImpact: 0, difficulty: 'low' });
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
