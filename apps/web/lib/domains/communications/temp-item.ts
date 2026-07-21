import { prisma } from '@/lib/db';

// 一時保管アイテムの保存/破棄の production-shared core（Codex M1-b E-03 / CAS misc）。
// Server Action（app/(app)/communications/actions.ts）の本体をここへ切り出し、実 PostgreSQL 証拠 spec が
// fault hook 付きで直接呼べるようにする（next/cache 非依存で test loader から import 可能）。
// hook 未指定時は本番挙動と同一。

/** M1-b 証拠用 test-only fault フック（本番未指定時は無作用）。 */
export interface TempItemTestHooks {
  /** tx 内で（save の Thread 作成後・）Audit 作成前に throw させ、CAS ごと全 rollback（status 不変）を実証する。 */
  __faultBetweenWritesForTest?: () => void;
}

export type DecideTempItemResult =
  | { ok: true; decision: 'save' | 'discard' }
  | { ok: false; reason: 'notfound' | 'already' };

/**
 * 一時保管アイテムの保存/破棄の testable core（Server Action から切り出し・fault 注入で証拠化）。
 * status CAS（未確定＝saved/discarded 以外のときだけ claim）→ save なら Thread 作成 → 監査を単一
 * $transaction で確定。CAS count≠1（並行敗者/replay）は書き込みゼロで already。
 */
export async function decideTempItemCore(
  actor: { tenantId: string; userId?: string | null },
  input: { itemId: string; decision: string },
  opts: TempItemTestHooks = {},
): Promise<DecideTempItemResult> {
  const decision: 'save' | 'discard' = input.decision === 'save' ? 'save' : 'discard';
  const item = await prisma.temporaryIngestionItem.findFirst({ where: { id: input.itemId, tenantId: actor.tenantId } });
  if (!item) return { ok: false, reason: 'notfound' };

  const done = await prisma.$transaction(async (tx) => {
    const claim = await tx.temporaryIngestionItem.updateMany({
      where: { id: input.itemId, tenantId: actor.tenantId, status: { notIn: ['saved', 'discarded'] } },
      data: { status: decision === 'save' ? 'saved' : 'discarded' },
    });
    if (claim.count !== 1) return false;
    if (decision === 'save') {
      await tx.communicationThread.create({
        data: { tenantId: actor.tenantId, channel: item.channel, subject: item.preview.split(' — ')[0] ?? item.preview, relevance: 'relevant' },
      });
    }
    if (opts.__faultBetweenWritesForTest) opts.__faultBetweenWritesForTest();
    await tx.auditLog.create({
      data: { tenantId: actor.tenantId, actorId: actor.userId ?? null, actorType: 'user', action: 'update', entityType: 'TemporaryIngestionItem', entityId: input.itemId, summary: `一時保管アイテムを${decision === 'save' ? '保存' : '破棄'}` },
    });
    return true;
  });
  return done ? { ok: true, decision } : { ok: false, reason: 'already' };
}
