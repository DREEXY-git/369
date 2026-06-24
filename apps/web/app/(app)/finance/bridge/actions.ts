'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import {
  bridgeEventProjectToFinance,
  bridgePurchaseOrderToFinance,
  bridgeDamageChargeToInvoiceCandidate,
  requestJournalFinalize,
  requestInvoiceSend,
} from '@/lib/domains/finance/finance-bridge';

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
