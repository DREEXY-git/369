// C21 SEO/Content: SEO ブリーフ下書きの生成オーケストレーション（Phase 3.5 Stream A2・roadmap73）。
// 入力の注入検出 → FakeLLM 決定論生成（fake 直呼び＝実 LLM 経路が構造的に不在・Zod 検証は packages/ai 側）
// → AIOutput / AISafetyLog / DataAccessLog 保存。外部検索・順位取得・公開・CMS 投稿・PR 配信は行わない。
// 入力は人間が入力する文字列と ContentAsset のタイトルのみ（顧客 PII・CUSTOMER_CONFIDENTIAL を渡さない）。
import { createHash } from 'node:crypto';
import { prisma } from './db';
import { writeAIDataAccess } from './audit';
import { detectPromptInjection, type ConfidentialityLabel } from '@hokko/shared';
import { fakeSeoBrief, type SeoBriefInput } from '@hokko/ai';

export interface SeoBriefGenResult {
  ok: boolean;
  blocked: boolean;
  reason?: string;
  aiOutputId?: string;
}

export async function generateSeoBriefDraft(params: {
  tenantId: string;
  userId: string;
  input: SeoBriefInput;
}): Promise<SeoBriefGenResult> {
  // 1) 入力の命令注入検出（keyword/audience/theme はすべて自由文字列）。
  const inj = detectPromptInjection(`${params.input.keyword}\n${params.input.audience}\n${params.input.theme}`);
  await prisma.aISafetyLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.userId,
      purpose: 'seo_brief_generation',
      check: 'injection',
      flagged: inj.flagged,
      severity: inj.severity,
      patterns: inj.patterns,
      detail: 'seo_brief',
      entityType: 'ContentAsset',
    },
  });
  if (inj.severity === 'high') {
    return { ok: false, blocked: true, reason: `prompt-injection:${inj.severity}` };
  }

  // 2) 生成（fake 直呼び・決定論・外部送信なし・Zod 検証済み）。
  const draft = fakeSeoBrief(params.input);

  // 3) AIOutput 保存。
  const inputHash = createHash('sha256').update(JSON.stringify(params.input)).digest('hex').slice(0, 16);
  const out = await prisma.aIOutput.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      task: 'seo_brief',
      purpose: params.input.keyword.slice(0, 80),
      entityType: 'ContentAsset',
      model: 'fake',
      inputHash,
      output: draft,
      outputText: draft.outline.join('\n'),
      confidence: draft.confidence,
      costEstimate: 0,
      safetyFlags: inj.flagged ? [`injection:${inj.severity}`] : [],
    },
  });

  // 4) AI 参照ログ。
  await writeAIDataAccess({
    tenantId: params.tenantId,
    actorId: params.userId,
    actorType: 'user',
    entityType: 'ContentAsset',
    entityId: out.id,
    label: 'INTERNAL' as ConfidentialityLabel,
    purpose: `SEOブリーフ下書き生成: ${params.input.keyword.slice(0, 40)}`,
  });

  return { ok: true, blocked: false, aiOutputId: out.id };
}
