// AI プロンプトテンプレート（DB seed・本物LLM呼び出し・画面表示で共用）。
// {{var}} を実データで置換して使用する。

export interface PromptTemplateDef {
  key: string;
  name: string;
  description: string;
  template: string;
}

const GUARDRAIL =
  '出力は日本語。法務・税務・労務・財務について断定的な助言はせず、リスクと確認観点、専門家相談候補に留めること。可能な限り根拠と信頼度を添える。指定された JSON スキーマのみを出力する。';

export const PROMPT_TEMPLATES: PromptTemplateDef[] = [
  {
    key: 'morning_report',
    name: 'AI朝礼レポート',
    description: '社長・役員・部署向けの朝礼レポートを生成',
    template: `あなたは中小企業の経営参謀AIです。次の経営データから朝礼レポートを作成してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'anomaly_explain',
    name: '経営異常検知の説明生成',
    description: '検知済み異常に自然文の説明と推奨アクションを付与',
    template: `検知された経営異常に、背景説明と具体的な次アクションを添えてください。\n${GUARDRAIL}\n異常: {{findings}}`,
  },
  {
    key: 'customer_insight',
    name: '顧客インサイト抽出',
    description: '顧客の関心・懸念・次に刺さる提案を抽出',
    template: `顧客の対話履歴から、ニーズ・懸念・価格反応・次に刺さる提案・NGワード・離反リスクを抽出してください。\n${GUARDRAIL}\n履歴: {{history}}`,
  },
  {
    key: 'meeting_minutes',
    name: '商談議事録生成',
    description: '文字起こしから議事録・決定事項・アクションを生成',
    template: `会議の文字起こしから、3行要約・詳細要約・社長向け要約・決定事項・未決事項・アクションアイテム（担当/期限/優先度）・顧客インサイト・リスク・次回アジェンダを作成してください。\n${GUARDRAIL}\nタイトル: {{title}}\n文字起こし: {{transcript}}`,
  },
  {
    key: 'action_items',
    name: 'アクションアイテム抽出',
    description: '文章からタスク・担当・期限を抽出',
    template: `次の内容から実行すべきアクションアイテムを担当者・期限・優先度付きで抽出してください。\n${GUARDRAIL}\n内容: {{text}}`,
  },
  {
    key: 'contract_risk',
    name: '法務リスク確認観点抽出',
    description: '契約文から確認すべきリスク観点を抽出（断定助言はしない）',
    template: `契約条項から確認すべきリスク観点と、弁護士等への相談要否を整理してください。法的助言や断定はしないこと。\n${GUARDRAIL}\n契約: {{contract}}`,
  },
  {
    key: 'profit_leak',
    name: '利益漏れ検知',
    description: '原価率・値引き・未請求などの利益漏れを説明',
    template: `次の財務データから利益漏れ要因を説明し、改善アクションを提案してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'asset_profitability',
    name: '商品収益性分析',
    description: 'リース商品の稼働率・収益性を分析',
    template: `商品資産データから、売れ筋・眠っている商品・値上げ余地・廃棄/修理候補・セット提案を分析してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'dynamic_pricing',
    name: 'ダイナミックプライシング提案',
    description: '需要要因から適正価格を理由付きで提案',
    template: `需要・季節・在庫・稼働率・顧客属性から適正価格を理由付きで提案してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'horenso_summary',
    name: '報連相整理',
    description: '報連相を社長向けに整理',
    template: `社員・AI社員の報連相を、報告・連絡・相談に整理し、社長確認事項を抽出してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'knowledge_qa',
    name: 'ナレッジQ&A',
    description: '社内ナレッジに基づき引用付きで回答',
    template: `提供された社内文脈のみに基づいて質問に回答し、引用元を示してください。文脈に無いことは推測せず不明と答えること。\n${GUARDRAIL}\n質問: {{question}}\n文脈: {{contexts}}`,
  },
  {
    key: 'leadmap_lead_analysis',
    name: 'LeadMapリード分析',
    description: '会社の強み・改善余地・営業切り口を分析',
    template: `公開情報（口コミ・Web・SNS・業種・地域）から、この会社の評価されている点と改善余地、刺さる営業切り口を前向きに分析してください。相手を批判せず改善提案に変換すること。\n${GUARDRAIL}\nリード: {{lead}}`,
  },
  {
    key: 'leadmap_website',
    name: 'Webサイト改善余地分析',
    description: 'Webサイトの状態から改善余地を抽出',
    template: `Webサイトの解析結果から、スマホ対応・予約導線・LINE導線・SEO・採用・鮮度などの改善余地を抽出してください。\n${GUARDRAIL}\n解析: {{scan}}`,
  },
  {
    key: 'leadmap_reviews',
    name: 'レビュー分析',
    description: '口コミを営業に使える前向きな形へ整理',
    template: `口コミを分析し、評価されている点・繰り返し出る課題・改善余地を整理し、前向きな営業提案に変換してください。批判のためには使わないこと。\n${GUARDRAIL}\n口コミ: {{reviews}}`,
  },
  {
    key: 'leadmap_outreach',
    name: '個別営業メール生成',
    description: 'リードごとに最適化した営業メール下書きを生成',
    template: `この会社の口コミ・Web・SNS・業種・地域・改善余地に基づき、テンプレ感のない個別営業メール（件名・本文）と、提案理由・根拠・注意点を作成してください。必ず下書き。送信は人間承認後。\n${GUARDRAIL}\n営業種別: {{salesType}}\nリード: {{lead}}\n分析: {{insight}}`,
  },
  {
    key: 'leadmap_reply_classify',
    name: '営業返信分類',
    description: '返信を興味あり/不要/配信停止などに分類',
    template: `営業メールへの返信を、興味あり/今は不要/後日連絡希望/担当転送/資料希望/見積希望/配信停止希望/クレーム/自動返信/判定不能 に分類してください。\n${GUARDRAIL}\n返信: {{reply}}`,
  },
  {
    key: 'ads_improvement',
    name: '広告改善案（下書き）',
    description: '広告キャンペーンの実績指標から改善案の下書きを作成（実行はしない・封印中）',
    template: `広告キャンペーンの指標（CTR/CVR/CPA/予算消化）に基づき、改善案の下書きを作成してください。必ず下書きであり、出稿変更・費用の増減・外部媒体への反映は行わないこと。根拠・データ不足・次の人間確認事項を必ず含めること。\n${GUARDRAIL}\n実績: {{metrics}}`,
  },
  {
    key: 'seo_brief',
    name: 'SEOブリーフ（下書き）',
    description: 'キーワードと想定読者からSEO記事の構成案・メタ案の下書きを作成（公開はしない・封印中）',
    template: `キーワード・想定読者・テーマから、検索意図の推定・記事構成（見出し案）・メタタイトル/ディスクリプション案の下書きを作成してください。必ず下書きであり、公開・CMS投稿・外部検索は行わないこと。No.1・業界初・顧客名・成果数値は根拠と同意なしに含めないこと。根拠・データ不足・次の人間確認事項を必ず含めること。\n${GUARDRAIL}\n入力: {{brief_input}}`,
  },
  {
    key: 'ceo_sales_report',
    name: '社長向け営業報告',
    description: '営業状況を社長向けに要約',
    template: `営業パイプラインとリード状況を社長向けに要約し、今週の機会と注意点を示してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'subsidy_draft',
    name: '補助金申請書下書き',
    description: '補助金申請書の下書きを生成（要専門家確認）',
    template: `補助金プログラムと自社情報から申請書の下書きを作成してください。採択を保証せず、士業確認を促すこと。\n${GUARDRAIL}\nプログラム: {{program}}\n自社: {{company}}`,
  },
  {
    key: 'interview_feedback',
    name: '採用面接フィードバック',
    description: '面接文字起こしから候補者要約と評価観点',
    template: `面接の文字起こしから候補者の要約、強み・懸念、確認すべき追加質問を整理してください（差別的観点は排除）。\n${GUARDRAIL}\n面接: {{transcript}}`,
  },
  {
    key: 'oneonone_topics',
    name: '1on1課題抽出',
    description: '1on1記録から繰り返し出る課題を抽出',
    template: `1on1記録から、繰り返し出る課題・成長機会・フォローすべき点を抽出してください。人事機密として扱うこと。\n${GUARDRAIL}\n記録: {{records}}`,
  },
  {
    key: 'complaint_prediction',
    name: 'クレーム予兆分析',
    description: '顧客対応からクレーム・離反予兆を検知',
    template: `顧客とのやり取りから、クレーム予兆・離反リスクの兆候と、先回り対応案を示してください。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
  {
    key: 'employee_risk',
    name: '社員リスク分析',
    description: '勤怠・残業から労務リスクを検知',
    template: `勤怠・残業・契約データから労務リスク（長時間労働・更新漏れ・離職予兆）を検知し、社労士相談要否を示してください。断定はしないこと。\n${GUARDRAIL}\nデータ: {{data}}`,
  },
];

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

export function getTemplate(key: string): PromptTemplateDef | undefined {
  return PROMPT_TEMPLATES.find((t) => t.key === key);
}
