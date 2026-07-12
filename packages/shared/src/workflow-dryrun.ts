// Workflow Dry Run（v7.2 Lane D・read-only）。
// フォーム/自然言語入力から業務フロー案（Trigger / Condition / Action / Approval Step / Risk）を
// **決定論的な純ロジック**で組み立て、dry-run（仮想実行）の結果だけを返す。
// queue への enqueue・Server Action 実行・外部送信・実 LLM・DB 更新・課金は一切行わない
// （本モジュールは I/O を持たない純関数のみ。実行系 API を import しない）。
// 危険 Action は必ず BLOCKED、人間承認が必要な Action は REQUIRES_APPROVAL（以降のステップは
// NOT_REACHED）として表示し、承認なしで先へ進む仮想結果を作らない。

import { z } from 'zod';

// ── 入力検証（Zod・サイズ上限・allowlist） ──────────────────────────────────

export const WORKFLOW_INPUT_LIMITS = {
  name: 80,
  conditionText: 300,
  actionsText: 1000,
  maxSteps: 10,
} as const;

/** Trigger は allowlist のみ（自由文字列の trigger を作らない）。 */
export const WORKFLOW_TRIGGERS = [
  { key: 'lead_created', label: '新規リードが登録されたとき' },
  { key: 'deal_stage_changed', label: '商談ステージが変わったとき' },
  { key: 'invoice_overdue', label: '請求の入金期日を過ぎたとき' },
  { key: 'daily_morning', label: '毎朝の定時' },
  { key: 'manual', label: '手動で開始' },
] as const;

export type WorkflowTriggerKey = (typeof WORKFLOW_TRIGGERS)[number]['key'];

export const WorkflowInputSchema = z.object({
  name: z.string().trim().min(1, 'フロー名を入力してください').max(WORKFLOW_INPUT_LIMITS.name, `フロー名は${WORKFLOW_INPUT_LIMITS.name}文字までです`),
  trigger: z.enum(WORKFLOW_TRIGGERS.map((t) => t.key) as [WorkflowTriggerKey, ...WorkflowTriggerKey[]]),
  conditionText: z.string().trim().max(WORKFLOW_INPUT_LIMITS.conditionText, `条件は${WORKFLOW_INPUT_LIMITS.conditionText}文字までです`).default(''),
  actionsText: z
    .string()
    .trim()
    .min(1, 'やりたいことを1行以上入力してください')
    .max(WORKFLOW_INPUT_LIMITS.actionsText, `内容は${WORKFLOW_INPUT_LIMITS.actionsText}文字までです`),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

// ── Action カタログ（allowlist・risk 分類の正本） ────────────────────────────

export type StepClassification = 'DRY_RUN_OK' | 'REQUIRES_APPROVAL' | 'BLOCKED' | 'UNRECOGNIZED';

interface CatalogEntry {
  key: string;
  label: string;
  classification: Exclude<StepClassification, 'UNRECOGNIZED'>;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  /** 自然言語入力を突き合わせるキーワード（決定論・最長一致でなく定義順の先勝ち）。 */
  keywords: string[];
}

/** 定義順が判定順（決定論）。危険 Action を先に評価し、緩い語で上書きされないようにする。 */
export const WORKFLOW_ACTION_CATALOG: readonly CatalogEntry[] = [
  // ── 危険 Action（dry-run でも必ず BLOCKED・実装しても人間 Gate の解除が先） ──
  { key: 'payment_execute', label: '支払の実行', classification: 'BLOCKED', risk: 'HIGH', reason: '実支払は人間 Gate（BILLING_GO_REQUIRED）', keywords: ['支払', '振込', '送金', '決済'] },
  { key: 'data_delete', label: 'データ削除', classification: 'BLOCKED', risk: 'HIGH', reason: '削除は承認必須かつ自動化対象外', keywords: ['削除', '消去', 'クリア'] },
  { key: 'ad_budget_change', label: '広告予算の変更', classification: 'BLOCKED', risk: 'HIGH', reason: '広告・予算変更は封印中（人間 Gate）', keywords: ['予算', '広告費', '入札'] },
  { key: 'external_publish', label: '外部公開・SNS投稿', classification: 'BLOCKED', risk: 'HIGH', reason: '外部公開は封印中（人間 Gate）', keywords: ['公開', '投稿', 'SNS', 'ツイート'] },
  // ── 人間承認が必要な Action（dry-run では REQUIRES_APPROVAL で停止） ──
  { key: 'customer_email_send', label: '顧客へのメール送信', classification: 'REQUIRES_APPROVAL', risk: 'HIGH', reason: '外部送信は常に人間承認（requiresApproval）', keywords: ['メール送信', 'メールを送', '送信', '連絡'] },
  { key: 'invoice_finalize', label: '請求書の正式化', classification: 'REQUIRES_APPROVAL', risk: 'MEDIUM', reason: '請求の正式化は人間承認必須', keywords: ['請求書', '請求'] },
  { key: 'quote_issue', label: '見積の発行', classification: 'REQUIRES_APPROVAL', risk: 'MEDIUM', reason: '見積発行は金額により承認必須', keywords: ['見積'] },
  // ── dry-run 可能な内部 Action（外部作用なし・下書き/記録/通知まで） ──
  { key: 'ai_draft', label: 'AI 下書きの生成（Fake・下書きまで）', classification: 'DRY_RUN_OK', risk: 'LOW', reason: '生成物は必ず下書き（外部送信なし）', keywords: ['下書き', '文面', '作成', '生成', 'ドラフト'] },
  { key: 'internal_record', label: '社内台帳への記録', classification: 'DRY_RUN_OK', risk: 'LOW', reason: '社内記録のみ（外部作用なし）', keywords: ['記録', '台帳', 'メモ', '登録'] },
  { key: 'notify_inbox', label: '社内通知（Inbox）', classification: 'DRY_RUN_OK', risk: 'LOW', reason: '社内通知のみ（外部送信なし）', keywords: ['通知', '知らせ', 'アラート', 'リマインド'] },
  { key: 'assign_task', label: '担当者へのタスク割当', classification: 'DRY_RUN_OK', risk: 'LOW', reason: '社内タスクのみ（外部作用なし）', keywords: ['タスク', '割当', '担当'] },
] as const;

// ── フロー案の組み立て（決定論） ────────────────────────────────────────────

export interface WorkflowStep {
  index: number;
  /** 入力行（上限内に切らず、超過は入力検証で拒否済み）。 */
  sourceLine: string;
  actionKey: string | null;
  actionLabel: string;
  classification: StepClassification;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  reason: string;
  /** 人間の承認ステップとして挿入されるか（REQUIRES_APPROVAL の直前に明示）。 */
  approvalStep: boolean;
}

export interface WorkflowPlan {
  name: string;
  trigger: { key: WorkflowTriggerKey; label: string };
  conditions: string[];
  steps: WorkflowStep[];
}

export type ParseWorkflowResult = { ok: true; plan: WorkflowPlan } | { ok: false; errors: string[] };

/** 自然言語/フォーム入力 → フロー案（決定論・カタログ allowlist 突き合わせ）。 */
export function parseWorkflowInput(raw: unknown): ParseWorkflowResult {
  const parsed = WorkflowInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;
  const lines = input.actionsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { ok: false, errors: ['やりたいことを1行以上入力してください'] };
  if (lines.length > WORKFLOW_INPUT_LIMITS.maxSteps) {
    return { ok: false, errors: [`ステップは${WORKFLOW_INPUT_LIMITS.maxSteps}行までです（${lines.length}行入力）`] };
  }
  // v7.2 R2（Codex CHANGE_REQUEST_V72_WORKFLOW P2-1）: keyword 突き合わせは NFKC 正規化＋空白除去で行い、
  // 全角/半角の違いや空白挿入（ASCII 空白・全角空白）による難読化を危険 Action として検出できるようにする。
  // ただし正規化はあくまで検出の補助であり、これで一致しない未知入力は下の fail-closed で REQUIRES_HUMAN_REVIEW。
  const normalizeForMatch = (s: string) => s.normalize('NFKC').replace(/\s+/g, '');
  const steps: WorkflowStep[] = lines.map((line, index) => {
    const nline = normalizeForMatch(line);
    const hit = WORKFLOW_ACTION_CATALOG.find((entry) => entry.keywords.some((k) => nline.includes(normalizeForMatch(k))));
    if (!hit) {
      return {
        index,
        sourceLine: line,
        actionKey: null,
        actionLabel: '認識できない操作',
        classification: 'UNRECOGNIZED' as const,
        risk: 'UNKNOWN' as const,
        reason: '対応表（allowlist）に無い操作は実行計画に含めません（推測で実行可能と表示しない）',
        approvalStep: false,
      };
    }
    return {
      index,
      sourceLine: line,
      actionKey: hit.key,
      actionLabel: hit.label,
      classification: hit.classification,
      risk: hit.risk,
      reason: hit.reason,
      approvalStep: hit.classification === 'REQUIRES_APPROVAL',
    };
  });
  const trigger = WORKFLOW_TRIGGERS.find((t) => t.key === input.trigger)!;
  const conditions = input.conditionText
    ? input.conditionText.split('\n').map((c) => c.trim()).filter(Boolean)
    : [];
  return { ok: true, plan: { name: input.name, trigger: { key: trigger.key, label: trigger.label }, conditions, steps } };
}

// ── Dry Run（仮想実行・外部作用ゼロ） ────────────────────────────────────────

// v7.2 R2（Codex CHANGE_REQUEST_V72_WORKFLOW P2-1）: 旧 SKIPPED_UNRECOGNIZED（= fail-open で最後まで
// completed）を廃し、allowlist 外は REQUIRES_HUMAN_REVIEW で停止する（危険操作を「安全」と誤認させない）。
export type DryRunStepStatus = 'SIMULATED' | 'REQUIRES_APPROVAL' | 'BLOCKED' | 'NOT_REACHED' | 'REQUIRES_HUMAN_REVIEW';

export interface DryRunStepResult {
  index: number;
  actionLabel: string;
  status: DryRunStepStatus;
  note: string;
}

export interface DryRunResult {
  steps: DryRunStepResult[];
  /**
   * completed = 最後まで仮想実行 / paused_for_approval = 人間承認待ちで停止 / blocked = 危険 Action で停止 /
   * needs_human_review = allowlist 外の操作があり人間レビューが必要で停止（fail-closed・completed にしない）。
   */
  outcome: 'completed' | 'paused_for_approval' | 'blocked' | 'needs_human_review';
  summary: string;
}

/**
 * 仮想実行（決定論・fail-closed）: 上から順に評価し、
 * - DRY_RUN_OK → SIMULATED（実際には何も実行しない）
 * - UNRECOGNIZED → REQUIRES_HUMAN_REVIEW でその場停止（allowlist 外を「安全に完了」と誤認させない・
 *   以降は NOT_REACHED）。正規化（NFKC/空白）は突き合わせの補助であって未知入力を通す根拠にしない。
 * - REQUIRES_APPROVAL → その場で停止（以降は NOT_REACHED・承認なしで進む結果を作らない）
 * - BLOCKED → その場で停止（以降は NOT_REACHED）
 */
export function dryRunWorkflow(plan: WorkflowPlan): DryRunResult {
  const results: DryRunStepResult[] = [];
  let halted: 'paused_for_approval' | 'blocked' | 'needs_human_review' | null = null;
  for (const step of plan.steps) {
    if (halted) {
      results.push({ index: step.index, actionLabel: step.actionLabel, status: 'NOT_REACHED', note: '前段で停止したため未評価' });
      continue;
    }
    if (step.classification === 'DRY_RUN_OK') {
      results.push({ index: step.index, actionLabel: step.actionLabel, status: 'SIMULATED', note: '仮想実行（実際には何も実行していません）' });
    } else if (step.classification === 'UNRECOGNIZED') {
      // fail-closed: 対応表に無い操作は「安全に完了」と表示せず、人間レビューが必要として停止する。
      results.push({
        index: step.index,
        actionLabel: step.actionLabel,
        status: 'REQUIRES_HUMAN_REVIEW',
        note: 'allowlist に無い操作のため自動では安全判定できません（人間のレビューが必要・ここで停止）',
      });
      halted = 'needs_human_review';
    } else if (step.classification === 'REQUIRES_APPROVAL') {
      results.push({ index: step.index, actionLabel: step.actionLabel, status: 'REQUIRES_APPROVAL', note: '人間の承認ステップが必要（ここで停止）' });
      halted = 'paused_for_approval';
    } else {
      results.push({ index: step.index, actionLabel: step.actionLabel, status: 'BLOCKED', note: `${step.reason}（ここで停止）` });
      halted = 'blocked';
    }
  }
  const outcome = halted ?? 'completed';
  const summary =
    outcome === 'completed'
      ? '最後まで仮想実行しました（実際には何も実行していません）'
      : outcome === 'paused_for_approval'
        ? '人間の承認が必要なステップで停止しました（承認なしで先へ進む結果は作りません）'
        : outcome === 'blocked'
          ? '危険な操作（人間 Gate）で停止しました（この操作は自動化できません）'
          : '認識できない操作があり、人間のレビューが必要です（安全のため completed にはしません）';
  return { steps: results, outcome, summary };
}
