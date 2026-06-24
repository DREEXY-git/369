// Golden Path 経営 KPI の表示部品（プレゼンテーションのみ・集計はしない）。Phase 1-12。
// CEO Dashboard と planning-hokko の双方で再利用し、page.tsx を薄く保つ。
// finance 項目は redact 済みデータ（null）を受け取り、financeVisible に応じて表示を切り替える。
import Link from 'next/link';
import { Badge, Stat, EmptyState } from '@/components/ui';
import {
  formatJpy,
  formatDate,
  EXEC_ATTENTION_LABEL,
  type ExecOverall,
  type ExecProjectKpi,
  type AttentionReasonCode,
} from '@hokko/shared';

const REASON_TONE: Record<AttentionReasonCode, string> = {
  overdue_receivable: 'red',
  high_risk: 'red',
  unsent_invoice: 'amber',
  unpaid: 'amber',
  low_margin: 'amber',
  overdue_logistics: 'amber',
  approval_pending: 'blue',
  unbridged: 'slate',
};

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 flex-1 rounded-full bg-secondary">
      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
    </div>
  );
}

/** 全体 KPI の Stat グリッド。financeVisible=false では金額系を出さない。 */
export function GoldenPathKpiGrid({ overall, financeVisible }: { overall: ExecOverall; financeVisible: boolean }) {
  return (
    <div className="space-y-3">
      {/* 非機密（誰でも見てよい業務 KPI） */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="平均進捗" value={`${overall.avgProgressPercent}%`} sub={`進行中 ${overall.activeCount} 件`} tone={overall.avgProgressPercent >= 70 ? 'green' : 'amber'} />
        <Stat label="進行中案件" value={overall.activeCount} sub={`完了 ${overall.completedCount}`} />
        <Stat label="高リスク" value={overall.highRiskCount} sub="open" tone={overall.highRiskCount ? 'red' : 'green'} />
        <Stat label="承認待ち" value={overall.approvalPendingTotal} tone={overall.approvalPendingTotal ? 'amber' : 'green'} />
        <Stat label="未完了物流" value={overall.unfinishedLogisticsTotal} sub={overall.overdueLogisticsCount ? `遅延 ${overall.overdueLogisticsCount}` : undefined} tone={overall.overdueLogisticsCount ? 'red' : 'slate'} />
        <Stat label="Finance未接続" value={overall.unbridgedCount} sub="要ブリッジ" tone={overall.unbridgedCount ? 'amber' : 'green'} />
      </div>

      {/* 機密（finance 権限が必要な金額 KPI） */}
      {financeVisible ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="未回収額" value={formatJpy(overall.unpaidTotal ?? 0)} sub={overall.overdueReceivableTotal ? `延滞 ${formatJpy(overall.overdueReceivableTotal)}` : undefined} tone={overall.unpaidTotal ? 'red' : 'green'} />
          <Stat label="入金済" value={formatJpy(overall.paidTotal ?? 0)} tone="emerald" />
          <Stat label="今月入金予定" value={formatJpy(overall.monthInflowExpected ?? 0)} tone="emerald" />
          <Stat label="今月支払予定" value={formatJpy(overall.monthOutflowExpected ?? 0)} tone={overall.cashflowTight ? 'red' : 'slate'} />
          <Stat label="低粗利案件" value={overall.lowMarginCount ?? 0} tone={overall.lowMarginCount ? 'amber' : 'green'} />
          <Stat label="未送信請求" value={overall.unsentInvoiceCount} tone={overall.unsentInvoiceCount ? 'amber' : 'green'} />
        </div>
      ) : (
        <div className="rounded-md bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          売上・粗利・未回収・入金/支払予定などの金額 KPI は財務閲覧権限が必要です（機密情報）。
        </div>
      )}
    </div>
  );
}

/** 「今すぐ見るべき案件」リスト。低粗利・未回収・高リスク・承認待ち・物流遅延・Bridge未接続を優先度順に。 */
export function AttentionList({ items, financeVisible }: { items: ExecProjectKpi[]; financeVisible: boolean }) {
  if (items.length === 0) {
    return <EmptyState title="今すぐ対応が必要な案件はありません" hint="進捗・リスク・請求・入金は良好です。" />;
  }
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/operations/events/${p.id}`}
          className="block rounded-md border p-3 hover:bg-secondary/50"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{p.name}</span>
            {p.customerName ? <Badge tone="slate">{p.customerName}</Badge> : null}
            {p.eventDate ? <Badge tone="blue">{formatDate(p.eventDate)}</Badge> : null}
            {!p.active ? <Badge tone="green">完了</Badge> : null}
            {financeVisible && p.marginPercent != null && p.lowMargin ? <Badge tone="amber">粗利率 {p.marginPercent}%</Badge> : null}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar percent={p.progressPercent} />
            <span className="whitespace-nowrap text-xs text-muted-foreground">{p.doneCount}/{p.totalCount}（{p.progressPercent}%）</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.attentionReasons.map((r) => (
              <Badge key={r} tone={REASON_TONE[r]}>{EXEC_ATTENTION_LABEL[r]}</Badge>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-blue-800">
              {p.nextActionLabel ? <>次の一手: <strong>{p.nextActionLabel}</strong></> : '✅ Golden Path 完了'}
            </span>
            {financeVisible && p.unpaidAmount != null && p.unpaidAmount > 0 ? (
              <span className={p.receivableOverdue ? 'font-semibold text-red-600' : 'text-amber-700'}>
                未回収 {formatJpy(p.unpaidAmount)}{p.receivableOverdue ? '（延滞）' : ''}
              </span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
