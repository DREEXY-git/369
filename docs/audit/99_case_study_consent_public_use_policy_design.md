# 99. CaseStudyConsent 公開活用判断 前提整理 — 導入事例・PR・SEO・顧客の声公開の条件設計（docs-only・判定 READY / GO）

> doc98（AI参照条件決定・KEEP_ANONYMIZED_TRUE_ONLY）後の次段（doc91 §6 段階9 / doc82 §7 の5前提の詳細化）。CaseStudy / CaseStudyConsent の**公開活用（external_publish / pr / seo / customer_voice）を将来検討する前の前提整理**。Mode B。
> **docs-only・実装なし・公開ページなし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし・ApprovalRequest 接続なし・AI参照条件変更なし・company-brain-reference 変更なし・code/schema/migration/seed/package/doc14 変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> 固定方針: PUBLIC_USE_SCOPE=DESIGN_ONLY・**PUBLIC_USE_POLICY=PROHIBIT_NOW**・PURPOSE_POLICY=**PURPOSE_NOT_SUFFICIENT_ALONE**・IMPLEMENTATION_POLICY=DOCS_ONLY_NOW。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 1. 非エンジニア向け要約

- **いまは公開しません**。顧客事例を外（導入事例ページ・PR・SEO・SNS・顧客の声）に出すには、**許諾台帳だけでは足りません**。
- 許諾台帳に **external_publish / pr / seo / customer_voice** の用途が書いてあっても、**それだけでは公開できません**（必要条件であって十分条件ではない）。
- 公開には **ApprovalRequest**（承認手続き）・**表現審査**・**公開前人間承認**・**取り下げ運用**・証跡・**根拠確認**が必要です。今回はその前提条件を整理しただけで、何も作っていません。
- **AI参照条件は変えません**（AIが読む事例は匿名化済みのみ・doc98 決定どおり）。**CaseStudyConsent は AI 文脈へ注入しません**。**外部送信・実LLM・AIコストは発生させません**。

## 2. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| doc96 で anonymized=false 本格扱いが本番確認GO済み・基準 = **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** | doc96・doc14 §60・CURRENT_STATE 実測 |
| doc98 で AI参照条件は **KEEP_ANONYMIZED_TRUE_ONLY** と正式決定済み | doc98 grep 実測（決定5・不変事項すべて確認） |
| 顧客事例は**社内限定・非公開（publishStatus 'private' 固定）**・AI参照は匿名化済みのみ | doc76〜/doc95・company-brain-reference 実測（注入0・anonymized: true 2） |
| externalAiAllowed true UI なし・publishStatus UI なし | grep 0件（実測） |
| **公開系 UI（公開ページ・PR配信・SEO公開・SNS投稿・顧客の声公開）なし** | route 実測（`pr` の部分一致は既存の印刷画面 `print` のみ＝誤検知・公開系ゼロ） |
| 台帳 purpose 6区分に external_publish / pr / seo / customer_voice が定義済み（**登録できるだけで公開機能はない**） | CASE_STUDY_CONSENT_PURPOSES（doc86/87） |
| 公開活用の5前提（連携・表現審査・公開前人間承認・取り下げ・証跡）が設計済み | doc82 §7 |

## 3. 論点（13）

1. **顧客名掲載許諾**: 本文表現と「顧客名を外に出すこと」は別の重み。公開時は明示的な掲載許諾（台帳＋証跡）が前提。
2. **取引先名掲載許諾**: 同上。取引先名の無承認掲載は禁止（§5）。
3. **成果数値掲載許諾**: 数値は誇大表現・景表法リスクの中心。**根拠確認**（実測データの所在）と承認が前提。
4. **顧客の声掲載許諾**: customer_voice purpose＋本人確認・原文改変禁止の審査が前提。
5. **PR配信時の表記**: 広告・PR であることの明示（PR表記）。自動配信はしない。
6. **SEOページの品質**: 誇大表現防止・事実に基づく記述・品質チェック。自動公開はしない。
7. **SNS投稿の人間承認**: 投稿前の人間承認必須。自動投稿はしない。
8. **取り下げ要求時の対応**: 顧客からの取り下げ要求→公開停止→記録、の運用（TAKEDOWN）を将来要件として固定。
9. **台帳取り消し時の公開停止**: 許諾が revoke されたら公開物も停止対象（保存の門番と同じ思想を公開にも延長）。
10. **ai_reference と public use を混同しない**: AI参照条件（doc98・社内）と公開活用（外部）は別ライン。片方の許諾・決定をもう片方に流用しない。
11. **purpose は必要条件であって十分条件ではない**: external_publish / pr / seo / customer_voice があっても、ApprovalRequest・表現審査・公開前人間承認なしには公開できない（PURPOSE_NOT_SUFFICIENT_ALONE）。
12. **ApprovalRequest と表現審査の位置づけ**: 公開は「危険操作」であり requiresApproval の思想の延長。承認の証跡と audit 記録を残す。
13. **不正な成長施策の禁止**: ステルスマーケティング・虚偽レビュー・根拠なし成果数値・根拠なし No.1 表記は、許諾があっても禁止（§5）。

## 4. 選択肢比較（3案）

| 案 | 内容 | メリット | 注意 |
|---|---|---|---|
| **案A（推奨）: PROHIBIT_NOW_AND_DESIGN_GATES** | **今は公開しない**。公開前提条件（ApprovalRequest・表現審査・公開前人間承認・取り下げ運用・監査ログ）だけを将来要件として固定。**実装ゼロ・外部送信ゼロ・公開ゼロ** | 最も安全・現行の非公開固定（publishStatus 'private'）と完全一致・将来の判断材料だけが整う | 公開活用の価値は当面出ない（社内活用で代替） |
| 案B: DRAFT_ONLY_INTERNAL_REVIEW_LATER | 将来、**社内下書き＋人間承認フローだけ**を作る。外部公開はまだしない。PR/SEO/SNS は下書き止まり | 公開準備の練習ができる・外部露出ゼロのまま | 下書き機能でも表現審査・権限・監査の設計が必要＝承認が中程度に重い |
| 案C: PUBLIC_USE_IMPLEMENT_LATER | 将来、公開ページや PR/SEO/SNS 活用を実装する案 | 事業価値は最大 | **現時点では非推奨**。承認・法務・取り下げ・証跡・不正防止・公開審査が未整備のため今は進めない |

**推奨は案A（PROHIBIT_NOW_AND_DESIGN_GATES）**: 今は公開せず、公開のための関門（ゲート）の要件だけを固定する。ただし**推奨を出しても §0 人間決定までは何もしない**（そもそも案A は実装ゼロ）。

## 5. 禁止事項（許諾があっても禁止・恒久）

- **AIによる虚偽口コミ投稿**・実体験でない体験談の生成・投稿。
- 顧客許諾なし導入事例公開・取引先名の無承認掲載・顧客の声の無承認公開。
- **根拠なし成果数値掲載**・**根拠なし No.1 表記**・誇大表現。
- **ステルスマーケティング**（広告であることの非明示）・インセンティブ非開示アフィリエイト。
- **PR配信の自動実行・SEOページの自動公開・SNS投稿の自動実行**（公開系の自動実行は全面禁止・人間承認必須）。

## 6. 安全な代替（将来要件・今回は設計候補の記録のみ）

許諾済み導入事例管理／公開前人間承認／表現審査／事実確認フロー／成果数値の根拠確認／顧客名・取引先名の掲載許諾確認／PR表記付き下書き作成／SEO品質チェック／公開停止・取り下げ管理／公開前チェックリスト／**ApprovalRequest 設計候補**（公開=危険操作として承認必須）／audit 記録／台帳取り消し時の公開停止候補。

## 7. 次回 §0 人間決定候補（今回は決定しない）

```
PUBLIC_USE_POLICY: 【PROHIBIT_NOW / DRAFT_ONLY_INTERNAL_REVIEW_LATER / PUBLIC_USE_IMPLEMENT_LATER / OTHER】（推奨: PROHIBIT_NOW）
PUBLIC_PURPOSE_POLICY: 【PURPOSE_NOT_SUFFICIENT_ALONE / REQUIRED_BUT_NOT_SUFFICIENT / OTHER】（推奨: PURPOSE_NOT_SUFFICIENT_ALONE）
APPROVAL_POLICY: 【APPROVAL_REQUEST_REQUIRED_LATER / MANUAL_APPROVAL_DOCS_ONLY / OTHER】（推奨: APPROVAL_REQUEST_REQUIRED_LATER）
CONTENT_REVIEW_POLICY: 【HUMAN_REVIEW_AND_FACT_CHECK_REQUIRED / LEGAL_REVIEW_REQUIRED / OTHER】（推奨: HUMAN_REVIEW_AND_FACT_CHECK_REQUIRED）
CUSTOMER_NAME_POLICY: 【EXPLICIT_PERMISSION_REQUIRED / PROHIBIT_PUBLIC_NAME / OTHER】（推奨: EXPLICIT_PERMISSION_REQUIRED）
OUTCOME_NUMBERS_POLICY: 【EVIDENCE_REQUIRED_AND_APPROVAL / PROHIBIT_NUMBERS / OTHER】（推奨: EVIDENCE_REQUIRED_AND_APPROVAL）
CUSTOMER_VOICE_POLICY: 【CUSTOMER_VOICE_PURPOSE_AND_APPROVAL_REQUIRED / PROHIBIT_CUSTOMER_VOICE / OTHER】（推奨: CUSTOMER_VOICE_PURPOSE_AND_APPROVAL_REQUIRED）
REVOCATION_TAKEDOWN_POLICY: 【TAKEDOWN_REQUIRED_LATER / DESIGN_LATER / OTHER】（推奨: TAKEDOWN_REQUIRED_LATER）
PUBLISH_CHANNEL_POLICY: 【NO_PR_SEO_SNS_NOW / DRAFT_ONLY_LATER / OTHER】（推奨: NO_PR_SEO_SNS_NOW）
IMPLEMENTATION_POLICY: 【DOCS_ONLY_NOW / IMPLEMENT_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DOCS_ONLY_NOW）
```

## 8. 実装する場合の段階案（各段個別承認）

1. **doc99 設計（今回・docs-only）** ✅
2. **§0 人間決定**（§7 の10項目・今は進めない前提）
3. ApprovalRequest / 表現審査の詳細設計（docs-only）
4. 公開下書きの docs-only 設計（案B へ進む場合のみ）
5. 最小実装（別承認・publishStatus UI / 公開機能はさらに個別承認）
6. 本番確認（利用者実測・§0）
7. PR / SEO / SNS / 顧客の声公開はさらに別承認（チャネルごと）
8. 取り下げ運用と監査ログ設計
9. Abuse / Spam / Disclosure Guard の設計（ステマ・虚偽・非開示の機械的防止）

## 9. 今回やらなかったこと

- **実装なし・UI変更なし・Server Action変更なし・company-brain-reference変更なし・AI参照条件変更なし・CaseStudyConsent の AI注入なし**（**anonymized=false は未解禁**のまま）。
- **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**・導入事例公開なし・**ApprovalRequest 接続なし**・publishStatus UI / externalAiAllowed true UI 追加なし。
- **DB変更なし・migrationなし・package変更なし・doc14変更なし・本番確認なし・pushなし**・本番DB接続なし・**外部LLM送信なし・実LLMなし・AIコストなし・外部送信なし**。

## 10. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「公開系 UI が存在しない」→ route 実測（`pr` 部分一致は既存 `print` のみ＝誤検知と特定・公開系ゼロ）②「AI参照条件は決定済み」→ doc98 grep 実測 ③「非公開固定」→ publishStatus 'private' 固定＋UI 0件（安全ゲート検査稼働）④「5前提の親設計」→ doc82 §7 ⑤「purpose 定義は存在するが公開機能はない」→ CASE_STUDY_CONSENT_PURPOSES（doc86/87）と本監査。
**Assumption Log**: ①案A は実装ゼロ＝リスク追加ゼロ ②公開活用を将来進める場合も本書 §5 の禁止事項は恒久（許諾があっても解除されない）③FakeLLM 継続。
**Unknowns Log**: ①§0 の10決定（人間・今は進めない前提）②法務レビューの体制（LEGAL_REVIEW_REQUIRED を選ぶ場合の運用）③取り下げ SLA・公開物の管理台帳の詳細（段階8 の別設計）。
**Risk Register**: 最大=「台帳に公開系 purpose があるから公開してよい」という誤解 → 本書 §1/§3-11 の PURPOSE_NOT_SUFFICIENT_ALONE で遮断。次点=公開系の自動実行（ステマ・虚偽レビュー等の不正リスク）→ §5 で恒久禁止・自動実行の全面禁止を固定。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（公開系 UI ゼロ・AI決定済み・封印維持）✅／論点13・3案比較（**案A推奨**）・禁止事項・安全な代替・§0 候補10項目・段階9案 ✅／doc99 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 11. 次回推奨プロンプト案

> ①**doc99 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **公開活用の §0 人間決定**（§7 の10項目・**今は進めない前提**。PROHIBIT_NOW を選べば実装不要=決定の記録のみ）。③並行選択肢: **Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2・3・★2・UX**／**CI・Test・Release Governance 等の品質基盤強化**。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 12. 判定

**判定: READY / GO**（公開活用の前提整理は固定完了・**公開活用は未実装・未解禁・§0 人間決定後の別承認待ち**）。**外部公開なし・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
