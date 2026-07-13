import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import { toNumber } from '@/lib/utils';
import { PrintButton } from '@/components/print-button';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

// P3-Q2C-A: 領収書の印刷表示。請求書印刷と同じ財務機密 ABAC（FINANCIAL_CONFIDENTIAL）を
// データ取得前に適用する（fetch-then-assert にしない・拒否閲覧者に ID の存在有無も返さない）。
export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const envelope = await prisma.receipt.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  try {
    await assertCanViewConfidential(user, {
      dataType: 'invoice',
      label: 'FINANCIAL_CONFIDENTIAL',
      entityType: 'Receipt',
      entityId: id,
      purpose: '領収書の印刷表示',
      skipViewLog: !envelope,
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return <AccessDenied title="領収書の印刷" reason={e.decision.reason} needsReason={e.decision.requiredSensitiveAccessReason} />;
    }
    throw e;
  }
  if (!envelope) notFound();
  const [receipt, tenant] = await Promise.all([
    prisma.receipt.findFirst({ where: { id, tenantId: user.tenantId }, include: { invoice: { select: { id: true, number: true, customerId: true } } } }),
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
  ]);
  if (!receipt) notFound();
  // 宛先も取得段階から遮断（権限なし= select しない・権限あり= label 条件付き別クエリ）。
  let customerName: string | null = null;
  if (receipt.invoice.customerId && hasPermission(user, 'customer', 'read')) {
    const c = await prisma.customer.findFirst({
      where: { id: receipt.invoice.customerId, tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { name: true },
    });
    customerName = c?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 print:hidden">
        <Link href={`/invoices/${receipt.invoice.id}`} className="text-sm text-primary hover:underline">← 請求詳細へ戻る</Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[800px] px-10 py-10">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-[0.3em]">領 収 書</h1>

        <div className="flex items-end justify-between">
          <div className="w-1/2">
            <div className="border-b-2 border-slate-800 pb-1 text-lg font-semibold">{customerName ?? '（宛名未設定）'} 御中</div>
            <table className="mt-3 text-sm">
              <tbody>
                <tr><td className="pr-3 text-slate-500">領収書番号</td><td className="font-mono">{receipt.number}</td></tr>
                <tr><td className="pr-3 text-slate-500">発行日</td><td>{formatDate(receipt.issuedAt)}</td></tr>
                <tr><td className="pr-3 text-slate-500">対象請求番号</td><td className="font-mono">{receipt.invoice.number}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="w-2/5 text-sm">
            <div className="font-semibold">{tenant?.name ?? '発行元'}</div>
            <div className="mt-1 text-slate-600">北海道札幌市</div>
            <div className="text-slate-600">担当: {user.name}</div>
            <div className="mt-4 flex justify-end">
              <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">印</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 border-y-2 border-slate-800 py-3">
          <span className="text-sm text-slate-500">領収金額（税込）</span>
          <span className="text-3xl font-bold" data-testid="receipt-amount">{formatJpy(toNumber(receipt.amount))}</span>
        </div>

        <p className="mt-6 text-sm">上記正に領収いたしました。</p>
        <p className="mt-1 text-xs text-slate-500">但し 請求書 {receipt.invoice.number} の代金として（お支払方法: {receipt.method}）</p>

        <div className="mt-10 text-center text-[10px] text-slate-400 print:hidden">
          ※ ブラウザの「印刷」→「PDFで保存」でPDF出力できます（A4縦推奨）。
        </div>
      </div>
    </div>
  );
}
