// Outcome & Human Time Ledger v0 read model（Phase 4 Stream C1・roadmap75）。
// 「AI の成果」は必ず証拠区分（measured/self_reported/estimated/unverified/unavailable）付きで返す。
// - 実測 = UsageEvent / AIAgentRun 等のシステム記録のみ。0 と計測なし（null）を混同しない。
// - 人間の削減時間: baseline（人間所要時間の実測）が存在しないため常に unavailable（推定しない）。
// - 財務金額: 呼び出し側が finance:read を確認した場合のみ含める（v0 は台帳未接続 = unavailable）。
// 本モジュールは read-only。実行・承認・削除・外部送信は行わない。
import { prisma } from '@/lib/db';
import type { OutcomeEntry } from '@hokko/shared';

export interface OutcomeLedgerReadModel {
  periodLabel: string;
  entries: OutcomeEntry[];
  generatedAtLabel: string;
}

const PERIOD_DAYS = 30;

export async function getOutcomeLedgerReadModel(
  tenantId: string,
  opts: { includeFinance: boolean },
  now: Date = new Date(),
): Promise<OutcomeLedgerReadModel> {
  const since = new Date(now.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const periodLabel = `直近${PERIOD_DAYS}日`;

  const [aiOutputEvents, runsTotal, runsSucceeded, runsFailed, runsNeedsApproval, gatesPending] = await Promise.all([
    prisma.usageEvent.count({ where: { tenantId, eventType: 'ai.output.generated', occurredAt: { gte: since } } }),
    prisma.aIAgentRun.count({ where: { tenantId, startedAt: { gte: since } } }),
    prisma.aIAgentRun.count({ where: { tenantId, startedAt: { gte: since }, status: 'SUCCEEDED' } }),
    prisma.aIAgentRun.count({ where: { tenantId, startedAt: { gte: since }, status: 'FAILED' } }),
    prisma.aIAgentRun.count({ where: { tenantId, startedAt: { gte: since }, status: 'NEEDS_APPROVAL' } }),
    prisma.aIApprovalGate.count({ where: { tenantId, status: 'PENDING' } }),
  ]);

  const entries: OutcomeEntry[] = [
    {
      key: 'ai_outputs',
      label: 'AI 生成物（下書き・レポート）',
      value: aiOutputEvents,
      unit: '件',
      evidenceClass: 'measured',
      evidenceSource: 'UsageEvent（ai.output.generated・二重計上防止キー付き）',
      periodLabel,
      denominatorNote: 'worker/web で記録された生成イベントのみ（未計装の生成経路は含まれない）',
      confidence: 0.9,
    },
    {
      key: 'runs_succeeded',
      label: 'AI 実行 成功',
      value: runsSucceeded,
      unit: '件',
      evidenceClass: 'measured',
      evidenceSource: 'AIAgentRun（status=SUCCEEDED）',
      periodLabel,
      denominatorNote: `期間内の全実行 ${runsTotal} 件中`,
      confidence: 0.9,
    },
    {
      key: 'runs_failed',
      label: 'AI 実行 失敗',
      value: runsFailed,
      unit: '件',
      evidenceClass: 'measured',
      evidenceSource: 'AIAgentRun（status=FAILED）',
      periodLabel,
      denominatorNote: `期間内の全実行 ${runsTotal} 件中`,
      confidence: 0.9,
    },
    {
      key: 'human_reviews_waiting',
      label: '人間の判断待ち（承認ゲート）',
      value: runsNeedsApproval + gatesPending,
      unit: '件',
      evidenceClass: 'measured',
      evidenceSource: 'AIAgentRun（NEEDS_APPROVAL）＋AIApprovalGate（PENDING）',
      periodLabel: `${periodLabel}（ゲートは現在値）`,
      denominatorNote: 'AI は承認・却下しない（人間の判断のみが解消する）',
      confidence: 0.9,
    },
    {
      // baseline（人間が同作業に要する時間の実測）が無いため、AI 実行時間からの推定はしない。
      key: 'human_time_saved',
      label: '人間の削減時間',
      value: null,
      unit: '時間',
      evidenceClass: 'unavailable',
      evidenceSource: 'baseline（人間所要時間の実測・合意値）未計測のため算出しない',
      periodLabel,
      denominatorNote: 'AI 実行時間だけから人間の削減時間を推定しない（roadmap75 §1）',
      confidence: null,
    },
  ];

  if (opts.includeFinance) {
    entries.push({
      // 財務効果は finance:read 保持者にのみ行自体を返す（金額根拠の台帳が未接続なので値は出さない）。
      key: 'financial_impact',
      label: '財務効果（金額）',
      value: null,
      unit: '円',
      evidenceClass: 'unavailable',
      evidenceSource: '金額根拠となる台帳（請求・原価）と AI 成果の接続が未実装のため算出しない',
      periodLabel,
      denominatorNote: '根拠なしに金額を表示しない',
      confidence: null,
    });
  }

  return {
    periodLabel,
    entries,
    generatedAtLabel: now.toISOString().slice(0, 16).replace('T', ' '),
  };
}
