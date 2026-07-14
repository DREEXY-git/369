// 受取債権（Receivable）の期日超過 → overdue 自動遷移コア。Wave2。
// worker の RECEIVABLE_OVERDUE_JOB（定期実行）と web/手動実行で共用する（outbox.ts と同型の配置）。
// 従来は runtime に open→overdue を遷移するコードが存在せず、期日を過ぎた売掛が永久に open のままで
// 財務ダッシュボード/朝礼/CEO ダッシュボードの「延滞」集計に載らなかった（seed のみ overdue を持っていた）。
import { prisma } from './client';

export interface TransitionOverdueOptions {
  /** 特定テナントのみ処理する場合に指定。未指定 / 'system' は全テナントを対象とする。 */
  tenantId?: string;
  /** 判定基準時刻（テストで注入可能）。既定は現在時刻。 */
  now?: Date;
}

export interface TransitionOverdueResult {
  transitioned: number;
  perTenant: { tenantId: string; count: number }[];
}

/** 期日超過（dueDate < now）かつ status='open' の Receivable を 'overdue' へ遷移する。
 *  - `status: 'open'` 条件付きの updateMany のため**冪等**（再実行で二重遷移しない・collected/overdue は不変）。
 *  - 各行の集合更新（read-modify-write なし）で lost update の余地がない。
 *  - テナントごとに count>0 のときのみ監査を1件記録（ノイズ抑制）。外部送信・課金・削除・実LLMなし。 */
export async function transitionOverdueReceivables(
  opts: TransitionOverdueOptions = {},
): Promise<TransitionOverdueResult> {
  const now = opts.now ?? new Date();
  const tenants =
    opts.tenantId && opts.tenantId !== 'system'
      ? [{ id: opts.tenantId }]
      : await prisma.tenant.findMany({ select: { id: true } });

  let transitioned = 0;
  const perTenant: { tenantId: string; count: number }[] = [];
  for (const t of tenants) {
    const res = await prisma.receivable.updateMany({
      where: { tenantId: t.id, status: 'open', dueDate: { not: null, lt: now } },
      data: { status: 'overdue' },
    });
    perTenant.push({ tenantId: t.id, count: res.count });
    if (res.count > 0) {
      transitioned += res.count;
      await prisma.auditLog.create({
        data: {
          tenantId: t.id,
          actorId: null,
          actorType: 'system',
          action: 'receivable_overdue_transition',
          entityType: 'Receivable',
          summary: `期日超過の売掛 ${res.count} 件を overdue に自動遷移`,
        },
      });
    }
  }
  return { transitioned, perTenant };
}
