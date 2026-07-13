// 未回収・延滞の請求に対する「お支払い状況のご確認（督促）」下書きの決定論テンプレートと対象判定。Phase 1-15。
// 方針: AI生成は使わない（法的・心理的にセンシティブ・外部送信に近いため決定論で安全性を担保）。
// 文面は丁寧・事務的・確認ベース・行き違い配慮。威圧/法的断定/強制回収の表現は入れない。
// 純ロジック（DB/UI 非依存）。実際の PII マスク・承認・送信は web 側 lib（dunning.ts）で行う。

export interface DunningInput {
  customerName: string | null;
  companyName: string; // 送信者（自社）表示
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  outstanding: number; // 未回収額（total - paid, 0 下限）
  dueDate: Date | null;
  stage?: number; // P3-Q2C-C 督促段数（1=やんわり確認〜3=最終確認）。既定 1。
}

export interface DunningDraft {
  subject: string;
  body: string;
}

// P3-Q2C-C: 督促の多段。上がるほど丁寧に「強め」だが、威圧・法的断定・強制回収の表現は入れない
// （一貫して確認ベース・行き違い配慮）。stage は 1..3 に丸める。
export const MAX_DUNNING_STAGE = 3;

export function clampDunningStage(stage: number | undefined): number {
  const s = Math.floor(Number(stage) || 1);
  return Math.max(1, Math.min(MAX_DUNNING_STAGE, s));
}

/** 次の督促段（送信済み reminder 数から算出。最大 3 で頭打ち）。 */
export function nextDunningStage(priorSentCount: number): number {
  return clampDunningStage((Math.max(0, Math.floor(priorSentCount)) || 0) + 1);
}

export interface DunningStageMeta {
  stage: number;
  label: string; // 画面バッジ用
  headline: string; // 本文の書き出しトーン
}

const DUNNING_STAGE_META: Record<number, { label: string; headline: string; subjectPrefix: string }> = {
  1: {
    label: 'やんわり確認',
    headline: '下記ご請求につきまして、お支払い状況の確認のためご連絡いたしました。',
    subjectPrefix: 'お支払い状況のご確認',
  },
  2: {
    label: 'リマインド',
    headline: '先般ご案内の下記ご請求につきまして、その後のお支払い状況を再度ご確認させていただきたくご連絡いたしました。',
    subjectPrefix: '【再度のご確認】お支払い状況',
  },
  3: {
    label: '最終確認',
    headline: '度重なるご連絡となり恐れ入ります。下記ご請求につきまして、お手数ですが今一度お支払い状況をご確認いただけますようお願い申し上げます。',
    subjectPrefix: '【最終のご確認のお願い】お支払い状況',
  },
};

export function dunningStageMeta(stage: number | undefined): DunningStageMeta {
  const s = clampDunningStage(stage);
  const m = DUNNING_STAGE_META[s]!;
  return { stage: s, label: m.label, headline: m.headline };
}

function jpy(n: number): string {
  return `${Math.round(n).toLocaleString('ja-JP')}円`;
}

function jpDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString('ja-JP') : '別途ご相談';
}

/**
 * 督促（お支払い状況のご確認）の下書きを決定論で生成。件名は請求番号から導出（保存しない）。
 * 必須要素: 顧客名 / 請求番号 / 請求金額 / 入金済額 / 未回収額 / 支払期日 /
 *           「お支払い状況の確認」/「行き違いの場合はご容赦ください」/「ご確認をお願いいたします」/
 *           「お手元の請求書をご確認ください」（振込先が未実装のため）。
 */
export function buildDunningDraft(input: DunningInput): DunningDraft {
  const name = input.customerName?.trim() || 'ご担当者';
  const meta = dunningStageMeta(input.stage);
  const stageMetaRaw = DUNNING_STAGE_META[meta.stage]!;
  const subject = `【${stageMetaRaw.subjectPrefix}】請求書 ${input.invoiceNumber}`;
  const body = [
    `${name} 様`,
    '',
    'いつもお世話になっております。',
    `${input.companyName} です。`,
    '',
    meta.headline,
    '',
    `・請求番号: ${input.invoiceNumber}`,
    `・ご請求金額: ${jpy(input.total)}`,
    `・入金済額: ${jpy(input.paidAmount)}`,
    `・未回収額: ${jpy(input.outstanding)}`,
    `・お支払期日: ${jpDate(input.dueDate)}`,
    '',
    'お振込のお手続きがお済みでない場合は、お手元の請求書をご確認のうえ、ご対応いただけますと幸いです。',
    '行き違いでお支払いがお済みの場合は、何卒ご容赦ください。',
    '',
    'ご不明な点がございましたら、お気軽にお問い合わせください。',
    'ご確認をお願いいたします。',
  ].join('\n');
  return { subject, body };
}

/**
 * 督促対象か（純判定）。
 * 対象: 未完済（DRAFT/PAID/VOID 以外）かつ paidAmount < total かつ Receivable が open/overdue（または未連携）。
 * 対象外: DRAFT / PAID / VOID、全額入金済み、Receivable が collected。
 */
export function isDunningEligible(
  invoiceStatus: string,
  paidAmount: number,
  total: number,
  receivableStatus: string | null,
): boolean {
  if (invoiceStatus === 'DRAFT' || invoiceStatus === 'PAID' || invoiceStatus === 'VOID') return false;
  if (paidAmount >= total) return false;
  if (receivableStatus != null && receivableStatus !== 'open' && receivableStatus !== 'overdue') return false;
  return true;
}
