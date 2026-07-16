import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from '@/components/ui';
import { LeadStageBadge, PriorityBadge } from '@/components/badges';
import { AccessDenied } from '@/components/access-denied';
import { analyzeLeadAction, generateOutreachAction, convertLeadToCustomerAction } from '../../actions';
import { isLeadLinkConsistent } from '@/lib/domains/crm/lead-convert';
import { formatDate, formatDateTime, isHumanUser, type LeadStage } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // リード詳細は店舗情報・営業メモ・下書きを含む。leadmap:read を持たないロールには
  // データ取得前に遮断する（/approvals と同型・P3-CT-5 push 前レビューの指摘対応）。
  if (!hasPermission(user, 'leadmap', 'read')) {
    return (
      <AccessDenied
        title="リード詳細"
        reason="リード詳細の閲覧には LeadMap の閲覧権限（leadmap:read）が必要です"
        breadcrumb={[{ label: 'リード一覧', href: '/leadmap/leads' }]}
      />
    );
  }
  const lead = await prisma.localBusinessLead.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      campaign: true,
      reviews: true,
      socialProfiles: true,
      websiteScans: { include: { findings: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      insights: { orderBy: { createdAt: 'desc' }, take: 1 },
      outreachDrafts: { orderBy: { createdAt: 'desc' }, take: 1 },
      placeSnapshots: { orderBy: { fetchedAt: 'desc' }, take: 1 },
      pipelineHistory: { orderBy: { createdAt: 'desc' }, take: 6 },
    },
  });
  if (!lead) notFound();

  const insight = lead.insights[0];
  const scan = lead.websiteScans[0];
  const snap = lead.placeSnapshots[0];
  const expired = lead.expiresAt ? new Date(lead.expiresAt).getTime() < Date.now() : false;
  // 実確定（商談化）は人間専用（role 由来の fail-closed 判定）。session の isAi は role と不一致になり得るため使わない。
  const isHuman = isHumanUser({ roles: user.roles });
  // 表示時にも link 整合を検証（Codex PR#60 R2 addendum P2）。不整合なら foreign ID を出さず修復導線へ。
  const linkConsistent = lead.customerId || lead.dealId ? await isLeadLinkConsistent(prisma, user.tenantId, lead) : false;

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={`${lead.industry}・${lead.city ?? ''}`}
        breadcrumb={[
          { label: 'LeadMap', href: '/leadmap/campaigns' },
          { label: 'リード', href: '/leadmap/leads' },
          { label: lead.name, href: `/leadmap/leads/${lead.id}` },
        ]}
        action={
          <div className="flex gap-2">
            <Link href={`/leadmap/leads/${lead.id}/analysis`}><Button variant="outline">AI分析を見る</Button></Link>
            <Link href={`/leadmap/leads/${lead.id}/outreach`}><Button>営業メール</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* 基本情報 */}
          <Card>
            <CardHeader><CardTitle>営業先情報</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="評価 / 口コミ" value={`★${lead.rating ?? '—'} / ${lead.reviewCount}件`} />
                <Field label="優先度" value={<PriorityBadge score={lead.priority} />} />
                <Field label="電話" value={lead.phone ?? '—'} />
                <Field label="Webサイト" value={lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{lead.website}</a> : 'なし'} />
                <Field label="メール" value={lead.email ?? '—'} />
                <Field label="問い合わせ" value={lead.contactForm ? 'フォームあり' : '—'} />
                <Field label="住所" value={lead.address ?? '—'} />
                <Field label="営業時間" value={lead.openingHours ?? '—'} />
                <Field label="SNS" value={lead.socialProfiles.length ? lead.socialProfiles.map((s) => s.platform).join('・') : '—'} />
                <Field label="ステージ" value={<LeadStageBadge stage={lead.stage as LeadStage} />} />
              </div>
            </CardContent>
          </Card>

          {/* レビュー */}
          <Card>
            <CardHeader><CardTitle>口コミ（{lead.reviews.length}件のサンプル）</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lead.reviews.length === 0 ? <EmptyState title="口コミがありません" /> : lead.reviews.map((r) => (
                <div key={r.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.author}</span>
                    <Badge tone={r.rating >= 4 ? 'green' : r.rating <= 2 ? 'red' : 'amber'}>★{r.rating}</Badge>
                  </div>
                  <div className="text-muted-foreground">{r.text}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Web解析 */}
          <Card>
            <CardHeader><CardTitle>Webサイト解析</CardTitle></CardHeader>
            <CardContent>
              {scan ? (
                <div className="space-y-1.5">
                  {scan.findings.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <Badge tone={f.positive ? 'green' : 'amber'}>{f.positive ? '良' : '改善余地'}</Badge>
                      <span>{f.detail}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="未解析" hint="「AI分析を見る」から解析を実行できます。" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* AIアクション */}
          <Card>
            <CardHeader><CardTitle>AIアクション</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <form action={analyzeLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
                <Button type="submit" variant="secondary" className="w-full">🔍 AIで分析（強み・改善余地・切り口）</Button>
              </form>
              <form action={generateOutreachAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="salesType" value={lead.campaign.forSalesType} />
                <Button type="submit" className="w-full">✉️ 個別営業メールを生成</Button>
              </form>
              <p className="text-[11px] text-muted-foreground">営業メールは必ず下書きとして生成され、送信には人間の承認が必要です。</p>
            </CardContent>
          </Card>

          {/* CRM連携（商談化） */}
          <Card>
            <CardHeader><CardTitle>CRM連携</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lead.customerId || lead.dealId ? (
                // 表示時にも link 整合（tenant + Customer 実在 + Deal の backlink 一致）を検証する（Codex PR#60 R2 addendum P2）。
                // 不整合（foreign / dangling / 片側欠落 / 別 Lead backlink）は foreign ID を出さず、修復導線を表示する。
                linkConsistent ? (
                  <>
                    <Badge tone="green">商談化済み</Badge>
                    <Link href={`/customers/${lead.customerId}`} className="block text-sm text-primary hover:underline">→ 連携先の顧客を見る</Link>
                    <Link href={`/deals/${lead.dealId}`} className="block text-sm text-primary hover:underline">→ 案件を見る</Link>
                  </>
                ) : (
                  <>
                    <Badge tone="red">連携先の不整合</Badge>
                    <p className="text-[11px] text-muted-foreground">このリードの連携先（顧客・案件）が確認できません。越境参照を防ぐためリンクは表示しません。再商談化で修復してください。</p>
                    {isHuman ? (
                      <form action={convertLeadToCustomerAction}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Button type="submit" variant="outline" className="w-full">🔧 連携をやり直す（修復）</Button>
                      </form>
                    ) : null}
                  </>
                )
              ) : !isHuman ? (
                // 実確定（顧客・案件の作成）は人間専用（Codex PR#49 R1 High / PR#60 R2 addendum）。AI/混在ロールには出さない。
                <p className="text-[11px] text-muted-foreground">商談化（顧客・案件の作成）は人が実行します。AIは分析・下書きまで。</p>
              ) : (
                <form action={convertLeadToCustomerAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <Button type="submit" className="w-full">🤝 商談化（顧客・案件をCRMに作成）</Button>
                  <p className="mt-1 text-[11px] text-muted-foreground">このリードをCRMの顧客・案件として登録し、以後はCRM/案件管理で追跡します。</p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* AI切り口サマリー */}
          {insight ? (
            <Card>
              <CardHeader><CardTitle>営業切り口（AI）</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="text-primary">{insight.angle}</div>
                <div className="mt-1 text-xs text-muted-foreground">信頼度 {Math.round(insight.confidence * 100)}%</div>
              </CardContent>
            </Card>
          ) : null}

          {/* データソース・コンプライアンス */}
          <Card>
            <CardHeader><CardTitle>データソース</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">source</span><Badge tone={lead.source === 'DEMO' ? 'slate' : 'green'}>{lead.source}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">placeId</span><span className="font-mono">{lead.placeId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">fetchedAt</span><span>{formatDateTime(lead.fetchedAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">expiresAt</span><span>{lead.expiresAt ? formatDate(lead.expiresAt) : '—'}{expired ? ' (期限切れ)' : ''}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">attribution</span><span>{lead.attributionRequired ? '必須' : '不要'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">cachePolicy</span><span>{lead.cachePolicy}</span></div>
              {lead.googleMapsUrl ? <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer" className="block pt-1 text-primary hover:underline">Googleマップで開く →</a> : null}
              {expired ? <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-700">キャッシュ期限切れ。再取得または再確認が必要です。</div> : null}
              {snap?.attributionRequired ? <div className="mt-1 text-muted-foreground">※ Google由来データは帰属表示が必要です。</div> : null}
            </CardContent>
          </Card>

          {/* パイプライン履歴 */}
          <Card>
            <CardHeader><CardTitle>ステージ履歴</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {lead.pipelineHistory.map((h) => (
                <div key={h.id} className="flex justify-between">
                  <span>{h.toStage}</span>
                  <span className="text-muted-foreground">{formatDate(h.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
