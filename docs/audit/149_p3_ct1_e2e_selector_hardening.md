# 149. P3-CT-1 E2E selector hardening — docs/roadmap/50 の記録（tests-only・369-vault非編集）

## 1. 非エンジニア向け要約

- これは**機能追加ではありません**。先に作った Control Tower v0（成長機会の見るだけ画面）の**自動テストが、CI で安定して通るようにするためのテスト補強**です。
- 画面本体（見た目・動き）は**まったく変えていません**。変えたのはテストファイル1本の書き方だけです。
- 何を直したか: 担当者（財務権限なし）の画面では、金額を伏せるメッセージ「原価・粗利は財務閲覧権限が必要です（機密情報）。」が **2枚のカード（未回収リスク・低粗利改善候補）に出ます**。テストが「この文が画面にある」を1個前提でチェックしていたため、2個見つかると Playwright の厳格モードでエラーになる可能性がありました。そこで「ちょうど2件出る」ことを確認し、社長（財務権限あり）では「0件」であることも確認するように直しました。
- 担当者に金額を見せない方針は**そのまま**です。むしろ「2枚とも伏せ字になっている」ことを件数で厳密に確認するようになり、保護がより明確になりました。
- DB 設計・権限・デモデータ・CI 設定は一切変えていません。外部送信・実 LLM・課金・本番反映もありません。
- これは push 前の品質補正です。今回は commit のみで、push は別承認です。
- **実装本体変更なし・schema/migration/RBAC/seed 変更なし・redaction 方針不変・PII 非増加・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**。判定 **E2E selector hardening 完了（tests-only）／次は P3-CT-1 push-only**。

## 2. 直した理由（かんたんに）

- Control Tower の finance（金額）系カードは「未回収リスク」「低粗利改善候補」の2枚。
- 担当者はこの2枚とも金額が伏せられ、同じ伏せ字メッセージが2回表示される。
- テストが「1個ある」前提だと、2個一致で厳格モードのエラー（strict mode violation）になり得た。
- そこで「2件ある」を確認する形に直し、社長では「0件」であることも確認して、意味を強くした。

## 3. 変えたもの・変えていないもの

- 変えた: `apps/web/tests/e2e/growth_control_tower.spec.ts`（テストの書き方のみ）＋記録 docs/tasks。
- 変えていない: 画面 `page.tsx`・データ整形層 `control-tower.ts`・純ロジック `growth-control-tower.ts`・`nav.ts`・`index.ts`（実装本体）。schema・migration・RBAC・seed・ci.yml・playwright.config.ts・package・lock・369-vault。

## 4. 検証結果

- 単体テスト `pnpm test` = 271 passed / 0 failed（回帰なし）。`pnpm --filter @hokko/web typecheck` exit 0・`pnpm --filter @hokko/shared typecheck` exit 0・`pnpm lint` exit 0・`node scripts/check-company-brain-safety.mjs` exit 0・`git diff --check` OK・secret NONE・禁止領域差分なし・artifact 混入なし・369-vault 差分なし。
- E2E は本サンドボックスで実走不能（ブラウザ/DB なし）→ push 後の CI で growth_control_tower 2件を含む 74 passed / 0 failed を確認。

## 5. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| finance カードは2枚 | CARD_SPECS の financeGated:true が2件（未回収リスク・低粗利） | redaction 2件 |
| 補正で strict-mode 回避 | toHaveCount(2)＋first().toBeVisible()／社長は toHaveCount(0) | 安定・意味強化 |
| 実装本体不変 | git status に page/lib/shared/nav 差分なし | tests-only |
| 単体・型・lint・safety 緑 | pnpm test 271 passed・各 exit 0 | 緑 |

## 6. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 将来 finance カード増減で toHaveCount(2) 破綻 | 低 | v0 は2枚固定・増減時にテスト更新 |
| R2 | 担当者に金額露出 | 高 | redaction 不変・件数明示で担保強化 |
| R3 | 既存 e2e 回帰 | 中 | e2e 1本の assertion のみ・push 後 CI で 74/0 確認 |

## 7. Definition of Done

- e2e redaction assertion を strict-mode 安全化（toHaveCount(2)＋first／社長 toHaveCount(0)）／実装本体変更なし／単体271 passed・型/lint/safety・diff-check・secret NONE 緑／禁止領域差分なし・artifact なし・369-vault非編集／redaction 方針不変・PII 非増加・外部送信/実LLM/AIコスト/課金/本番なし／e2e 実緑は push 後 CI（74/0 見込み）／commit-only（push は別承認）。

## 8. 次回推奨プロンプト案

> 「P3-CT-1 push-only（別承認）: 実装＋e2e hardening commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し、Run E2E 74 passed / 0 failed、担当者に redaction 2件で金額実値なし、社長は redaction 0 件で閲覧できることを確認。緑なら P3-CT-2（優先度ロジック精緻化・別承認）。」

## 9. 判定

判定: **P3-CT-1 E2E selector hardening 完了（tests-only・commit-only）／実装本体変更なし／redaction 方針不変（担当者に金額実値なし・redaction 2件を件数明示で担保強化）／schema/migration/RBAC/seed 変更なし・PII 非増加・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・369-vault非編集**／単体271 passed・型/lint/safety 緑・diff-check OK・secret NONE／e2e 実緑は push 後 CI（74/0 見込み）／push なし（commit-only）。次は P3-CT-1 push-only（別承認）→ CI で 74/0 確認 → P3-CT-2。
