# 101. Customer Pain 入口レビュー — 高機密ラベル前提整理（docs-only・判定 READY / GO）

> doc70（Phase 2-C 入口レビュー）で「Customer Pain は高機密ラベル対応が先」と評価して以来、後続送りにしてきた **Customer Pain（顧客課題）** の入口レビュー。Mode B。
> §0 固定方針: CUSTOMER_PAIN_SCOPE=ENTRY_REVIEW_ONLY・HIGH_CONFIDENTIAL_LABEL_POLICY=DESIGN_PREREQUISITE_ONLY・IMPLEMENTATION_POLICY=DOCS_ONLY_NOW・DATA_POLICY=NO_REAL_CUSTOMER_DATA・PII_POLICY=DO_NOT_STORE_NOW・AI_REFERENCE_POLICY=DO_NOT_INJECT・PUBLIC_USE_POLICY=PROHIBIT_NOW・EXTERNAL_SEND_POLICY=NO_EXTERNAL_SEND・APPROVAL_POLICY=SEPARATE_APPROVAL_REQUIRED_FOR_IMPLEMENTATION・DB_POLICY=NO_SCHEMA_CHANGE・MIGRATION_POLICY=NO_MIGRATION・UI_POLICY=NO_UI_IMPLEMENTATION・AUDIT_POLICY=DESIGN_ONLY_NOW（設計前提の整理であって実装承認ではない）。
> **docs-only・実装なし・DB変更なし・schema変更なし・migrationなし・UI/Server Action/API 作成なし・RBAC/label 定義変更なし・AI参照条件変更なし・公開活用なし・外部送信なし・実LLMなし・AIコストなし・doc14 変更なし・push なし（commit-only）**。
> プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 1. 非エンジニア向け要約

- Customer Pain（顧客課題）は「顧客の未解決の悩み・不満・**クレーム**・**失注理由**・競合比較」といった**生の声に近い情報**で、顧客事例（CaseStudy）よりずっと機密性が高くなりやすい領域です。
- だから**作る前に**、「どの機密ラベルで守るか・誰が見られるか・記録をどう残すか・AIには読ませない・公開しない」を先に決める必要があります（doc70 以来の方針）。
- 今回はその**入口レビューだけ**です。テーブルも画面も作っていません。実顧客データも入れていません。**AIに読ませない・公開しない**は今回も不変です。
- 3案を比較し、**「高機密ラベル・権限・監査の前提設計を先にやり、Customer Pain 実装はまだしない」（案A）を推奨**として固定しました。

## 2. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| Customer Pain の実装（model・画面・Server Action）は**未存在** | doc70 実測の再確認（今回 grep でも実装ファイルなし・言及は docs のみ） |
| doc70 で「**PII最近接・高機密ラベル対応が前提**・実装は設計から」と評価済み（CaseStudy 先行を選択） | doc70 §3/§4 |
| **ConfidentialityLabel enum に高機密ラベルは定義済み**（CONFIDENTIAL / STRICT_SECRET / HR・LEGAL・FINANCIAL・**CUSTOMER_CONFIDENTIAL**） | schema.prisma enum 実測 |
| labels.ts にロール別アクセス（CUSTOMER_CONFIDENTIAL 等）とバッジ定義が存在 | packages/shared/src/labels.ts 実測 |
| ただし **Company Brain 系（会社の頭脳4テーブル）は NORMAL / INTERNAL のみ扱い、高機密ラベルは保留中**（writeDataAccess 連携含め解禁は別承認） | doc39 以来の安全補正・安全ゲート ★3 検査稼働 |
| CRM 側（Customer/CustomerInsight 等）には CUSTOMER_CONFIDENTIAL 既定のデータが既にあり、失注/クレーム系の言及は CRM 領域に少数存在 | schema・grep 実測（14件・CRM 系） |
| AI参照は anonymized=true の CaseStudy のみ（doc98 決定）・公開は PROHIBIT_NOW（doc100 決定）・封印 UI 0件・公開系 tsx 0件 | 実測（注入0・anonymized: true 2・UI 0/0/0） |
| writeDataAccess（機密参照ログ）の仕組みは存在するが Company Brain では未使用 | CLAUDE.md・doc39 |

## 3. Customer Pain とは何か

顧客が抱える**未解決の課題・悩み・不満**を構造化して蓄積し、提案の的中率や商品改善に活かすための知識領域。CaseStudy が「解決済みで整理された成功譚」なのに対し、Customer Pain は「**解決前の生データ**」——具体的な困りごと・**失注理由**・**クレーム**・競合に負けた理由・成果未達の背景——を含む。

## 4. CaseStudy / VOC / Support / CRM との違い

| 領域 | 性質 | 機密性 |
|---|---|---|
| CaseStudy | 解決済み・整理済み・匿名化前提・許諾台帳あり | 統治済み（NORMAL/INTERNAL・本番確認GO） |
| **Customer Pain** | **未解決・生データ・特定顧客の弱み/不満に直結** | **最も高い**（顧客名と紐づくと顧客への実害リスク） |
| VOC（顧客の声） | 収集した意見・要望。公開活用は doc100 で PROHIBIT_NOW | 中〜高 |
| Support / クレーム対応 | 個別対応の記録（CRM/interactions 側） | 高（CUSTOMER_CONFIDENTIAL 系） |
| CRM（Customer 等） | 顧客マスタ・商談 | 高（既に CUSTOMER_CONFIDENTIAL 既定） |

Customer Pain は「CaseStudy の型を流用すればよい」領域**ではない**。CaseStudy は匿名化を既定にできたが、Pain は**特定顧客の文脈があってこそ価値が出る**ため、匿名化と価値が衝突しやすい＝**ラベル・権限・監査で守る設計が先**。

## 5. Customer Pain が含み得る危険情報

- **顧客名・担当者名**（誰が何に困っているか＝PII と顧客関係の機微）。
- **失注理由・成果未達情報**（顧客側・自社側双方の弱み。漏えい時は信頼失墜・取引毀損）。
- **不満・クレーム**の生の表現（感情的表現・第三者への言及を含み得る）。
- **競合名**と競合比較（営業機密・第三者の名誉に関わる記述リスク）。
- 価格・値引きの個別事情（財務機微）。

## 6. なぜ高機密ラベル対応が先か

1. 上記の危険情報は **NORMAL / INTERNAL では守れない**（Company Brain の現行2択は「全社共有してよい情報」向け）。
2. enum に CUSTOMER_CONFIDENTIAL は定義済みだが、**Company Brain 系で高機密ラベルを扱う運用（閲覧制限・writeDataAccess 記録・AI遮断・UI表示）は未設計・保留中**（doc39）。この解禁は「別の重い承認」と当初から位置づけられている（doc70）。
3. 先に器（テーブル）を作ると、「守り方が決まる前にデータが入る」逆順になる。**Data Classification（何をどのラベルで守り、誰が見て、どう記録するか）の設計が先**。

## 7. 3案比較

| 案 | 内容 | メリット | 注意 |
|---|---|---|---|
| **案A（推奨）: HIGH_CONFIDENTIAL_PREREQUISITE_FIRST** | **高機密ラベル・権限・監査（writeDataAccess）・AI禁止方針を先に設計**し、Customer Pain 実装はまだしない | 守り方が先＝データが入る前に統治が完成・doc70/doc33 の評価と一貫・解禁ゼロ | Pain の事業価値は当面出ない（CRM の既存記録で代替） |
| 案B: INTERNAL_ONLY_DRAFT_LATER | 将来、社内限定の下書き（または docs-only 管理）から小さく始める | 小さく学べる | 「INTERNAL で始めて後から高機密化」は分類の逆行＝危険情報が既に混入している恐れ。DB実装もまだ重い |
| 案C: IMPLEMENT_CUSTOMER_PAIN_NOW | すぐに Customer Pain テーブル・画面を作る | 価値が早い | **現時点では非推奨**。高機密対応（ラベル運用・writeDataAccess・AI遮断・閲覧制限）が未整備のまま生データが入る |

**推奨は案A**。ただし**推奨を出しても実装はしない**（§0 人間決定 → Data Classification 設計 → 実装承認の段階）。

## 8. 推奨案（案A の骨子）

- 先に **Data Classification / 高機密ラベル運用設計**（docs-only・別承認）: CUSTOMER_CONFIDENTIAL（既定義）を Company Brain 型の画面で扱う場合の閲覧制限・writeDataAccess 記録・AI遮断・バッジ表示・安全ゲート検査の設計。
- Customer Pain の器・画面・API はその後の別承認。**実顧客データ・PII は設計完了と本番確認まで保存しない**（NO_REAL_CUSTOMER_DATA / DO_NOT_STORE_NOW）。

## 9. AI参照との関係

- **AIに読ませない**（DO_NOT_INJECT・原則 AI 参照禁止で開始）。Customer Pain は匿名化しても文脈から顧客が特定されやすく、AI 回答は閲覧権限に関係なく届くため、CaseStudy（anonymized=true のみ）より厳しく**参照ゼロが既定**。
- **AI参照条件変更なし**（doc98 の KEEP_ANONYMIZED_TRUE_ONLY のまま）・**CaseStudyConsent は AI 文脈へ注入しない**も不変。将来 Pain の匿名化要約を AI に読ませる案は、別途の重い承認（doc97 案B と同型の設計）が前提。

## 10. 公開活用との関係

- **公開しない**（PROHIBIT_NOW・doc100 の決定と同じ関門思想）。**外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。
- 失注理由・クレーム・競合比較は、公開はもちろん**社外への示唆となる二次利用（提案書への転記等）も個別判断**が必要（設計時の論点として固定）。

## 11. 個人情報・顧客名・担当者名・成果未達・失注理由の扱い

- **PII（担当者名・連絡先等）は今は保存しない**（DO_NOT_STORE_NOW）。将来も Customer マスタへの参照（ID）で持ち、Pain 本文への複製は禁止方向で設計。
- **顧客名**: 今は保存しない。将来は customerId 参照のみ（本文への実名記載は検証・ゲートで抑止する設計を検討）。
- **失注理由・成果未達・クレーム**: 保存する場合は高機密ラベル必須＋閲覧制限＋参照ログが前提（§12/§13）。

## 12. 権限・閲覧範囲

- 現行 labels.ts のロール別アクセス（CUSTOMER_CONFIDENTIAL は OWNER/EXECUTIVE/ADMIN 等に限定）を土台に、**knowledge:update 以上かつラベル許可ロールのみ閲覧**の交差条件を設計候補とする（§0 で人間決定）。
- 一覧はプレースホルダ（実名寄り事例の「閲覧制限」表示と同型）・詳細は許可ロールのみ、が最小案。

## 13. 監査ログ・アクセスログ

- 書き込みは writeAudit 必須（既存方針）。**閲覧（参照）も writeDataAccess で記録する設計が必要**（高機密の参照ログ＝Company Brain 初の writeDataAccess 適用・DESIGN_ONLY_NOW）。
- AI が仮に将来関与する場合も ai_reference 相当の記録が前提（当面は AI 参照ゼロなので発生しない）。

## 14. §0 人間決定候補（次回以降・今回は決定しない）

```
CUSTOMER_PAIN_POLICY: 【HIGH_CONFIDENTIAL_PREREQUISITE_FIRST / INTERNAL_ONLY_DRAFT_LATER / IMPLEMENT_CUSTOMER_PAIN_NOW / OTHER】（推奨: HIGH_CONFIDENTIAL_PREREQUISITE_FIRST）
DATA_CLASSIFICATION_POLICY: 【REQUIRE_CUSTOMER_CONFIDENTIAL_LABEL_DESIGN / NORMAL_INTERNAL_ONLY / OTHER】（推奨: REQUIRE_CUSTOMER_CONFIDENTIAL_LABEL_DESIGN）
PII_POLICY: 【PROHIBIT_PII_NOW / ALLOW_WITH_APPROVAL_LATER / OTHER】（推奨: PROHIBIT_PII_NOW）
CUSTOMER_NAME_POLICY: 【PROHIBIT_CUSTOMER_NAME_NOW / ALLOW_WITH_PERMISSION_LATER / OTHER】（推奨: PROHIBIT_CUSTOMER_NAME_NOW・将来も customerId 参照のみ）
AI_REFERENCE_POLICY: 【PROHIBIT_AI_REFERENCE_NOW / ANONYMIZED_SUMMARY_ONLY_LATER / OTHER】（推奨: PROHIBIT_AI_REFERENCE_NOW）
PUBLIC_USE_POLICY: 【PROHIBIT_PUBLIC_USE / DESIGN_LATER / OTHER】（推奨: PROHIBIT_PUBLIC_USE）
VIEW_PERMISSION_POLICY: 【KNOWLEDGE_UPDATE_ONLY_OR_HIGHER / DESIGN_RBAC_LATER / OTHER】（推奨: KNOWLEDGE_UPDATE_ONLY_OR_HIGHER＋ラベル許可ロールの交差）
AUDIT_POLICY: 【REQUIRE_ACCESS_LOG_AND_WRITE_AUDIT_DESIGN / BASIC_WRITE_AUDIT_ONLY / OTHER】（推奨: REQUIRE_ACCESS_LOG_AND_WRITE_AUDIT_DESIGN）
IMPLEMENTATION_POLICY: 【DOCS_ONLY_NOW / IMPLEMENT_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DOCS_ONLY_NOW）
```

## 15. 実装する場合の段階案（各段個別承認）

1. **doc101 入口レビュー（今回・docs-only）** ✅
2. **§0 人間決定**（§14 の9項目）
3. Data Classification / 高機密ラベル運用の詳細設計 docs-only（閲覧制限・writeDataAccess・AI遮断・ゲート検査・「高機密ラベル解禁」は個別人間承認の重い判断）
4. （承認後）高機密対応の最小実装（Company Brain 型とは別の閲覧制限枠・実データなし）
5. Customer Pain schema 設計 docs-only → schema 追加（追加のみ migration・別承認）
6. read-only 画面 → 人間書き込み（各段本番確認・実データはまだ）
7. 実顧客データの投入判断（運用整備・別承認）
8. AI参照の扱い判断（原則禁止の再確認または匿名化要約案の設計・別承認）
9. 公開活用判断（doc100 の関門と同型・別承認）

## 16. 今回やらなかったこと

- **Customer Pain 実装なし**（テーブル/画面/Server Action/API 作成なし）・**DB変更なし・schema変更なし・migrationなし**・seed 追加なし・RBAC/label 定義変更なし・高機密ラベルの実装なし。
- **AI参照条件変更なし・AIに読ませない**（company-brain-reference 変更なし・**CaseStudyConsent は AI 文脈へ注入しない**も不変）・anonymized=false の AI参照解禁なし。
- **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**・公開活用なし・ApprovalRequest 接続なし。
- **外部送信なし・実LLMなし・AIコストなし**・実顧客データ/PII の保存なし・本番確認なし・本番DB接続なし・本番deployなし・doc14 追記なし・push なし。

## 17. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「Pain 未実装」→ grep 実測（実装ファイルなし・言及は docs のみ）②「高機密が先の評価」→ doc70 §3/§4・doc33/doc50 ③「高機密ラベルは enum 定義済みだが Company Brain では保留」→ schema/labels.ts 実測＋doc39 ④「CRM 側は既に CUSTOMER_CONFIDENTIAL 既定」→ schema 実測 ⑤「AI/公開の封印維持」→ 注入0・anonymized: true 2・封印UI 0/0・公開系 tsx 0（実測）。
**Assumption Log**: ①案A の前提設計は既存の labels.ts / writeDataAccess を土台にでき、新規 enum 追加は不要の見込み（設計で確定）②Pain の当面の代替は CRM の既存記録（interactions/insights）③FakeLLM 継続。
**Unknowns Log**: ①§0 の9決定（人間）②高機密ラベル解禁の承認範囲（どのロールまで・writeDataAccess の粒度）③Pain と CRM 既存データ（失注/クレーム系）の重複整理④匿名化要約の将来設計（AI 参照を検討する場合のみ）。
**Risk Register**: 最大=守り方が決まる前の実装・実データ投入 → 本書 §6/§15 の順序固定と §0 で遮断。次点=「enum にあるから使ってよい」という誤解 → 高機密ラベルの Company Brain 適用は別の重い承認と明記（doc39/doc70 継承）。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（Pain 未実装・ラベル現況・封印維持）✅／定義・比較（**案A推奨**）・危険情報・順序根拠・AI/公開との関係・PII/顧客名/失注理由の扱い・権限・監査・§0 候補9項目・段階9案 ✅／doc101 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 18. 次回推奨プロンプト案

> ①**doc101 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **Customer Pain の §0 人間決定**（§14 の9項目・推奨はすべて安全側）→（案A なら）**Data Classification / 高機密ラベル運用の詳細設計 docs-only**（doc102 候補・解禁は個別人間承認）。③並行選択肢: CI・Test・Release Governance 等の品質基盤強化／Stage 2・3・★2・UX。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別人間承認なしに進まない。

## 19. 判定

**判定: READY / GO**（Customer Pain の入口レビューと高機密ラベル前提の整理は固定完了・**Customer Pain 実装は未着手・§0 人間決定後の別承認**）。**AI参照条件変更なし・AIに読ませない・公開しない・PII 保存なし**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
