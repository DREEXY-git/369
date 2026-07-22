import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import {
  REFERRAL_RECORD_STATUSES,
  REFERRAL_RECORD_STATUS_LABEL,
  canTransitionReferralRecord,
  summarizeReferralRecords,
  formatDate,
  type ReferralRecordStatus,
} from '@hokko/shared';
import { createReferralRecordAction, updateReferralRecordStatusAction } from './actions';

export const dynamic = 'force-dynamic';

// Phase 3.5「紹介」薄い縦切り: 受けた紹介を「受領→商談中→成約/不成立」で記録・追跡・可視化。
// 紹介元候補の分析（/growth/referral）に対し、こちらは実際の紹介の記録。schema=CustomerReferral。
// 権限: 閲覧 marketing:read / 記録 marketing:create / 状況更新 marketing:update。AI 主体は Action 側で遮断。

const STATUS_TONE: Record<ReferralRecordStatus, string> = {
  received: 'slate',
  in_progress: 'blue',
  won: 'green',
  lost: 'amber',
};

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export default async function ReferralRecordsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="紹介の記録・追跡"
        reason="紹介記録の閲覧にはマーケティング閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: '紹介・リファラル', href: '/growth/referral' }]}
      />
    );
  }
  // Codex R4-01: Action と同じ actor 判定（AI 主体＝role/isAi 不整合含む は書き込み UI を出さない）。
  const canCreate = !user.isAi && hasPermission(user, 'marketing', 'create');
  const canUpdate = !user.isAi && hasPermission(user, 'marketing', 'update');
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.created === 'string' ? '紹介を記録しました。' : typeof sp.updated === 'string' ? '状況を更新しました。' : '';
  const errorMsg =
    typeof sp.denied === 'string'
      ? '権限がありません（記録・更新にはマーケティングの作成/更新権限が必要です）。'
      : sp.error === 'input'
        ? '入力を確認してください（紹介者・紹介先は必須です）。'
        : sp.error === 'transition'
          ? 'その状態には変更できません。'
          : '';

  const records = await prisma.customerReferral.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });
  const summary = summarizeReferralRecords(
    records.map((r) => ({ status: r.status, estimatedValue: r.estimatedValue == null ? null : toNumber(r.estimatedValue) })),
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="紹介の記録・追跡"
        description="受けた紹介を「受領→商談中→成約／不成立」で記録し、成約率と見込み金額を可視化します。紹介は最も安く成約率の高いリード源です。"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/growth/referral" className="text-primary underline">← 紹介元候補の分析（誰に頼むか）へ</Link>
      </div>

      {flash ? <div className="mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{flash}</div> : null}
      {errorMsg ? <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{errorMsg}</div> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">紹介の総数</div><div className="text-2xl font-bold">{summary.total}件</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">成約率</div><div className="text-2xl font-bold">{summary.winRate}%</div><div className="text-xs text-muted-foreground">成約{summary.won} / 不成立{summary.lost}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">進行中の見込み金額</div><div className="text-2xl font-bold">{yen(summary.pipelineValue)}</div><div className="text-xs text-muted-foreground">受領{summary.received} / 商談中{summary.inProgress}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">成約した見込み金額</div><div className="text-2xl font-bold">{yen(summary.wonValue)}</div></CardContent></Card>
      </div>

      {canCreate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>紹介を記録する</CardTitle></CardHeader>
          <CardContent>
            <form action={createReferralRecordAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">紹介者（必須）</span>
                <input name="referrerName" required maxLength={100} placeholder="例: 札幌イベント企画株式会社" className="w-full rounded-md border px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">紹介先（必須）</span>
                <input name="referredName" required maxLength={100} placeholder="例: 大通フェス実行委員会" className="w-full rounded-md border px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">連絡先（任意）</span>
                <input name="referredContact" maxLength={120} placeholder="例: contact@example.jp / 011-000-0000" className="w-full rounded-md border px-3 py-2 text-sm" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">見込み金額（任意・円）</span>
                <input name="estimatedValue" type="number" min={0} step={1000} placeholder="例: 500000" className="w-full rounded-md border px-3 py-2 text-sm" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-muted-foreground">メモ（任意）</span>
                <textarea name="note" maxLength={500} rows={2} placeholder="紹介の経緯・温度感など" className="w-full rounded-md border px-3 py-2 text-sm" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">記録する</button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>紹介一覧</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {records.length === 0 ? (
            <EmptyState title="まだ紹介の記録がありません" hint="既存顧客から紹介を受けたら、上のフォームで記録して成約まで追跡しましょう。" />
          ) : (
            records.map((r) => {
              const status = r.status as ReferralRecordStatus;
              const nexts = REFERRAL_RECORD_STATUSES.filter((s) => canTransitionReferralRecord(r.status, s));
              return (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.referrerName}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{r.referredName}</span>
                    <Badge tone={STATUS_TONE[status] ?? 'slate'}>{REFERRAL_RECORD_STATUS_LABEL[status] ?? r.status}</Badge>
                    {r.estimatedValue != null ? <Badge tone="slate">見込み {yen(toNumber(r.estimatedValue))}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.referredContact ? <span className="mr-2">連絡先: {r.referredContact}</span> : null}
                    記録日: {formatDate(r.createdAt)}
                  </div>
                  {r.note ? <p className="mt-1 text-sm">{r.note}</p> : null}
                  {canUpdate && nexts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">状況を更新:</span>
                      {nexts.map((s) => (
                        <form key={s} action={updateReferralRecordStatusAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={s} />
                          <button type="submit" className="rounded-md border px-2.5 py-1 text-xs hover:bg-secondary/60">{REFERRAL_RECORD_STATUS_LABEL[s]}へ</button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
