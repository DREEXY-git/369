import Link from 'next/link';
import { Radar, ArrowRight, Sparkles } from 'lucide-react';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { getControlTowerData } from '@/lib/domains/growth/control-tower';
import { summarizeGrowthEvents } from '@/lib/growth';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Stat } from '@/components/ui';
import { formatDateTime, formatJpy, isHumanUser, type ControlTowerPriority } from '@hokko/shared';
import { generateControlTowerNextStepAction } from './actions';

export const dynamic = 'force-dynamic';

const PRIORITY_LABEL: Record<ControlTowerPriority, string> = {
  high: '優先度：高',
  medium: '優先度：中',
  low: '優先度：低',
};
const PRIORITY_TONE: Record<ControlTowerPriority, string> = {
  high: 'red',
  medium: 'amber',
  low: 'slate',
};
const GROWTH_CATEGORY_LABEL: Record<string, string> = {
  marketing: 'マーケ',
  sales: '営業',
  finance: '財務',
  dx: 'DX',
  ai: 'AI',
  management: '経営',
  customer: '顧客',
  operations: '運用',
};

export default async function GrowthControlTowerPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; blocked?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  // 金額（原価・粗利・未回収）は財務閲覧権限が必要。redact はデータ整形層で担保する。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  // 生成は人間かつ営業下書きの作成権限（leadmap:create）を持つ人のみ（Server Action 側と同じ判定を UI にも適用）。
  const canGenerateDraft = isHumanUser(user) && hasPermission(user, 'leadmap', 'create');
  const { cards, actionableCount } = await getControlTowerData(user.tenantId, canViewFinance, user.userId);
  // P3-CT-4: 生成済みの「次の一手ドラフト」（AIOutput・下書きのみ）を read-only 表示する。
  // 生成は人間のボタン操作のみ。送信・承認・削除の導線は作らない。
  // finance 系カード由来のメモは件数を含み得るため、財務権限のない閲覧者には表示しない（表示経路の redaction・二重防御）。
  const financeCardKeys = cards.filter((c) => c.financeGated).map((c) => c.key);
  const nextStepDrafts = await prisma.aIOutput.findMany({
    where: {
      tenantId: user.tenantId,
      task: 'generateControlTowerNextStep',
      ...(canViewFinance ? {} : { entityId: { notIn: financeCardKeys } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  // P3-CT-5: 人間の判断待ちへの deep link（リンクのみ・承認/送信/実行のボタンは置かない）。
  // 承認一覧は請求金額等の finance 機密を含むため、件数も承認権限者（approval:approve）のみ取得・表示する。
  // 件数は count のみで、金額・PII・件名・本文は取得しない。
  const canApprove = hasPermission(user, 'approval', 'approve');
  const canViewLeads = hasPermission(user, 'leadmap', 'read');
  const [pendingApprovalCount, outreachDraftCount] = await Promise.all([
    canApprove
      ? prisma.approvalRequest.count({ where: { tenantId: user.tenantId, status: 'PENDING' } })
      : Promise.resolve(null),
    canViewLeads
      ? prisma.outreachDraft.count({
          where: { tenantId: user.tenantId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
        })
      : Promise.resolve(null),
  ]);
  // WIP2（roadmap62）: Growth Event Ledger の read-only 集計。既存 summarizeGrowthEvents のみを使い、
  // イベントの新規発火・状態変更はしない。select は type/金額/時間の4列のみ（PII・payload 非取得）。
  const [growth7, growth30] = await Promise.all([
    summarizeGrowthEvents(user.tenantId, 7),
    summarizeGrowthEvents(user.tenantId, 30),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Growth Opportunity Control Tower"
        description="既存データ（LeadMap・商談・会社の頭脳・Golden Path・資金繰り）から成長機会を1画面に集約し、次の一手を判断します（閲覧専用・実行は各導線の承認で）。"
        action={
          <Link href="/growth">
            <Button variant="outline">成長ダッシュボード</Button>
          </Link>
        }
      />

      {(sp.denied || sp.blocked) ? (
        <p className="mb-3 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {sp.blocked
            ? '安全チェックにより AI 下書きの生成を中止しました（入力に危険な指示が含まれる可能性があります）。'
            : 'AI 下書きメモを作成する権限がありません（生成には営業下書きの作成権限が必要です）。'}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="成長機会カード" value={cards.length} tone="purple" icon={<Radar />} />
        <Stat label="要対応の機会" value={actionableCount} tone="amber" sub="件数（redaction 含む）" />
        <Stat label="財務表示" value={canViewFinance ? '表示可' : '非表示'} tone={canViewFinance ? 'emerald' : 'slate'} sub={canViewFinance ? '財務閲覧権限あり' : '金額は権限者のみ'} />
        <Stat label="送信・実行" value="人間承認" tone="blue" sub="AIは下書きのみ" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.key} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-base">{card.title}</CardTitle>
              <Badge tone={PRIORITY_TONE[card.priority]}>{PRIORITY_LABEL[card.priority]}</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <p className="text-xs text-muted-foreground">{card.description}</p>

              {card.redacted ? (
                <div className="rounded-md bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                  {card.reason}
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{card.count ?? 0}</span>
                  <span className="text-xs text-muted-foreground">件</span>
                </div>
              )}

              {card.redacted ? null : <p className="text-xs text-muted-foreground">{card.reason}</p>}

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span className="text-[11px] text-muted-foreground">出典: {card.source}</span>
                <div className="flex items-center gap-1">
                  {card.redacted ? (
                    // 安全な説明のみ（redacted カードでは生成不可・二重防御の UI 側）。
                    <span className="text-[11px] text-muted-foreground">AI 下書きは財務権限者のみ作成できます。</span>
                  ) : canGenerateDraft ? (
                    <form action={generateControlTowerNextStepAction}>
                      <input type="hidden" name="cardKey" value={card.key} />
                      <Button type="submit" variant="outline" size="sm" data-testid={`ct-generate-${card.key}`}>
                        <Sparkles className="mr-1" /> AI 下書きメモを作る
                      </Button>
                    </form>
                  ) : null}
                  <Link href={card.href}>
                    <Button variant="ghost" size="sm">
                      次の一手 <ArrowRight className="ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canApprove || canViewLeads ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">人間の判断待ち（承認導線）</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              送信・承認・実行はこの画面からは行いません。実行は承認画面での人間の判断のみです。
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {canApprove ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    承認待ち <span className="font-bold tabular-nums">{pendingApprovalCount}</span> 件
                  </span>
                  <Link href="/approvals">
                    <Button variant="outline" size="sm" data-testid="ct-link-approvals">
                      承認待ちを開く <ArrowRight className="ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : null}
              {canViewLeads ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    営業メール下書き（送信待ち）{' '}
                    <span className="font-bold tabular-nums">{outreachDraftCount}</span> 件
                  </span>
                  <Link href="/leadmap/leads">
                    <Button variant="outline" size="sm" data-testid="ct-link-outreach">
                      下書き一覧を開く <ArrowRight className="ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">成果と削減時間（Growth Event Ledger）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted-foreground">
            集計期間: 直近7日 / 直近30日。既存の成長イベント台帳の read-only 集計で、イベントの発火・変更・外部送信は行いません。
          </p>
          <div data-testid="ct-growth-counts">
            イベント件数: 直近7日 <span className="font-bold tabular-nums">{growth7.total}</span> 件 ／ 直近30日{' '}
            <span className="font-bold tabular-nums">{growth30.total}</span> 件
            {growth30.total === 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">未計測（イベントなし・データ不足）</span>
            ) : null}
          </div>
          {growth30.total > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {Object.entries(growth30.byCategory).map(([cat, n]) => (
                <Badge key={cat} tone="slate">
                  {GROWTH_CATEGORY_LABEL[cat] ?? cat}:{' '}
                  {cat === 'finance' && !canViewFinance ? '—' : `${n} 件`}
                </Badge>
              ))}
            </div>
          ) : null}
          {canViewFinance ? (
            <div data-testid="ct-growth-money">
              売上効果（30日合計）:{' '}
              <span className="font-bold tabular-nums">
                {growth30.totalRevenueImpact > 0 ? formatJpy(growth30.totalRevenueImpact) : '未計測'}
              </span>
              <span className="mx-2">／</span>
              コスト削減（30日合計）:{' '}
              <span className="font-bold tabular-nums">
                {growth30.totalCostSaving > 0 ? formatJpy(growth30.totalCostSaving) : '未計測'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">金額の集計は財務閲覧権限のある人にのみ表示されます。</p>
          )}
          <div>
            削減時間（30日合計）:{' '}
            <span className="font-bold tabular-nums">
              {growth30.totalTimeSavingMinutes > 0 ? `${growth30.totalTimeSavingMinutes} 分` : '未計測'}
            </span>
            <span className="ml-2 text-[11px] text-muted-foreground">
              AI・自動化の自己申告値を含む集計です（検証済みの実績ではありません）。
            </span>
          </div>
          <div>
            <Link href="/growth/events">
              <Button variant="outline" size="sm" data-testid="ct-link-growth-events">
                イベント台帳を開く <ArrowRight className="ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">AI 下書きメモ（最新・下書きのみ）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {nextStepDrafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              まだ AI 下書きメモはありません。カードの「AI 下書きメモを作る」から生成できます（FakeLLM・下書きのみ）。
            </p>
          ) : (
            nextStepDrafts.map((draft) => (
              <div key={draft.id} data-testid="ct-memo-item" className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>下書き（送信・承認・削除はしません）</span>
                  <span>{formatDateTime(draft.createdAt)}</span>
                </div>
                <p className="whitespace-pre-line text-xs">{draft.outputText}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        本画面は閲覧専用です。外部送信・実LLM・課金は行いません。AI 下書きメモは FakeLLM による下書きのみで、送信・承認・削除・請求や契約の確定は行いません。金額系の指標は財務閲覧権限のある社長のみに表示され、権限のない担当者には件数・存在のみ、または権限が必要である旨のみが表示されます。
      </p>
    </div>
  );
}
