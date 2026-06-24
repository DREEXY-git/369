// 承認ゲート（危険操作を必ず ApprovalRequest 経由にする）。Phase 1-2。
import { prisma, writeAudit } from './db';
import { requiresApproval, type ApprovalAction, type RoleKey } from '@hokko/shared';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateApprovalInput {
  tenantId: string;
  action: ApprovalAction;
  title: string;
  summary?: string;
  targetType: string;
  targetId: string;
  requestedById?: string | null;
  approverRoleRequired?: RoleKey | null;
  riskLevel?: RiskLevel;
  reason?: string;
  payloadBefore?: Record<string, unknown>;
  payloadAfter?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  expiresInHours?: number;
}

/** 危険操作の承認リクエストを作成（status=PENDING）。直接実行しない。 */
export async function createApprovalRequest(input: CreateApprovalInput): Promise<{ id: string }> {
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 3_600_000)
    : null;
  const req = await prisma.approvalRequest.create({
    data: {
      tenantId: input.tenantId,
      type: input.action,
      requestedForAction: input.action,
      title: input.title,
      summary: input.summary ?? '',
      entityType: input.targetType,
      entityId: input.targetId,
      requestedById: input.requestedById ?? null,
      approverRoleRequired: (input.approverRoleRequired ?? null) as any,
      riskLevel: (input.riskLevel ?? 'MEDIUM') as any,
      reason: input.reason ?? '',
      payload: (input.payload ?? undefined) as any,
      payloadBefore: (input.payloadBefore ?? undefined) as any,
      payloadAfter: (input.payloadAfter ?? undefined) as any,
      status: 'PENDING',
      expiresAt,
    },
  });
  await writeAudit({
    tenantId: input.tenantId,
    actorId: input.requestedById,
    action: 'approval_request',
    entityType: input.targetType,
    entityId: input.targetId,
    summary: `承認依頼: ${input.title}`,
    metadata: { approvalAction: input.action, riskLevel: input.riskLevel ?? 'MEDIUM' },
  });
  return { id: req.id };
}

/**
 * 危険操作のガード。requiresApproval=true なら承認リクエストを作成して
 * { requiresApproval: true, approvalId } を返す。呼び出し側は直接実行しない。
 */
export async function requireApprovalForDangerousAction(
  input: CreateApprovalInput & { actorIsAi?: boolean; amount?: number; external?: boolean },
): Promise<{ requiresApproval: boolean; approvalId?: string }> {
  const needed = requiresApproval(input.action, {
    actorIsAi: input.actorIsAi,
    amount: input.amount,
    external: input.external,
  });
  if (!needed) return { requiresApproval: false };
  const { id } = await createApprovalRequest(input);
  return { requiresApproval: true, approvalId: id };
}

export async function logApprovalDecision(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  deciderId: string | null,
  note: string,
): Promise<void> {
  const req = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!req) return;
  await writeAudit({
    tenantId: req.tenantId,
    actorId: deciderId,
    action: decision === 'APPROVED' ? 'approve' : 'reject',
    entityType: req.entityType,
    entityId: req.entityId,
    summary: `${decision === 'APPROVED' ? '承認' : '却下'}: ${req.title}`,
    metadata: { approvalId: id, note },
  });
}

export async function approveRequest(
  id: string,
  deciderId: string | null,
  note = '',
): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id },
    data: { status: 'APPROVED', decidedById: deciderId, decidedAt: new Date(), decisionNote: note },
  });
  await logApprovalDecision(id, 'APPROVED', deciderId, note);
}

export async function rejectRequest(
  id: string,
  deciderId: string | null,
  note = '',
): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id },
    data: { status: 'REJECTED', decidedById: deciderId, decidedAt: new Date(), decisionNote: note },
  });
  await logApprovalDecision(id, 'REJECTED', deciderId, note);
}

/** 承認がまだ有効か（APPROVED かつ未失効）。実行直前に必ず確認する。 */
export async function assertApprovalStillValid(id: string): Promise<boolean> {
  const req = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!req || req.status !== 'APPROVED') return false;
  if (req.expiresAt && req.expiresAt.getTime() < Date.now()) return false;
  return true;
}

/**
 * 承認済みアクションを実行する。承認の有効性を確認し、`executedAt` を原子的にクレームしてから
 * executor を呼ぶ（二重実行防止）。危険操作は必ずこの関数経由でのみ実行する。
 *  - status=APPROVED かつ 未失効 かつ 未実行 のときだけ実行。
 *  - 実行に失敗したら executedAt を戻し再実行可能にする。
 */
export async function executeApprovedAction<T>(
  id: string,
  executor: () => Promise<T>,
  opts: { executedById?: string | null; preventReexecution?: boolean } = {},
): Promise<{ executed: boolean; result?: T; reason?: string }> {
  const valid = await assertApprovalStillValid(id);
  if (!valid) return { executed: false, reason: 'approval-invalid-or-expired' };

  if (opts.preventReexecution !== false) {
    // 原子的クレーム: executedAt が null のものだけ「実行中」に更新（同時/再実行を防ぐ）。
    const claim = await prisma.approvalRequest.updateMany({
      where: { id, executedAt: null },
      data: { executedAt: new Date(), executedById: opts.executedById ?? null, executionStatus: 'executing' },
    });
    if (claim.count === 0) return { executed: false, reason: 'already-executed' };
  }

  try {
    const result = await executor();
    await prisma.approvalRequest.update({ where: { id }, data: { executionStatus: 'executed' } });
    return { executed: true, result };
  } catch (e) {
    // 失敗時はクレームを戻して再実行可能にする。
    await prisma.approvalRequest.update({
      where: { id },
      data: { executedAt: null, executionStatus: 'failed' },
    });
    throw e;
  }
}
