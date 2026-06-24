'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { executeApprovedAction } from '@/lib/approval';
import {
  bridgeEventProjectToFinance,
  bridgePurchaseOrderToFinance,
  bridgeDamageChargeToInvoiceCandidate,
  requestJournalFinalize,
  requestInvoiceSend,
} from '@/lib/domains/finance/finance-bridge';
import { finalizeJournalCandidate, finalizeInvoiceCandidate } from '@/lib/domains/finance/formalize';

// Server Action は薄く（認証→権限→取得→検証→lib呼び出し→redirect）。ロジックは finance-bridge.ts。

export async function createFinanceBridgeFromEventProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/bridge?denied=1');
  const eventId = String(formData.get('eventId') ?? '');
  if (!eventId) redirect('/finance/bridge?error=input');
  await bridgeEventProjectToFinance({ tenantId: user.tenantId, userId: user.userId }, eventId);
  revalidatePath('/finance/bridge');
  redirect('/finance/bridge?bridged=event');
}

export async function createFinanceBridgeFromPurchaseOrderAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/bridge?denied=1');
  const poId = String(formData.get('purchaseOrderId') ?? '');
  if (!poId) redirect('/finance/bridge?error=input');
  await bridgePurchaseOrderToFinance({ tenantId: user.tenantId, userId: user.userId }, poId);
  revalidatePath('/finance/bridge');
  redirect('/finance/bridge?bridged=po');
}

export async function createInvoiceCandidateFromDamageChargeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/bridge?denied=1');
  const damageId = String(formData.get('damageId') ?? '');
  if (!damageId) redirect('/finance/bridge?error=input');
  await bridgeDamageChargeToInvoiceCandidate({ tenantId: user.tenantId, userId: user.userId }, damageId);
  revalidatePath('/finance/bridge');
  redirect('/finance/bridge?bridged=damage');
}

export async function requestJournalFinalizeApprovalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/journal-candidates?denied=1');
  const candidateId = String(formData.get('candidateId') ?? '');
  if (!candidateId) redirect('/finance/journal-candidates?error=input');
  await requestJournalFinalize({ tenantId: user.tenantId, userId: user.userId }, candidateId);
  revalidatePath('/finance/journal-candidates');
  redirect('/finance/journal-candidates?requested=1');
}

export async function requestInvoiceSendApprovalAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/invoice-candidates?denied=1');
  const candidateId = String(formData.get('candidateId') ?? '');
  if (!candidateId) redirect('/finance/invoice-candidates?error=input');
  await requestInvoiceSend({ tenantId: user.tenantId, userId: user.userId }, candidateId);
  revalidatePath('/finance/invoice-candidates');
  redirect('/finance/invoice-candidates?requested=1');
}

// ===== 候補→正式化（承認後実行・二重実行防止）— Phase 1-9 =====

/** 承認済み仕訳候補を正式 JournalEntry へ変換。 */
export async function executeApprovedJournalFinalizeAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/journal-candidates?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({ where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'journal_finalize' } });
  if (!req) redirect('/finance/journal-candidates?error=notfound');
  const candidateId = String((req!.payloadAfter as { candidateId?: string } | null)?.candidateId ?? req!.entityId);

  let reason: string | undefined;
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        const res = await finalizeJournalCandidate({ tenantId: user.tenantId, userId: user.userId }, candidateId);
        if (!res.ok) throw new Error(res.reason ?? 'formalize-failed');
        return res;
      },
      { executedById: user.userId },
    );
    if (!r.executed) reason = r.reason;
  } catch (e) {
    reason = e instanceof Error ? e.message : 'error';
  }
  if (reason) redirect(`/finance/journal-candidates?error=${encodeURIComponent(reason)}`);
  redirect('/finance/journal-candidates?posted=1');
}

/** 承認済み請求候補を正式 Invoice/Receivable へ変換（外部送信なし）。 */
export async function executeApprovedInvoiceSendAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'finance', 'create')) redirect('/finance/invoice-candidates?denied=1');
  const approvalId = String(formData.get('approvalId') ?? '');
  const req = await prisma.approvalRequest.findFirst({ where: { id: approvalId, tenantId: user.tenantId, requestedForAction: 'invoice_send' } });
  if (!req) redirect('/finance/invoice-candidates?error=notfound');
  const candidateId = String((req!.payloadAfter as { candidateId?: string } | null)?.candidateId ?? req!.entityId);

  let reason: string | undefined;
  try {
    const r = await executeApprovedAction(
      approvalId,
      async () => {
        const res = await finalizeInvoiceCandidate({ tenantId: user.tenantId, userId: user.userId }, candidateId);
        if (!res.ok) throw new Error(res.reason ?? 'formalize-failed');
        return res;
      },
      { executedById: user.userId },
    );
    if (!r.executed) reason = r.reason;
  } catch (e) {
    reason = e instanceof Error ? e.message : 'error';
  }
  if (reason) redirect(`/finance/invoice-candidates?error=${encodeURIComponent(reason)}`);
  redirect('/finance/invoice-candidates?formalized=1');
}
