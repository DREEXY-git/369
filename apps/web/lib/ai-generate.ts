// AI 生成（安全処理付き）。Phase 1-4。
// 入力の注入検出 → 生成（FakeLLM 決定論・外部送信なし）→ AIOutput / AISafetyLog / DataAccessLog 保存。
import { createHash } from 'node:crypto';
import { prisma } from './db';
import { writeAIDataAccess } from './audit';
import { detectPromptInjection, runSafetyChecks, type ConfidentialityLabel } from '@hokko/shared';

export type MarketingAssetKind =
  | 'lp'
  | 'sns'
  | 'ad'
  | 'mail'
  | 'line'
  | 'sales_doc'
  | 'review_request'
  | 'reactivation'
  | 'proposal_outline';

const KIND_LABEL: Record<MarketingAssetKind, string> = {
  lp: 'LP原稿',
  sns: 'SNS投稿案',
  ad: '広告文',
  mail: 'メルマガ',
  line: 'LINE配信文',
  sales_doc: '営業資料の構成',
  review_request: '口コミ依頼文',
  reactivation: '休眠顧客掘り起こし文',
  proposal_outline: '提案書の骨子',
};

export interface GenerateAssetInput {
  tenantId: string;
  userId: string;
  kind: MarketingAssetKind;
  campaignName: string;
  audience: string;
  instruction: string;
  channel?: string;
}

export interface GenerateAssetResult {
  ok: boolean;
  blocked: boolean;
  reason?: string;
  title: string;
  body: string;
  aiOutputId?: string;
  safetyFlags: string[];
  confidence: number;
}

// FakeLLM 相当の決定論生成（入力に基づく「それらしい日本語」。外部送信はしない）。
function fakeMarketingCopy(input: GenerateAssetInput): { title: string; body: string } {
  const aud = input.audience || 'ターゲット顧客';
  const camp = input.campaignName || 'キャンペーン';
  const ask = input.instruction || '魅力を訴求';
  const kindName = KIND_LABEL[input.kind];
  const title = `【${kindName}】${camp} — ${aud}向け`;
  const common = `対象: ${aud}\n目的/指示: ${ask}\n`;
  let body = '';
  switch (input.kind) {
    case 'lp':
      body = `# ${camp}\n\n${aud}のあなたへ。${ask}。\n\n## 選ばれる3つの理由\n1. 実績と信頼\n2. 明確な価格\n3. 手厚いサポート\n\n## 今だけの特典\n初回ご相談無料。\n\n[無料で相談する]`;
      break;
    case 'sns':
      body = `${aud}の方へ📣\n${ask}\n\n詳しくはプロフィールのリンクから✅\n#${camp.replace(/\s/g, '')} #地域密着`;
      break;
    case 'ad':
      body = `${aud}必見｜${ask}\n今なら初回特典あり。まずは無料相談を。`;
      break;
    case 'mail':
      body = `件名: ${camp}のご案内\n\n${aud}の皆さま\n\nいつもお世話になっております。\n${ask}。\nぜひこの機会にご検討ください。\n\n— 担当より`;
      break;
    case 'line':
      body = `${aud}さま、お得なお知らせ🎁\n${ask}\n＼ 今すぐチェック ／`;
      break;
    case 'sales_doc':
      body = `${common}\n## 営業資料 構成案\n1. 課題の整理\n2. 解決アプローチ\n3. 導入事例\n4. 料金プラン\n5. 導入の流れ\n6. よくある質問`;
      break;
    case 'review_request':
      body = `${aud}さま\n\n先日はご利用ありがとうございました。\nもしよろしければ、サービスのご感想・口コミをいただけますと励みになります。\n所要1分のアンケートにご協力ください。`;
      break;
    case 'reactivation':
      body = `${aud}さま、お久しぶりです。\n${ask}\n以前ご利用いただいたあなたへ、特別なご案内です。\nぜひお気軽にお問い合わせください。`;
      break;
    case 'proposal_outline':
      body = `${common}\n## 提案書 骨子\n- 背景と課題\n- 提案概要\n- 期待効果（売上/コスト/工数）\n- 実施計画\n- 費用とROI\n- 次のステップ`;
      break;
  }
  return { title, body };
}

/**
 * マーケ資産を AI 生成し、安全ログと AIOutput を保存する。
 * 危険な命令注入が検出された場合は生成を中止（blocked）。外部送信は一切行わない。
 */
export async function generateMarketingAsset(
  input: GenerateAssetInput,
): Promise<GenerateAssetResult> {
  // 1) 入力の命令注入検出
  const inj = detectPromptInjection(`${input.instruction}\n${input.audience}`);
  await prisma.aISafetyLog.create({
    data: {
      tenantId: input.tenantId,
      actorId: input.userId,
      purpose: 'marketing_asset_generation',
      check: 'injection',
      flagged: inj.flagged,
      severity: inj.severity,
      patterns: inj.patterns,
      detail: input.kind,
      entityType: 'MarketingAsset',
    },
  });
  if (inj.severity === 'high') {
    return {
      ok: false,
      blocked: true,
      reason: `prompt-injection:${inj.severity}`,
      title: '',
      body: '',
      safetyFlags: ['injection:high'],
      confidence: 0,
    };
  }

  // 2) 生成（決定論・外部送信なし）
  const { title, body } = fakeMarketingCopy(input);

  // 3) 安全フラグ（PII 検出。実際のマスクは外部送信時に適用）
  const safety = runSafetyChecks(body, { mask: false });

  // 4) AIOutput 保存（根拠/信頼度/コスト/安全フラグ）
  const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
  const out = await prisma.aIOutput.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      task: 'marketing_asset',
      purpose: input.kind,
      model: 'fake',
      inputHash,
      output: { title, body },
      outputText: body,
      confidence: 0.7,
      costEstimate: 0,
      safetyFlags: safety.flags,
    },
  });

  // 5) AI 参照ログ
  await writeAIDataAccess({
    tenantId: input.tenantId,
    actorId: input.userId,
    actorType: 'user',
    entityType: 'MarketingAsset',
    entityId: out.id,
    label: 'INTERNAL' as ConfidentialityLabel,
    purpose: `AIマーケ資産生成: ${KIND_LABEL[input.kind]}`,
  });

  return {
    ok: true,
    blocked: false,
    title,
    body,
    aiOutputId: out.id,
    safetyFlags: safety.flags,
    confidence: 0.7,
  };
}

export { KIND_LABEL as MARKETING_ASSET_KIND_LABEL };
