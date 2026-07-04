import { isExternalLlmEnabled } from '@hokko/ai';
import { canAccessLabel, maskText, type ConfidentialityLabel, type RoleKey } from '@hokko/shared';
import { prisma } from '@/lib/db';

// Company Brain（会社方針・商品カタログ・営業プレイブック・顧客事例）の AI 参照候補取得
// （Phase 2-A-3c-2・doc44 設計準拠。Phase 2-B-5 で SalesPlaybookEntry・Phase 2-C-5 で CaseStudy を追加・doc59/doc78 準拠）。
// - read-only（create/update/delete は一切呼ばない）
// - tenantId スコープ・archivedAt:null・label は NORMAL/INTERNAL のみ・canAccessLabel を通す
// - 外部LLM（FakeLLM 以外）の場合は externalAiAllowed=true のレコードのみ注入し、maskText を通す
//   （現状 true にする UI は無いため、外部LLM時の注入はゼロになるのが安全側デフォルト）
// - FakeLLM はローカル実行のため外部送信に該当しない（doc44 §5 の整理）
// - priceNote は説明テキストとして文脈化するのみで、価格計算・請求・課金には使わない
// - 営業プレイブックの doNotSay は AI が肯定文として引用しないよう「言わない:」を必ず前置する
// - relatedPolicyIds / relatedProductCatalogItemIds は展開しない（doc59 §4・将来拡張）
// - 顧客事例（CaseStudy）は anonymized=true（匿名化済み）かつ publishStatus='private' のみ参照（doc78 §3）。
//   consentStatus は参照条件に使わない（granted でも ConsentRecord 未連携のため真正性を慎重扱い）。
//   sourceNote / customerId / consentRecordId / consentStatus は select せず AI 文脈へ注入しない（doc78 §5）。

export type CompanyBrainReference = {
  entityType: 'CompanyPolicy' | 'ProductCatalogItem' | 'SalesPlaybookEntry' | 'CaseStudy';
  entityId: string;
  title: string;
  label: ConfidentialityLabel;
};

export type CompanyBrainContext = { title: string; text: string };

export type CompanyBrainResult = {
  contexts: CompanyBrainContext[];
  references: CompanyBrainReference[];
};

const AI_READABLE_LABELS: ConfidentialityLabel[] = ['NORMAL', 'INTERNAL'];
const MAX_PER_TABLE = 3;
const MAX_TOTAL = 5;
const MIN_SCORE = 3;
const CONTEXT_TEXT_LIMIT = 800;

function uniqueBigrams(text: string): string[] {
  const grams = new Set<string>();
  const t = text.replace(/\s+/g, '');
  for (let i = 0; i + 2 <= t.length; i++) grams.add(t.slice(i, i + 2));
  return [...grams];
}

/** 質問文と候補フィールドの簡易一致スコア（決定的・LLM不使用）。 */
function matchScore(question: string, title: string, haystack: string): number {
  let score = 0;
  if (title.length >= 2 && (question.includes(title) || title.includes(question))) score += 10;
  for (const g of uniqueBigrams(question)) {
    if (haystack.includes(g)) score += 1;
  }
  return score;
}

export async function getCompanyBrainReferences(input: {
  tenantId: string;
  roles: RoleKey[];
  question: string;
}): Promise<CompanyBrainResult> {
  const { tenantId, roles, question } = input;
  const q = question.trim();
  if (!q) return { contexts: [], references: [] };

  const [policies, items, playbooks, caseStudies] = await Promise.all([
    prisma.companyPolicy.findMany({
      where: { tenantId, archivedAt: null, label: { in: AI_READABLE_LABELS } },
      select: { id: true, title: true, body: true, category: true, tags: true, label: true, externalAiAllowed: true },
    }),
    prisma.productCatalogItem.findMany({
      where: { tenantId, archivedAt: null, label: { in: AI_READABLE_LABELS } },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        targetPain: true,
        strengths: true,
        priceNote: true,
        tags: true,
        label: true,
        externalAiAllowed: true,
      },
    }),
    prisma.salesPlaybookEntry.findMany({
      where: { tenantId, archivedAt: null, label: { in: AI_READABLE_LABELS } },
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        playbookType: true,
        targetIndustry: true,
        targetSituation: true,
        objection: true,
        recommendedTalkTrack: true,
        doNotSay: true,
        tags: true,
        label: true,
        externalAiAllowed: true,
      },
    }),
    // 顧客事例（Phase 2-C-5・doc78 §3）: 匿名化済み（anonymized: true）かつ非公開（publishStatus: 'private'）のみ。
    // sourceNote / customerId / consentRecordId / consentStatus は select しない（AI 文脈へ注入しない）。
    prisma.caseStudy.findMany({
      where: {
        tenantId,
        archivedAt: null,
        publishStatus: 'private',
        anonymized: true,
        label: { in: AI_READABLE_LABELS },
      },
      select: {
        id: true,
        title: true,
        body: true,
        industry: true,
        challenge: true,
        solution: true,
        outcome: true,
        tags: true,
        label: true,
        externalAiAllowed: true,
      },
    }),
  ]);

  type Candidate = {
    entityType: CompanyBrainReference['entityType'];
    entityId: string;
    title: string;
    label: ConfidentialityLabel;
    externalAiAllowed: boolean;
    text: string;
    score: number;
  };

  const policyCandidates: Candidate[] = policies
    .filter((p) => canAccessLabel(roles, p.label))
    .map((p) => ({
      entityType: 'CompanyPolicy' as const,
      entityId: p.id,
      title: p.title,
      label: p.label,
      externalAiAllowed: p.externalAiAllowed,
      text: `【会社方針/${p.category}】${p.body}`.slice(0, CONTEXT_TEXT_LIMIT),
      score: matchScore(q, p.title, [p.title, p.category, p.tags.join(','), p.body].join('\n')),
    }))
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_TABLE);

  const itemCandidates: Candidate[] = items
    .filter((it) => canAccessLabel(roles, it.label))
    .map((it) => {
      const parts = [`【商品カタログ/${it.category}】${it.description}`];
      if (it.targetPain) parts.push(`解決する課題: ${it.targetPain}`);
      if (it.strengths) parts.push(`強み: ${it.strengths}`);
      if (it.priceNote) parts.push(`価格メモ（説明のみ・請求や課金には使わない）: ${it.priceNote}`);
      return {
        entityType: 'ProductCatalogItem' as const,
        entityId: it.id,
        title: it.name,
        label: it.label,
        externalAiAllowed: it.externalAiAllowed,
        text: parts.join('／').slice(0, CONTEXT_TEXT_LIMIT),
        score: matchScore(
          q,
          it.name,
          [it.name, it.category, it.tags.join(','), it.description, it.targetPain ?? '', it.strengths ?? ''].join('\n'),
        ),
      };
    })
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_TABLE);

  // 営業プレイブック（売り方の型・Phase 2-B-5）。playbookType を文脈上明示し、
  // objection/recommendedTalkTrack/doNotSay はそれぞれ「想定反論:」「推奨トーク:」「言わない:」を前置する。
  const PLAYBOOK_TYPE_LABEL: Record<string, string> = {
    approach: '切り口',
    objection: '反論対応',
    preparation: '提案準備',
    talk_track: 'トーク',
  };
  const playbookCandidates: Candidate[] = playbooks
    .filter((pb) => canAccessLabel(roles, pb.label))
    .map((pb) => {
      const typeLabel = PLAYBOOK_TYPE_LABEL[pb.playbookType] ?? pb.playbookType;
      const parts = [`【営業プレイブック/${typeLabel}】${pb.body}`];
      if (pb.targetIndustry) parts.push(`対象業種: ${pb.targetIndustry}`);
      if (pb.targetSituation) parts.push(`使う場面: ${pb.targetSituation}`);
      if (pb.objection) parts.push(`想定反論: ${pb.objection}`);
      if (pb.recommendedTalkTrack) parts.push(`推奨トーク: ${pb.recommendedTalkTrack}`);
      if (pb.doNotSay) parts.push(`言わない: ${pb.doNotSay}`);
      return {
        entityType: 'SalesPlaybookEntry' as const,
        entityId: pb.id,
        title: pb.title,
        label: pb.label,
        externalAiAllowed: pb.externalAiAllowed,
        text: parts.join('／').slice(0, CONTEXT_TEXT_LIMIT),
        score: matchScore(
          q,
          pb.title,
          [
            pb.title,
            pb.category,
            pb.playbookType,
            pb.targetIndustry ?? '',
            pb.targetSituation ?? '',
            pb.objection ?? '',
            pb.recommendedTalkTrack ?? '',
            pb.tags.join(','),
            pb.body,
          ].join('\n'),
        ),
      };
    })
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_TABLE);

  // 顧客事例（匿名化済みのみ・Phase 2-C-5）。業種を文脈上明示し、
  // challenge/solution/outcome は「課題:」「提供内容:」「結果（定性的）:」を前置する。
  const caseStudyCandidates: Candidate[] = caseStudies
    .filter((cs) => canAccessLabel(roles, cs.label))
    .map((cs) => {
      const parts = [`【顧客事例/${cs.industry ?? '業種未設定'}】${cs.body}`];
      if (cs.challenge) parts.push(`課題: ${cs.challenge}`);
      if (cs.solution) parts.push(`提供内容: ${cs.solution}`);
      if (cs.outcome) parts.push(`結果（定性的）: ${cs.outcome}`);
      return {
        entityType: 'CaseStudy' as const,
        entityId: cs.id,
        title: cs.title,
        label: cs.label,
        externalAiAllowed: cs.externalAiAllowed,
        text: parts.join('／').slice(0, CONTEXT_TEXT_LIMIT),
        score: matchScore(
          q,
          cs.title,
          [
            cs.title,
            cs.industry ?? '',
            cs.tags.join(','),
            cs.body,
            cs.challenge ?? '',
            cs.solution ?? '',
            cs.outcome ?? '',
          ].join('\n'),
        ),
      };
    })
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_TABLE);

  let selected = [...policyCandidates, ...itemCandidates, ...playbookCandidates, ...caseStudyCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOTAL);

  // 外部LLM（FakeLLM以外）の場合: externalAiAllowed=true のみ注入し、テキストは maskText を通す。
  // 現状 true にする UI が無いため、外部LLM時は selected が空になる（安全側デフォルト）。
  const external = isExternalLlmEnabled();
  if (external) {
    selected = selected.filter((c) => c.externalAiAllowed).map((c) => ({ ...c, text: maskText(c.text) }));
  }

  return {
    contexts: selected.map((c) => ({ title: c.title, text: c.text })),
    references: selected.map((c) => ({
      entityType: c.entityType,
      entityId: c.entityId,
      title: c.title,
      label: c.label,
    })),
  };
}
