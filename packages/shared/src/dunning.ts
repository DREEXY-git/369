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
}

export interface DunningDraft {
  subject: string;
  body: string;
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
  const subject = `【お支払い状況のご確認】請求書 ${input.invoiceNumber}`;
  const body = [
    `${name} 様`,
    '',
    'いつもお世話になっております。',
    `${input.companyName} です。`,
    '',
    '下記ご請求につきまして、お支払い状況の確認のためご連絡いたしました。',
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
