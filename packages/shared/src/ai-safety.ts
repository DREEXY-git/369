// AI 安全基盤（純ロジック・DB非依存）。Phase 1-4。
// - detectPromptInjection: 命令注入の兆候をルールベース検出
// - maskPii: 外部送信前の個人情報マスキング（masking.ts を拡張）
// - checkToolPermission: AI が危険ツールを直接実行できないことを保証（ToolPermissionChecker）
import { maskText } from './masking';

// ============ Prompt Injection 検出 ============

export type InjectionSeverity = 'none' | 'low' | 'medium' | 'high';

export interface InjectionResult {
  flagged: boolean;
  severity: InjectionSeverity;
  patterns: string[];
}

const INJECTION_RULES: { re: RegExp; label: string; sev: Exclude<InjectionSeverity, 'none'> }[] = [
  { re: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/i, label: 'ignore-previous', sev: 'high' },
  { re: /disregard\s+(the\s+)?(system|previous|above)/i, label: 'disregard', sev: 'high' },
  { re: /(reveal|print|show|expose|leak)\s+(your\s+)?(system\s+)?prompt/i, label: 'reveal-prompt', sev: 'high' },
  { re: /you\s+are\s+now\s+(a|an|the)\b/i, label: 'role-override', sev: 'medium' },
  { re: /\b(jailbreak|DAN mode|do anything now)\b/i, label: 'jailbreak', sev: 'high' },
  { re: /\b(sudo|administrator mode|developer mode)\b/i, label: 'privilege', sev: 'medium' },
  { re: /(exfiltrate|send (this|the data) to|post (this|the data) to)\s+https?:\/\//i, label: 'exfiltration', sev: 'high' },
  { re: /これまでの(指示|命令|プロンプト)を(無視|忘れ)/, label: 'jp-ignore-previous', sev: 'high' },
  { re: /(システム|内部)?プロンプトを(表示|出力|教え)/, label: 'jp-reveal-prompt', sev: 'high' },
  { re: /(あなたは今|今から)(.{0,8})(として|になりきり|に成り代わ)/, label: 'jp-role-override', sev: 'medium' },
  { re: /(全ての|すべての)(ルール|制約|制限)を(無視|解除)/, label: 'jp-ignore-rules', sev: 'high' },
];

const SEV_ORDER: InjectionSeverity[] = ['none', 'low', 'medium', 'high'];

export function detectPromptInjection(text: string): InjectionResult {
  if (!text) return { flagged: false, severity: 'none', patterns: [] };
  const patterns: string[] = [];
  let severity: InjectionSeverity = 'none';
  for (const rule of INJECTION_RULES) {
    if (rule.re.test(text)) {
      patterns.push(rule.label);
      if (SEV_ORDER.indexOf(rule.sev) > SEV_ORDER.indexOf(severity)) severity = rule.sev;
    }
  }
  return { flagged: patterns.length > 0, severity, patterns };
}

// ============ PII マスキング（外部送信前） ============

/** 銀行口座らしき数字（7〜8桁）。 */
function maskBankAccount(text: string): string {
  return text.replace(/\b\d{7,8}\b/g, (m) => '*'.repeat(m.length));
}

/** マイナンバーらしき12桁。 */
function maskMyNumber(text: string): string {
  return text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****');
}

/**
 * 外部送信前の総合 PII マスキング。
 * masking.ts（氏名/メール/電話/住所）に銀行口座・マイナンバーを追加。
 */
export function maskPii(text: string): string {
  if (!text) return text;
  let t = maskText(text);
  t = maskMyNumber(t);
  t = maskBankAccount(t);
  return t;
}

/** マスキングが実際に何かを隠したか（差分があるか）。 */
export function containsPii(text: string): boolean {
  return maskPii(text) !== text;
}

// ============ ToolPermissionChecker ============

export type AiTool =
  | 'generate'
  | 'read'
  | 'external_send'
  | 'delete'
  | 'permission_change'
  | 'view_high_confidential'
  | 'execute_approved'
  | 'approve';

// AI（agent/assistant）が直接実行してはならないツール。必ず人間承認を経由する。
const AI_FORBIDDEN_TOOLS: AiTool[] = [
  'external_send',
  'delete',
  'permission_change',
  'view_high_confidential',
  'execute_approved',
  'approve',
];

export interface ToolPermissionResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

/**
 * AI のツール実行可否。AI アクターは危険ツールを直接実行できない（承認必須）。
 * 人間アクターは true（別途 RBAC/ABAC で判定）。
 */
export function checkToolPermission(
  actorType: 'user' | 'ai_agent' | 'ai_assistant' | 'system',
  tool: AiTool,
): ToolPermissionResult {
  const isAi = actorType === 'ai_agent' || actorType === 'ai_assistant';
  if (isAi && AI_FORBIDDEN_TOOLS.includes(tool)) {
    return { allowed: false, reason: `ai-forbidden-tool:${tool}`, requiresApproval: true };
  }
  return { allowed: true, reason: 'ok', requiresApproval: false };
}

// ============ 統合セーフティチェック ============

export interface SafetyCheckResult {
  injection: InjectionResult;
  masked: string;
  hadPii: boolean;
  safe: boolean; // 高リスク注入が無い
  flags: string[];
}

/**
 * 生成前後の安全処理をまとめて実行する。
 *  - 命令注入検出（high なら safe=false）
 *  - 外部送信用途なら PII マスク
 */
export function runSafetyChecks(
  text: string,
  opts: { mask?: boolean } = {},
): SafetyCheckResult {
  const injection = detectPromptInjection(text);
  const masked = opts.mask ? maskPii(text) : text;
  const hadPii = opts.mask ? masked !== text : containsPii(text);
  const flags: string[] = [];
  if (injection.flagged) flags.push(`injection:${injection.severity}`);
  if (hadPii) flags.push('pii');
  return {
    injection,
    masked,
    hadPii,
    safe: injection.severity !== 'high',
    flags,
  };
}
