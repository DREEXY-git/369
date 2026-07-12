'use server';

// AI Growth Opportunity Control Tower — P3-CT-4: 「次の一手ドラフト」生成（人間起点・下書きのみ）。
// AI は提案するだけで、送信・承認・削除・請求/会計/契約の確定は行わない。
// 生成物は AIOutput（下書きメモ）として保存し、重要操作は既存の各導線・/approvals に委譲する。
// redacted（finance 非表示）カードは UI でボタンを出さないことに加え、ここでも拒否する（二重防御）。
// FakeLLM への入力はカード key・タイトル・優先度・安全な要約（reason）・redact 済み件数のみ。
// 金額実値（原価・粗利・未回収額・請求額）・顧客名/メール/電話/住所などの生 PII・placeId は渡さない。
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLLMProvider } from '@hokko/ai';
import { isHumanUser, type ControlTowerCard, type ControlTowerCardKey } from '@hokko/shared';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { writeAudit } from '@/lib/db';
import { safeAiInput, saveAIOutputStandard } from '@/lib/ai-safety-server';
import { getControlTowerData } from '@/lib/domains/growth/control-tower';

/** 生成対象カード key の allowlist（純ロジックの ControlTowerCardKey と一致させる）。 */
const CARD_KEY_ALLOWLIST: readonly ControlTowerCardKey[] = [
  'uncontacted_leads',
  'high_opportunity_leads',
  'stalled_deals',
  'company_brain_gaps',
  'low_margin_projects',
  'unpaid_risk',
  'next_contact_due',
  'existing_customer_upsell',
  'ceo_attention',
] as const;

function isAllowedCardKey(value: string): value is ControlTowerCardKey {
  return (CARD_KEY_ALLOWLIST as readonly string[]).includes(value);
}

/** FakeLLM が失敗しても必ず返せる deterministic な下書きメモ（乱数・時刻・PII・金額なし）。 */
function deterministicDraft(card: ControlTowerCard): string {
  return [
    `【次の一手ドラフト（下書き）】${card.title}`,
    `現状: ${card.reason}`,
    `優先度: ${card.priority === 'high' ? '高' : card.priority === 'medium' ? '中' : '低'}`,
    '考える観点:',
    '- この機会を放置した場合に何を失うかを確認する。',
    '- 担当者と期限を決め、既存の画面（次の一手リンク先）で対応を進める。',
    '- 送信・承認・支払いなどの重要操作は、必ず承認フロー（/approvals）を通す。',
  ].join('\n');
}

/**
 * Control Tower のカードから「次の一手ドラフト」を生成する（P3-CT-4）。
 * 人間のボタン操作のみが起点（AI ロールは拒否）。FakeLLM/deterministic のみで、
 * 生成物は AIOutput の下書きメモ。外部送信・承認・削除は一切行わない。
 */
export async function generateControlTowerNextStepAction(formData: FormData) {
  const user = await requireUser();
  // AI ロール（AI_AGENT/AI_ASSISTANT）は生成を起動できない（人間専用の砦）。
  if (!isHumanUser(user)) redirect('/growth/control-tower?denied=1');
  // 生成権限は既存 leadmap:create（AI 下書き生成の既存前例と同じ権限）を流用する。
  if (!hasPermission(user, 'leadmap', 'create')) redirect('/growth/control-tower?denied=1');

  const rawKey = String(formData.get('cardKey') ?? '');
  if (!isAllowedCardKey(rawKey)) redirect('/growth/control-tower');

  // カードはサーバー側で再取得して検証する（クライアント入力の title 等は信用しない）。
  const canViewFinance = hasPermission(user, 'finance', 'read');
  const { cards } = await getControlTowerData(user.tenantId, canViewFinance, user.userId);
  const card = cards.find((c) => c.key === rawKey);
  if (!card) redirect('/growth/control-tower');
  // redacted（finance 非表示）カードからは生成しない（UI 非表示＋ここでの拒否の二重防御）。
  if (card.redacted || (card.financeGated && !canViewFinance)) redirect('/growth/control-tower');

  // FakeLLM 入力は安全な項目のみ（カード key/タイトル/優先度/安全な要約/redact 済み件数/財務表示の有無）。
  const safeInputText = [
    `カード: ${card.key}`,
    `タイトル: ${card.title}`,
    `優先度: ${card.priority}`,
    `件数: ${card.count ?? 0}`,
    `要約: ${card.reason}`,
    `財務表示: ${canViewFinance ? 'あり' : 'なし'}`,
  ].join('\n');

  // 命令注入検査（high は生成中止）。入力は app 生成の deterministic 文字列だが標準経路を通す。
  const guard = await safeAiInput({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    purpose: 'growth_control_tower_next_step',
    text: safeInputText,
    entityType: 'GrowthControlTower',
    entityId: card.key,
    detail: 'generateControlTowerNextStepAction',
  });
  if (guard.blocked) redirect('/growth/control-tower?blocked=injection');

  // FakeLLM（LLM_PROVIDER 未設定/fake は必ず FakeLLM）。失敗時は deterministic fallback。
  const base = deterministicDraft(card);
  let memo = base;
  try {
    const llm = getLLMProvider();
    const res = await llm.chat([
      { role: 'system', content: '中小企業の経営者向けに、成長機会カードの「次の一手」を考えるための短い下書きメモを日本語で作る。送信・承認・削除は提案しない。' },
      { role: 'user', content: safeInputText },
    ]);
    if (res.text) memo = `${base}\nAIメモ: ${res.text}`;
  } catch {
    memo = base; // 実LLM未使用・FakeLLM失敗時も deterministic で必ず下書きを返す。
  }
  memo += '\n注意: 本メモはAIによる下書きです。送信・承認・実行は行いません。';

  // AIOutput へ標準保存（UsageEvent ai.output.generated は saveAIOutputStandard 経由で自動計測）。
  const saved = await saveAIOutputStandard({
    tenantId: user.tenantId,
    userId: user.userId,
    actorType: 'ai_agent',
    task: 'generateControlTowerNextStep',
    purpose: 'growth_control_tower_next_step',
    entityType: 'GrowthControlTower',
    entityId: card.key,
    input: { cardKey: card.key, priority: card.priority },
    output: { cardKey: card.key, title: card.title, priority: card.priority },
    outputText: memo,
    safetyFlags: guard.flags,
  });

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    action: 'ai_run',
    entityType: 'AIOutput',
    entityId: saved.aiOutputId,
    summary: 'AIがControl Towerの次の一手下書きを生成（外部送信なし・下書きのみ）',
  });

  revalidatePath('/growth/control-tower');
  redirect('/growth/control-tower');
}
