// リードの手動ステージ変更（LocalBusinessLead.stage）の業務ロジック。
// P3-CRM（Codex CR CODEX_CHANGE_REQUEST_V90_P3_CRM_STAGE_MUTATION_R1 #4989708668 対応）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// CR の要求と対応:
//  1. RBAC/AI 迂回 — 旧 updateLeadStageAction は requireUser() のみで hasPermission も human-only も
//     無く、READ_ONLY / AI_AGENT / AI_ASSISTANT / AI+OWNER 混在主体が Server Action 直接送信で
//     NEW→WON 等へ業務状態を変更できた。→ **対象取得前**に `sessionIsAi === false`（厳密・欠落/null は
//     fail-closed）∧ roles 配列必須 ∧ `isHumanUser(roles)`（AI role 混在拒否）∧
//     `canForRoles(roles,'leadmap','update')` を判定（domain と Action の二重防御）。
//  2. `as LeadStage` は runtime validation ではない → leadId/stage を runtime で検証し、
//     **許容遷移を明示**（MANUAL_STAGE_TRANSITIONS）。自動遷移（分析/下書き/承認申請/送信/返信分類/
//     配信停止/商談化）は各専用経路のみが行い、手動変更は商談フェーズの前進と失注のみを許可する。
//  3. Lead更新・StageHistory・Audit が別 commit で History/Audit 欠落時に Lead だけ確定した →
//     tenant-scoped FOR UPDATE → lock 下再読取 → 遷移判定 → **条件付き CAS（updateMany stage一致・
//     count===1）→ History → Audit を単一 transaction** で all-or-nothing 確定。
//     並行更新は行 lock + CAS で直列化され、勝者1本・敗者は書き込みゼロ（lost history なし）。
//  4. R4（CODEX_CHANGE_REQUEST_V90_P3_CRM_STAGE_MUTATION_R4_EXPECTED_STAGE_CAS #4997527961）—
//     旧実装は lock 下再読取の「最新 stage」に対して遷移を再解釈していたため、同じ REPLIED を見た
//     2画面が APPOINTMENT / LOST を送ると両方 commit し得た（stale intent overwrite）。→ 利用者が
//     **画面で見ていた開始 stage（expectedStage）** を form→Action→domain へ runtime 検証付きで貫通し、
//     lock 下再読取 stage が expectedStage と一致する場合のみ遷移判定・CAS を行う。不一致は
//     `stale-conflict`（書き込み0）。現行 stage が既に target なら従来どおり idempotent な `already`。
//     CAS 条件も expectedStage に固定し、最新 stage への古い target の再解釈は行わない。
// schema 変更なし・frozen ファイル（lead-convert.ts 等）非接触。
import { prisma } from '@/lib/db';
import { canForRoles, isHumanUser, LEAD_STAGES, type LeadStage, type RoleKey } from '@hokko/shared';

export interface LeadStageActor {
  tenantId: string;
  userId?: string | null;
  /** role キー配列（欠落は fail-closed）。 */
  roles?: RoleKey[] | null;
  /** セッションの AI フラグ。**false 以外（true/undefined/null）は全て拒否**（fail-closed）。 */
  sessionIsAi?: boolean | null;
}

export type UpdateLeadStageResult =
  | { ok: true; fromStage: LeadStage; toStage: LeadStage }
  | {
      ok: false;
      reason: 'forbidden' | 'notfound' | 'invalid-input' | 'invalid-transition' | 'already' | 'conflict' | 'stale-conflict';
    };

export interface LeadStageTestHooks {
  /** Lead 更新（CAS）後・History 前に throw させ、all-or-nothing を実証する。 */
  __faultAfterUpdateForTest?: () => void;
  /** History 作成後・Audit 前に throw させ、all-or-nothing を実証する。 */
  __faultAfterHistoryForTest?: () => void;
  /** FOR UPDATE 取得後に停止させ、並行直列化を観測する。 */
  __gateAfterLockForTest?: () => Promise<void> | void;
  /** 真lock競合テスト用: waiter を意図的に長時間 block させるため tx timeout を延長する
   *  （未指定時は Prisma 既定のまま — 本番挙動は不変）。 */
  __txTimeoutMsForTest?: number;
  /** 真lock競合テスト用: FOR UPDATE 取得**前**に自 backend PID を通知する（lock 前 PID 通知 —
   *  呼出しと観測 backend の一対一固定用。未指定時は追加 query なし）。 */
  __beforeLockForTest?: (backendPid: number) => Promise<void> | void;
}

/**
 * 手動遷移の許容マップ（明示・fail-closed: 記載外は invalid-transition）。
 * 自動化ステージ（NEW〜CLICKED）と終端（WON/LOST/UNSUBSCRIBED/EXCLUDED）からの手動変更は不可。
 * 手動で行えるのは「返信後の商談フェーズ前進」と「商談フェーズからの失注記録」のみ。
 */
export const MANUAL_STAGE_TRANSITIONS: Partial<Record<LeadStage, readonly LeadStage[]>> = {
  REPLIED: ['APPOINTMENT', 'LOST'],
  APPOINTMENT: ['NEGOTIATING', 'LOST'],
  NEGOTIATING: ['QUOTED', 'LOST'],
  QUOTED: ['WON', 'LOST'],
};

/** 手動遷移先として現在ステージから許される候補（UI 表示用）。 */
export function manualStageTargets(current: string): readonly LeadStage[] {
  return MANUAL_STAGE_TRANSITIONS[current as LeadStage] ?? [];
}

function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

/** 人間専用 ∧ leadmap:update の fail-closed 判定（sessionIsAi は厳密に false のみ許可）。 */
function actorMayMutateStage(actor: LeadStageActor): boolean {
  if (actor.sessionIsAi !== false) return false;
  if (!Array.isArray(actor.roles) || actor.roles.length === 0) return false;
  if (!isHumanUser({ roles: actor.roles })) return false;
  return canForRoles(actor.roles, 'leadmap', 'update');
}

/**
 * リードの手動ステージ変更。権限・入力・遷移の全てが fail-closed。
 * 単一 transaction: Lead FOR UPDATE（tenant-scoped）→ lock 下再読取 → expectedStage 一致確認（R4）→
 * 許容遷移判定 → CAS（updateMany stage=expectedStage 一致・count===1）→ StageHistory → Audit。
 * 現行 stage が既に target なら already（書き込みゼロ・冪等）。
 * 現行 stage が expectedStage と不一致（画面表示後に他の変更が確定）なら stale-conflict（書き込みゼロ）。
 */
export async function updateLeadStage(
  actor: LeadStageActor,
  input: { leadId: string; stage: string; expectedStage: string },
  opts: LeadStageTestHooks = {},
): Promise<UpdateLeadStageResult> {
  // 対象取得前の権限判定（CR item 1: DB 接触前に拒否）。
  if (!actorMayMutateStage(actor)) return { ok: false, reason: 'forbidden' };
  // runtime 入力検証（CR item 2: `as LeadStage` を廃止。R4: expectedStage も enum 検証）。
  if (typeof input.leadId !== 'string' || input.leadId.length === 0 || input.leadId.length > 64) {
    return { ok: false, reason: 'invalid-input' };
  }
  if (typeof input.stage !== 'string' || !isLeadStage(input.stage)) {
    return { ok: false, reason: 'invalid-input' };
  }
  if (typeof input.expectedStage !== 'string' || !isLeadStage(input.expectedStage)) {
    return { ok: false, reason: 'invalid-input' };
  }
  const toStage = input.stage;
  const expectedStage = input.expectedStage;

  const txOptions = opts.__txTimeoutMsForTest
    ? { timeout: opts.__txTimeoutMsForTest, maxWait: Math.min(opts.__txTimeoutMsForTest, 10000) }
    : undefined;
  return prisma.$transaction(async (tx) => {
    if (opts.__beforeLockForTest) {
      const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid()::int AS pid`;
      await opts.__beforeLockForTest(pidRows[0]!.pid);
    }
    // tenant-scoped FOR UPDATE — 並行する手動変更・自動遷移と直列化し、判定は lock 下の再読取値で行う。
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "LocalBusinessLead" WHERE id = ${input.leadId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false, reason: 'notfound' } as const;
    if (opts.__gateAfterLockForTest) await opts.__gateAfterLockForTest();
    const lead = await tx.localBusinessLead.findFirst({
      where: { id: input.leadId, tenantId: actor.tenantId },
      select: { stage: true, name: true },
    });
    if (!lead) return { ok: false, reason: 'notfound' } as const;
    const fromStage = lead.stage as LeadStage;
    // 現行 stage が既に target なら冪等 no-op（同一 POST replay・並行同一 target の敗者）。
    if (fromStage === toStage) return { ok: false, reason: 'already' } as const;
    // R4: 利用者が画面で見ていた開始 stage と lock 下再読取の現行 stage が不一致なら、
    // 最新 stage に対して古い target を再解釈せず stale-conflict で書き込みゼロ拒否する。
    if (fromStage !== expectedStage) return { ok: false, reason: 'stale-conflict' } as const;
    // 遷移判定は利用者の expectedStage（= lock 下で一致確認済みの fromStage）に固定。
    const allowed = MANUAL_STAGE_TRANSITIONS[expectedStage] ?? [];
    if (!allowed.includes(toStage)) return { ok: false, reason: 'invalid-transition' } as const;

    // 多層防御の CAS: 利用者の expectedStage と一致する行のみ更新（count===1 必須）。
    const claim = await tx.localBusinessLead.updateMany({
      where: { id: input.leadId, tenantId: actor.tenantId, stage: expectedStage },
      data: { stage: toStage },
    });
    if (claim.count !== 1) return { ok: false, reason: 'conflict' } as const;
    if (opts.__faultAfterUpdateForTest) opts.__faultAfterUpdateForTest();

    await tx.leadPipelineStageHistory.create({
      data: {
        tenantId: actor.tenantId,
        leadId: input.leadId,
        fromStage,
        toStage,
        changedById: actor.userId ?? null,
      },
    });
    if (opts.__faultAfterHistoryForTest) opts.__faultAfterHistoryForTest();

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'update',
        entityType: 'LocalBusinessLead',
        entityId: input.leadId,
        summary: `リードのステージを手動変更: ${lead.name} ${fromStage} → ${toStage}`,
      },
    });
    return { ok: true, fromStage, toStage } as const;
  }, txOptions);
}
