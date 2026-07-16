// LeadMap リードの商談化（Customer/Deal/Timeline/Lead更新/StageHistory/Audit の原子確定）。
// Server Action（leadmap/actions.ts）はこのサービスを呼ぶだけ（docs/audit/12_maintenance_architecture.md）。
import { prisma } from '@/lib/db';

export interface LeadConvertActor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体が「人間でない」か（true は DB 接触前に一律拒否）。
   *  呼び出し側は自己申告 boolean ではなく `!isHumanUser({roles})`（role 由来 fail-closed）を渡す
   *  （Codex PR#60 R2 addendum High: isAiAgent と role の不一致 bypass を封じる）。 */
  actorIsAi?: boolean;
}

/** 6 書込地点の fault injection ポイント（Codex PR#60 R2 P2-3）。 */
export type LeadConvertFailpoint = 'customer' | 'deal' | 'timeline' | 'lead' | 'history' | 'audit';

export type LeadConvertResult =
  | { kind: 'created'; customerId: string }
  | { kind: 'already'; customerId: string }
  | { kind: 'not-found' }
  /** 既存 link（customerId/dealId）が別 tenant / dangling / 片側欠落 / 別 Lead backlink = fail-closed。 */
  | { kind: 'inconsistent' }
  /** AI/非人間 主体（実確定不可）。 */
  | { kind: 'forbidden' };

export interface LeadConvertOptions {
  /** test-only: FOR UPDATE ロック取得の直前に await する（真の barrier 同期用・Codex PR#60 R2 P2-2）。 */
  __beforeLockForTest?: () => Promise<void>;
  /** test-only: 指定書込地点の直後に例外を注入し全 rollback を検証（6 地点・Codex PR#60 R2 P2-3）。 */
  __faultAfterForTest?: (point: LeadConvertFailpoint) => void;
}

/** 既存 link（lead.customerId/dealId）が完全整合か検証する（tx / prisma いずれでも動く db を注入）。
 *  整合条件: customerId と dealId が両方存在し、同一 tenant の Customer が実在、Deal が
 *  `id=dealId, tenantId, customerId=lead.customerId, leadId=lead.id`（相互 backlink 一致）で実在。
 *  片側欠落・別 tenant・dangling・別 Lead を指す Deal（backlink 不一致）は不整合。 */
export async function isLeadLinkConsistent(
  db: {
    customer: { findFirst(args: unknown): Promise<{ id: string } | null> };
    deal: { findFirst(args: unknown): Promise<{ id: string } | null> };
  },
  tenantId: string,
  lead: { id: string; customerId: string | null; dealId: string | null },
): Promise<boolean> {
  if (!lead.customerId || !lead.dealId) return false;
  const linkedCustomer = await db.customer.findFirst({ where: { id: lead.customerId, tenantId }, select: { id: true } });
  if (!linkedCustomer) return false;
  // Deal.leadId は nullable・非 unique のため、同一 Customer に加えて **backlink（leadId=lead.id）** も照合する
  // （同一 tenant の別 Lead を指す Deal を整合済みと誤認しない・Codex PR#60 R2 P2-1）。
  const linkedDeal = await db.deal.findFirst({
    where: { id: lead.dealId, tenantId, customerId: lead.customerId, leadId: lead.id },
    select: { id: true },
  });
  return !!linkedDeal;
}

/** リードを商談化し、Customer / Deal / Timeline / Lead更新 / StageHistory / Audit を単一 tx で確定する。
 *  堅牢化（Codex CODEX_CHANGE_REQUEST_V80_LEAD_CONVERT_R1 / PR#60 R2）:
 *   - **High**: 非人間（AI/混在ロール）は実確定を持たない → DB 接触前に一律拒否（監査を人間として記録しない）。
 *   - **P2**: 既存 link は tenant + Customer 実在 + Deal の相互 backlink（leadId 一致）まで検証し、
 *     不整合は `inconsistent` で fail-closed（foreign ID を返さず越境表示・重複を生まない）。
 *   - リード行を FOR UPDATE でロックし同時商談化を直列化、ロック後に link を再読取して冪等に収束。 */
export async function convertLeadToCustomer(
  actor: LeadConvertActor,
  leadId: string,
  opts: LeadConvertOptions = {},
): Promise<LeadConvertResult> {
  if (actor.actorIsAi) return { kind: 'forbidden' };

  return prisma.$transaction(async (tx) => {
    // 真の barrier 同期用フック（本番不到達）: ロック取得前に全並行 tx を揃える。
    if (opts.__beforeLockForTest) await opts.__beforeLockForTest();
    // 同一リードへの並行商談化を直列化（FOR UPDATE）。後続 tx は先行 commit の link を必ず見る。
    await tx.$queryRaw`SELECT id FROM "LocalBusinessLead" WHERE id = ${leadId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const lead = await tx.localBusinessLead.findFirst({ where: { id: leadId, tenantId: actor.tenantId } });
    if (!lead) return { kind: 'not-found' as const };

    if (lead.customerId || lead.dealId) {
      // 既に何らかの link あり = 既変換扱いだが、整合性（tenant + backlink 一致）を検証してから収束する。
      const consistent = await isLeadLinkConsistent(tx, actor.tenantId, lead);
      if (!consistent) return { kind: 'inconsistent' as const };
      return { kind: 'already' as const, customerId: lead.customerId! };
    }

    const fault = (p: LeadConvertFailpoint) => {
      if (opts.__faultAfterForTest) opts.__faultAfterForTest(p);
    };

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
    fault('customer');

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
    fault('deal');

    await tx.customerTimelineEvent.create({
      data: { tenantId: actor.tenantId, customerId: customer.id, type: 'deal', title: 'LeadMapから商談化', body: `新規開拓リードを顧客・案件に連携しました。`, actorId: actor.userId },
    });
    fault('timeline');

    await tx.localBusinessLead.update({
      where: { id: lead.id },
      data: { customerId: customer.id, dealId: deal.id, stage: 'APPOINTMENT' },
    });
    fault('lead');

    await tx.leadPipelineStageHistory.create({
      data: { tenantId: actor.tenantId, leadId: lead.id, fromStage: lead.stage, toStage: 'APPOINTMENT', note: '商談化（CRM連携）', changedById: actor.userId },
    });
    fault('history');

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
    fault('audit');

    return { kind: 'created' as const, customerId: customer.id };
  });
}
