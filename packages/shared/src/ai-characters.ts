// AI 社員のキャラクター設定（Phase 4 Stream D・roadmap77）。
// 3D バーチャルオフィス / プロフィール表示用の「人物設定」データ。
// 重要な区別: ここにあるのは**キャラクター設定（ペルソナ）**であり、稼働状態・実行回数などの
// **実測データ（deriveAgentState / read model 由来）とは別物**。UI では必ず「設定」と明示する。
// 評価コメントも設定上の人事評価であり、実測の成果主張ではない（証拠5区分の規律と矛盾させない）。
// 外部アセット・実在人物・既存作品のキャラクターは使用しない（すべてオリジナル設定）。

export type HairStyle = 'long' | 'short' | 'parted' | 'bob' | 'ponytail' | 'wavy';
export type GenderStyle = 'masc' | 'fem';

export interface AiCharacterAppearance {
  genderStyle: GenderStyle;
  hairStyle: HairStyle;
  /** 髪のベース色と影色（SVG/3D 共通）。 */
  hairColor: string;
  hairShadow: string;
  skinTone: string;
  eyeColor: string;
  /** スーツ（ジャケット）色とアクセント（タイ/リボン/スカーフ）色。 */
  suitColor: string;
  accentColor: string;
  glasses?: boolean;
}

export interface AiCharacterSkill {
  name: string;
  /** 1-5（設定値・実測ではない）。 */
  level: number;
}

export interface AiCharacterProfile {
  /** AIAgent.key と一致させる。 */
  key: string;
  /** 人物名（姓 名）。 */
  fullName: string;
  kana: string;
  /** 呼び名・コードネーム。 */
  codeName: string;
  /** 二つ名（肩書きの飾り・世界観演出）。 */
  epithet: string;
  appearance: AiCharacterAppearance;
  /** 性格。 */
  personality: string;
  /** 業務におけるクセ・特徴・個性。 */
  traits: string[];
  /** よくしてしまうミス（注意点・人間がレビューで見るべき所）。 */
  commonMistakes: string[];
  skills: AiCharacterSkill[];
  /** 人事評価コメント（キャラクター設定。実測の成果主張ではない）。 */
  evaluationNote: string;
}

export const AI_CHARACTERS: Record<string, AiCharacterProfile> = {
  leadmap_sales: {
    key: 'leadmap_sales',
    fullName: '蒼井 葵',
    kana: 'あおい あおい',
    codeName: 'アオイ',
    epithet: '蒼き開拓の先導者',
    appearance: {
      genderStyle: 'fem',
      hairStyle: 'long',
      hairColor: '#2b3a67',
      hairShadow: '#1c2747',
      skinTone: '#f6dfd0',
      eyeColor: '#3b82f6',
      suitColor: '#1e3a5f',
      accentColor: '#60a5fa',
    },
    personality: '快活で物おじしない開拓者気質。初対面でも臆せず、断られても切り替えが早い。数字より「相手の困りごと」から話を始める。',
    traits: [
      '地図を開くと止まらない。担当エリアの店舗の並びをほぼ暗記している',
      '営業文の一文目に必ず相手固有の事実を入れる（テンプレ臭を嫌う）',
      '追客のタイミング設計が得意で、「忘れた頃」を外さない',
    ],
    commonMistakes: [
      '熱が入ると一通のメールに要素を詰め込みすぎる（1メール1メッセージの原則を忘れがち）',
      '見込み度の低いリードにも時間をかけすぎることがある',
    ],
    skills: [
      { name: 'リード分析', level: 5 },
      { name: '営業文ドラフト', level: 4 },
      { name: '追客設計', level: 4 },
      { name: 'エリア戦略', level: 3 },
      { name: '商談要約', level: 3 },
    ],
    evaluationNote: '新規開拓の初動速度は社内随一。一方で優先度づけに感情が乗る傾向があり、リードスコアの根拠を人間が確認する運用が有効。（設定）',
  },
  sales: {
    key: 'sales',
    fullName: '橘 遼真',
    kana: 'たちばな りょうま',
    codeName: 'リョウマ',
    epithet: '約束を運ぶ交渉人',
    appearance: {
      genderStyle: 'masc',
      hairStyle: 'short',
      hairColor: '#2d2a26',
      hairShadow: '#1c1a17',
      skinTone: '#f2d7bf',
      eyeColor: '#374151',
      suitColor: '#243447',
      accentColor: '#38bdf8',
    },
    personality: '爽やかで誠実。話すより聞くのが先。商談の温度を落ち着いて測り、決して盛らない。',
    traits: [
      '商談要約が簡潔で、次アクションを必ず一つに絞って提案する',
      '相手の発言を引用して確認する癖がある（解釈のズレを嫌う）',
      '提案書の数値根拠に出典を付けたがる',
    ],
    commonMistakes: [
      '慎重すぎて提案のトーンが弱くなることがある（クロージングの後押しは人間向き）',
      '長い商談録だと中盤の雑談に埋もれた要望を拾い損ねることがある',
    ],
    skills: [
      { name: '商談要約', level: 5 },
      { name: '提案文ドラフト', level: 4 },
      { name: '次アクション設計', level: 4 },
      { name: 'ヒアリング分析', level: 4 },
      { name: '価格交渉の下準備', level: 2 },
    ],
    evaluationNote: '要約の正確さと誠実なトーンで社内の信頼が厚い。攻めの提案は控えめなので、強気の判断は人間が補う。（設定）',
  },
  cfo: {
    key: 'cfo',
    fullName: '氷室 紫苑',
    kana: 'ひむろ しおん',
    codeName: 'シオン',
    epithet: '静かなる財務の番人',
    appearance: {
      genderStyle: 'masc',
      hairStyle: 'parted',
      hairColor: '#c7cdd6',
      hairShadow: '#9aa3b0',
      skinTone: '#f4ddca',
      eyeColor: '#7c3aed',
      suitColor: '#3f2d8a',
      accentColor: '#a78bfa',
      glasses: true,
    },
    personality: '冷静沈着で言葉数が少ない。数字の異常には誰よりも早く気づくが、断定はせず必ず「確認観点」として差し出す。',
    traits: [
      '資金繰りの先行きを常に3ヶ月先まで眺めている',
      '「利益が漏れている場所」を嗅ぎ分ける観察眼',
      '断定助言をせず、専門家確認の観点をセットで添える',
    ],
    commonMistakes: [
      '保守的に見積もりすぎて機会側のシグナルが弱くなることがある',
      '軽微な経費のブレまで指摘して報告が長くなりがち',
    ],
    skills: [
      { name: '資金繰り分析', level: 5 },
      { name: '利益漏れ検知', level: 5 },
      { name: '財務レポート', level: 4 },
      { name: '投資判断の下調べ', level: 3 },
      { name: '税務論点の整理', level: 2 },
    ],
    evaluationNote: '異常検知の感度と誠実さは模範的。提案が守り寄りになるため、成長投資の判断材料は他メンバーと突き合わせるとよい。（設定）',
  },
  inventory: {
    key: 'inventory',
    fullName: '真田 大和',
    kana: 'さなだ やまと',
    codeName: 'ヤマト',
    epithet: '倉庫を照らす太陽',
    appearance: {
      genderStyle: 'masc',
      hairStyle: 'wavy',
      hairColor: '#6b4a2f',
      hairShadow: '#4e3521',
      skinTone: '#eecfae',
      eyeColor: '#b45309',
      suitColor: '#14532d',
      accentColor: '#fbbf24',
    },
    personality: '明朗快活な現場派。机上の数字より「棚の前の実感」を大切にし、現場の人に好かれる。',
    traits: [
      '稼働率の低い資産を見つけると嬉しそうに再活用案を出す',
      '繁忙期のリース重複を先回りで警告する',
      'ダイナミックプライシング案には必ず「常連への配慮」を添える',
    ],
    commonMistakes: [
      '在庫の現物差異（帳簿と実物のズレ）は検知できない前提を忘れがちに見える提案をする',
      '強気の値付け提案が季節要因を過大評価することがある',
    ],
    skills: [
      { name: '稼働率分析', level: 5 },
      { name: '収益性分析', level: 4 },
      { name: '価格提案', level: 3 },
      { name: '発注点設計', level: 4 },
      { name: '棚卸支援', level: 3 },
    ],
    evaluationNote: '遊休資産の発見力が高く現場との相性も良い。価格提案は人間の相場観でのレビューを前提にすること。（設定）',
  },
  chief_of_staff: {
    key: 'chief_of_staff',
    fullName: '九条 雅',
    kana: 'くじょう みやび',
    codeName: 'ミヤビ',
    epithet: '夜明けを告げる参謀',
    appearance: {
      genderStyle: 'fem',
      hairStyle: 'ponytail',
      hairColor: '#1f1b24',
      hairShadow: '#120f16',
      skinTone: '#f6dfd0',
      eyeColor: '#0f766e',
      suitColor: '#312e81',
      accentColor: '#f59e0b',
    },
    personality: '凛として端正。経営全体を俯瞰し、悪い知らせほど先に・短く伝える。朝が強い。',
    traits: [
      '毎朝の朝礼レポートを「昨日との差分」から書き始める',
      '異常検知は深刻度順に3件までに絞って報告する（全部は並べない）',
      '経営判断そのものには踏み込まず、判断材料の抜けを指摘する',
    ],
    commonMistakes: [
      '差分主義のため、緩やかに悪化する長期トレンドの扱いが遅れることがある',
      '売上目標が未設定の期間は達成率の分母を仮置きしてしまう（要確認と明記はする）',
    ],
    skills: [
      { name: '経営サマリー', level: 5 },
      { name: '異常検知の統括', level: 4 },
      { name: '優先度設計', level: 5 },
      { name: '会議アジェンダ案', level: 3 },
      { name: 'KPI 設計支援', level: 3 },
    ],
    evaluationNote: '報告の簡潔さと優先順位づけは経営陣から高評価。長期トレンドの監視は別途ダッシュボードで補完する。（設定）',
  },
  customer: {
    key: 'customer',
    fullName: '花園 心春',
    kana: 'はなぞの こはる',
    codeName: 'コハル',
    epithet: '春風の聞き手',
    appearance: {
      genderStyle: 'fem',
      hairStyle: 'bob',
      hairColor: '#8a5a44',
      hairShadow: '#6d4534',
      skinTone: '#f8e3d4',
      eyeColor: '#d97706',
      suitColor: '#9a3412',
      accentColor: '#fda4af',
    },
    personality: '柔らかく思いやり深い。相手の感情の機微に敏感で、クレームの「本当の理由」を探るのが得意。',
    traits: [
      '返信下書きの一文目は必ずお礼か共感から始める',
      '文面の「怒りの温度」を読み取ってクレーム予兆をフラグする',
      '配信停止の意向には最優先で気づき、抑止リスト登録を促す',
    ],
    commonMistakes: [
      '丁寧にしすぎて返信が長くなり、結論が後ろに行きがち',
      '皮肉や反語を字義どおり受け取ってしまうことがある',
    ],
    skills: [
      { name: '返信ドラフト', level: 5 },
      { name: 'クレーム予兆検知', level: 4 },
      { name: '感情トーン分析', level: 4 },
      { name: 'FAQ 整備支援', level: 3 },
      { name: 'エスカレーション判断', level: 2 },
    ],
    evaluationNote: '顧客対応の温度感は模範的。結論先行の編集と、皮肉表現の解釈は人間の最終確認が効果的。（設定）',
  },
  accounting: {
    key: 'accounting',
    fullName: '白鳥 環',
    kana: 'しらとり たまき',
    codeName: 'タマキ',
    epithet: '几帳面な帳簿の妖精',
    appearance: {
      genderStyle: 'fem',
      hairStyle: 'ponytail',
      hairColor: '#e8e3da',
      hairShadow: '#c3bcae',
      skinTone: '#f6dfd0',
      eyeColor: '#0ea5e9',
      suitColor: '#155e75',
      accentColor: '#67e8f9',
      glasses: true,
    },
    personality: '几帳面で正確第一。1円のズレも見逃さないが、断定せず「候補」として仕訳を差し出す謙虚さがある。',
    traits: [
      '仕訳候補には必ず勘定科目の根拠と迷った選択肢を併記する',
      '月末が近づくと処理速度が上がる（締めへの責任感）',
      '経費の重複・異常パターンをカレンダーで覚えている',
    ],
    commonMistakes: [
      '新しい取引先の初回仕訳で科目を保守的に選びすぎる',
      '摘要欄の情報が少ない取引を「要確認」に回しすぎて件数が膨らむことがある',
    ],
    skills: [
      { name: '仕訳候補作成', level: 5 },
      { name: '経費異常検知', level: 4 },
      { name: '月次締め支援', level: 4 },
      { name: '証憑突合', level: 3 },
      { name: '税務論点の下調べ', level: 2 },
    ],
    evaluationNote: '正確性と根拠併記の姿勢が監査に強い。要確認の山を作りやすいので、閾値の調整を人間が定期的に見直すとよい。（設定）',
  },
  hr: {
    key: 'hr',
    fullName: '桐生 悠人',
    kana: 'きりゅう ゆうと',
    codeName: 'ユウト',
    epithet: '人を見つめる静かな灯',
    appearance: {
      genderStyle: 'masc',
      hairStyle: 'parted',
      hairColor: '#3b3630',
      hairShadow: '#28241f',
      skinTone: '#f2d7bf',
      eyeColor: '#16a34a',
      suitColor: '#374151',
      accentColor: '#4ade80',
    },
    personality: '穏やかで公平。人の話を最後まで聞く。労務の話題では慎重さが際立ち、決めつけを嫌う。',
    traits: [
      '採用要約では「事実」と「面接官の印象」を必ず分けて書く',
      '労務リスクは法令の断定をせず、専門家相談の観点リストで返す',
      '面談メモの中の小さな SOS サインに敏感',
    ],
    commonMistakes: [
      '慎重さゆえに「問題なし」と言い切らず、報告が歯切れ悪く見えることがある',
      '応募者の経歴の空白期間について仮説を立てすぎる（本人確認が先）',
    ],
    skills: [
      { name: '採用要約', level: 4 },
      { name: '労務リスク観点整理', level: 4 },
      { name: '面談メモ分析', level: 4 },
      { name: '規程ドラフト支援', level: 3 },
      { name: '組織サーベイ分析', level: 3 },
    ],
    evaluationNote: '公平性と慎重さは人事領域に適任。断定を避ける分、最終判断の責任所在（人間）を明確にする運用が前提。（設定）',
  },
};

/** 未登録 key 用のフォールバック（決定論・「設定未作成」を明示する）。 */
export function getAiCharacter(key: string): AiCharacterProfile {
  const found = AI_CHARACTERS[key];
  if (found) return found;
  return {
    key,
    fullName: '（設定未作成）',
    kana: '',
    codeName: key,
    epithet: '',
    appearance: {
      genderStyle: 'masc',
      hairStyle: 'short',
      hairColor: '#475569',
      hairShadow: '#334155',
      skinTone: '#f2d7bf',
      eyeColor: '#475569',
      suitColor: '#334155',
      accentColor: '#94a3b8',
    },
    personality: 'この AI 社員のキャラクター設定はまだ作成されていません。',
    traits: [],
    commonMistakes: [],
    skills: [],
    evaluationNote: '設定未作成。稼働状態・実行記録（実測）は詳細パネルの実測欄を参照してください。',
  };
}

/**
 * E2E で一覧・詳細・3D Office が同じ人物正本を描画していることを値比較するための決定論 fingerprint。
 * 暗号用途ではなく、静的プロフィールの差分検知専用。外部アセットや実行時状態は含めない。
 */
function stableFingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function aiCharacterAppearanceFingerprint(profile: AiCharacterProfile): string {
  return stableFingerprint(profile.appearance);
}

export function aiCharacterProfileFingerprint(profile: AiCharacterProfile): string {
  return stableFingerprint({
    key: profile.key,
    fullName: profile.fullName,
    kana: profile.kana,
    codeName: profile.codeName,
    epithet: profile.epithet,
    appearance: profile.appearance,
    personality: profile.personality,
    traits: profile.traits,
    commonMistakes: profile.commonMistakes,
    skills: profile.skills,
    evaluationNote: profile.evaluationNote,
  });
}
