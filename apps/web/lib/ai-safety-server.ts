// AI 安全処理の共通サーバヘルパ（全AI経路で標準利用）。Phase 1-5。
// 純ロジックは @hokko/shared/ai-safety を再利用し、結果を AISafetyLog / AIOutput / DataAccessLog に記録する。
// 方針: high 注入のみ生成中止。medium/low は継続しフラグのみ。AI は危険ツールを直接実行不可（多重防御）。
import { createHash } from 'node:crypto';
import { prisma } from './db';
import { writeAIDataAccess } from './audit';
import { recordUsageEvent } from './usage-events';
import {
  detectPromptInjection,
  checkToolPermission,
  runSafetyChecks,
  type InjectionResult,
  type AiTool,
  type ConfidentialityLabel,
} from '@hokko/shared';

export type AiActorType = 'user' | 'ai_agent' | 'ai_assistant' | 'system';

// ============ 入力の命令注入検査 ============

export interface SafeAiInputArgs {
  tenantId: string;
  actorId?: string | null;
  actorType?: AiActorType;
  purpose: string; // 例: 'leadmap_outreach_generation'
  text: string; // 検査対象（外部由来テキスト・ユーザー入力）
  entityType?: string;
  entityId?: string | null;
  detail?: string;
}

export interface SafeAiInputResult {
  blocked: boolean; // high 注入 → 生成中止
  injection: InjectionResult;
  flags: string[];
}

/**
 * AI 実行前の入力安全検査。命令注入を検出し AISafetyLog に記録する。
 * severity=high は blocked=true（呼び出し側は生成を中止）。medium/low は継続しフラグのみ。
 */
export async function safeAiInput(args: SafeAiInputArgs): Promise<SafeAiInputResult> {
  const injection = detectPromptInjection(args.text ?? '');
  await prisma.aISafetyLog.create({
    data: {
      tenantId: args.tenantId,
      actorId: args.actorId ?? null,
      actorType: args.actorType ?? 'user',
      purpose: args.purpose,
      check: 'injection',
      flagged: injection.flagged,
      severity: injection.severity,
      patterns: injection.patterns,
      detail: args.detail ?? '',
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
    },
  });
  const flags: string[] = [];
  if (injection.flagged) flags.push(`injection:${injection.severity}`);
  return { blocked: injection.severity === 'high', injection, flags };
}

// ============ AIOutput の標準保存 ============

export interface SaveAIOutputArgs {
  tenantId: string;
  userId?: string | null;
  actorType?: AiActorType;
  task: string; // 例: 'analyzeLead'
  purpose?: string;
  entityType?: string;
  entityId?: string | null;
  model?: string;
  input: unknown; // inputHash 計算用
  output: unknown; // 構造化出力（JSON）
  outputText?: string;
  citations?: unknown;
  confidence?: number;
  costEstimate?: number;
  safetyFlags?: string[];
  label?: ConfidentialityLabel;
  logDataAccess?: boolean; // true で writeAIDataAccess も実行
}

export interface SaveAIOutputResult {
  aiOutputId: string;
  inputHash: string;
  safetyFlags: string[];
}

/**
 * AIOutput を標準フォーマットで保存（task/purpose/entity/inputHash/output/confidence/cost/model/safetyFlags/citations）。
 * outputText に PII があれば safetyFlags に 'pii' を自動付与（保存本文はマスクしない＝内部参照用）。
 */
export async function saveAIOutputStandard(args: SaveAIOutputArgs): Promise<SaveAIOutputResult> {
  const inputHash = createHash('sha256').update(JSON.stringify(args.input ?? '')).digest('hex').slice(0, 16);
  const text = args.outputText ?? '';
  const extraFlags = text ? runSafetyChecks(text, { mask: false }).flags : [];
  const safetyFlags = Array.from(new Set([...(args.safetyFlags ?? []), ...extraFlags]));
  const out = await prisma.aIOutput.create({
    data: {
      tenantId: args.tenantId,
      userId: args.userId ?? null,
      task: args.task,
      purpose: args.purpose ?? '',
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      model: args.model ?? 'fake',
      inputHash,
      output: (args.output ?? {}) as object,
      outputText: text,
      citations: (args.citations ?? undefined) as object | undefined,
      confidence: args.confidence ?? 0.6,
      costEstimate: args.costEstimate ?? 0,
      safetyFlags,
    },
  });
  // Phase 1-25: 非課金の利用量記録（AI出力が1件生成されたという事実のみ）。課金ではない・billing=usage_only 固定。
  // metadata は非PIIの task/model のみ（input/output/outputText/prompt/citations/顧客情報/金額/secret は入れない）。
  // 記録失敗は AIOutput 保存・主処理を壊さない（recordUsageEvent は例外を投げず ok:false を返すだけ）。
  await recordUsageEvent({
    tenantId: args.tenantId,
    actorId: args.userId ?? null,
    actorType: (args.actorType ?? 'ai_agent') as 'user' | 'ai_agent' | 'system',
    eventType: 'ai.output.generated',
    category: 'ai',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'AIOutput',
    sourceId: out.id,
    idempotencyKey: `usage:ai.output.generated:${out.id}`,
    metadata: { task: args.task, model: args.model ?? 'fake' },
  });
  if (args.logDataAccess) {
    await writeAIDataAccess({
      tenantId: args.tenantId,
      actorId: args.userId ?? null,
      actorType: args.actorType ?? 'ai_agent',
      entityType: args.entityType ?? 'AIOutput',
      entityId: out.id,
      label: args.label ?? ('INTERNAL' as ConfidentialityLabel),
      purpose: args.purpose ?? args.task,
    });
  }
  return { aiOutputId: out.id, inputHash, safetyFlags };
}

// ============ AI ツール権限の多重防御 ============

export interface AssertToolArgs {
  tenantId: string;
  actorId?: string | null;
  actorType: AiActorType;
  tool: AiTool;
  entityType?: string;
  entityId?: string | null;
}

export class AiToolForbiddenError extends Error {
  constructor(public readonly tool: AiTool) {
    super(`ai-forbidden-tool:${tool}`);
    this.name = 'AiToolForbiddenError';
  }
}

/**
 * AI アクターが危険ツール（外部送信/削除/承認/権限変更/高機密参照/承認済み実行）を
 * 直接実行できないことを保証する多重防御。違反は AISafetyLog に記録の上で例外を投げる。
 */
export async function assertAiToolAllowed(args: AssertToolArgs): Promise<void> {
  const res = checkToolPermission(args.actorType, args.tool);
  if (!res.allowed) {
    await prisma.aISafetyLog.create({
      data: {
        tenantId: args.tenantId,
        actorId: args.actorId ?? null,
        actorType: args.actorType,
        purpose: 'tool_permission',
        check: 'tool_permission',
        flagged: true,
        severity: 'high',
        patterns: [res.reason],
        detail: args.tool,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
      },
    });
    throw new AiToolForbiddenError(args.tool);
  }
}
