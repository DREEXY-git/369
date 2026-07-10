import Link from 'next/link';
import { Radar, ArrowRight, Sparkles } from 'lucide-react';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { getControlTowerData } from '@/lib/domains/growth/control-tower';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Stat } from '@/components/ui';
import { formatDateTime, type ControlTowerPriority } from '@hokko/shared';
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

export default async function GrowthControlTowerPage() {
  const user = await requireUser();
  // 金額（原価・粗利・未回収）は財務閲覧権限が必要。redact はデータ整形層で担保する。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const { cards, actionableCount } = await getControlTowerData(user.tenantId, canViewFinance, user.userId);
  // P3-CT-4: 生成済みの「次の一手ドラフト」（AIOutput・下書きのみ）を read-only 表示する。
  // 生成は人間のボタン操作のみ。送信・承認・削除の導線は作らない。
  const nextStepDrafts = await prisma.aIOutput.findMany({
    where: { tenantId: user.tenantId, task: 'generateControlTowerNextStep' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

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
                  ) : (
                    <form action={generateControlTowerNextStepAction}>
                      <input type="hidden" name="cardKey" value={card.key} />
                      <Button type="submit" variant="outline" size="sm" data-testid={`ct-generate-${card.key}`}>
                        <Sparkles className="mr-1" /> AI 下書きメモを作る
                      </Button>
                    </form>
                  )}
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
