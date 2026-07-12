// C19 広告改善案 承認ブリッジの transaction 正本（roadmap83 案A・人間承認済み 2026-07-12）。
// C21（content-review-bridge）と同型: 申請 = MarketingSuggestion.approvalStatus の CAS
// （none/rejected → pending）→ ApprovalRequest 作成 → 監査 → DataAccessLog を単一 $transaction で
// all-or-nothing。決定 = ApprovalRequest CAS → suggestion 更新 count===1 必須 → 監査。
// **広告の実変更・予算変更・出稿・外部送信・実 LLM・課金は一切行わない**（承認は社内状態のみ）。
// db は注入（実 prisma / テスト mock / 失敗注入 wrapper）。

import { suggestionStatusOnRequest, suggestionStatusOnDecision } from '@hokko/shared';

interface SuggestionTx {
  marketingSuggestion: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
    create(args: unknown): Promise<{ id: string }>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  approvalRequest: {
    create(args: unknown): Promise<{ id: string }>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  auditLog: { create(args: unknown): Promise<unknown> };
  dataAccessLog: { create(args: unknown): Promise<unknown> };
}

export interface SuggestionBridgeDb {
  $transaction<T>(fn: (tx: SuggestionTx) => Promise<T>): Promise<T>;
}

export interface MaterializeSuggestionInput {
  tenantId: string;
  actorId: string;
  /** AI ロールは（生成 action 側の拒否に加え）core でも実体化不可（二重防御）。 */
  actorIsAi: boolean;
  /**
   * 冪等キー＝MarketingSuggestion の deterministic PK（v7.2 R2・Codex r3566352032 対応）。
   * 既存 PK の unique 制約が DB レベルの直列化 barrier になるため、**同一キーの並行実体化は
   * schema 変更なしで必ず1件に収束**する（check-then-create ではない・敗者は P2002 → 'already'）。
   * 呼び出し側（Server Action）がフォーム描画時に発行し ^c[a-z0-9]{20,32}$ を検証して渡す。
   */
  suggestionId: string;
  /** 生成元 AIOutput の id（監査の相関用メタ）。 */
  aiOutputId: string;
  /** メタのみ（campaign 名＋改善案タイトル）。 */
  title: string;
  /** 下書き本文（MarketingSuggestion.detail のみに保存・監査へは複製しない）。 */
  detail: string;
  campaignId: string | null;
  /**
   * 生成全体の必須監査（ai_run 等）。同一 transaction 内で書く（v7.2 R2: transaction 外の
   * 後置 writeAudit を残さない＝最終監査失敗でも suggestion ごと rollback し利用者 retry で収束）。
   */
  runAudit?: { entityType: string; entityId: string; summary: string } | null;
}

export type MaterializeSuggestionResult =
  | { outcome: 'created'; suggestionId: string }
  | { outcome: 'already'; suggestionId: string }
  | { outcome: 'forbidden' };

/** Prisma unique violation（P2002）判定（test mock からも同形で注入可能）。 */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

/**
 * 改善案の実体化（v7.0 R2 → v7.2 R2 で並行冪等性を是正・Codex comment 4951705481 対応）:
 * - **並行冪等性**: suggestion の PK を冪等キーにし、DB の unique 制約で直列化。並行同一キーは
 *   1件だけ commit され、敗者は unique violation → transaction ごと rollback → 'already'。
 * - **原子性**: suggestion 作成＋実体化監査（suggestion_materialize）＋**生成全体の必須監査（runAudit）**を
 *   単一 `$transaction` で確定（どれが失敗しても孤児・未監査レコードは残らない）。
 * - **逐次冪等性**: 既存キーの再実体化は tenant スコープ findFirst の fast-path で 'already'（行を増やさない）。
 * 広告の実変更・予算変更・出稿・外部送信は行わない。
 */
export async function materializeSuggestionCore(
  db: SuggestionBridgeDb,
  input: MaterializeSuggestionInput,
): Promise<MaterializeSuggestionResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  try {
    return await db.$transaction(async (tx) => {
      // fast-path（逐次冪等）: 自 tenant スコープで照会（tenant 規律）。他 tenant が同じ PK を
      // 使っていた場合もここでは開示せず、下の create の unique violation → 'already' に収束させる。
      const prior = await tx.marketingSuggestion.findFirst({
        where: { id: input.suggestionId, tenantId: input.tenantId },
        select: { id: true },
      });
      if (prior) return { outcome: 'already' as const, suggestionId: input.suggestionId };
      const s = await tx.marketingSuggestion.create({
        data: {
          id: input.suggestionId, // deterministic PK ＝ unique 制約による並行直列化（schema 変更なし）
          tenantId: input.tenantId,
          title: input.title,
          detail: input.detail,
          approvalStatus: 'none',
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId,
          actorType: 'user',
          action: 'suggestion_materialize',
          entityType: 'AIOutput',
          entityId: input.aiOutputId,
          summary: `広告改善案を実体化: ${input.title}（実行なし・封印中）`,
          metadata: { suggestionId: s.id, campaignId: input.campaignId },
        },
      });
      if (input.runAudit) {
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorId: input.actorId,
            actorType: 'user',
            action: 'ai_run',
            entityType: input.runAudit.entityType,
            entityId: input.runAudit.entityId,
            summary: input.runAudit.summary,
          },
        });
      }
      return { outcome: 'created' as const, suggestionId: s.id };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      // 並行実体化の敗者: 勝者の suggestion が既に存在（transaction は全て rollback 済み）。
      return { outcome: 'already', suggestionId: input.suggestionId };
    }
    throw e;
  }
}

export interface RequestSuggestionReviewInput {
  tenantId: string;
  requestedById: string;
  /** action 側で tenant スコープ取得済みの対象メタ（title のみ・detail 本文は渡さない）。 */
  suggestion: { id: string; title: string };
  actorIsAi: boolean;
}

export type RequestSuggestionReviewResult =
  | { outcome: 'requested'; approvalId: string }
  | { outcome: 'already' }
  | { outcome: 'forbidden' };

export async function requestSuggestionReviewCore(
  db: SuggestionBridgeDb,
  input: RequestSuggestionReviewInput,
): Promise<RequestSuggestionReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' }; // DB に触れる前に拒否
  const s = input.suggestion;
  return db.$transaction(async (tx) => {
    const claim = await tx.marketingSuggestion.updateMany({
      where: { id: s.id, tenantId: input.tenantId, approvalStatus: { in: ['none', 'rejected'] } },
      data: suggestionStatusOnRequest(),
    });
    if (claim.count === 0) return { outcome: 'already' as const };
    const req = await tx.approvalRequest.create({
      data: {
        tenantId: input.tenantId,
        type: 'ad_suggestion_review',
        requestedForAction: 'ad_suggestion_review',
        title: `広告改善案の承認申請: ${s.title}`,
        summary: '改善案を人間レビューに提出（広告の実変更・予算変更・外部送信は伴いません）',
        entityType: 'marketing_suggestion',
        entityId: s.id,
        requestedById: input.requestedById,
        riskLevel: 'LOW',
        status: 'PENDING',
        payload: { kind: 'ads_improvement' }, // メタのみ（detail 本文は入れない）
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        action: 'approval_request',
        entityType: 'marketing_suggestion',
        entityId: s.id,
        summary: `承認依頼: 広告改善案の承認申請: ${s.title}`,
        metadata: { approvalAction: 'ad_suggestion_review', riskLevel: 'LOW' },
      },
    });
    await tx.dataAccessLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.requestedById,
        actorType: 'user',
        entityType: 'MarketingSuggestion',
        entityId: s.id,
        label: 'INTERNAL',
        action: 'read',
        purpose: 'ad_suggestion_review_request',
        metadata: { approvalId: req.id, fields: ['title'] },
      },
    });
    return { outcome: 'requested' as const, approvalId: req.id };
  });
}

export interface DecideSuggestionReviewInput {
  tenantId: string;
  approvalId: string;
  entityId: string | null;
  decision: 'approve' | 'reject';
  decidedById: string;
  note: string;
  approvalTitle: string;
  actorIsAi: boolean;
}

export type DecideSuggestionReviewResult = { outcome: 'decided' } | { outcome: 'already' } | { outcome: 'forbidden' };

export async function decideSuggestionReviewCore(
  db: SuggestionBridgeDb,
  input: DecideSuggestionReviewInput,
): Promise<DecideSuggestionReviewResult> {
  if (input.actorIsAi) return { outcome: 'forbidden' };
  if (!input.entityId) throw new Error('ad_suggestion_review approval without entityId');
  const status = input.decision === 'approve' ? 'APPROVED' : 'REJECTED';
  return db.$transaction(async (tx) => {
    const decided = await tx.approvalRequest.updateMany({
      where: { id: input.approvalId, tenantId: input.tenantId, status: 'PENDING' },
      data: { status, decidedById: input.decidedById, decidedAt: new Date(), decisionNote: input.note },
    });
    if (decided.count === 0) return { outcome: 'already' as const };
    const updated = await tx.marketingSuggestion.updateMany({
      where: { id: input.entityId, tenantId: input.tenantId, approvalStatus: 'pending' },
      data: suggestionStatusOnDecision(input.decision),
    });
    if (updated.count !== 1) {
      // 対象消失・別 tenant・状態不整合 → 決定ごと rollback（PENDING のまま人間が再判断できる）。
      throw new Error('suggestion-transition-failed');
    }
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.decidedById,
        actorType: 'user',
        action: status === 'APPROVED' ? 'approve' : 'reject',
        entityType: 'ApprovalRequest',
        entityId: input.approvalId,
        summary: `${input.approvalTitle} を${status === 'APPROVED' ? '承認' : '却下'}`,
      },
    });
    return { outcome: 'decided' as const };
  });
}
