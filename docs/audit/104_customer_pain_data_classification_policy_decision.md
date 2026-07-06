# 104. Customer Pain Data Classification 方針決定 — 高機密ラベル運用は設計先行・解禁なし（docs-only・判定 GO）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（§0 方針決定の正式記録。コード差分ゼロ）
- 前提: doc103（Data Classification / 高機密ラベル運用設計・READY / GO・`3b0d3a4` として push 済み）
- 今回**やっていないこと**: Data Classification 実装なし・**高機密ラベル実装・解禁なし**・**Customer Pain 実装なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference 変更なし**・**PII保存なし**・顧客名/担当者名保存なし・**実顧客データ保存なし**・本番確認なし・push なし（commit まで）
- 封印継続: **AIに読ませない**・**CaseStudyConsent は AI 文脈へ注入しない**・**外部公開なし**・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし・**外部送信なし**・**実LLMなし**・**AIコストなし**

## 1. 非エンジニア向け要約

- 今回は、Customer Pain（顧客の生の悩み・失注理由・クレーム等）を将来扱うための「**守り方**」を、**人間の決定として正式に記録**した回です。
- これは「**高機密ラベルを使う**」決定では**ありません**。高機密ラベルは定義済みですが、**使い始める（解禁する）には別の重い人間承認が必要**なままです。
- これは「**Customer Pain を作る**」決定でも**ありません**。テーブルも画面も Server Action もまだ作りません。
- 決めたのは「作るとしたら、こう守る」という前提条件だけです。**解禁なし**・実装なし・コードは1行も変わっていません。

## 2. §0 人間決定値

本ミッションの送付をもって、以下12項目を人間承認済みの安全側方針として正式記録する。

```
DATA_CLASSIFICATION_POLICY: CUSTOMER_CONFIDENTIAL_AS_PREREQUISITE_DESIGN_ONLY
LABEL_ENABLEMENT_POLICY: DO_NOT_ENABLE_HIGH_CONFIDENTIAL_LABEL_YET
VIEW_PERMISSION_POLICY: TENANT_AND_KNOWLEDGE_UPDATE_AND_LABEL_ROLE_AND
ACCESS_LOG_POLICY: REQUIRE_WRITE_DATA_ACCESS_DESIGN
WRITE_AUDIT_POLICY: KEEP_WRITE_AUDIT_REQUIRED
PII_POLICY: PROHIBIT_PII_STORAGE_NOW
CUSTOMER_REFERENCE_POLICY: CUSTOMER_ID_REFERENCE_ONLY_LATER
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE_NOW
PUBLIC_USE_POLICY: PROHIBIT_PUBLIC_USE
SAFETY_GATE_POLICY: REQUIRE_SAFETY_GATE_DESIGN_BEFORE_IMPLEMENTATION
TEST_POLICY: REQUIRE_NEGATIVE_TEST_DESIGN_BEFORE_IMPLEMENTATION
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

### doc103 §20 候補名との対応（名称差分の記録・意味の変更なし）

ミッション指定の決定値名は doc103 §20 の候補名と一部で完全一致しないため、対応を記録する（**すべて doc103 の安全側推奨値と同義、または安全側に厳格化**であり、意味の変更はない）。

| 項目 | 今回の決定値 | doc103 §20 の安全側推奨 | 差分の性質 |
|---|---|---|---|
| DATA_CLASSIFICATION_POLICY | CUSTOMER_CONFIDENTIAL_AS_PREREQUISITE_DESIGN_ONLY | CUSTOMER_CONFIDENTIAL_DEFAULT | 同義＋「設計のみ」を名前に明示（厳格化） |
| LABEL_ENABLEMENT_POLICY | DO_NOT_ENABLE_HIGH_CONFIDENTIAL_LABEL_YET | DESIGN_ONLY_NOW | 同義（解禁しない） |
| VIEW_PERMISSION_POLICY | TENANT_AND_KNOWLEDGE_UPDATE_AND_LABEL_ROLE_AND | KNOWLEDGE_UPDATE_AND_LABEL_ALLOWED_ROLE（＋AIロール除外の3条件 AND） | 同義＋tenantId スコープを名前に明示。末尾の AND は「AND 交差の継続（AIロール除外を含む）」の意（下記 §4） |
| ACCESS_LOG_POLICY | REQUIRE_WRITE_DATA_ACCESS_DESIGN | WRITE_DATA_ACCESS_REQUIRED | 同義（実装時 writeDataAccess 必須＋その設計を実装前に必須化） |
| WRITE_AUDIT_POLICY | KEEP_WRITE_AUDIT_REQUIRED | WRITE_AUDIT_REQUIRED | 同義（既存原則の維持を明示） |
| PII_POLICY | PROHIBIT_PII_STORAGE_NOW | PROHIBIT_BODY_PII | 安全側に拡大（本文に限らず、今は PII 保存自体を禁止） |
| CUSTOMER_REFERENCE_POLICY | CUSTOMER_ID_REFERENCE_ONLY_LATER | CUSTOMER_ID_REFERENCE_ONLY | 同義（「将来も ID 参照のみ・今は保存自体なし」を明示） |
| AI_REFERENCE_POLICY | PROHIBIT_AI_REFERENCE_NOW | PROHIBIT_AI_REFERENCE | 同義 |
| PUBLIC_USE_POLICY | PROHIBIT_PUBLIC_USE | PROHIBIT_PUBLIC_USE | 完全一致 |
| SAFETY_GATE_POLICY | REQUIRE_SAFETY_GATE_DESIGN_BEFORE_IMPLEMENTATION | REQUIRED_BEFORE_IMPLEMENTATION | 同義（実装前に安全ゲート設計必須） |
| TEST_POLICY | REQUIRE_NEGATIVE_TEST_DESIGN_BEFORE_IMPLEMENTATION | NEGATIVE_TESTS_REQUIRED_BEFORE_IMPLEMENTATION | 同義（実装前に否定系テスト設計必須） |
| IMPLEMENTATION_POLICY | DOCS_ONLY_NOW | DOCS_ONLY_NOW | 完全一致 |

## 3. 決定の根拠と現状確認

決定前に read-only 監査で以下を実測した（2026-07-06・HEAD=`3b0d3a4`）。

- doc103 に設計の根拠語句が全て存在（Customer Pain Data Classification / 高機密ラベル運用設計 / CUSTOMER_CONFIDENTIAL / writeDataAccess / writeAudit / knowledge:update / label許可ロール / PII / 顧客名 / 担当者名 / 実顧客データ / AIに読ませない 等をカウントで確認）。
- Customer Pain 実装らしき apps/packages 件数: **0**（未着手のまま）。
- 封印の維持: AI 文脈への CaseStudyConsent 注入 0・`apps/web/lib/company-brain-reference.ts` の `anonymized: true` 条件 2・externalAiAllowed 切替 UI 0・publishStatus 切替 UI 0・公開系 tsx 0。
- 高機密ラベル定義は既存のまま: `packages/db/prisma/schema.prisma` の CUSTOMER_CONFIDENTIAL 2件・`packages/shared/src/labels.ts` の CUSTOMER_CONFIDENTIAL 2件（**定義済みだが Customer Pain 用の解禁はしていない**。doc103 の中心論点どおり、labels.ts の許可ロールには AI_AGENT・AI_ASSISTANT・STAFF が含まれるため、ラベル単独に頼らない）。

この現状が doc103 の設計前提と一致していることを確認したうえで、§0 12項目を安全側で確定した。

## 4. この決定で固定されたこと

- **既定ラベル方針**: Customer Pain の既定ラベルは CUSTOMER_CONFIDENTIAL を**前提候補とする設計のみ**（使用開始ではない）。
- **解禁しない**: 高機密ラベルの解禁は今回行わない。解禁には**個別の重い人間承認**が必要なまま。
- **閲覧条件**: 閲覧は `tenantId` スコープ・`knowledge:update` 権限・label許可ロール（canAccessLabel）の **AND 条件**で設計する。この AND 交差には doc103 §9〜10 の「AIロール除外（isHumanUser）」を含む（AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE_NOW でも二重に固定）。
- **閲覧記録**: 高機密詳細の閲覧は `writeDataAccess` で記録する設計を実装前に必須とする（本文・PII は記録に入れない）。
- **書き込み記録**: 書き込みは `writeAudit` 必須（既存原則の維持）。
- **PII**: PII・顧客名・担当者名・実顧客データは今は保存しない。将来も本文への複製は禁止方向。
- **顧客参照**: 顧客との紐づけは将来も customerId 参照のみの方向（今は参照自体もまだ）。
- **AI**: AIに読ませない。CaseStudyConsent は AI 文脈へ注入しない（現行の非注入ゲート維持）。
- **公開**: 公開しない（外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし）。
- **実装前の関門**: 実装前に安全ゲート設計と否定系テスト設計が必須。実装自体は DOCS_ONLY_NOW（別承認まで着手しない）。

## 5. 今回やらなかったこと・変わらないこと

- Data Classification 実装なし・高機密ラベル実装・解禁なし・Customer Pain 実装なし（schema / 画面 / Server Action いずれも未着手のまま）。
- DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし。
- AI参照条件変更なし・company-brain-reference 変更なし（AI が読む事例は匿名化済みのみ、の現行条件は不変）。
- 外部公開なし・外部送信なし・実LLMなし・AIコストなし。
- 本番確認なし・本番DB接続なし・本番deployなし。doc14 追記なし。
- プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。

## 6. 次に進む場合の段階案

1. doc104 の push（push-only・別承認・feature＋main）。
2. 高機密ラベル運用の詳細設計（docs-only・別承認。標準式の擬似コード・writeDataAccess の記録粒度・安全ゲートの検査文字列・否定系テストの具体ケースまで固める。**解禁ではない**）。
3. 高機密ラベル解禁の個別人間承認（重い判断・別承認）。
4. 解禁承認後に最小実装＋安全ゲート＋否定系テスト（別承認）。
5. 本番確認（利用者実測）→ 実顧客データの扱いはさらにその後の別承認。
6. 並行して CI / Test / Release Governance 等の品質基盤強化（別承認）。

## 7. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

### Evidence Map

- §0 12項目の決定値: 本ミッション本文（人間承認済み）＝本書 §2 に固定。
- 名称差分の根拠: doc103 §20（候補と推奨値）と本書 §2 の対応表。
- 現状確認: 本書 §3 の read-only 監査実測値（HEAD=`3b0d3a4`・Customer Pain 実装 0・封印指標 0/2/0/0/0・ラベル定義 2/2）。
- 正本反映: `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`369-vault/知識/CustomerPainデータ分類方針決定高機密ラベル解禁なし.md`・`369-vault/index.md`（いずれも本 commit に同梱）。

### Assumption Log

- VIEW_PERMISSION_POLICY の値名末尾の「_AND」は、doc103 の 3条件 AND 交差（AIロール除外を含む）へ続く AND 連鎖の意と解釈した（doc103 §20 推奨の注記「＋AIロール除外の3条件 AND」と整合。AI 除外は AI_REFERENCE_POLICY でも独立に固定されるため、解釈差があっても安全側に倒れる）。
- 名称差分12項目中10項目は表記ゆれであり、いずれも意味は doc103 の安全側推奨と同義または厳格化と判断した（本書 §2 の表）。

### Unknowns Log

- 高機密ラベル解禁の承認時期（人間判断待ち）。
- 詳細設計で決める記録粒度（writeDataAccess の fields 構成等）・安全ゲートの具体検査文字列（次の docs-only ミッション対象）。

### Risk Register

- 決定名と doc103 候補名の不一致が将来の照合で混乱を生むリスク → 本書 §2 の対応表で対応（正本は本書 §2 の決定値）。
- ラベル定義（labels.ts）の許可ロールに AI_AGENT・AI_ASSISTANT・STAFF が含まれる既存設計のまま実装すると過剰露出になるリスク → VIEW_PERMISSION_POLICY の AND 交差＋PROHIBIT_AI_REFERENCE_NOW で設計上固定済み。実装時は安全ゲート＋否定系テストで機械検知（SAFETY_GATE_POLICY / TEST_POLICY）。
- 未push commit の消失リスク → 次の push-only ミッション（別承認）で解消。

### Definition of Done

- [x] doc103 の read-only 監査（決定の前提と現状の一致確認）
- [x] §0 12項目の決定値を doc104 に正式記録（名称差分の対応表つき）
- [x] CURRENT_STATE / PROGRESS / 369-vault ノート＋index の正本反映
- [x] 許可5ファイルのみの差分で Gate 全 green
- [x] commit 1件作成・push なし・clean 停止

## 8. 次回推奨プロンプト案

1. **doc104 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature→main・Gate＋17項目報告）。
2. **高機密ラベル運用の詳細設計ミッション（docs-only・doc105 候補）**: 標準式（tenantId × knowledge:update × label許可ロール × AIロール除外）の擬似コード、writeDataAccess 記録粒度、安全ゲート検査文字列、否定系テスト具体ケースの確定。解禁ではない。
3. CI / Test / Release Governance 等の品質基盤強化ミッション（別承認）。

## 9. 判定

**判定: GO**（Customer Pain Data Classification 方針決定は完了。**高機密ラベル解禁なし**・**Customer Pain 実装なし**・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・AI参照条件変更なし・company-brain-reference 変更なし・PII/実顧客データ保存なし・外部公開なし・外部送信なし・実LLMなし・AIコストなし・push なし）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
