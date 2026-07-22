import Link from 'next/link';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeDataAccess } from '@/lib/db';
import { toNumber } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { AccessDenied } from '@/components/access-denied';
import { SeverityBadge } from '@/components/badges';
import { visibleCustomerLabels } from '@/lib/security/customer-visibility';
import { generateMorningReport } from '@hokko/ai';
import { detectAnomalies, formatDate, classifyReferralSource } from '@hokko/shared';

export const dynamic = 'force-dynamic';

export default async function MorningReportPage() {
  const user = await requireUser();
  const t = user.tenantId;
  // WIP-5（roadmap66 追補）: 経営指標の俯瞰ページとしてページ基礎権限（dashboard:read）を
  // データ取得前に適用（外部ロール・AI アシスタントを遮断。STAFF は従前どおり閲覧可）。
  if (!hasPermission(user, 'dashboard', 'read')) {
    return (
      <AccessDenied
        title="AI朝礼レポート"
        reason="朝礼レポートの閲覧にはダッシュボードの閲覧権限（dashboard:read）が必要です"
      />
    );
  }
  // 朝報は全社的に閲覧されうる。売上・原価・粗利・売掛延滞などの財務指標は finance:read 保有者のみに限定し、
  // 表示だけでなく AI 朝報生成の入力からも redact する（画面 redact のすり抜け防止・Phase 1-19）。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  // 承認待ち件数も Topbar / /approvals ページゲートと同一条件で redact（存在シグナルの遮断・WIP-5 追補）。
  const canViewApprovals = hasPermission(user, 'approval', 'approve');
  // M3-2: 要追客リードの詳細（氏名・導線）は leadmap:read 保有者のみ。件数は非財務シグナルとして全 dashboard:read に表示。
  const canViewLeadmap = hasPermission(user, 'leadmap', 'read');
  // Phase 3.5: 紹介候補ハイライト。紹介分析ページ（/growth/referral）と同じ marketing:read ゲート。
  const canViewReferral = hasPermission(user, 'marketing', 'read');
  // 「成約以降」とみなす Deal stage（DealStage に WON 無し・紹介分析ページと同一定義）。
  const REFERRAL_WON_STAGES = ['CONTRACT', 'DELIVERY', 'INVOICE', 'FOLLOW_UP'];
  // 要追客 = 追客ボードと同条件（送信済み未反応で最終接触から5日以上／記録なし）。
  const followupOverdueBefore = new Date(Date.now() - 5 * 86_400_000);
  const FOLLOWUP_STAGES = ['SENT', 'OPENED', 'CLICKED'] as const;
  const followupWhere = {
    tenantId: t,
    stage: { in: [...FOLLOWUP_STAGES] },
    OR: [{ lastContactAt: { lt: followupOverdueBefore } }, { lastContactAt: null }],
  };

  const [dealSum, target, overdue, unhandledLeads, pendingApprovals, stalledDeals, tasks, prevMargin, complaints, expiring, followupOverdueCount, followupOverdueTop] =
    await Promise.all([
      prisma.deal.aggregate({ where: { tenantId: t, stage: { not: 'LOST' } }, _sum: { amount: true, cost: true } }),
      prisma.systemSetting.findUnique({ where: { tenantId_key: { tenantId: t, key: 'sales_target_monthly' } } }),
      prisma.receivable.count({ where: { tenantId: t, status: 'overdue' } }),
      prisma.localBusinessLead.count({ where: { tenantId: t, priority: { gte: 70 }, stage: { in: ['NEW', 'ANALYZED', 'DRAFTED', 'PENDING_APPROVAL'] } } }),
      canViewApprovals
        ? prisma.approvalRequest.count({ where: { tenantId: t, status: 'PENDING' } })
        : Promise.resolve(0),
      prisma.deal.count({ where: { tenantId: t, stage: { in: ['CONTACT', 'HEARING'] }, nextActionAt: { lt: new Date() } } }),
      prisma.actionItem.findMany({ where: { tenantId: t, status: { not: 'done' } }, orderBy: { dueDate: 'asc' }, take: 5 }),
      Promise.resolve(38),
      prisma.customerComplaint.count({ where: { tenantId: t, status: 'open' } }),
      prisma.contract.count({ where: { tenantId: t, renewalDate: { lt: new Date(Date.now() + 60 * 86400000) } } }),
      prisma.localBusinessLead.count({ where: followupWhere }),
      prisma.localBusinessLead.findMany({ where: followupWhere, orderBy: [{ lastContactAt: 'asc' }], select: { id: true, name: true, stage: true, lastContactAt: true }, take: 5 }),
    ]);

  // Phase 3.5: 紹介元候補の件数を朝礼に前出し（既存 classifyReferralSource・氏名は出さず件数と導線のみ）。
  // marketing:read 保有時のみ機密射影（satisfaction/churnRisk）を取得し、取得時は metadata-only で監査する。
  const referralCustomers = canViewReferral
    ? await prisma.customer.findMany({
        where: { tenantId: t, label: { in: visibleCustomerLabels(user.roles) } },
        select: { id: true, rank: true, status: true, satisfaction: true, churnRisk: true, lastContactAt: true, deals: { where: { tenantId: t }, select: { stage: true } } },
        // Codex R4-07: 標本を決定的にする（rank 昇順→更新新しい順）。上位50件（優良顧客）中の候補数を朝礼に出す。
        orderBy: [{ rank: 'asc' }, { updatedAt: 'desc' }],
        take: 50,
      })
    : [];
  const referralNow = new Date();
  const referralCandidateCount = referralCustomers.filter((c) =>
    classifyReferralSource(
      {
        customerId: c.id,
        rank: c.rank,
        status: c.status,
        satisfaction: c.satisfaction,
        churnRisk: c.churnRisk,
        wonDeals: c.deals.filter((d) => REFERRAL_WON_STAGES.includes(d.stage)).length,
        lastContactAt: c.lastContactAt,
      },
      referralNow,
    ).eligible,
  ).length;
  // 機密射影（satisfaction/churnRisk）を判定に使うため metadata-only で監査（氏名・本文は入れない・紹介分析ページと同型）。
  if (canViewReferral && referralCustomers.length > 0) {
    await writeDataAccess({
      tenantId: t,
      actorId: user.userId,
      actorType: user.isAi ? 'ai_agent' : 'user',
      entityType: 'ReferralAnalysis',
      action: 'read',
      label: 'INTERNAL',
      purpose: 'morning_referral_highlight',
      metadata: { scanned: referralCustomers.length, candidates: referralCandidateCount },
    });
  }

  // 財務指標は finance:read 非保有者には redact（0/neutral）。AI 入力・異常検知・画面のすべてに redact 後の値を使う。
  const sales = canViewFinance ? toNumber(dealSum._sum.amount) : 0;
  const cost = canViewFinance ? toNumber(dealSum._sum.cost) : 0;
  const grossRate = canViewFinance && sales > 0 ? Math.round(((sales - cost) / sales) * 1000) / 10 : 0;
  const targetVal = canViewFinance ? toNumber(target?.value, 12_000_000) : 0;
  const overdueShown = canViewFinance ? overdue : 0;
  const prevMarginShown = canViewFinance ? prevMargin : 0;
  const pendingApprovalsShown = canViewApprovals ? pendingApprovals : 0;

  const anomalies = detectAnomalies({
    salesActual: sales,
    salesTarget: targetVal,
    grossMarginRate: grossRate,
    prevGrossMarginRate: prevMarginShown,
    overdueReceivableCount: overdueShown,
    highPriorityUnhandledLeads: unhandledLeads,
    stalledDeals,
    pendingApprovals: pendingApprovalsShown,
    complaintsThisPeriod: complaints,
    complaintsPrevPeriod: 0,
    contractsExpiringSoon: expiring,
  });

  const report = await generateMorningReport({
    date: formatDate(new Date()),
    salesActual: sales,
    salesTarget: targetVal,
    overdueCount: overdueShown,
    unhandledLeads,
    pendingApprovals: pendingApprovalsShown,
    stalledDeals,
    topTasks: tasks.map((t2) => t2.title),
    anomalies: anomalies.map((a) => ({ title: a.title })),
  });

  return (
    <div>
      <PageHeader title="AI朝礼レポート" description={`${formatDate(new Date())} ・ AIが経営データから自動生成（社長向け）`} />

      {!canViewFinance ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          財務指標（売上・原価・粗利・売掛・延滞・資金繰り）は閲覧権限がないため非表示です（AI生成にも含めていません）。
        </div>
      ) : null}

      <Card className="mb-4 border-primary/30 bg-accent/40">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🤖</span>
            {/* 非finance ユーザーには財務 redact 値（0）由来の AI 文を見せず、固定の安全文に差し替え（0 を実績と誤解させない）。 */}
            <p className="text-sm leading-relaxed">
              {canViewFinance
                ? report.forCeo
                : '本日の朝報では、財務指標（売上・原価・粗利・売掛・延滞・資金繰り）は閲覧権限により非表示です。タスク・リード・承認待ち・顧客対応など、非財務の確認事項を中心にご確認ください。'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="📌 今日の重要タスク" items={report.todayTasks} />
        {/* 売上機会は財務由来。非finance ユーザーには redact(0) 由来の内容を見せないため非表示。 */}
        {canViewFinance ? <ListCard title="💰 今週の売上機会" items={report.salesOpportunities} tone="green" /> : null}
        <ListCard title="🗺️ 本日対応すべきリード" items={report.leadmapTodo} tone="blue" />
        <ListCard title="❓ 社長確認事項" items={report.confirmations} tone="amber" />
      </div>

      {/* M3-2: 追客ボードの「要追客」を朝礼に前出し。送信後の取りこぼしを毎朝ゼロにするための導線。 */}
      {followupOverdueCount > 0 ? (
        <Card className="mt-4 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader><CardTitle>🔔 今日追うべきリード（要追客 {followupOverdueCount}件）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">送信済みで5日以上反応が無いリードです。追客メール（下書き→承認）や商談化で取りこぼしを防ぎましょう。</p>
            {canViewLeadmap ? (
              <>
                <ul className="space-y-1 text-sm">
                  {followupOverdueTop.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2">
                      <Link href={`/leadmap/leads/${l.id}`} className="truncate hover:underline">{l.name}</Link>
                      <span className="shrink-0 text-xs text-muted-foreground">最終接触 {l.lastContactAt ? formatDate(l.lastContactAt) : '記録なし'}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/leadmap/followup" className="inline-block text-xs text-primary hover:underline">→ 追客ボードを開く</Link>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">詳細はリードマップの閲覧権限を持つ担当者が対応します。</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Phase 3.5: 紹介元候補を朝礼に前出し。最も安く成約率の高いリード源＝紹介を、既存顧客への一声から増やす導線。 */}
      {canViewReferral && referralCandidateCount > 0 ? (
        <Card className="mt-4 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader><CardTitle>🤝 今日、紹介を頼める優良顧客（{referralCandidateCount}件）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">成約実績のある active 顧客から算出した「紹介元候補」です。紹介は最も安く成約率の高いリード源。既存顧客への一声から増やしましょう（依頼文の下書きは分析ページ・送信は既存の承認導線のみ）。</p>
            <Link href="/growth/referral" className="inline-block text-xs text-primary hover:underline">→ 紹介・リファラル分析を開く</Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader><CardTitle>⚠️ 経営異常検知（ルールベース + AI説明）</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {anomalies.length === 0 ? (
            <div className="text-sm text-muted-foreground">大きな異常は検知されていません。</div>
          ) : (
            anomalies.map((a) => (
              <div key={a.code} className="flex items-start gap-2 rounded-md border p-3">
                <SeverityBadge severity={a.severity} />
                <div>
                  <div className="text-sm font-medium">{a.title} <Badge tone="slate">{a.category}</Badge></div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                  <div className="mt-1 text-xs text-primary">→ {a.recommendation}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListCard({ title, items, tone = 'slate' }: { title: string; items: string[]; tone?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">なし</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-${tone}-400`} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
