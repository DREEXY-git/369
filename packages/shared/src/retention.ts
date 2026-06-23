// 保存期間（リテンション）判定の純ロジック。DB非依存。

export type RetentionState = 'active' | 'expired';

/** createdAt から retentionDays を過ぎていれば失効。 */
export function isExpired(createdAt: Date, retentionDays: number, now: Date = new Date()): boolean {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return false;
  const expiry = createdAt.getTime() + retentionDays * 86_400_000;
  return now.getTime() >= expiry;
}

export function retentionState(
  createdAt: Date,
  retentionDays: number,
  now: Date = new Date(),
): RetentionState {
  return isExpired(createdAt, retentionDays, now) ? 'expired' : 'active';
}

/** 失効までの残日数（負なら超過日数）。 */
export function daysUntilExpiry(
  createdAt: Date,
  retentionDays: number,
  now: Date = new Date(),
): number {
  const expiry = createdAt.getTime() + retentionDays * 86_400_000;
  return Math.ceil((expiry - now.getTime()) / 86_400_000);
}
