import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Table, Th, Td, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { formatDateTime, diagnoseSeoContent, findDuplicateTitles, detectForbiddenClaims, canRequestContentApproval, contentApprovalLabel } from '@hokko/shared';
import { generateSeoBriefDraftAction } from '../actions';
import { requestContentApprovalAction } from './actions';

export const dynamic = 'force-dynamic';

// C21 SEO/Content read model（Phase 3.5 Stream A2・roadmap73）。
// 外部検索・順位取得・公開・CMS 投稿・PR 配信は行わない（封印中）。AI はブリーフの「下書き」まで。
// 診断は既存 ContentAsset（記事/LP）の read-only 検査（決定論・外部アクセスなし）。

interface SeoBriefOutput {
  title?: string;
  keyword?: string;
  searchIntent?: string;
  outline?: string[];
  metaTitle?: string;
  metaDescription?: string;
  rationale?: string[];
  dataGaps?: string[];
  nextHumanChecks?: string[];
}

export default async function ContentSeoPage({ searchParams }: { searchParams: Promise<{ generated?: string; blocked?: string; denied?: string; error?: string; requested?: string; already?: string; highlight?: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="SEO・コンテンツ（read-only）"
        reason="この画面の閲覧にはマーケティングの閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }]}
      />
    );
  }
  const sp = await searchParams;
  const t = user.tenantId;
  const canGenerate = hasPermission(user, 'marketing', 'create') && !user.isAi;
  // 承認申請は marketing:update かつ人間のみ（AI は申請しない）。roadmap81 §2.1。
  const canRequest = hasPermission(user, 'marketing', 'update') && !user.isAi;

  const [articles, briefs] = await Promise.all([
    prisma.contentAsset.findMany({
      where: { tenantId: t, type: { in: ['article', 'lp'] } },
      select: { id: true, type: true, title: true, body: true, status: true, approvalStatus: true, generatedByAi: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.aIOutput.findMany({
      where: { tenantId: t, task: 'seo_brief' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, output: true, confidence: true, createdAt: true },
    }),
  ]);

  const duplicates = new Set(findDuplicateTitles(articles.map((a) => a.title)));
  const keywordSet = new Set<string>();
  for (const b of briefs) {
    const kw = (b.output as SeoBriefOutput | null)?.keyword;
    if (kw) keywordSet.add(kw);
  }
  // 月別カレンダー（作成月ごとの記事本数・テーマ=タイトル）。
  const byMonth = new Map<string, string[]>();
  for (const a of articles) {
    const key = `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const arr = byMonth.get(key) ?? [];
    arr.push(a.title);
    byMonth.set(key, arr);
  }

  return (
    <div>
      <PageHeader
        title="SEO・コンテンツ（read-only）"
        description="既存記事の診断と SEO ブリーフの下書きまで。公開・CMS 投稿・外部検索・PR 配信は行いません。"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: 'SEO・コンテンツ', href: '#' }]}
        action={<Badge tone="amber">公開・外部検索: 封印中</Badge>}
      />

      {sp.generated ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">SEOブリーフの下書きを生成しました（公開はされません）。</div> : null}
      {sp.blocked ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">入力の安全検査により生成を中止しました（AI 安全ログに記録済み）。</div> : null}
      {sp.denied ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">この操作を行う権限がありません。</div> : null}
      {sp.error === 'keyword' ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">キーワードを入力してください。</div> : null}
      {sp.requested ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="content-requested-banner">承認申請を作成しました。<a href="/approvals" className="underline">承認待ち一覧</a>で人間が承認/却下できます（公開・外部送信は伴いません）。</div> : null}
      {sp.already ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">この下書きは既に承認申請中または承認済みです（重複申請は作成されません）。</div> : null}
      {sp.error === 'notfound' ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">対象の下書きが見つかりません。</div> : null}
      {sp.error === 'input' ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">入力が不正です。</div> : null}

      {canGenerate ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>SEOブリーフの下書きを生成（人間のみ・公開なし）</CardTitle></CardHeader>
          <CardContent>
            <form action={generateSeoBriefDraftAction} className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Input name="keyword" placeholder="キーワード（例: イベント集客 札幌）" required data-testid="seo-keyword" />
              <Input name="audience" placeholder="想定読者（例: 中小企業の広報担当）" />
              <Input name="theme" placeholder="テーマ（任意）" />
              <Button type="submit" data-testid="seo-generate-brief">下書きを生成</Button>
            </form>
            <p className="mt-1 text-[11px] text-muted-foreground">
              No.1・業界初・顧客名・成果数値は根拠と同意なしに生成しません。顧客情報は AI に渡しません。
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader><CardTitle>SEOブリーフ下書き（最新5件・公開はされません）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {briefs.length === 0 ? (
            <EmptyState title="下書きはまだありません" hint="キーワードを入力して生成できます（人間のみ）。" />
          ) : (
            briefs.map((b) => {
              const o = (b.output ?? {}) as SeoBriefOutput;
              return (
                <div key={b.id} className="rounded-md border p-3" data-testid="seo-brief-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{o.title ?? 'SEOブリーフ'}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">信頼度 {Math.round(toNumber(b.confidence) * 100)}%・{formatDateTime(b.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-xs">検索意図: {o.searchIntent ?? '—'}</div>
                  <div className="mt-1 text-xs text-muted-foreground">メタ案: {o.metaTitle ?? '—'} ／ {o.metaDescription ?? '—'}</div>
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {(o.outline ?? []).map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                  {(o.rationale ?? []).length > 0 ? <div className="mt-2 text-xs text-muted-foreground">根拠: {(o.rationale ?? []).join(' ／ ')}</div> : null}
                  {(o.dataGaps ?? []).length > 0 ? <div className="mt-1 text-xs text-amber-700">データ不足: {(o.dataGaps ?? []).join(' ／ ')}</div> : null}
                  <div className="mt-1 text-xs text-blue-700">次の人間確認: {(o.nextHumanChecks ?? []).join(' ／ ')}</div>
                  <div className="mt-1"><Badge tone="amber">外部公開不可（下書き）</Badge></div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>キーワード管理（ブリーフ由来・read model）</CardTitle></CardHeader>
          <CardContent>
            {keywordSet.size === 0 ? (
              <EmptyState title="キーワードの記録がありません" hint="ブリーフを生成すると蓄積されます。" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...keywordSet].map((k) =>
                  detectForbiddenClaims(k).length > 0 ? (
                    <Badge key={k} tone="amber">⚠ {k}（表現の根拠確認が必要）</Badge>
                  ) : (
                    <Badge key={k} tone="blue">{k}</Badge>
                  ),
                )}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">検索ボリューム・順位は取得していません（外部検索は封印中）。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>記事カレンダー（作成月別）</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byMonth.size === 0 ? (
              <EmptyState title="記事の記録がありません" />
            ) : (
              [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([m, titles]) => (
                <div key={m} className="flex items-start justify-between gap-2">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{m}</span>
                  <span className="min-w-0 flex-1 truncate text-xs">{titles.join('、')}</span>
                  <Badge>{titles.length}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>記事管理と SEO 診断（記事・LP {articles.length} 件・read-only）</CardTitle></CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <EmptyState title="記事・LP の記録がありません" hint="AI資産の生成（マーケ資産）で article/lp を作成すると診断されます。" />
          ) : (
            <Table>
              <thead><tr><Th>タイトル</Th><Th>種別</Th><Th>状態</Th><Th>承認（review-only）</Th><Th>診断（read-only）</Th></tr></thead>
              <tbody>
                {articles.map((a) => {
                  const findings = diagnoseSeoContent({ title: a.title, body: a.body });
                  if (duplicates.has(a.title.trim())) {
                    findings.push({ code: 'duplicate-title', severity: 'warn', message: '同一タイトルの記事があります（重複コンテンツ候補）。' });
                  }
                  return (
                    <tr key={a.id} id={`content-${a.id}`} className={sp.highlight === a.id ? 'bg-amber-50' : undefined}>
                      <Td className="text-xs font-medium">{a.title}</Td>
                      <Td className="text-xs">{a.type}</Td>
                      <Td><Badge tone={a.approvalStatus === 'approved' ? 'green' : 'slate'}>{a.status}</Badge></Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            tone={a.approvalStatus === 'approved' ? 'green' : a.approvalStatus === 'pending' ? 'amber' : a.approvalStatus === 'rejected' ? 'red' : 'slate'}
                            data-testid={`content-approval-status-${a.id}`}
                          >
                            {contentApprovalLabel(a.approvalStatus)}
                          </Badge>
                          {canRequest && canRequestContentApproval(a.status) ? (
                            <form action={requestContentApprovalAction}>
                              <input type="hidden" name="contentAssetId" value={a.id} />
                              <Button type="submit" data-testid={`content-request-approval-${a.id}`}>承認申請</Button>
                            </form>
                          ) : null}
                          <a href="/approvals" className="text-[11px] text-blue-700 underline">承認一覧へ</a>
                        </div>
                      </Td>
                      <Td>
                        {findings.length === 0 ? (
                          <span className="text-xs text-emerald-700">指摘なし</span>
                        ) : (
                          <ul className="space-y-0.5 text-xs">
                            {findings.map((f, i) => (
                              <li key={i} className={f.severity === 'warn' ? 'text-amber-700' : 'text-muted-foreground'}>{f.message}</li>
                            ))}
                          </ul>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            診断は記録済みデータの機械検査です。順位・流入は計測していません。公開の可否は人間の承認で判断します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
