import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { assertCanViewConfidential, PolicyDenied } from '@/lib/security/policy';
import { canSeeCustomerLabel } from '@/lib/security/customer-visibility';
import { toNumber } from '@/lib/utils';
import { PrintButton } from '@/components/print-button';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP-4（roadmap65）: 印刷画面にも請求詳細（/invoices/[id]）と同じ財務機密 ABAC を
  // データ取得前に適用する（fetch-then-assert にしない・拒否閲覧者に ID の存在有無も返さない）。
  // 存在確認は id のみの envelope で行い、実在しない ID には confidential_view の allow 記録を残さない。
  const envelope = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  try {
    await assertCanViewConfidential(user, {
      dataType: 'invoice',
      label: 'FINANCIAL_CONFIDENTIAL',
      entityType: 'Invoice',
      entityId: id,
      purpose: '請求書の印刷表示',
      skipViewLog: !envelope,
    });
  } catch (e) {
    if (e instanceof PolicyDenied) {
      return (
        <AccessDenied
          title="請求書の印刷"
          reason={e.decision.reason}
          needsReason={e.decision.requiredSensitiveAccessReason}
        />
      );
    }
    throw e;
  }
  if (!envelope) notFound();
  const [invoice, tenant] = await Promise.all([
    // 顧客は宛先表示の name と可視判定の label のみ取得（連絡先等 PII の over-fetch 防止）。
    prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId }, include: { lineItems: true, customer: { select: { name: true, label: true } } } }),
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
  ]);
  if (!invoice) notFound();
  // 宛先も CRM の閲覧境界（WIP1）に従う（quote 側と対称・不可視は「宛先未設定」と区別不能でオラクルにならない）。
  const customerName =
    invoice.customer && hasPermission(user, 'customer', 'read') && canSeeCustomerLabel(user.roles, invoice.customer.label)
      ? invoice.customer.name
      : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 print:hidden">
        <Link href={`/invoices/${invoice.id}`} className="text-sm text-primary hover:underline">← 請求詳細へ戻る</Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[800px] px-10 py-10">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-[0.3em]">請 求 書</h1>

        <div className="flex items-end justify-between">
          <div className="w-1/2">
            <div className="border-b-2 border-slate-800 pb-1 text-lg font-semibold">{customerName ?? '（宛先未設定）'} 御中</div>
            <p className="mt-3 text-sm">下記のとおりご請求申し上げます。</p>
            <table className="mt-3 text-sm">
              <tbody>
                <tr><td className="pr-3 text-slate-500">請求番号</td><td className="font-mono">{invoice.number}</td></tr>
                <tr><td className="pr-3 text-slate-500">発行日</td><td>{formatDate(invoice.issueDate ?? invoice.createdAt)}</td></tr>
                <tr><td className="pr-3 text-slate-500">支払期日</td><td>{formatDate(invoice.dueDate)}</td></tr>
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

        <div className="mt-6 flex items-center gap-3 border-y-2 border-slate-800 py-2">
          <span className="text-sm text-slate-500">ご請求金額（税込）</span>
          <span className="text-2xl font-bold">{formatJpy(toNumber(invoice.total))}</span>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-left">品目</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right">数量</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right">単価</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="border border-slate-300 px-2 py-1.5">{li.name}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{toNumber(li.quantity)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatJpy(toNumber(li.unitPrice))}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatJpy(toNumber(li.amount))}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - invoice.lineItems.length) }).map((_, i) => (
              <tr key={`e-${i}`}>
                <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <table className="w-72 text-sm">
            <tbody>
              <tr><td className="px-2 py-1 text-slate-500">小計</td><td className="px-2 py-1 text-right">{formatJpy(toNumber(invoice.subtotal))}</td></tr>
              <tr><td className="px-2 py-1 text-slate-500">消費税</td><td className="px-2 py-1 text-right">{formatJpy(toNumber(invoice.taxAmount))}</td></tr>
              <tr className="border-t-2 border-slate-800"><td className="px-2 py-1.5 font-semibold">合計（税込）</td><td className="px-2 py-1.5 text-right text-lg font-bold">{formatJpy(toNumber(invoice.total))}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded border border-slate-300 p-3 text-xs">
          <div className="font-semibold text-slate-600">お振込先</div>
          <p className="mt-1">北海道銀行 札幌中央支店 普通 1234567 カ）{tenant?.name ?? ''}</p>
          <p className="text-slate-500">※ 振込手数料は御社負担にてお願いいたします。お支払期日: {formatDate(invoice.dueDate)}</p>
        </div>

        <div className="mt-10 text-center text-[10px] text-slate-400 print:hidden">
          ※ ブラウザの「印刷」→「PDFで保存」でPDF出力できます（A4縦推奨）。
        </div>
      </div>
    </div>
  );
}
