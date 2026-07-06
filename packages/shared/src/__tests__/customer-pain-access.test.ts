import { describe, it, expect } from 'vitest';
import {
  canViewCustomerPainDetail,
  evaluateCustomerPainAccess,
  CUSTOMER_PAIN_LABEL,
  CUSTOMER_PAIN_DENY_REASONS,
  type CustomerPainViewer,
  type CustomerPainRecordMeta,
} from '../customer-pain-access';
import { canForRoles, isHumanUser } from '../rbac';
import { canAccessLabel } from '../labels';

// doc105 §5〜§7 / doc109 候補A の否定系テスト。
// 標準閲覧式＝tenantId × knowledge:update × canAccessLabel(CUSTOMER_CONFIDENTIAL) × AIロール除外 × archivedAt null の AND。
// これは「見られるか」の判定のみ。実画面・実データ・writeDataAccess/writeAudit には接続しない。

const TENANT = 'tenant-1';
const OTHER_TENANT = 'tenant-2';

function viewer(roles: CustomerPainViewer['roles'], tenantId = TENANT): CustomerPainViewer {
  return { tenantId, roles };
}
const activeRecord: CustomerPainRecordMeta = { tenantId: TENANT, archivedAt: null };
const archivedRecord: CustomerPainRecordMeta = { tenantId: TENANT, archivedAt: new Date('2026-01-01T00:00:00Z') };

describe('canViewCustomerPainDetail（Customer Pain 高機密詳細の標準閲覧式・doc109 候補A）', () => {
  it('全条件を満たす人間ユーザー（STAFF）は閲覧可', () => {
    // STAFF は knowledge:update を持ち、CUSTOMER_CONFIDENTIAL 許可ロールにも含まれる人間ロール。
    expect(canViewCustomerPainDetail(viewer(['STAFF']), activeRecord)).toBe(true);
    expect(canViewCustomerPainDetail(viewer(['OWNER']), activeRecord)).toBe(true);
  });

  it('1) tenantId 不一致なら閲覧不可', () => {
    // レコードは TENANT、閲覧者は OTHER_TENANT。
    expect(canViewCustomerPainDetail(viewer(['OWNER'], OTHER_TENANT), activeRecord)).toBe(false);
    expect(evaluateCustomerPainAccess(viewer(['OWNER'], OTHER_TENANT), activeRecord)).toEqual({
      allowed: false,
      reason: 'tenant_mismatch',
    });
  });

  it('2) knowledge:update なしなら閲覧不可（EXECUTIVE は label は満たすが update を持たない）', () => {
    // EXECUTIVE は CUSTOMER_CONFIDENTIAL 許可ロールだが knowledge:update を持たない人間ロール。
    expect(canForRoles(['EXECUTIVE'], 'knowledge', 'update')).toBe(false); // 前提の明示
    expect(canAccessLabel(['EXECUTIVE'], CUSTOMER_PAIN_LABEL)).toBe(true); // label は満たす
    expect(isHumanUser({ roles: ['EXECUTIVE'] })).toBe(true); // 人間である
    expect(canViewCustomerPainDetail(viewer(['EXECUTIVE']), activeRecord)).toBe(false);
    expect(evaluateCustomerPainAccess(viewer(['EXECUTIVE']), activeRecord)).toEqual({
      allowed: false,
      reason: 'no_knowledge_update',
    });
  });

  it('3) label 許可ロールなしなら閲覧不可（READ_ONLY は CUSTOMER_CONFIDENTIAL 許可外）', () => {
    // READ_ONLY は人間だが CUSTOMER_CONFIDENTIAL の許可ロールに含まれない。
    expect(canAccessLabel(['READ_ONLY'], CUSTOMER_PAIN_LABEL)).toBe(false); // 前提の明示
    expect(isHumanUser({ roles: ['READ_ONLY'] })).toBe(true);
    expect(canViewCustomerPainDetail(viewer(['READ_ONLY']), activeRecord)).toBe(false);
    expect(evaluateCustomerPainAccess(viewer(['READ_ONLY']), activeRecord)).toEqual({
      allowed: false,
      reason: 'label_role_denied',
    });
    // EXTERNAL_PARTNER も同様に許可外。
    expect(canViewCustomerPainDetail(viewer(['EXTERNAL_PARTNER']), activeRecord)).toBe(false);
  });

  it('4) AIロールは、権限・ラベルを満たしても閲覧不可（label 単独では守れないため）', () => {
    // ['STAFF','AI_AGENT'] は knowledge:update も CUSTOMER_CONFIDENTIAL label も満たすが、AI を含むため拒否。
    expect(canForRoles(['STAFF', 'AI_AGENT'], 'knowledge', 'update')).toBe(true); // 権限は満たす
    expect(canAccessLabel(['STAFF', 'AI_AGENT'], CUSTOMER_PAIN_LABEL)).toBe(true); // label も満たす
    expect(isHumanUser({ roles: ['STAFF', 'AI_AGENT'] })).toBe(false); // だが人間ではない（混在も拒否）
    expect(canViewCustomerPainDetail(viewer(['STAFF', 'AI_AGENT']), activeRecord)).toBe(false);
    expect(evaluateCustomerPainAccess(viewer(['STAFF', 'AI_AGENT']), activeRecord)).toEqual({
      allowed: false,
      reason: 'ai_role',
    });
    // 純粋な AI ロール単独も当然不可。
    expect(canViewCustomerPainDetail(viewer(['AI_AGENT']), activeRecord)).toBe(false);
    expect(canViewCustomerPainDetail(viewer(['AI_ASSISTANT']), activeRecord)).toBe(false);
    // roles 空も不可（isHumanUser が false）。
    expect(canViewCustomerPainDetail(viewer([]), activeRecord)).toBe(false);
  });

  it('5) archivedAt ありなら閲覧不可', () => {
    expect(canViewCustomerPainDetail(viewer(['STAFF']), archivedRecord)).toBe(false);
    expect(evaluateCustomerPainAccess(viewer(['STAFF']), archivedRecord)).toEqual({
      allowed: false,
      reason: 'archived',
    });
    // 文字列の archivedAt でも同様に拒否（純粋・Prisma 非依存）。
    expect(
      canViewCustomerPainDetail(viewer(['STAFF']), { tenantId: TENANT, archivedAt: '2026-01-01T00:00:00Z' }),
    ).toBe(false);
  });

  it('6) 全条件を満たす人間ユーザーは allowed（evaluate 版）', () => {
    expect(evaluateCustomerPainAccess(viewer(['STAFF']), activeRecord)).toEqual({ allowed: true });
    expect(evaluateCustomerPainAccess(viewer(['DEPARTMENT_MANAGER']), activeRecord)).toEqual({ allowed: true });
    expect(evaluateCustomerPainAccess(viewer(['ADMIN']), activeRecord)).toEqual({ allowed: true });
  });

  it('7) OR 緩和になっていない（全条件を満たす状態から 1 つ崩すと必ず拒否になる）', () => {
    // ベースライン: STAFF・同一テナント・未アーカイブ＝閲覧可。
    const base = viewer(['STAFF']);
    expect(canViewCustomerPainDetail(base, activeRecord)).toBe(true);

    // 各条件を 1 つずつ崩すと、いずれも false（他の条件を満たしていても OR で救済されない）。
    expect(canViewCustomerPainDetail(viewer(['STAFF'], OTHER_TENANT), activeRecord)).toBe(false); // tenant だけ崩す
    expect(canViewCustomerPainDetail(viewer(['EXECUTIVE']), activeRecord)).toBe(false); // knowledge:update だけ崩す
    expect(canViewCustomerPainDetail(viewer(['READ_ONLY']), activeRecord)).toBe(false); // label だけ崩す
    expect(canViewCustomerPainDetail(viewer(['STAFF', 'AI_AGENT']), activeRecord)).toBe(false); // 人間性だけ崩す
    expect(canViewCustomerPainDetail(base, archivedRecord)).toBe(false); // archived だけ崩す
  });

  it('8) 拒否理由は安全な列挙値のみ（自由文・本文断片・PII を含まない）', () => {
    const denials: CustomerPainViewer[] = [
      viewer(['OWNER'], OTHER_TENANT), // tenant_mismatch
      viewer(['STAFF', 'AI_AGENT']), // ai_role
      viewer(['READ_ONLY']), // label_role_denied
      viewer(['EXECUTIVE']), // no_knowledge_update
    ];
    for (const v of denials) {
      const res = evaluateCustomerPainAccess(v, activeRecord);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        // 理由は既知の列挙値のいずれかであり、自由文ではない。
        expect(CUSTOMER_PAIN_DENY_REASONS).toContain(res.reason);
      }
    }
    // archived も列挙値。
    const arch = evaluateCustomerPainAccess(viewer(['STAFF']), archivedRecord);
    expect(arch.allowed).toBe(false);
    if (!arch.allowed) expect(CUSTOMER_PAIN_DENY_REASONS).toContain(arch.reason);
  });
});
