// C21 SEO/Content read model の純ロジック（Phase 3.5 Stream A2・roadmap73）。
// DB 非依存。既存記事（title/body）の read-only 診断と、誇大表示（スパム）防止の検出のみを行う。
// 外部検索・順位取得・公開・CMS 投稿・PR 配信は本モジュールの範囲外（封印中）。

export interface SeoFinding {
  code: string;
  severity: 'info' | 'warn';
  message: string;
}

/** メタタイトルとして安全な長さの目安（全角換算の慣行に合わせ文字数で判定）。 */
const TITLE_MAX = 32;
const TITLE_MIN = 8;
const BODY_MIN = 300;

/** 記事1件の read-only SEO 診断（決定論・外部アクセスなし）。 */
export function diagnoseSeoContent(input: { title: string; body: string }): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const title = (input.title ?? '').trim();
  const body = input.body ?? '';
  if (title.length === 0) {
    findings.push({ code: 'title-missing', severity: 'warn', message: 'タイトルが未設定です。' });
  } else {
    if (title.length > TITLE_MAX) findings.push({ code: 'title-too-long', severity: 'warn', message: `タイトルが長すぎます（${title.length}字 > ${TITLE_MAX}字目安）。検索結果で途切れる可能性があります。` });
    if (title.length < TITLE_MIN) findings.push({ code: 'title-too-short', severity: 'info', message: `タイトルが短すぎます（${title.length}字 < ${TITLE_MIN}字目安）。` });
  }
  if (body.trim().length === 0) {
    findings.push({ code: 'body-missing', severity: 'warn', message: '本文が未作成です（下書きのみ）。' });
  } else if (body.length < BODY_MIN) {
    findings.push({ code: 'body-thin', severity: 'info', message: `本文が薄い可能性があります（${body.length}字 < ${BODY_MIN}字目安）。` });
  }
  if (body.trim().length > 0 && !/(^|\n)#{1,3}\s|<h[1-3]/.test(body)) {
    findings.push({ code: 'no-headings', severity: 'info', message: '見出し構造（#/##）が見つかりません。' });
  }
  const claims = detectForbiddenClaims(`${title}\n${body}`);
  for (const c of claims) {
    findings.push({ code: 'forbidden-claim', severity: 'warn', message: `根拠・同意の確認が必要な表現: 「${c}」（誇大表示・ステマ規制の観点で人間の確認が必要です）` });
  }
  return findings;
}

/** 同一タイトル（重複コンテンツ候補）の検出。 */
export function findDuplicateTitles(titles: string[]): string[] {
  const seen = new Map<string, number>();
  for (const t of titles) {
    const key = t.trim();
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([t]) => t);
}

/**
 * 根拠・同意なしに生成・掲出してはならない表現（No.1 系・業界初・比較優良誤認の典型）。
 * 検出は「禁止」ではなく「人間確認の必須化」に使う（AI はこれらを含む文面を生成しない）。
 */
const FORBIDDEN_CLAIM_RES: { re: RegExp; label: string }[] = [
  { re: /No\.?\s?1|ナンバー\s?ワン|ﾅﾝﾊﾞｰﾜﾝ/i, label: 'No.1表現' },
  { re: /業界初|日本初|世界初/, label: '「初」表現' },
  { re: /日本一|世界一|地域一番/, label: '「一番」表現' },
  { re: /満足度\s?\d+(\.\d+)?\s?[%％]/, label: '満足度数値' },
];

export function detectForbiddenClaims(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const { re, label } of FORBIDDEN_CLAIM_RES) {
    if (re.test(text)) hits.push(label);
  }
  return hits;
}
