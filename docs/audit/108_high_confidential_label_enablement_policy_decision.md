# 108. 高機密ラベル解禁可否 方針決定 — DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN（まだ解禁しない）の正式決定（docs-only・判定 GO）

- Audit Doc: 108
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Enablement Policy Decision
- Status: GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `6c6d0ceabb93f3c38cf19c0075faad06d500f5cb`（doc107・Scout 実測）
- Scope: 高機密ラベル解禁可否の §0 方針決定の記録
- Not Included: 実装・解禁・Customer Pain実装・DB変更・schema変更・migration・RBAC変更・label定義変更・AI参照条件変更・company-brain-reference変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc108 push-only（別承認）
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain実装 / schema変更 / migration / RBAC変更 / label定義変更 / AI参照条件変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- 今回は、doc107 で並べた「高機密ラベルを**使い始めてよいか（解禁してよいか）**」の判断材料をもとに、**人間が方針を正式に決めた**回です。
- 決めた内容は **「まだ解禁しない。次は守り方の最小実装設計を紙の上（docs-only）で進める」**（案A＝`DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN`）です。
- これは**解禁ではない**決定です。コードは1行も変わっていません。**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Data Classification実装なし**。
- 高機密ラベルを実際に使い始めるには、この後さらに**別の重い人間承認**が必要なままです。今回はその手前で「まだやらない」と正式に記録しただけです。

## 2. §0 人間決定値（10項目）

このミッションの送付をもって、以下10項目は**人間承認済みの安全側決定値**として確定します（承認されるのは「docs-only の方針決定記録」のみ。実装・解禁・本番反映・外部送信は一切承認されていません）。

```
HIGH_CONFIDENTIAL_ENABLEMENT_POLICY: DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN
ENABLEMENT_SCOPE_POLICY: NO_RUNTIME_ENABLEMENT_NOW
LABEL_POLICY: CUSTOMER_CONFIDENTIAL_ONLY_LATER
VIEW_POLICY: TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY
ACCESS_LOG_POLICY: WRITE_DATA_ACCESS_REQUIRED_LATER
WRITE_AUDIT_POLICY: WRITE_AUDIT_REQUIRED_LATER
PII_POLICY: PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE
PUBLIC_USE_POLICY: PROHIBIT_PUBLIC_USE
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

## 3. 決定の意味

各決定値が実務上どういう約束かを、非エンジニア向けに言い換えます。

- **HIGH_CONFIDENTIAL_ENABLEMENT_POLICY = DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN**: 高機密ラベルはまだ使い始めない。次段は「守り方の最小実装設計」を docs-only で進める（実装ではない）。
- **ENABLEMENT_SCOPE_POLICY = NO_RUNTIME_ENABLEMENT_NOW**: いま動く仕組みとしては何も解禁しない（実行時の解禁ゼロ）。
- **LABEL_POLICY = CUSTOMER_CONFIDENTIAL_ONLY_LATER**: 将来使うとしても対象ラベルは `CUSTOMER_CONFIDENTIAL` のみ（それ以外の例外ラベルは別設計）。ただし今は使わない。
- **VIEW_POLICY = TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY**: 将来の閲覧条件は「同じ会社（tenantId）× 編集権限（knowledge:update）× ラベル許可ロール × 人間（AIロール除外）」の **AND 交差のみ**（ラベル単独では不十分・OR 緩和禁止）。今は実装しない。
- **ACCESS_LOG_POLICY = WRITE_DATA_ACCESS_REQUIRED_LATER**: 将来、閲覧のたびに参照ログ（`writeDataAccess`）を必須にする（本文・個人情報はログに入れない）。今は実装しない。
- **WRITE_AUDIT_POLICY = WRITE_AUDIT_REQUIRED_LATER**: 将来、書き込みは監査ログ（`writeAudit`）を必須にする。今は実装しない。
- **PII_POLICY = PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW**: 今は個人情報・実顧客データを保存しない（**PII保存なし**・**実顧客データ保存なし**）。
- **AI_REFERENCE_POLICY = PROHIBIT_AI_REFERENCE**: 高機密ラベル対象は **AIに読ませない**（**AI参照条件変更なし**・`company-brain-reference` へ注入しない）。
- **PUBLIC_USE_POLICY = PROHIBIT_PUBLIC_USE**: 公開に使わない（**外部公開なし**・PR/SEO/SNS/顧客の声すべて禁止のまま）。
- **IMPLEMENTATION_POLICY = DOCS_ONLY_NOW**: 今回は文書だけ。**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**。

## 4. doc107 の3案との対応

doc107 で提示した3案のうち、今回の人間決定は **案A** です。

- **案A（採用）**: `DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN` — まだ解禁せず、次は高機密ラベル運用の最小実装設計 docs-only に進む。**今回も実装しない**。
- **案B（不採用・今回ではない）**: `ENABLE_NARROW_SCOPE_AFTER_SEPARATE_APPROVAL` — 対象ラベル/画面/テーブルを限定して別承認後に最小実装へ。今回は選ばない。
- **案C（不採用）**: `DO_NOT_ENABLE_AND_PRIORITIZE_QUALITY_FOUNDATION` — 解禁判断を保留し品質基盤（CI / Test / Release Governance）を優先。今回は選ばない（ただし将来の選択肢として保持）。

§0 決定値10項目は、すべて案A（および doc107 の推奨）と整合する安全側の値です。

## 5. なぜ今回は解禁しないのか

- **実装がまだ**: doc105 で守り方（標準閲覧式・記録・安全ゲート・否定系テスト）は設計済みだが、実コードは存在しない（Customer Pain 実装 0件を実測）。
- **schema がまだ**: Customer Pain のテーブル形状は未設計（`NO_SCHEMA_CHANGE` のまま）。器がない状態で解禁しても運用できない。
- **否定系テストがまだ**: doc105 の否定系テストが実装・green になる前に解禁すると、守りの後退を検知できない。
- **本番確認がまだ**: 解禁は本番確認まで含む重い工程。順序を飛ばすと安全性を実証できない。
- **可逆性の担保**: 一度実データに高機密を入れると後戻りが難しい。設計 → 実装 → テスト → 本番確認の順を守る。

## 6. 次に進む場合の安全な順序

案A に沿った次段は、いずれも**個別の別承認**が前提です。

1. **doc108 push-only**（別承認）: 本決定記録を feature ＋ main に反映する（push は今回禁止）。
2. **高機密ラベル運用の最小実装設計（docs-only・別承認）**: doc105 の事前停止条件（schema / RBAC / label定義変更の要否）の判定から開始し、必要が判明したら停止して人間判断へ戻す。
3. **高機密ラベル実装・解禁**: 最小実装設計後の**個別人間承認**（重い判断）。
4. **Customer Pain schema / 画面 / Server Action 実装**: 高機密ラベル設計・実装・本番確認後の別承認。
5. 品質基盤強化（CI / Test / Release Governance）を先に選ぶ道（案C）も、人間が選べば別承認で開始できる。

いずれの経路でも、**外部LLM送信・高機密ラベル解禁・本番確認・外部発信は個別人間承認なしに進めない**。

## 7. 今回やらなかったこと

- **解禁ではない**・**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Data Classification実装なし**。
- **DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**。
- **AI参照条件変更なし**・**company-brain-reference変更なし**・**AIに読ませない**。
- **PII保存なし**・**実顧客データ保存なし**。
- **外部公開なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし（commit-only）。
- `docs/10_obsidian` と `369-vault` の関係は別承認（今回確定しない）・既存 docs は改名しない・HOLD 記録削除なし・`369-vault` 構造変更なし（新規ノート1件と index 1行のみ）。

## 8. Evidence Map

- 現在地の根拠: Scout 実測（HEAD = origin/main = origin/feature = `6c6d0ceabb93f3c38cf19c0075faad06d500f5cb`・working tree clean・`origin/main..HEAD` 空・未push 0）。
- doc107 の3案・§0 候補の根拠: `docs/audit/107_high_confidential_label_enablement_decision_prerequisite.md`（§8 の3案・§10 の §0 人間決定候補10項目）を read-only で確認。
- doc105 の守り方の根拠: `docs/audit/105_customer_pain_high_confidential_label_operation_detail_design.md`（標準閲覧式＝tenantId × knowledge:update × label許可ロール × AIロール除外・writeDataAccess・writeAudit・安全ゲート・否定系テスト）を read-only で確認。
- 封印維持の実測（Customer Pain / 高機密ラベル Lineage のスコープ）:
  - `apps/web/lib/company-brain-reference.ts` への `CaseStudyConsent` / `caseStudyConsent` / `validateCaseStudyConsentReconciliation` の注入: **0件**（AI注入0）。
  - 同ファイルの `anonymized: true` 条件: **2件**（不変）。
  - `apps/packages` の Customer Pain 実装（customerPain / customer_pain 由来）: **0件**（Customer Pain実装0）。
  - `packages/db/prisma/schema.prisma` と `packages/shared/src/labels.ts` の `CUSTOMER_CONFIDENTIAL`: 各2件（既存定義・**確認のみ・変更しない**）。
- 補足（スコープの明確化）: 実測上 `externalAiAllowed`（.tsx 12）・`publishStatus`（.tsx 6）は存在するが、これらは**すべて既存の会社ブレイン（`brain/catalog`・`brain/policies`・`brain/playbooks`）および CaseStudy（`brain/case-studies`）の従来機能**であり、Customer Pain とは**別ドメイン**である。これらは外部AI公開や公開発信を**新たに解禁する UI ではない**（`externalAiAllowed` は作成時 false 固定で UI から true にできない＝doc39/doc42、`publishStatus` は `'private'` のまま公開導線なし＝doc80）。したがって**高機密ラベル・Customer Pain に紐づく 外部AI公開UI・公開ステータス公開UI・公開系tsx は 0件**であり、これらの既存機能は今回**不変**である。

## 9. Assumption Log

- 「doc105 で守り方の設計が揃った直後の最小リスクの次段は、最小実装設計 docs-only である」と仮定し、案A（§0 決定）を安全側決定として記録した。
- §0 決定値10項目は、このプロンプト送付をもって人間承認済みとして扱う（承認範囲は docs-only の方針決定記録のみ）。
- Evidence Map の `externalAiAllowed` / `publishStatus` は会社ブレイン / CaseStudy の既存機能であり、Customer Pain / 高機密ラベル解禁とは無関係と判断した（doc39・doc42・doc80 の記録に基づく）。

## 10. Unknowns Log

- 高機密ラベル運用 最小実装設計の具体化内容（次段・docs-only・別承認待ち）。
- Customer Pain のスキーマ形状（未設計・`NO_SCHEMA_CHANGE` のまま）。
- 品質基盤（CI / Test / Release Governance）と Customer Pain ラインの優先順位（人間判断）。
- `docs/10_obsidian` と `369-vault` の関係（別承認・今回確定しない）。

## 11. Risk Register

- 順序を飛ばして解禁すると、否定系テスト・本番確認前に実データが露出するリスク → 案A（設計先行）と §0 の `NO_RUNTIME_ENABLEMENT_NOW` / `DOCS_ONLY_NOW` で防ぐ。
- 「決定＝解禁」と誤読されるリスク → 本書冒頭・§7・§14 で**解禁ではない**ことを明記して防ぐ。
- 判断を先送りしすぎて Customer Pain ラインが停滞するリスク → 案A は最小実装設計 docs-only へ前進する形で緩和。
- 未push commit の揮発リスク → 次の doc108 push-only（別承認）で解消。

## 12. Definition of Done

- [x] doc108 に「まだ解禁しない」という §0 方針決定10項目を正式記録（案A＝`DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN`）。
- [x] doc107 の3案との対応・まだ解禁しない理由・次の安全な順序・今回やらなかったことを記録。
- [x] `CURRENT_STATE` / `PROGRESS` / vault ノート＋index の正本反映。
- [x] 許可5ファイルのみで Gate 全 green（code/schema/migration/RBAC/label定義/company-brain-reference/doc14/docs/10_obsidian は無変更）。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 13. 次回推奨プロンプト案

1. **doc108 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **高機密ラベル運用 最小実装設計ミッション**（docs-only・doc109 候補・doc105 の事前停止条件から。schema / RBAC / label定義変更の要否を最初に判定し、必要なら停止して人間判断へ）。
3. 品質基盤を優先する場合は **CI / Test / Release Governance 強化ミッション**（別承認）。

## 14. 判定

**判定: GO**（高機密ラベル解禁可否の §0 方針決定は「まだ解禁しない（案A＝`DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN`）」で正式記録された）。

ただし、これは高機密ラベル解禁ではない。**解禁ではない**・**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Data Classification実装なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference変更なし**・**AIに読ませない**・**PII保存なし**・**実顧客データ保存なし**・**外部公開なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
