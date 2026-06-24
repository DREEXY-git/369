// AI タスクの安全実行ラッパー。入力注入検査 → 実行 → AIOutput 標準保存を 1 関数に集約。Phase 1-5。
// 各AI経路（leadmap/meetings/communications/knowledge）から共通利用する。
import { safeAiInput, saveAIOutputStandard, type AiActorType } from './ai-safety-server';
import type { ConfidentialityLabel } from '@hokko/shared';

export interface SafeAiRunOutput {
  output: unknown;
  outputText?: string;
  confidence?: number;
  citations?: unknown;
  costEstimate?: number;
}

export interface RunSafeAiTaskArgs {
  tenantId: string;
  actorId?: string | null;
  actorType?: AiActorType;
  task: string;
  purpose: string;
  entityType?: string;
  entityId?: string | null;
  model?: string;
  /** 命令注入の検査対象（外部由来テキスト・ユーザー入力）。 */
  guardText: string;
  /** 実行本体。注入 high の場合は呼ばれない。 */
  run: () => Promise<SafeAiRunOutput>;
  label?: ConfidentialityLabel;
  logDataAccess?: boolean;
}

export interface RunSafeAiTaskResult {
  ok: boolean;
  blocked: boolean;
  reason?: string;
  aiOutputId?: string;
  output?: unknown;
  outputText?: string;
  safetyFlags: string[];
}

/**
 * AI タスクを安全に実行する標準ラッパー。
 *  1) safeAiInput で入力の命令注入を検査（high は中止し blocked=true）
 *  2) run() 実行
 *  3) saveAIOutputStandard で AIOutput を標準保存（PII フラグ自動付与）
 */
export async function runSafeAiTask(args: RunSafeAiTaskArgs): Promise<RunSafeAiTaskResult> {
  const guard = await safeAiInput({
    tenantId: args.tenantId,
    actorId: args.actorId,
    actorType: args.actorType,
    purpose: args.purpose,
    text: args.guardText,
    entityType: args.entityType,
    entityId: args.entityId,
    detail: args.task,
  });
  if (guard.blocked) {
    return {
      ok: false,
      blocked: true,
      reason: `prompt-injection:${guard.injection.severity}`,
      safetyFlags: guard.flags,
    };
  }
  const r = await args.run();
  const saved = await saveAIOutputStandard({
    tenantId: args.tenantId,
    userId: args.actorId,
    actorType: args.actorType,
    task: args.task,
    purpose: args.purpose,
    entityType: args.entityType,
    entityId: args.entityId,
    model: args.model,
    input: args.guardText,
    output: r.output,
    outputText: r.outputText,
    citations: r.citations,
    confidence: r.confidence,
    costEstimate: r.costEstimate,
    safetyFlags: guard.flags,
    label: args.label,
    logDataAccess: args.logDataAccess,
  });
  return {
    ok: true,
    blocked: false,
    aiOutputId: saved.aiOutputId,
    output: r.output,
    outputText: r.outputText,
    safetyFlags: saved.safetyFlags,
  };
}
