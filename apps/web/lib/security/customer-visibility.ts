import { CONFIDENTIALITY_LABELS, canAccessLabel, type ConfidentialityLabel, type RoleKey } from '@hokko/shared';

// WIP-4（roadmap65）: WIP1（roadmap61・customers 一覧）で確立した「閲覧不可 label の行を
// DB クエリ段階で除外する」判定を、顧客名を参照する他ドメイン（見積・請求のフォーム/詳細/印刷）
// からも使えるよう共有ヘルパに抽出したもの。
// 定数は shared/policy.ts §7 の highLabel / MANAGER_ROLES のミラー（shared 非 export のため
// 局所複製・変更時は両方を更新すること）。
const HIGH_LABELS = [
  'CONFIDENTIAL',
  'STRICT_SECRET',
  'HR_CONFIDENTIAL',
  'FINANCIAL_CONFIDENTIAL',
  'LEGAL_CONFIDENTIAL',
  'EXECUTIVE_ONLY',
] as const;
const MANAGER_ROLES = ['OWNER', 'EXECUTIVE', 'ADMIN', 'DEPARTMENT_MANAGER'] as const;

export function isManagerViewer(roles: RoleKey[]): boolean {
  return MANAGER_ROLES.some((r) => roles.includes(r));
}

/**
 * 一覧・フォーム・埋め込み表示（詳細画面の ABAC を通らない経路）でその label の顧客を
 * 見せてよいか。詳細側 ABAC（policy.ts §7: 非マネージャは高機密ラベルに機密アクセス理由が必要）
 * と整合させるため、非マネージャには高機密ラベルを fail-closed で不可視にする。
 */
export function canSeeCustomerLabel(roles: RoleKey[], label: ConfidentialityLabel): boolean {
  return canAccessLabel(roles, label) && (isManagerViewer(roles) || !(HIGH_LABELS as readonly string[]).includes(label));
}

/** DB クエリの `label: { in: ... }` に渡す可視ラベル集合。 */
export function visibleCustomerLabels(roles: RoleKey[]): ConfidentialityLabel[] {
  return CONFIDENTIALITY_LABELS.filter((l) => canSeeCustomerLabel(roles, l));
}
