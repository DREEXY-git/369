// Human Work Inbox v0 read model（Phase 4 Stream C1・roadmap75）。
// 「人間がやるべきこと」を証拠から集約する。各項目は deep link（既存の閲覧/操作画面への遷移）のみで、
// Inbox 上での承認・送信・再実行・削除は行わない（導線を作らない）。
// 権限規律: 承認案件（ApprovalRequest）は approval:approve 保持者にのみ返す（/approvals ページゲートと同一条件）。
// それ以外（AI 稼働の異常・承認ゲート）は dashboard:read の範囲（/ai-office と同一）。
// PII・プロンプト全文・承認 payload 本文は取得しない（title/summary/種別/件数のみ）。
import { prisma } from '@/lib/db';
import { STALE_RUNNING_MS } from '@hokko/shared';
import { getAiWorkforceReadModel } from './read-model';

export interface InboxItem {
  key: string;
  kind: 'approval' | 'ai_gate' | 'ai_error' | 'ai_blocked' | 'ai_stale' | 'ai_no_telemetry';
  title: string;
  detail: string;
  /** 件数（一覧の要約）。 */
  count: number;
  /** deep link（この画面では実行しない・遷移のみ）。 */
  href: string;
  linkLabel: string;
}

export interface HumanWorkInboxReadModel {
  items: InboxItem[];
  generatedAtLabel: string;
}

export async function getHumanWorkInboxReadModel(
  tenantId: string,
  opts: { canViewApprovals: boolean },
  now: Date = new Date(),
): Promise<HumanWorkInboxReadModel> {
  const items: InboxItem[] = [];

  // 1) 人間の承認待ち（ApprovalRequest）。approval:approve 保持者のみ（取得段階で遮断・fail-closed）。
  if (opts.canViewApprovals) {
    const pending = await prisma.approvalRequest.count({ where: { tenantId, status: 'PENDING' } });
    items.push({
      key: 'approvals_pending',
      kind: 'approval',
      title: '承認待ちの重要操作',
      detail:
        pending > 0
          ? '外部送信・契約・請求などの重要操作が人間の承認を待っています。'
          : '現在、承認待ちの重要操作はありません。',
      count: pending,
      href: '/approvals',
      linkLabel: '承認待ち一覧で判断する',
    });
  }

  // 2) AI 承認ゲート（AIApprovalGate PENDING）。AI は承認しない＝人間の確認事項。
  const gatesPending = await prisma.aIApprovalGate.count({ where: { tenantId, status: 'PENDING' } });
  items.push({
    key: 'ai_gates_pending',
    kind: 'ai_gate',
    title: 'AI 実行の承認ゲート（PENDING）',
    detail:
      gatesPending > 0
        ? 'AI の実行が人間の判断待ちで停止しています（AI は自己承認しません）。'
        : '現在、判断待ちの AI 承認ゲートはありません。',
    count: gatesPending,
    href: '/ai-agents',
    linkLabel: 'AI 社員の活動ログで内容を確認する',
  });

  // 3) AI 稼働の異常（error / blocked / stale / no telemetry）— /ai-office と同じ read model から導出。
  const workforce = await getAiWorkforceReadModel(tenantId, now);
  const byState = (s: string) => workforce.agents.filter((a) => a.state === s);
  const errors = byState('error');
  const blocked = byState('blocked');
  // stale = 直近 run が RUNNING のまま STALE_RUNNING_MS 超（「実行記録なし」の unknown と stale フラグで区別）。
  const staleAgents = workforce.agents.filter((a) => a.state === 'unknown' && a.stale);
  const noTelemetry = workforce.agents.filter((a) => a.state === 'unknown' && !a.stale);

  if (errors.length > 0) {
    items.push({
      key: 'ai_errors',
      kind: 'ai_error',
      title: 'AI 実行の失敗',
      detail: `直近の実行が失敗した AI 社員: ${errors.map((a) => a.name).join('・')}。再実行は新しい実行として扱われます。`,
      count: errors.length,
      href: '/ai-agents',
      linkLabel: '失敗内容を確認する',
    });
  }
  if (blocked.length > 0) {
    items.push({
      key: 'ai_blocked',
      kind: 'ai_blocked',
      title: '承認却下によりブロック中の AI 社員',
      detail: `人間の再判断が必要です: ${blocked.map((a) => a.name).join('・')}`,
      count: blocked.length,
      href: '/ai-office',
      linkLabel: '3D オフィスで状態を確認する',
    });
  }
  if (staleAgents.length > 0) {
    items.push({
      key: 'ai_stale',
      kind: 'ai_stale',
      title: `実行中と断定できない AI 社員（RUNNING が ${Math.floor(STALE_RUNNING_MS / 3600000)} 時間超）`,
      detail: `クラッシュ残骸の可能性があります: ${staleAgents.map((a) => a.name).join('・')}`,
      count: staleAgents.length,
      href: '/ai-agents',
      linkLabel: '実行記録を確認する',
    });
  }
  if (noTelemetry.length > 0) {
    items.push({
      key: 'ai_no_telemetry',
      kind: 'ai_no_telemetry',
      title: '計測なし（no telemetry）の AI 社員',
      detail: `実行記録がありません（働いているようには表示しません）: ${noTelemetry.map((a) => a.name).join('・')}`,
      count: noTelemetry.length,
      href: '/ai-office',
      linkLabel: '稼働状況を確認する',
    });
  }

  return { items, generatedAtLabel: now.toISOString().slice(0, 16).replace('T', ' ') };
}
