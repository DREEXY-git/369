// EventProject の Planning Hokko Golden Path 状態を、既存モデル横断で集約するクエリ。Phase 1-11。
// 純粋な進捗判定は @hokko/shared の computeGoldenPath に委譲（ここは集約のみ）。
// 新規DBモデルは追加しない（FinanceEvent.sourceType/sourceId と InvoiceCandidate.invoiceId で連結）。
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { computeGoldenPath, type GoldenPathResult, type ConfidentialityLabel } from '@hokko/shared';

export interface EventGoldenPathStatus {
  result: GoldenPathResult;
  customerId: string | null;
  customerName: string | null;
  bridged: boolean;
  invoiceCandidateId: string | null;
  invoiceCandidateStatus: string | null;
  invoiceId: string | null;
  invoiceStatus: string | null;
  paidAmount: number;
  invoiceTotal: number;
}

/**
 * EventProject の Golden Path 進捗・次アクション・関連請求/入金状態を集約。
 * visibleCustomerLabels: 閲覧者が見てよい顧客ラベル集合（customer-visibility.ts・WIP-6/roadmap67）。
 * 集合外ラベルの顧客は customerName を null にする（customerId は進捗判定用に保持）。
 * 省略時は fail-closed（顧客名を返さない）。
 */
export async function getEventGoldenPathStatus(
  tenantId: string,
  eventId: string,
  visibleCustomerLabels: readonly ConfidentialityLabel[] = [],
): Promise<EventGoldenPathStatus | null> {
  const event = await prisma.eventProject.findFirst({
    where: { id: eventId, tenantId },
    include: {
      _count: { select: { productUsages: true, logisticsTasks: true, staffAssignments: true, risks: true, costs: true, grossSnapshots: true } },
    },
  });
  if (!event) return null;

  // 顧客・ブリッジ済み・請求候補・正式請求書 を横断取得（EventProject 由来でたどる）。
  const [customer, eventRevenueFe, candidate] = await Promise.all([
    event.customerId && visibleCustomerLabels.length
      ? prisma.customer.findFirst({
          // 可視ラベルのみ name を取得（不可視は null 扱い・取得段階遮断）。
          where: { id: event.customerId, tenantId, label: { in: [...visibleCustomerLabels] } },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    prisma.financeEvent.findFirst({ where: { tenantId, sourceType: 'EventProject', sourceId: eventId, type: 'event_revenue' }, select: { id: true } }),
    prisma.invoiceCandidate.findFirst({ where: { tenantId, sourceType: 'EventProject', sourceId: eventId }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, invoiceId: true } }),
  ]);

  const bridged = eventRevenueFe != null;
  const invoiceId = candidate?.invoiceId ?? null;
  const invoice = invoiceId
    ? await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { status: true, paidAmount: true, total: true } })
    : null;

  const revenue = toNumber(event.revenue);
  const cost = Math.max(toNumber(event.cost), 0);
  const result = computeGoldenPath({
    hasCustomer: event.customerId != null,
    productUsageCount: event._count.productUsages,
    logisticsTaskCount: event._count.logisticsTasks,
    staffCount: event._count.staffAssignments,
    riskCount: event._count.risks,
    costRecorded: event._count.costs > 0 || cost > 0,
    revenue,
    cost,
    grossSnapshotCount: event._count.grossSnapshots,
    bridged,
    invoiceCandidateStatus: candidate?.status ?? null,
    invoiceStatus: invoice?.status ?? null,
    paidAmount: toNumber(invoice?.paidAmount ?? 0),
    invoiceTotal: toNumber(invoice?.total ?? 0),
  });

  return {
    result,
    customerId: event.customerId ?? null,
    customerName: customer?.name ?? null,
    bridged,
    invoiceCandidateId: candidate?.id ?? null,
    invoiceCandidateStatus: candidate?.status ?? null,
    invoiceId,
    invoiceStatus: invoice?.status ?? null,
    paidAmount: toNumber(invoice?.paidAmount ?? 0),
    invoiceTotal: toNumber(invoice?.total ?? 0),
  };
}
