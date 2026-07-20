import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { AccessDenied } from '@/components/access-denied';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Table, Th, Td, Badge, Button, Input, Stat, EmptyState } from '@/components/ui';
import {
  issueInvoiceAction,
  recordPaymentAction,
  requestInvoiceExternalSendApprovalAction,
  executeApprovedInvoiceExternalSendAction,
  createDunningDraftAction,
  requestDunningSendApprovalAction,
  executeApprovedDunningSendAction,
  issueReceiptAction,
  requestInvoiceVoidApprovalAction,
} from '../actions';
import { PaymentIdempotencyKeyField } from '../idempotency-key-field';
import { canIssueReceipt } from '@hokko/shared';
import { getDunningContext } from '@/lib/domains/finance/dunning';
import { formatJpy, formatDate, formatDateTime, isOverdue, canSendInvoice } from '@hokko/shared';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'slate', ISSUED: 'blue', SENT: 'blue', PARTIALLY_PAID: 'amber', PAID: 'green', OVERDUE: 'red', VOID: 'slate',
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // ABAC: 請求は財務機密。WIP-4（roadmap65）で判定を fetch より前に移動した
  // （fetch-then-assert の解消・拒否される閲覧者に対しては ID の存在有無も返さない）。
  // label は固定の FINANCIAL_CONFIDENTIAL のため行本体の取得なしで判定できる。
  // 存在確認は id のみの envelope で行い、実在しない ID には confidential_view の
  // allow 記録を残さない（skipViewLog・監査ログの偽陽性防止）。判定は notFound より先
  // （拒否閲覧者には存在有無を返さない）。
  const envelope = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  try {
    await assertCanViewConfidential(user, {
      dataType: 'invoice',
      label: 'FINANCIAL_CONFIDENTIAL',
      entityType: 'Invoice',
      entityId: id,
      purpose: '請求詳細の閲覧',
      skipViewLog: !envelope,
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="請求詳細"
          reason={e.decision.reason}
          needsReason={e.decision.requiredSensitiveAccessReason}
          breadcrumb={[{ label: '請求', href: '/invoices' }]}
        />
      );
    }
    throw e;
  }
  if (!envelope) notFound();
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenantId },
    // 顧客は宛先表示の name と可視判定の label のみ取得（連絡先等 PII の over-fetch 防止）。
    include: { lineItems: true, payments: { orderBy: { paidAt: 'desc' } }, customer: { select: { name: true, label: true } }, receivable: true, quote: { select: { id: true, number: true } }, receipt: { select: { id: true, number: true } } },
  });
  if (!invoice) notFound();
  const canUpdate = hasPermission(user, 'invoice', 'update');
  const overdue = isOverdue(invoice.dueDate, invoice.status);
  const outstanding = toNumber(invoice.total) - toNumber(invoice.paidAmount);
  // 宛先（顧客名）も CRM の閲覧境界（WIP1）に従う: 財務 ABAC 通過者でも、顧客ラベルが
  // 不可視（例: ADMIN/EXTERNAL_EXPERT に対する STRICT_SECRET/EXECUTIVE_ONLY）なら表示しない
  // （quote 側と対称・roadmap65 追補で §2-4 の判断を改訂）。
  const customerName =
    invoice.customer && hasPermission(user, 'customer', 'read') && canSeeCustomerLabel(user.roles, invoice.customer.label)
      ? invoice.customer.name
      : '';

  // 送信承認の状態（承認済みかつ未実行なら送信実行可能）と関連 FinanceEvent、VOID申請の有無。
  const [sendApproval, financeEvents, voidPending] = await Promise.all([
    prisma.approvalRequest.findFirst({
      where: { tenantId: user.tenantId, entityType: 'Invoice', entityId: invoice.id, requestedForAction: 'invoice_send' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.financeEvent.findMany({ where: { tenantId: user.tenantId, sourceType: 'Invoice', sourceId: invoice.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.approvalRequest.findFirst({
      where: { tenantId: user.tenantId, type: 'invoice_void', entityId: invoice.id, status: 'PENDING' },
      select: { id: true },
    }),
  ]);
  // 未入金（paidAmount=0）かつ発行済み（DRAFT/VOID/PAID 以外）のみ VOID 申請可能（承認必須・AI不可）。
  const voidable = toNumber(invoice.paidAmount) === 0 && !['DRAFT', 'VOID', 'PAID'].includes(invoice.status);
  const canSend = canSendInvoice(invoice.status);
  const sendApproved = sendApproval?.status === 'APPROVED' && !sendApproval.executedAt;
  const sendPending = sendApproval?.status === 'PENDING';

  // 督促（お支払い状況の確認）。未回収/延滞のみ。invoice:update に加え finance:read を必須化
  // （STAFF は invoice:update を持つが finance:read を持たないため非表示。server action 側でも同条件で遮断）。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const dunning = canUpdate && canViewFinance ? await getDunningContext({ tenantId: user.tenantId, userId: user.userId }, invoice.id) : null;

  return (
    <div>
      <PageHeader
        title={`${invoice.number}`}
        description={customerName}
        breadcrumb={[{ label: '請求', href: '/invoices' }, { label: invoice.number, href: '#' }]}
        action={
          <div className="flex items-center gap-3">
            <Badge tone={overdue && invoice.status !== 'PAID' ? 'red' : STATUS_TONE[invoice.status] ?? 'slate'}>{overdue && invoice.status !== 'PAID' ? 'OVERDUE' : invoice.status}</Badge>
            <Link href={`/print/invoices/${invoice.id}`} target="_blank"><Button variant="outline">印刷 / PDF</Button></Link>
          </div>
        }
      />

      {/* P3-Q2C: この請求書が見積から生成された場合、生成元見積への逆リンク（見積↔請求の往復導線）。 */}
      {invoice.quote ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-secondary/40 px-3 py-2 text-sm" data-testid="invoice-source-quote">
          この請求書は見積
          <Link href={`/quotes/${invoice.quote.id}`} className="font-medium underline" data-testid="invoice-source-quote-link">
            {invoice.quote.number}
          </Link>
          から作成されました。
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="合計(税込)" value={formatJpy(toNumber(invoice.total))} />
        <Stat label="入金済" value={formatJpy(toNumber(invoice.paidAmount))} tone="green" />
        <Stat label="未収" value={formatJpy(outstanding)} tone={outstanding > 0 ? 'amber' : 'green'} />
        <Stat label="支払期日" value={formatDate(invoice.dueDate)} tone={overdue ? 'red' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>明細</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <thead><tr><Th>品目</Th><Th>数量</Th><Th>単価</Th><Th>金額</Th></tr></thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <Td>{li.name}</Td>
                    <Td>{toNumber(li.quantity)}</Td>
                    <Td>{formatJpy(toNumber(li.unitPrice))}</Td>
                    <Td className="font-medium">{formatJpy(toNumber(li.amount))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-3 flex flex-col items-end gap-0.5 text-sm">
              <div>小計: {formatJpy(toNumber(invoice.subtotal))}</div>
              <div>消費税: {formatJpy(toNumber(invoice.taxAmount))}</div>
              <div className="text-base font-bold">合計: {formatJpy(toNumber(invoice.total))}</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {invoice.status === 'DRAFT' ? (
            <Card>
              <CardHeader><CardTitle>発行</CardTitle></CardHeader>
              <CardContent>
                <form action={issueInvoiceAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" className="w-full" disabled={!canUpdate}>請求書を発行（送付承認へ）</Button>
                </form>
                <p className="mt-1 text-[11px] text-muted-foreground">発行で売掛が起票され、送付は承認を経て行います。</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>外部送信（承認必須）</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!canSend ? (
                <Badge tone="green">送信済み（{invoice.status}）</Badge>
              ) : sendApproved ? (
                <form action={executeApprovedInvoiceExternalSendAction}>
                  <input type="hidden" name="approvalId" value={sendApproval!.id} />
                  <Button type="submit" className="w-full" disabled={!canUpdate}>承認済み — 請求書を送信</Button>
                </form>
              ) : sendPending ? (
                <Badge tone="amber">送信承認待ち（/approvals）</Badge>
              ) : (
                <form action={requestInvoiceExternalSendApprovalAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="outline" className="w-full" disabled={!canUpdate || invoice.status === 'DRAFT'}>送信を申請（承認後に送信）</Button>
                </form>
              )}
              <p className="text-[11px] text-muted-foreground">送信は承認後のみ。送信前にPIIマスク。AIは直接送信しません。{invoice.status === 'DRAFT' ? '（先に発行してください）' : ''}</p>
            </CardContent>
          </Card>

          {/* Wave2: 請求書VOID（無効化）。未入金の誤発行のみ・承認必須・AIは不可。実際の無効化は承認で実行。 */}
          {canViewFinance && (invoice.status === 'VOID' || voidPending || voidable) ? (
            <Card data-testid="invoice-void">
              <CardHeader><CardTitle>請求書VOID（無効化・承認必須）</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {invoice.status === 'VOID' ? (
                  <Badge tone="slate" data-testid="invoice-void-done">無効化済み（VOID）</Badge>
                ) : voidPending ? (
                  <Badge tone="amber" data-testid="invoice-void-pending">VOID承認待ち（/approvals）</Badge>
                ) : (
                  <form action={requestInvoiceVoidApprovalAction}>
                    <input type="hidden" name="id" value={invoice.id} />
                    <Button type="submit" variant="outline" className="w-full" disabled={!canUpdate} data-testid="invoice-void-request">誤発行のため無効化を申請</Button>
                  </form>
                )}
                <p className="text-[11px] text-muted-foreground">未入金の誤発行請求書のみ対象。承認後に請求書を無効化し、売掛・入金予定を取り消します（AIは無効化しません）。</p>
              </CardContent>
            </Card>
          ) : null}

          {invoice.status !== 'PAID' && invoice.status !== 'DRAFT' ? (
            <Card>
              <CardHeader><CardTitle>入金記録</CardTitle></CardHeader>
              <CardContent>
                {overdue ? <p className="mb-2 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">⚠️ 支払期日を過ぎています（延滞）。入金があれば記録してください。</p> : null}
                <form action={recordPaymentAction} className="space-y-2">
                  <input type="hidden" name="id" value={invoice.id} />
                  <PaymentIdempotencyKeyField />
                  <Input name="amount" type="number" placeholder={`未収 ${outstanding}`} defaultValue={outstanding} disabled={!canUpdate} />
                  <Button type="submit" variant="secondary" className="w-full" disabled={!canUpdate}>入金を記録</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {dunning && dunning.eligible ? (
            <Card id="dunning" className="scroll-mt-4 border-amber-200">
              <CardHeader><CardTitle>入金確認・督促（お支払い状況の確認）</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/* P3-Q2C-C: 督促の段数（送信ごとに丁寧に強め・最大3・威圧なし）。 */}
                <div><Badge tone={dunning.stage >= 3 ? 'red' : dunning.stage === 2 ? 'amber' : 'slate'} data-testid="dunning-stage">第{dunning.stage}段: {dunning.stageLabel}</Badge></div>
                <p className="text-xs text-muted-foreground">未回収 {formatJpy(dunning.outstanding)}。外部送信は必ず承認後（AIは送信しません）。督促メールの実送信は EXTERNAL_SEND_ENABLED 有効時のみ、無効時は記録（ログ）のみ。</p>
                {dunning.recipient ? null : (
                  <p className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">送信先メールアドレスが未登録です（下書き作成・申請は可能ですが、送信は実行できません）。</p>
                )}
                {!dunning.reminder ? (
                  <form action={createDunningDraftAction}>
                    <input type="hidden" name="id" value={invoice.id} />
                    <Button type="submit" variant="outline" className="w-full" disabled={!canUpdate}>お支払い状況の確認文面（下書き）を作成</Button>
                  </form>
                ) : (
                  <>
                    {dunning.draft ? <div className="text-xs font-medium">件名: {dunning.draft.subject}</div> : null}
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-secondary/30 p-2 text-xs">{dunning.reminder.draftMessage}</pre>
                    {dunning.reminder.status === 'sent' || dunning.reminder.status === 'logged' ? (
                      <Badge tone="green">督促を{dunning.reminder.status === 'sent' ? '送信済み' : '記録済み（送信ログ）'}</Badge>
                    ) : dunning.approvedApprovalId ? (
                      <form action={executeApprovedDunningSendAction}>
                        <input type="hidden" name="approvalId" value={dunning.approvedApprovalId} />
                        <Button type="submit" className="w-full" disabled={!canUpdate || !dunning.recipient}>承認済み — 督促を送信/記録</Button>
                      </form>
                    ) : dunning.pendingApprovalId ? (
                      <Badge tone="amber">督促送信承認待ち（/approvals）</Badge>
                    ) : (
                      <form action={requestDunningSendApprovalAction}>
                        <input type="hidden" name="id" value={invoice.id} />
                        <input type="hidden" name="reminderId" value={dunning.reminder.id} />
                        <Button type="submit" variant="outline" className="w-full" disabled={!canUpdate}>送信承認を申請</Button>
                      </form>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>入金履歴</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {invoice.payments.length === 0 ? <EmptyState title="入金なし" /> : invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between"><span>{formatJpy(toNumber(p.amount))}（{p.method}）</span><span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span></div>
              ))}
            </CardContent>
          </Card>

          {/* P3-Q2C-A: 領収書。PAID のみ発行可。発行済みは番号＋印刷導線。外部送信・課金なし。 */}
          {canViewFinance && (canIssueReceipt(invoice.status) || invoice.receipt) ? (
            <Card id="receipt" className="scroll-mt-4">
              <CardHeader><CardTitle>領収書</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {invoice.receipt ? (
                  <div className="flex flex-wrap items-center gap-2" data-testid="invoice-receipt">
                    <Badge tone="green">発行済み</Badge>
                    <span className="font-medium">{invoice.receipt.number}</span>
                    <Link href={`/print/receipts/${invoice.receipt.id}`} target="_blank" className="text-blue-700 underline" data-testid="invoice-receipt-print">印刷 / PDF</Link>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">全額入金済みの請求書から領収書を発行できます（内部記録・外部送信なし）。</p>
                    <form action={issueReceiptAction}>
                      <input type="hidden" name="id" value={invoice.id} />
                      <Button type="submit" className="w-full" disabled={!canUpdate} data-testid="invoice-issue-receipt">領収書を発行</Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {invoice.receivable ? (
            <Card>
              <CardHeader><CardTitle>売掛（回収）</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <Badge tone={invoice.receivable.status === 'collected' ? 'green' : overdue ? 'red' : 'amber'}>{invoice.receivable.status}</Badge>
                <div className="mt-1 text-xs text-muted-foreground">期日: {formatDate(invoice.receivable.dueDate)}</div>
              </CardContent>
            </Card>
          ) : null}

          {financeEvents.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>関連 FinanceEvent</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                {financeEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span><Badge tone={e.direction === 'inflow' ? 'green' : e.direction === 'outflow' ? 'amber' : 'slate'}>{e.type}</Badge> <span className="text-muted-foreground">{e.status}</span></span>
                    <span className="text-muted-foreground">{formatJpy(toNumber(e.amount))} / {formatDateTime(e.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
