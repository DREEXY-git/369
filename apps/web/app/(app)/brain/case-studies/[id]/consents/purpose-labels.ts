// CaseStudyConsent（許諾台帳）画面の表示用ラベル（doc86 §5 の purpose 6区分）。
// 用途の値は @hokko/shared の CASE_STUDY_CONSENT_PURPOSES が正（actions 側で機械検証）。

export const CASE_STUDY_CONSENT_PURPOSE_LABEL: Record<string, string> = {
  internal_view: '社内閲覧',
  ai_reference: 'AI参照',
  external_publish: '外部公開',
  pr: 'PR',
  seo: 'SEO',
  customer_voice: '顧客の声掲載',
};

export function formatConsentDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
