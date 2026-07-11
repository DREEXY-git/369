import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Stat, Badge, Button, Table, Th, Td, EmptyState } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import {
  formatJpy,
  formatDateTime,
  GROWTH_CHANNELS,
  GROWTH_CHANNEL_LABEL,
  CHANNEL_DATA_STATE_LABEL,
  channelDataState,
  summarizeAdsMetrics,
} from '@hokko/shared';
import { generateAdsImprovementDraftAction } from '../actions';

export const dynamic = 'force-dynamic';

// C19 Ads Management read model（Phase 3.5 Stream A・roadmap70）。
// 外部広告 API・出稿変更・費用の支出は行わない（封印中）。AI は改善案の「下書き」まで。
// 広告予算・消化はマーケ担当が入力する計画値/自己申告値（会計実績ではない）= marketing ドメインの
// 業務データとして marketing:read 配下（会計実績と接続する際は finance 境界で再判定・roadmap70 §2）。

interface AdsDraftOutput {
  title?: string;
  recommendations?: string[];
  rationale?: string[];
  dataGaps?: string[];
  nextHumanChecks?: string[];
}

export default async function AdsReadModelPage({ searchParams }: { searchParams: Promise<{ generated?: string; blocked?: string; denied?: string }> }) {
  const user = await requireUser();
  // ページ基礎権限: marketing:read（データ取得前・外部ロール/AI_ASSISTANT を遮断）。
  if (!hasPermission(user, 'marketing', 'read')) {
    return (
      <AccessDenied
        title="広告・チャネル分析（read-only）"
        reason="この画面の閲覧にはマーケティングの閲覧権限（marketing:read）が必要です"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }]}
      />
    );
  }
  const sp = await searchParams;
  const t = user.tenantId;
  const canGenerate = hasPermission(user, 'marketing', 'create') && !user.isAi;

  const [campaigns, drafts] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where: { tenantId: t },
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aIOutput.findMany({
      where: { tenantId: t, task: 'ads_improvement' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, entityId: true, output: true, confidence: true, createdAt: true },
    }),
  ]);

  // チャネル状態盤: 記録済みキャンペーン/メトリクスから内部データ状態を導出。
  // 外部 API 連携は全チャネル常時「封印中」（実データがないチャネルを動作中に見せない）。
  const byChannel = new Map<string, { campaigns: number; metrics: number }>();
  for (const c of campaigns) {
    const cur = byChannel.get(c.channel) ?? { campaigns: 0, metrics: 0 };
    cur.campaigns += 1;
    cur.metrics += c.metrics.length;
    byChannel.set(c.channel, cur);
  }
  const channels = GROWTH_CHANNELS.map((ch) => {
    const cur = byChannel.get(ch) ?? { campaigns: 0, metrics: 0 };
    return { key: ch as string, label: GROWTH_CHANNEL_LABEL[ch], ...cur, state: channelDataState(cur.campaigns, cur.metrics) };
  });
  // 既知6チャネル外の channel 値（自由文字列で登録され得る）も無言で消さずに「その他」行で示す。
  for (const [key, cur] of byChannel) {
    if (!(GROWTH_CHANNELS as readonly string[]).includes(key)) {
      channels.push({ key, label: `その他（${key}）`, ...cur, state: channelDataState(cur.campaigns, cur.metrics) });
    }
  }

  // Ads チャネルの集計（記録ベース）。
  const adsCampaigns = campaigns.filter((c) => c.channel === 'ads');
  const adsSummary = summarizeAdsMetrics(
    adsCampaigns.flatMap((c) =>
      c.metrics.map((m) => ({ impressions: m.impressions, clicks: m.clicks, conversions: m.conversions, cost: toNumber(m.cost) })),
    ),
  );
  const adsBudget = adsCampaigns.reduce((s, c) => s + toNumber(c.budget), 0);
  const adsSpent = adsCampaigns.reduce((s, c) => s + toNumber(c.spent), 0);
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="広告・チャネル分析（read-only）"
        description="記録済みデータの分析と AI 改善案の下書きまで。出稿変更・費用の支出・外部媒体への反映は行いません。"
        breadcrumb={[{ label: 'Marketing OS', href: '/marketing' }, { label: '広告・チャネル分析', href: '#' }]}
        action={<Badge tone="amber">外部連携: 封印中</Badge>}
      />

      {sp.generated ? <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">改善案の下書きを生成しました（実行はされません）。</div> : null}
      {sp.blocked ? <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">入力の安全検査により生成を中止しました（AI 安全ログに記録済み）。</div> : null}
      {sp.denied ? <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">この操作を行う権限がありません。</div> : null}

      <Card className="mb-4">
        <CardHeader><CardTitle>チャネル状態盤</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            内部の記録状態です。外部媒体 API（広告出稿・SNS 投稿・PR 配信）はすべて封印中で、本画面から実行されることはありません。
          </p>
          <Table>
            <thead><tr><Th>チャネル</Th><Th>キャンペーン</Th><Th>実績記録</Th><Th>データ状態</Th><Th>外部連携</Th></tr></thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.key}>
                  <Td className="font-medium">{ch.label}</Td>
                  <Td>{ch.campaigns}</Td>
                  <Td>{ch.metrics}</Td>
                  <Td>
                    <Badge tone={ch.state === 'connected_data' ? 'green' : ch.state === 'insufficient' ? 'amber' : 'slate'}>
                      {CHANNEL_DATA_STATE_LABEL[ch.state]}
                    </Badge>
                  </Td>
                  <Td><Badge tone="amber">封印中</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="広告予算（計画）" value={formatJpy(adsBudget)} sub="マーケ入力の計画値" />
        <Stat label="消化（自己申告）" value={formatJpy(adsSpent)} tone="blue" sub="会計実績ではありません" />
        <Stat label="CTR" value={adsSummary.ctr != null ? `${(adsSummary.ctr * 100).toFixed(2)}%` : '未計測'} />
        <Stat label="CPA" value={adsSummary.cpa != null ? formatJpy(adsSummary.cpa) : '未計測'} tone="purple" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>広告キャンペーン（記録ベース）</CardTitle></CardHeader>
        <CardContent>
          {adsCampaigns.length === 0 ? (
            <EmptyState title="広告チャネルのキャンペーン記録がありません" hint="キャンペーン作成から channel=ads で登録すると集計されます。" />
          ) : (
            <Table>
              <thead><tr><Th>キャンペーン</Th><Th>予算/消化</Th><Th>表示</Th><Th>クリック</Th><Th>CV</Th><Th>AI 改善案</Th></tr></thead>
              <tbody>
                {adsCampaigns.map((c) => {
                  const s = summarizeAdsMetrics(c.metrics.map((m) => ({ impressions: m.impressions, clicks: m.clicks, conversions: m.conversions, cost: toNumber(m.cost) })));
                  return (
                    <tr key={c.id}>
                      <Td className="font-medium">{c.name}</Td>
                      <Td className="text-xs">{formatJpy(toNumber(c.budget))} / {formatJpy(toNumber(c.spent))}</Td>
                      <Td>{s.impressions}</Td>
                      <Td>{s.clicks}</Td>
                      <Td>{s.conversions}</Td>
                      <Td>
                        {canGenerate ? (
                          <form action={generateAdsImprovementDraftAction}>
                            <input type="hidden" name="campaignId" value={c.id} />
                            <Button type="submit" variant="outline" data-testid="ads-generate-draft">下書きを生成</Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">権限者のみ</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI 改善案の下書き（最新5件・実行はされません）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {drafts.length === 0 ? (
            <EmptyState title="下書きはまだありません" hint="キャンペーン行の「下書きを生成」から作成できます（人間のみ）。" />
          ) : (
            drafts.map((d) => {
              const o = (d.output ?? {}) as AdsDraftOutput;
              return (
                <div key={d.id} className="rounded-md border p-3" data-testid="ads-draft-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{o.title ?? '広告改善案'}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      信頼度 {Math.round(toNumber(d.confidence) * 100)}%・{formatDateTime(d.createdAt)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">対象: {campaignName.get(d.entityId ?? '') ?? '（不明なキャンペーン）'}</div>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {(o.recommendations ?? []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  {(o.rationale ?? []).length > 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">根拠: {(o.rationale ?? []).join(' ／ ')}</div>
                  ) : null}
                  {(o.dataGaps ?? []).length > 0 ? (
                    <div className="mt-1 text-xs text-amber-700">データ不足: {(o.dataGaps ?? []).join(' ／ ')}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-blue-700">次の人間確認: {(o.nextHumanChecks ?? []).join(' ／ ')}</div>
                </div>
              );
            })
          )}
          <p className="text-[11px] text-muted-foreground">
            下書きは提案であり、採否は人間が判断します。外部媒体への反映・出稿変更・費用の増減は個別の人間承認まで実施されません。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
