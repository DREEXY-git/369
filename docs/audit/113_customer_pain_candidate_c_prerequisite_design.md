# 113. Customer Pain 候補C 前提設計 — schema/migration 前の docs-only・解禁なし

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（候補C前提設計の記録。コード差分ゼロ）
- Audit Doc: 113
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Candidate C Prerequisite Design
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `77ac47f33288fdd74e1d3ffa9dc5cb8da31a224c`
- Scope: 候補C（Customer Pain schema / 画面 / Server Action / writeDataAccess / writeAudit 実接続）へ進む前の前提・選択肢・停止条件・schema要否・安全な順序の設計
- Not Included: 候補C本実装・schema変更・migration・Customer Pain画面・Server Action・writeDataAccess/writeAudit 実接続・高機密ラベル runtime 解禁・RBAC変更・label定義変更・company-brain-reference変更・AI参照条件変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc113 push-only（別承認）
- Do Not Start: Customer Pain本実装 / schema変更 / migration / 画面・Server Action / writeDataAccess・writeAudit実接続 / 高機密ラベル実装・解禁 / RBAC変更 / label定義変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- ここまでで、守りの「判定ロジック（候補A）」と「自動見張り（候補B）」が完成し、doc112 で「候補A+B完了でもまだ runtime 解禁しない」と決めました。今回はその次段として、**「候補C（Customer Pain を実際にデータとして扱う本実装）へ進むなら、事前に何を整えるべきか」を紙の上で設計だけ**した回です。
- **これは候補C本実装ではありません**。**候補C前提設計 docs-only** です。**schema変更なし**・**migrationなし**・**Customer Pain本実装なし**・**Customer Pain runtime実装なし**。コードは1行も変わっていません。
- 候補Cは「データの入れ物（schema）」と「migration」を伴うため最も重く、進むには**別の重い人間承認**が必要です。今回はその手前で、前提・停止条件・順序を正本に残すだけです。

## 2. これは候補C本実装ではなく、候補C前提設計 docs-only であること

- 本書は **候補C前提設計 docs-only** の記録であり、**解禁ではない**。
- Customer Pain のテーブル・migration・画面・Server Action・記録の実接続は一切作らない（**Customer Pain本実装なし**・**Customer Pain runtime実装なし**）。
- 候補A（doc110・純粋関数）と候補B（doc111・安全ゲート）は完了・正本反映済み。本書はそれらを「実際のデータ・画面・記録」につなぐ前段の設計にとどまる。

## 3. 候補A+B完了後でも、まだ runtime 解禁しないこと

- doc112 の決定（`DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB`）を継承する。**高機密ラベル解禁なし**。
- 候補A+B は「守りの部品と見張り」であり、**それだけでは実データを扱う稼働（runtime 解禁）の理由にならない**。
- 本書で前提設計をしても、**schema・実装・本番確認・解禁はいずれも別の人間承認のまま**。

## 4. 候補Cとは何か

候補C（Customer Pain 本実装）は、次のすべてを実際に作り・つなぐことを意味する:

- **Customer Pain schema**（顧客課題を保存するテーブルの器）
- **migration**（その器を DB に反映する変更）
- **一覧/詳細画面**（Customer Pain の閲覧 UI）
- **Server Action**（作成・更新・アーカイブの変更系）
- **writeDataAccess**（高機密詳細を閲覧するたびの参照ログの実記録）
- **writeAudit**（書き込みのたびの監査ログの実記録）
- **安全ゲート拡張**（候補B の静的検査を実コードに合わせて拡張）
- **否定系テスト**（候補A のテストを実接続レベルで拡張）
- **本番確認**（利用者実測での GO 判定）

→ これらは**すべて別の重い人間承認**を要する。本書では作らない。

## 5. 候補Cが重い理由

- **schema/migration が必要**: DB の器を作る＝一度作ると構造変更・データ移行が伴い、最も重い工程。
- **実顧客データ・PII に近い**: Customer Pain は失注理由・クレーム等の生データで、顧客名・担当者名と紐づくと実害リスク。
- **一度 DB に入れると後戻りしにくい**: 実データに高機密を入れた後の撤回は難しい（可逆性が下がる）。
- **本番確認が必要**: 画面・記録・否定系テストを本番確認まで通す必要があり、工数と露出リスクが大きい。

## 6. schema 要否の判断

- **実装するなら最終的には schema が必要**（Customer Pain の器がないと保存・判定・記録ができない）。
- **ただし今回は schema を決めない**（NO_SCHEMA_CHANGE のまま・**schema変更なし**・**migrationなし**）。
- **schema が必要と判明したら、そこで停止して別の重い人間承認へ**（本書は要否の整理まで）。

## 7. 最小 schema 候補の考え方（まだ確定しない）

将来 schema を設計する場合の**方向性のみ**（本書では確定・作成しない）:

- **PII を入れない**（電話番号・メール・住所等を列に持たない）。
- **顧客名・担当者名を入れない**（本文にも列にも複製しない）。
- **customerId 参照も別承認**（顧客との結合はリスクが変わるため、参照を付けること自体を別承認）。
- **本文に実顧客情報を複製しない**（マスキング済み・一般化された記述のみを想定）。
- **archivedAt 前提**（物理削除せずソフトアーカイブ）。
- **tenantId 必須**（全モデル tenantId スコープの既存原則）。
- **label は CUSTOMER_CONFIDENTIAL 前提候補**だが、**runtime 解禁はまだ**（label定義変更なし・解禁は個別承認）。

## 8. 画面設計の前提

- **一覧は非許可者にプレースホルダのみ**（「高機密案件（閲覧制限）」等・顧客名/失注理由/クレーム本文を出さない）。
- **詳細は候補A の標準閲覧式（tenantId × knowledge:update × canAccessLabel × 人間 × 未アーカイブ）を満たす人間だけ**。
- **許可判定前に本文を取得しない候補**（メタのみ取得 → 判定 → 許可時のみ本文取得）。
- **詳細表示のたび writeDataAccess 必須**（本文・PII は記録に入れない）。

## 9. 書き込み設計の前提

- **create / update / archive のみ候補**。
- **物理削除なし**（delete/deleteMany を作らない・ソフトアーカイブのみ）。
- **restore / label変更 / customerId変更は別承認**（操作追加・機密度引き下げ・結合リスク変化のため）。
- **writeAudit 必須**（本文・PII・顧客名・担当者名の生値は入れない・差分要約レベル）。

## 10. AI参照禁止

- **company-brain-reference に入れない**（Customer Pain を AI 参照層に注入しない）。
- **AIに読ませない**（PROHIBIT_AI_REFERENCE 継続）。
- **AI参照条件変更なし**（AI が読むのは匿名化済み CaseStudy のみ、という現行条件は不変）。

## 11. 公開禁止

- **PR / SEO / SNS / 顧客の声公開なし**（Customer Pain は公開活用に使わない・doc100 の PROHIBIT_NOW 継続）。
- **externalAiAllowed / publishStatus UI なし**（Customer Pain に公開系フィールド・導線を作らない・作られたら候補B の安全ゲートで FAIL）。

## 12. 候補C実装前の停止条件

将来の候補C実装ミッションで、以下に**1つでも該当したら実装せず停止**し、人間判断へ戻す:

- **schema変更が必要** / **migrationが必要** / **RBAC変更が必要** / **label定義変更が必要**
- **customerId 参照を使う**
- **PII や実顧客データを保存する**
- **AI参照に触る**（company-brain-reference 変更・AI参照条件変更）
- **公開導線に触る**（externalAiAllowed / publishStatus / PR / SEO / SNS）
- **本番確認が必要** / 本番DBに触る / 外部送信が発生する / 実LLM・AIコストが発生する

## 13. 次の選択肢

- **案A: 候補C schema 設計 docs-only** — Customer Pain の器（schema）の最小形を**紙の上（docs-only）**で設計する。schema変更・migration はしない。schema が必要と確定したら、そこで停止して別の重い人間承認へ。
- **案B: CI / Test / Release Governance を先に強化する** — 品質基盤を先に固め、Customer Pain ラインは一旦保留（証拠として保持・削除しない）。
- **案C: まだ保留にする** — 前提設計の段階で一旦止め、次段の選択自体を先送りする。

## 14. 推奨案

- **推奨: 案A（候補C schema 設計 docs-only）**。ただし**schema変更・migration はしない**（設計のみ）。
- 理由: 候補C の重さの中心は schema/migration であり、その最小形を紙で先に固めれば、重い承認の範囲（何を作り、何を作らないか）を人間が正確に把握できる。docs-only なら可逆・低リスク。
- ただし**案Aでも実装しない**（DOCS_ONLY_NOW）。本書は「次にやること」を schema 設計 docs-only に向けるだけで、schema も migration も作らない。案B（品質基盤優先）も人間が選べば別承認で開始できる。

## 15. 今回やらなかったこと

- **解禁ではない**・**高機密ラベル解禁なし**・**Customer Pain本実装なし**・**Customer Pain runtime実装なし**。
- **schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**。
- **company-brain-reference変更なし**・**AI参照条件変更なし**。
- **PII保存なし**・**実顧客データ保存なし**・**customerId参照は別承認**。
- Customer Pain の画面・Server Action・writeDataAccess/writeAudit 実接続なし。
- **外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。
- 既存 docs 改名なし・HOLD 記録削除なし・doc14 変更なし・docs/10_obsidian 変更なし・apps/packages/scripts/.github 変更なし。

## 16. Evidence Map

- 現在地の根拠: Scout 実測（HEAD = origin/main = origin/feature = `77ac47f33288fdd74e1d3ffa9dc5cb8da31a224c`・working tree clean・`origin/main..HEAD` 空）。
- 前段の決定の根拠: doc112（`DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB`・候補Cは別の重い人間承認・候補C前提設計docs-only）を read-only で確認。
- 候補A+B 完了の根拠: doc110（候補A・純粋関数＋否定系テスト）／doc111（候補B・安全ゲート静的検査）／doc109（候補A/B/C 分離・C は schema/migration を伴う重い承認）。
- 守り方の設計根拠: doc105（標準閲覧式・writeDataAccess・writeAudit・安全ゲート・否定系テスト・事前停止条件）を read-only で確認。
- 安全の土台が生きている根拠: `node scripts/check-company-brain-safety.mjs` を read-only 実行 → **exit 0**（`Company Brain safety checks passed. (actions: 4, ui files scanned: 156)`）。
- 封印維持の実測: company-brain-reference への CaseStudyConsent/CustomerPain 注入 0・`anonymized: true` 2・**apps の Customer Pain runtime 実装 0**・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）・rbac.ts / labels.ts / company-brain-reference 無変更。

## 17. Assumption Log

- 「候補C の重さの中心は schema/migration であり、その最小形を紙で先に固めるのが最小リスクの次段」と仮定し、案A（schema 設計 docs-only）を推奨。
- 最小 schema 候補（§7）は方向性のみで、実際の列・型は schema 設計 docs-only ミッションで確定する（本書は要否と方針の整理）。
- customerId 参照は「付けた瞬間に結合リスクが生じる」ため、参照自体を別承認とする前提を維持（doc105 §14 継承）。

## 18. Unknowns Log

- Customer Pain schema の実際の最小形（列・型・インデックス）。本書では決めない（NO_SCHEMA_CHANGE）。
- 品質基盤（CI / Test / Release Governance）と Customer Pain ラインの優先順位（人間判断）。
- 高機密ラベル runtime 解禁の最終判断の時期（候補C schema 設計後の個別人間承認・人間判断待ち）。
- denied 記録の既定（全 denied を記録するか攻撃兆候のみか）は実接続設計で決定。

## 19. Risk Register

- **前提設計を実装と誤読するリスク** → 本書 §1・§2・§15 で**候補C本実装なし**・**schema変更なし**を明記。
- **順序を飛ばして schema/migration に踏み込むリスク** → §12 の停止条件（schema/migration が必要なら停止）で防ぐ。
- **PII・実顧客データ混入リスク** → §7・§9・§10 で PII/顧客名/customerId 参照/本文複製を禁止方向に固定、候補B の安全ゲートで機械検知。
- **判断を先送りしすぎて Customer Pain ラインが停滞するリスク** → 案A（schema 設計 docs-only）で可逆・低リスクに前進。
- **未push commit の揮発リスク** → 次の doc113 push-only（別承認）で解消。

## 20. Definition of Done

- [x] 候補C前提設計として、schema要否・最小schema候補の考え方・停止条件・候補A/Bとの接続位置・画面/書き込み設計の前提・PII/実顧客データ封印・解禁しない理由・次段の人間承認項目を記録。
- [x] 「候補C本実装ではない・schema変更/migration はしない」ことを明記。
- [x] read-only 安全確認（safety script exit 0）を Evidence Map に記録。
- [x] CURRENT_STATE / PROGRESS / vault ノート＋index の正本反映。
- [x] 許可5ファイルのみで Gate 全 green（code/schema/migration/RBAC/label定義/company-brain-reference/scripts/doc14/docs/10_obsidian 無変更）。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 21. 次回推奨プロンプト案

1. **doc113 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **Customer Pain schema 設計 docs-only ミッション**（doc114 候補。最小 schema の列・型を紙で設計し、schema変更/migration はしない。schema が必要と確定したら停止して別承認）。
3. 品質基盤強化ミッション（CI / Test / Release Governance・別承認）。
4. 候補C本実装（Customer Pain schema・migration・画面・Server Action・writeDataAccess/writeAudit 実接続）は、schema 設計と高機密ラベル解禁可否判断のあとの**別の重い人間承認**。

## 22. 判定

**判定: READY / GO**（候補C前提設計は完了。schema要否・最小schema候補の方向性・停止条件・画面/書き込み/AI非注入/公開禁止の前提・次段の承認項目を固定した）。

ただし、これは候補C本実装ではなく前提設計であり**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain本実装なし**・**Customer Pain runtime実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**AI参照条件変更なし**・**PII保存なし**・**実顧客データ保存なし**・**customerId参照は別承認**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
