import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Textarea, EmptyState } from '@/components/ui';
import {
  generateOutreachAction,
  updateOutreachDraftAction,
  requestOutreachApprovalAction,
} from '../../../actions';
import { isSuppressed, formatDateTime } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function OutreachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lead = await prisma.localBusinessLead.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      campaign: true,
      outreachDrafts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sendLogs: true, replies: true, approvals: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
  });
  if (!lead) notFound();
  const draft = lead.outreachDrafts[0];

  const suppression = await prisma.suppressionList.findMany({ where: { tenantId: user.tenantId, channel: 'email' } });
  const targetEmail = lead.email ?? `info@${lead.placeId}.example.jp`;
  const suppressed = isSuppressed(suppression.map((s) => ({ channel: s.channel, value: s.value })), 'email', targetEmail);
  const externalSendEnabled = process.env.EXTERNAL_SEND_ENABLED === 'true';

  return (
    <div>
      <PageHeader
        title={`営業メール: ${lead.name}`}
        description="AIが会社ごとに最適化した営業メール下書きです。送信には人間の承認が必要です。"
        breadcrumb={[
          { label: 'リード', href: '/leadmap/leads' },
          { label: lead.name, href: `/leadmap/leads/${lead.id}` },
          { label: '営業メール', href: `/leadmap/leads/${lead.id}/outreach` },
        ]}
        action={
          <form action={generateOutreachAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
            <Button variant="outline">{draft ? '再生成' : 'AIで生成'}</Button>
          </form>
        }
      />

      {!draft ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <EmptyState title="営業メール下書きがありません" hint="「AIで生成」で会社に合わせた下書きを作成します。" />
            <form action={generateOutreachAction} className="mt-3 inline-block">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
              <Button type="submit">✉️ 個別営業メールを生成</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>メール下書き（編集可）</span>
                  <Badge tone={draft.status === 'SENT' ? 'purple' : draft.status === 'PENDING_APPROVAL' ? 'amber' : 'slate'}>
                    {draft.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateOutreachDraftAction} className="space-y-2">
                  <input type="hidden" name="draftId" value={draft.id} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">件名</label>
                    <Input name="subject" defaultValue={draft.subject} disabled={draft.status === 'SENT'} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">本文</label>
                    <Textarea name="body" defaultValue={draft.body} rows={14} disabled={draft.status === 'SENT'} className="font-sans" />
                  </div>
                  {draft.status !== 'SENT' ? (
                    <div className="flex gap-2">
                      <Button type="submit" variant="secondary">下書きを保存</Button>
                    </div>
                  ) : null}
                </form>

                {draft.status === 'DRAFT' ? (
                  <form action={requestOutreachApprovalAction} className="mt-3 border-t pt-3">
                    <input type="hidden" name="draftId" value={draft.id} />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <Button type="submit" disabled={suppressed}>承認に出す（送信は承認後）</Button>
                    {suppressed ? <span className="ml-2 text-xs text-red-600">※ 配信停止リストに含まれるため送信できません。</span> : null}
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>提案理由・根拠・注意点</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><div className="text-[11px] text-muted-foreground">提案理由</div>{draft.rationale}</div>
                <div><div className="text-[11px] text-muted-foreground">根拠</div>{draft.evidence}</div>
                <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">{draft.cautions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>送信前チェック</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <Check label="配信停止リスト" ok={!suppressed} okText="対象外" ngText="登録あり（送信不可）" />
                <Check label="送信者情報" ok okText="設定済み" ngText="未設定" />
                <Check label="外部送信スイッチ" ok={externalSendEnabled} okText="有効" ngText="無効（既定・安全）" warn={!externalSendEnabled} />
                <Check label="AIによる自動送信" ok={false} okText="" ngText="禁止（人間承認必須）" warn />
                <div className="pt-1 text-muted-foreground">送信先: {targetEmail}</div>
              </CardContent>
            </Card>

            {draft.sendLogs.length ? (
              <Card>
                <CardHeader><CardTitle>送信ログ</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {draft.sendLogs.map((s) => (
                    <div key={s.id} className="flex justify-between">
                      <span>{s.status}（{s.provider}）</span>
                      <span className="text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {draft.replies.length ? (
              <Card>
                <CardHeader><CardTitle>返信（AI分類）</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {draft.replies.map((r) => (
                    <div key={r.id} className="rounded border p-2">
                      <Badge tone={r.classification === 'interested' ? 'green' : r.classification === 'unsubscribe' ? 'red' : 'slate'}>{r.classification}</Badge>
                      <div className="mt-1">{r.body}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <Link href={`/leadmap/leads/${lead.id}`} className="text-primary hover:underline">← リード詳細へ戻る</Link>
      </p>
    </div>
  );
}

function Check({ label, ok, okText, ngText, warn }: { label: string; ok: boolean; okText: string; ngText: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <Badge tone={ok ? 'green' : warn ? 'amber' : 'red'}>{ok ? okText : ngText}</Badge>
    </div>
  );
}
