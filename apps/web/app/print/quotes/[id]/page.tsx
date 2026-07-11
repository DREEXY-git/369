import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PrintButton } from '@/components/print-button';
import { AccessDenied } from '@/components/access-denied';
import { formatJpy, formatDate } from '@hokko/shared';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';

export const dynamic = 'force-dynamic';

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // WIP-4（roadmap65）: 印刷画面も詳細と同じページ基礎権限（quote:read）をデータ取得前に適用。
  if (!hasPermission(user, 'quote', 'read')) {
    return <AccessDenied title="見積書の印刷" reason="見積の閲覧には見積の閲覧権限（quote:read）が必要です" />;
  }
  const [quote, tenant] = await Promise.all([
    prisma.quote.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { lineItems: true, deal: true },
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
  ]);
  if (!quote) notFound();

  // v5.8 Medium-4 修正: 宛先（顧客名）は取得段階から遮断（権限なし= select しない・
  // 権限あり= label 条件付き別クエリ。不可視は「宛先未設定」と区別不能でオラクルにならない）。
  let customer: { name: string } | null = null;
  const linkedCustomerId = quote.deal?.customerId ?? quote.customerId;
  if (linkedCustomerId && hasPermission(user, 'customer', 'read')) {
    customer = await prisma.customer.findFirst({
      where: { id: linkedCustomerId, tenantId: user.tenantId, label: { in: visibleCustomerLabels(user.roles) } },
      select: { name: true },
    });
  }
  const subtotal = toNumber(quote.subtotal);
  const discounted = Math.round(subtotal * (1 - toNumber(quote.discountRate) / 100));
  const tax = toNumber(quote.total) - discounted;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 操作バー（印刷時は非表示） */}
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 print:hidden">
        <Link href={`/quotes/${quote.id}`} className="text-sm text-primary hover:underline">← 見積詳細へ戻る</Link>
        <PrintButton />
      </div>

      {/* 見積書本体 */}
      <div className="mx-auto max-w-[800px] px-10 py-10">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-[0.3em]">御 見 積 書</h1>

        <div className="flex items-end justify-between">
          <div className="w-1/2">
            <div className="border-b-2 border-slate-800 pb-1 text-lg font-semibold">
              {customer?.name ?? '（宛先未設定）'} 御中
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              下記のとおりお見積り申し上げます。
            </p>
            <table className="mt-3 text-sm">
              <tbody>
                <tr><td className="pr-3 text-slate-500">見積番号</td><td className="font-mono">{quote.number}</td></tr>
                <tr><td className="pr-3 text-slate-500">発行日</td><td>{formatDate(quote.createdAt)}</td></tr>
                <tr><td className="pr-3 text-slate-500">有効期限</td><td>{formatDate(quote.validUntil)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="w-2/5 text-sm">
            <div className="font-semibold">{tenant?.name ?? '発行元'}</div>
            <div className="mt-1 text-slate-600">北海道札幌市</div>
            <div className="text-slate-600">担当: {user.name}</div>
            <div className="mt-4 flex justify-end">
              <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">
                印
              </div>
            </div>
          </div>
        </div>

        {/* 合計（強調） */}
        <div className="mt-6 flex items-center gap-3 border-y-2 border-slate-800 py-2">
          <span className="text-sm text-slate-500">御見積金額（税込）</span>
          <span className="text-2xl font-bold">{formatJpy(toNumber(quote.total))}</span>
          <span className="ml-auto text-sm text-slate-500">{quote.title}</span>
        </div>

        {/* 明細 */}
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
            {quote.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="border border-slate-300 px-2 py-1.5">{li.name}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{toNumber(li.quantity)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatJpy(toNumber(li.unitPrice))}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatJpy(toNumber(li.amount))}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - quote.lineItems.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
                <td className="border border-slate-300 px-2 py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 合計欄 */}
        <div className="mt-3 flex justify-end">
          <table className="w-72 text-sm">
            <tbody>
              <tr><td className="px-2 py-1 text-slate-500">小計</td><td className="px-2 py-1 text-right">{formatJpy(subtotal)}</td></tr>
              {toNumber(quote.discountRate) > 0 ? (
                <tr><td className="px-2 py-1 text-slate-500">値引き（{toNumber(quote.discountRate)}%）</td><td className="px-2 py-1 text-right">-{formatJpy(subtotal - discounted)}</td></tr>
              ) : null}
              <tr><td className="px-2 py-1 text-slate-500">消費税（{toNumber(quote.taxRate)}%）</td><td className="px-2 py-1 text-right">{formatJpy(tax)}</td></tr>
              <tr className="border-t-2 border-slate-800"><td className="px-2 py-1.5 font-semibold">合計（税込）</td><td className="px-2 py-1.5 text-right text-lg font-bold">{formatJpy(toNumber(quote.total))}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          <div className="font-semibold text-slate-600">備考</div>
          <p className="mt-1">・本見積書の有効期限は {formatDate(quote.validUntil)} です。</p>
          <p>・金額は税込表示です。記載のない費用は別途お見積りいたします。</p>
        </div>

        <div className="mt-10 text-center text-[10px] text-slate-400 print:hidden">
          ※ ブラウザの「印刷」→「PDFで保存」でPDF出力できます（A4縦推奨）。
        </div>
      </div>
    </div>
  );
}
