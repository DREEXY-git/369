// C19 Ads Management: AI 改善案下書きの生成オーケストレーション（Phase 3.5 Stream A・roadmap70）。
// 入力の注入検出 → FakeLLM 決定論生成（Zod 検証は packages/ai 側）→ AIOutput / AISafetyLog / DataAccessLog 保存。
// 外部広告 API・広告費の支出・自動最適化・外部送信は一切行わない（封印中）。
import { createHash } from 'node:crypto';
import { prisma } from './db';
import { writeAIDataAccess } from './audit';
import { detectPromptInjection, type ConfidentialityLabel } from '@hokko/shared';
import { fakeAdsImprovement, type AdsImprovementInput } from '@hokko/ai';

export interface AdsInsightResult {
  ok: boolean;
  blocked: boolean;
  reason?: string;
  aiOutputId?: string;
}

export async function generateAdsImprovementDraft(params: {
  tenantId: string;
  userId: string;
  campaignId: string;
  input: AdsImprovementInput;
}): Promise<AdsInsightResult> {
  // 1) 入力の命令注入検出（campaignName に加え、channel もサーバ検証のない自由文字列のため検査対象に含める）。
  const inj = detectPromptInjection(`${params.input.campaignName}\n${params.input.channel}`);
  await prisma.aISafetyLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.userId,
      purpose: 'ads_improvement_generation',
      check: 'injection',
      flagged: inj.flagged,
      severity: inj.severity,
      patterns: inj.patterns,
      detail: params.input.channel,
      entityType: 'MarketingCampaign',
      entityId: params.campaignId,
    },
  });
  if (inj.severity === 'high') {
    return { ok: false, blocked: true, reason: `prompt-injection:${inj.severity}` };
  }

  // 2) 生成。fakeAdsImprovement を直接呼ぶ（ai-generate.ts と同型）。
  // env（LLM_PROVIDER）にかかわらず実 LLM 経路が構造的に存在しない＝「実 LLM 封印」をコードで担保し、
  // AIOutput.model='fake' の監査記録を常に真にする。実 LLM 化は Human Certification Gate 後の別 WIP。
  const draft = fakeAdsImprovement(params.input);

  // 3) AIOutput 保存（根拠/信頼度/データ不足/次の人間確認を含む下書き）。
  const inputHash = createHash('sha256').update(JSON.stringify(params.input)).digest('hex').slice(0, 16);
  const out = await prisma.aIOutput.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      task: 'ads_improvement',
      purpose: params.input.channel,
      entityType: 'MarketingCampaign',
      entityId: params.campaignId,
      model: 'fake',
      inputHash,
      output: draft,
      outputText: draft.recommendations.join('\n'),
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
    entityType: 'MarketingCampaign',
    entityId: params.campaignId,
    label: 'INTERNAL' as ConfidentialityLabel,
    purpose: `広告改善案の下書き生成: ${params.input.campaignName}`,
  });

  return { ok: true, blocked: false, aiOutputId: out.id };
}
