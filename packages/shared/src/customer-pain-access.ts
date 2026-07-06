// Customer Pain（顧客課題）高機密詳細の「閲覧可否」を判定する純粋関数（doc105 §5〜§7 / doc109 候補A）。
//
// これは候補A（純粋関数＋否定系テスト）のみの実装であり、**解禁ではない・実装（画面/DB/Server Action）ではない**。
// - DB 接続・Prisma import なし（引数だけで判定する純粋関数）。
// - apps/web 参照なし・company-brain-reference 参照なし・schema 参照なし。
// - RBAC 定義（rbac.ts の ROLE_PERMISSIONS）も label 定義（labels.ts の許可ロール）も変更しない。
//   既存の canForRoles / canAccessLabel / isHumanUser を「利用側の条件式」として組み合わせるだけ。
// - writeDataAccess / writeAudit の実接続はしない（本モジュールは「見られるか」の判定まで）。
//
// 中心設計（doc105 §4〜§7）: labels.ts の CUSTOMER_CONFIDENTIAL 許可ロールには AI_AGENT / AI_ASSISTANT / STAFF が
// 含まれるため、**label 単独では守りが不足**する。したがって標準閲覧式は次の 5 条件の AND 交差のみ（OR 緩和禁止）:
//   1. tenantId 一致
//   2. knowledge:update 以上（canForRoles(roles, 'knowledge', 'update')）
//   3. canAccessLabel(roles, 'CUSTOMER_CONFIDENTIAL')
//   4. AIロール除外（isHumanUser）
//   5. archivedAt が null

import type { ConfidentialityLabel, RoleKey } from './types';
import { canForRoles, isHumanUser } from './rbac';
import { canAccessLabel } from './labels';

/** Customer Pain 高機密詳細に用いる機密ラベル（doc104/doc105 の設計で固定）。 */
export const CUSTOMER_PAIN_LABEL: ConfidentialityLabel = 'CUSTOMER_CONFIDENTIAL';

/** 閲覧しようとする人間ユーザー（PII は含めない。判定に必要な tenantId と roles のみ）。 */
export interface CustomerPainViewer {
  tenantId: string;
  roles: RoleKey[];
}

/**
 * 対象レコードの「メタのみ」（本文・PII・顧客名は含めない）。
 * archivedAt は Date でも ISO 文字列でも null/undefined でも受ける（純粋・Prisma 非依存）。
 */
export interface CustomerPainRecordMeta {
  tenantId: string;
  archivedAt: Date | string | null | undefined;
}

/**
 * 拒否理由は「安全な列挙値」のみ（doc105 §9）。自由文・本文断片・PII を理由に入れない。
 */
export const CUSTOMER_PAIN_DENY_REASONS = [
  'tenant_mismatch',
  'ai_role',
  'label_role_denied',
  'no_knowledge_update',
  'archived',
] as const;
export type CustomerPainDenyReason = (typeof CUSTOMER_PAIN_DENY_REASONS)[number];

export type CustomerPainAccessResult =
  | { allowed: true }
  | { allowed: false; reason: CustomerPainDenyReason };

/**
 * 標準閲覧式（5 条件の AND 交差）。1 つでも欠けたら false（OR 緩和禁止）。
 * doc105 §6 の擬似コードと同一の意味。boolean のため条件の評価順は結果に影響しない。
 */
export function canViewCustomerPainDetail(
  viewer: CustomerPainViewer,
  record: CustomerPainRecordMeta,
): boolean {
  return (
    viewer.tenantId === record.tenantId &&
    canForRoles(viewer.roles, 'knowledge', 'update') &&
    canAccessLabel(viewer.roles, CUSTOMER_PAIN_LABEL) &&
    isHumanUser(viewer) &&
    record.archivedAt == null
  );
}

/**
 * 閲覧可否＋拒否理由（安全な列挙値のみ）を返す評価版。canViewCustomerPainDetail と同じ AND 条件を、
 * 診断しやすい順（tenant → 人間性 → label → 権限 → 状態）で評価する。理由は本文・PII を含まない。
 * これは診断用の順序であり、いずれの条件が欠けても allowed:false になる（AND 交差・OR 緩和なし）。
 */
export function evaluateCustomerPainAccess(
  viewer: CustomerPainViewer,
  record: CustomerPainRecordMeta,
): CustomerPainAccessResult {
  if (viewer.tenantId !== record.tenantId) return { allowed: false, reason: 'tenant_mismatch' };
  if (!isHumanUser(viewer)) return { allowed: false, reason: 'ai_role' };
  if (!canAccessLabel(viewer.roles, CUSTOMER_PAIN_LABEL)) {
    return { allowed: false, reason: 'label_role_denied' };
  }
  if (!canForRoles(viewer.roles, 'knowledge', 'update')) {
    return { allowed: false, reason: 'no_knowledge_update' };
  }
  if (record.archivedAt != null) return { allowed: false, reason: 'archived' };
  return { allowed: true };
}
