// 同意（コンプラ）評価の純ロジック。DB非依存。
// 位置情報/録音/AI参照/外部LLM送信/士業共有/各種配信 などの目的別同意を扱う。

export type ConsentPurpose =
  | 'location_tracking'
  | 'recording'
  | 'ai_reference'
  | 'external_llm'
  | 'expert_share'
  | 'email_marketing'
  | 'sms'
  | 'line'
  | 'call_center';

export type ConsentStatusValue = 'granted' | 'withdrawn' | 'expired' | 'missing';

export interface ConsentGrantLike {
  purpose: ConsentPurpose;
  status: 'granted' | 'withdrawn';
  grantedAt?: Date | null;
  withdrawnAt?: Date | null;
  expiresAt?: Date | null;
}

// 明示同意が必須の目的（取得・利用前に granted が必要）。
export const PURPOSES_REQUIRING_CONSENT: ConsentPurpose[] = [
  'location_tracking',
  'recording',
  'external_llm',
  'expert_share',
  'email_marketing',
  'sms',
  'line',
  'call_center',
];

export function isConsentRequired(purpose: ConsentPurpose): boolean {
  return PURPOSES_REQUIRING_CONSENT.includes(purpose);
}

/** 単一の同意レコードが「今」有効か。撤回・失効を反映。 */
export function isConsentValid(grant: ConsentGrantLike, now: Date = new Date()): boolean {
  if (grant.status !== 'granted') return false;
  if (grant.withdrawnAt && grant.withdrawnAt.getTime() <= now.getTime()) return false;
  if (grant.expiresAt && grant.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * 対象目的について、与えられた同意群から現在の状態を導出する。
 * 最新の granted（有効）を優先。撤回/失効/未取得を区別する。
 */
export function evaluateConsent(
  grants: ConsentGrantLike[],
  purpose: ConsentPurpose,
  now: Date = new Date(),
): { status: ConsentStatusValue; required: boolean } {
  const required = isConsentRequired(purpose);
  const forPurpose = grants.filter((g) => g.purpose === purpose);
  if (forPurpose.length === 0) {
    return { status: required ? 'missing' : 'missing', required };
  }
  // 有効な granted が1つでもあれば granted
  if (forPurpose.some((g) => isConsentValid(g, now))) {
    return { status: 'granted', required };
  }
  // 撤回が含まれるなら withdrawn、失効のみなら expired
  if (forPurpose.some((g) => g.status === 'withdrawn' || (g.withdrawnAt && g.withdrawnAt <= now))) {
    return { status: 'withdrawn', required };
  }
  if (forPurpose.some((g) => g.expiresAt && g.expiresAt <= now)) {
    return { status: 'expired', required };
  }
  return { status: 'missing', required };
}

/** 同意が無ければアクセス不可か（必須目的かつ granted でない）。 */
export function consentBlocksAccess(
  grants: ConsentGrantLike[],
  purpose: ConsentPurpose,
  now: Date = new Date(),
): boolean {
  const { status, required } = evaluateConsent(grants, purpose, now);
  return required && status !== 'granted';
}
