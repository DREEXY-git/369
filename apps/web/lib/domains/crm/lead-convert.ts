// LeadMap リードの商談化（Customer/Deal/Timeline/Lead更新/StageHistory/Audit の原子確定）。
// Server Action（leadmap/actions.ts）はこのサービスを呼ぶだけ（docs/audit/12_maintenance_architecture.md）。
import { prisma } from '@/lib/db';
import { isHumanUser, type RoleKey } from '@hokko/shared';
import type { Prisma } from '@hokko/db';

export interface LeadConvertActor {
  tenantId: string;
  userId?: string | null;
  /** 実行主体の role 一覧（**必須**）。domain 内で `isHumanUser`（AI_AGENT/AI_ASSISTANT を1つでも
   *  含めば混在も拒否・空も拒否）により fail-closed 判定する。呼び出し側の自己申告 boolean は受けない
   *  （Codex PR#60 R3 High: optional boolean は省略/false 渡しで fail-open になるため、省略不能な
   *  信頼済み policy context として roles を要求する）。 */
  roles: RoleKey[];
}

/** domain 入口の人間判定（fail-closed）。roles が欠落/非配列/空/AI混在なら false。 */
function actorIsHuman(actor: LeadConvertActor): boolean {
  return Array.isArray(actor.roles) && isHumanUser({ roles: actor.roles });
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

export type LeadRepairResult =
  | { kind: 'repaired'; customerId: string }
  /** link が既に整合＝修復不要（冪等収束）。 */
  | { kind: 'already'; customerId: string }
  /** link なし＝修復対象外（通常の商談化を使う）。 */
  | { kind: 'not-linked' }
  | { kind: 'not-found' }
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

type LeadRow = Prisma.LocalBusinessLeadGetPayload<Record<string, never>>;

/** 商談化の 6 書込（Customer/Deal/Timeline/Lead更新/StageHistory/Audit）を呼び出し側 tx 内で確定する。
 *  convertLeadToCustomer（新規変換）と repairLeadLinks（不整合修復後の正規収束）で共用。 */
async function createConversionWritesTx(
  tx: Prisma.TransactionClient,
  actor: LeadConvertActor,
  lead: LeadRow,
  fault: (p: LeadConvertFailpoint) => void,
): Promise<string> {
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

  return customer.id;
}

/** リードを商談化し、Customer / Deal / Timeline / Lead更新 / StageHistory / Audit を単一 tx で確定する。
 *  堅牢化（Codex CODEX_CHANGE_REQUEST_V80_LEAD_CONVERT_R1 / PR#60 R2 / **R3**）:
 *   - **High（R3）**: 非人間（AI/混在ロール・roles 欠落/空）は実確定を持たない → domain 内の
 *     `isHumanUser` 判定で DB 接触前に一律拒否。省略可能な自己申告 boolean は受けない（fail-open 排除）。
 *   - **P2**: 既存 link は tenant + Customer 実在 + Deal の相互 backlink（leadId 一致）まで検証し、
 *     不整合は `inconsistent` で fail-closed（foreign ID を返さず越境表示・重複を生まない）。
 *   - リード行を FOR UPDATE でロックし同時商談化を直列化、ロック後に link を再読取して冪等に収束。 */
export async function convertLeadToCustomer(
  actor: LeadConvertActor,
  leadId: string,
  opts: LeadConvertOptions = {},
): Promise<LeadConvertResult> {
  if (!actorIsHuman(actor)) return { kind: 'forbidden' };

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
    const customerId = await createConversionWritesTx(tx, actor, lead, fault);
    return { kind: 'created' as const, customerId };
  });
}

/** 不整合 link（foreign / dangling / 片側欠落 / 別 Lead backlink）を持つリードを**人間限定**で修復する
 *  （Codex PR#60 R3 P2: 「連携をやり直す」導線の実効化）。単一 tx で:
 *   1. FOR UPDATE でリード行をロックし、不整合を**再検証**（整合済みなら no-op で `already` に冪等収束）。
 *   2. 不正 link を切離し（customerId/dealId を null 化）、検出/切離しの**修復 Audit** を記録
 *      （旧 link ID は監査 metadata にのみ保持し、UI/戻り値へは出さない＝越境実体の内容・存在を漏らさない）。
 *   3. 正規の Customer/Deal/Timeline/Lead更新/StageHistory/Audit（商談化と同一の 6 書込）へ収束。
 *  越境実体（別 tenant の Customer/Deal）には一切書き込まない。retry/並行は FOR UPDATE 直列化＋
 *  修復後の整合 link により `already` で冪等収束する。 */
export async function repairLeadLinks(
  actor: LeadConvertActor,
  leadId: string,
  opts: LeadConvertOptions = {},
): Promise<LeadRepairResult> {
  if (!actorIsHuman(actor)) return { kind: 'forbidden' };

  return prisma.$transaction(async (tx) => {
    if (opts.__beforeLockForTest) await opts.__beforeLockForTest();
    await tx.$queryRaw`SELECT id FROM "LocalBusinessLead" WHERE id = ${leadId} AND "tenantId" = ${actor.tenantId} FOR UPDATE`;
    const lead = await tx.localBusinessLead.findFirst({ where: { id: leadId, tenantId: actor.tenantId } });
    if (!lead) return { kind: 'not-found' as const };
    if (!lead.customerId && !lead.dealId) return { kind: 'not-linked' as const };

    // ロック下で再検証。整合済みなら何も変更せず冪等収束（並行修復の敗者もここへ落ちる）。
    if (await isLeadLinkConsistent(tx, actor.tenantId, lead)) {
      return { kind: 'already' as const, customerId: lead.customerId! };
    }

    // 1) 不正 link の切離し（越境実体には触れない）。旧 ID は監査 metadata にのみ残す。
    await tx.localBusinessLead.update({ where: { id: lead.id }, data: { customerId: null, dealId: null } });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorId: actor.userId ?? null,
        actorType: 'user',
        action: 'lead_link_repair',
        entityType: 'LocalBusinessLead',
        entityId: lead.id,
        summary: `リード「${lead.name}」の不整合な連携先を切離し、正規の顧客・案件へ再連携`,
        metadata: { detachedCustomerId: lead.customerId, detachedDealId: lead.dealId } as any,
      },
    });

    // 2) 正規の商談化 6 書込へ収束（fresh な Customer/Deal 1 組・相互 backlink 一致）。
    const fault = (p: LeadConvertFailpoint) => {
      if (opts.__faultAfterForTest) opts.__faultAfterForTest(p);
    };
    const customerId = await createConversionWritesTx(tx, actor, lead, fault);
    return { kind: 'repaired' as const, customerId };
  });
}
