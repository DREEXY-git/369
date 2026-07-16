// LeadMap リードの商談化（Customer/Deal/Timeline/Lead更新/StageHistory/Audit の原子確定）。
// Server Action（leadmap/actions.ts）はこのサービスを呼ぶだけ（docs/audit/12_maintenance_architecture.md）。
import { prisma } from '@/lib/db';

export interface LeadConvertActor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体が AI か（true は DB 接触前に一律拒否。実確定は人間専用）。 */
  actorIsAi?: boolean;
}

export type LeadConvertResult =
  | { kind: 'created'; customerId: string }
  | { kind: 'already'; customerId: string }
  | { kind: 'not-found' }
  /** 既存 link（customerId/dealId）が別 tenant / dangling / 片側欠落 = fail-closed（foreign ID を返さない）。 */
  | { kind: 'inconsistent' }
  /** AI 主体（実確定不可）。 */
  | { kind: 'forbidden' };

export interface LeadConvertOptions {
  /** test-only: tx 内の全書き込み後・commit 前に例外を注入し、全 rollback（孤児 0）を検証する。
   *  Server Action は設定しないため本番経路からは到達不能（Codex PR#49 R1 P2 の fault injection 用）。 */
  __faultBeforeCommitForTest?: () => void;
}

/** リードを商談化し、Customer / Deal / Timeline / Lead更新 / StageHistory / Audit を単一 tx で確定する。
 *  堅牢化（Codex CODEX_CHANGE_REQUEST_V80_LEAD_CONVERT_R1）:
 *   - **High**: AI は実確定を持たない → DB 接触前に一律拒否（監査を人間として記録しない）。
 *   - **P2**: 既存 link は同一 tenant で Customer/Deal を検証し、別 tenant / dangling / 片側欠落は
 *     `inconsistent` で fail-closed（foreign ID を返して越境表示・重複を生まない）。
 *   - リード行を FOR UPDATE でロックし同時商談化を直列化、ロック後に link を再読取して冪等に収束。 */
export async function convertLeadToCustomer(
  actor: LeadConvertActor,
  leadId: string,
  opts: LeadConvertOptions = {},
): Promise<LeadConvertResult> {
  if (actor.actorIsAi) return { kind: 'forbidden' };

  return prisma.$transaction(async (tx) => {
    // 同一リードへの並行商談化を直列化（FOR UPDATE）。後続 tx は先行 commit の link を必ず見る。
    await tx.$queryRaw`SELECT id FROM "LocalBusinessLead" WHERE id = ${leadId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const lead = await tx.localBusinessLead.findFirst({ where: { id: leadId, tenantId: actor.tenantId } });
    if (!lead) return { kind: 'not-found' as const };

    if (lead.customerId || lead.dealId) {
      // 既に何らかの link あり = 既変換扱いだが、整合性を tenant scoped で検証してから収束する。
      // 片側欠落（customer のみ / deal のみ）・別 tenant・dangling は foreign ID を返さず fail-closed。
      if (!lead.customerId || !lead.dealId) return { kind: 'inconsistent' as const };
      const linkedCustomer = await tx.customer.findFirst({ where: { id: lead.customerId, tenantId: actor.tenantId }, select: { id: true } });
      if (!linkedCustomer) return { kind: 'inconsistent' as const };
      const linkedDeal = await tx.deal.findFirst({ where: { id: lead.dealId, tenantId: actor.tenantId, customerId: lead.customerId }, select: { id: true } });
      if (!linkedDeal) return { kind: 'inconsistent' as const };
      return { kind: 'already' as const, customerId: lead.customerId };
    }

    const customer = await tx.customer.create({
      data: {
        tenantId: actor.tenantId,
        name: lead.name,
        industry: lead.industry,
        rank: 'B',
        ownerId: lead.ownerId ?? actor.userId,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        website: lead.website,
        status: 'prospect',
        notes: `LeadMap（${lead.city ?? ''} ${lead.industry}）から商談化。優先度 ${lead.priority}。`,
      },
    });

    const deal = await tx.deal.create({
      data: {
        tenantId: actor.tenantId,
        customerId: customer.id,
        title: `${lead.name} 商談（新規開拓）`,
        ownerId: lead.ownerId ?? actor.userId,
        stage: 'CONTACT',
        probability: 30,
        nextAction: '初回ヒアリングの日程調整',
        source: 'leadmap',
        leadId: lead.id,
      },
    });

    await tx.customerTimelineEvent.create({
      data: { tenantId: actor.tenantId, customerId: customer.id, type: 'deal', title: 'LeadMapから商談化', body: `新規開拓リードを顧客・案件に連携しました。`, actorId: actor.userId },
    });
    await tx.localBusinessLead.update({
      where: { id: lead.id },
      data: { customerId: customer.id, dealId: deal.id, stage: 'APPOINTMENT' },
    });
    await tx.leadPipelineStageHistory.create({
      data: { tenantId: actor.tenantId, leadId: lead.id, fromStage: lead.stage, toStage: 'APPOINTMENT', note: '商談化（CRM連携）', changedById: actor.userId },
    });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'create',
        entityType: 'Customer',
        entityId: customer.id,
        summary: `LeadMapリード「${lead.name}」を商談化（顧客・案件を作成）`,
      },
    });

    // test-only fault injection（本番不到達）: 全書き込み後に例外→単一 tx なので全 rollback。
    if (opts.__faultBeforeCommitForTest) opts.__faultBeforeCommitForTest();

    return { kind: 'created' as const, customerId: customer.id };
  });
}
