# 51. P3-CT-2 Control Tower 優先度ロジック精緻化 Candidate（実装あり・純ロジック中心）

> 出典＝GitHub 正本 docs＋P3-CT-1（roadmap49/50・commit 664546c）＋P3-CT-1 CI green（run 28944487139=74/0）の read-only 確認。本書は Control Tower の**優先度スコアリングを純ロジック中心で精緻化**した記録。**業務データ mutation なし（read-only）・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。

## 1. 目的と範囲

P3-CT-1 read-only 画面（run 28944487139=success・74/0）を前提に、`packages/shared/src/growth-control-tower.ts` の DB非依存の純ロジックを精緻化し、Control Tower の判断品質を上げる。画面の大幅変更・状態永続化・外部送信・実LLM はしない。redaction 方針は不変。

## 2. 実装前 CI 前提（read-only）

- run 28944487139（run_number 148・head_sha 664546c）= completed / success・stage1 success・stage3_e2e success・Run E2E 74 passed / 0 failed・Upload report on failure=skipped・env fake/log/false。growth_control_tower 2件 green（社長閲覧／担当者 redaction）。これが **P3-CT-1 CI green 完了**の根拠。

## 3. STOP 判定（該当なし）

新規 table/column/enum/migration・状態永続化・新規 RBAC action/role・新規 seed・redaction で塞げない機密表示・ci.yml/playwright.config.ts/package/lock 変更のいずれも不要。signals interface 不変のため lib/page/e2e も変更不要（純ロジック＋単体テスト中心）。

## 4. 精緻化したスコアリング（deterministic・上限あり）

- 旧 v0: `score = baseWeight + min(count, 20)`（redacted=baseWeight×0.6）。件数の線形加算で、重要度・信頼度・緊急度が分離されていなかった。
- 新 P3-CT-2: **score = 重要度(businessImpact) × (基礎 BASE_SHARE + 緊急度 URGENCY_SHARE × urgency) × 信頼度(confidence)**。
  - `businessImpact`（0-100）: 機会の経営インパクト（重要度）。
  - `urgency`（0-1）: `min(count / urgencyCap, 1)`＝件数由来の緊急度。**urgencyCap で飽和**し過剰に釣り上げない（カードごとに調整）。
  - `confidence`（0-1）: シグナルの信頼度（Golden Path/Finance=1.0、Deal=0.95、リード=0.9、次回接触=0.85、Company Brain=0.7、既存顧客件数のみ=0.6）。
  - `BASE_SHARE=0.7`・`URGENCY_SHARE=0.3`・`REDACTED_FACTOR=0.6`・**上限 `CONTROL_TOWER_SCORE_MAX=100`**。
  - **empty（count=0・非 redacted）は score=0**。
  - **redacted（financeGated かつ canViewFinance=false）は「要確認」中位**＝`round(businessImpact × REDACTED_FACTOR × confidence)`・**count=null・urgency=0・reason は redaction 文言**（実値を渡さない）。
- `scoreBreakdown`（businessImpact/urgency/confidence/redactedFloor）を各カードに付与し**score の根拠を説明可能**にした（乱数・時刻・PII・金額を含まない）。
- 同点は **重要度降順で安定ソート**（乱数なし・deterministic）。priority ラベル閾値は high>=70・medium>=40・low。

## 5. カードごとの方向性（実装値）

| key | businessImpact | urgencyCap | confidence | financeGated |
|---|---|---|---|---|
| ceo_attention（社長が見るべき成長機会） | 92 | 5 | 1.0 | no |
| unpaid_risk（未回収リスク） | 88 | 5 | 1.0 | **yes** |
| stalled_deals（停滞商談） | 80 | 8 | 0.95 | no |
| low_margin_projects（低粗利改善候補） | 76 | 6 | 1.0 | **yes** |
| uncontacted_leads（未追客リード） | 70 | 20 | 0.9 | no |
| high_opportunity_leads（高機会リード） | 66 | 15 | 0.9 | no |
| next_contact_due（次回接触推奨） | 58 | 15 | 0.85 | no |
| company_brain_gaps（Company Brain 改善候補） | 46 | 10 | 0.7 | no |
| existing_customer_upsell（既存顧客追加提案候補・件数のみ） | 40 | 30 | 0.6 | no |

- 件数があるとき、社長が見るべき成長機会・未回収リスク・停滞商談・低粗利改善候補が上位に来やすい。**count=0 は上位に来ない（score=0）**。redacted finance は中位。

## 6. redaction（不変・データ構造でも担保）

- `financeGated` かつ `canViewFinance=false` のカードは **count=null・redacted=true・reason=CONTROL_TOWER_REDACTION_NOTICE**（`原価・粗利は財務閲覧権限が必要です（機密情報）。`）を維持。urgency=0・redactedFloor=true。**担当者に原価・粗利・未回収・請求金額などの実値を渡さない**（pure logic のデータ構造でも count を持たない）。Customer/Contact の生 PII を増やさない（既存顧客カードは件数のみ）。
- e2e（担当者 redaction 2件・社長 redaction 0件）は既存のまま green を維持（純ロジック変更で見出し・redaction 表示は不変）。

## 7. 変更ファイル

- 変更: `packages/shared/src/growth-control-tower.ts`（純ロジック精緻化・型に `scoreBreakdown`/`ControlTowerScoreBreakdown` 追加・定数 `CONTROL_TOWER_SCORE_MAX` 追加）。
- 変更: `packages/shared/src/__tests__/growth-control-tower.test.ts`（既存6→13 テスト：score 上限・urgency 飽和・単調非減少・上位順・redacted 中位・priority ラベル・scoreBreakdown）。
- docs/tasks: 本書＋`docs/audit/150`＋`tasks/CURRENT_STATE.md`＋`tasks/PROGRESS.md`＋`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。
- **未変更（=最小差分）**: `apps/web/lib/domains/growth/control-tower.ts`（signals interface 不変）・`apps/web/app/(app)/growth/control-tower/page.tsx`（card 消費のみ・scoreBreakdown は任意消費）・`apps/web/tests/e2e/growth_control_tower.spec.ts`（見出し・redaction 不変）。

## 8. 検証結果

- `pnpm test`: **278 passed / 0 failed**（従来271＋新規7・growth-control-tower は6→13・回帰なし）。
- `pnpm --filter @hokko/web typecheck`: exit 0。`pnpm --filter @hokko/shared typecheck`: exit 0。
- `pnpm lint`: exit 0。`node scripts/check-company-brain-safety.mjs`: exit 0（ui files 157・page 不変）。
- `git diff --check`: OK。secret scan: NONE。禁止領域差分: なし。artifact 混入: なし。369-vault 差分: なし。
- **e2e（growth_control_tower 2件＋既存）: 本サンドボックスで実走不能→push 後の CI（stage3_e2e）で 74 passed / 0 failed（担当者 redaction 2件・社長 0件）を確認**。純ロジック変更は見出し・redaction 表示を変えないため既存 e2e は不変で緑維持見込み。

## 9. Complete Function Coverage Matrix（50カテゴリ）

| # | 区分 | # | 区分 | # | 区分 | # | 区分 | # | 区分 |
|---|---|---|---|---|---|---|---|---|---|
| **C41** | 直接(Phase3) | **C42** | 直接(Phase3) | **C43** | 直接(Phase3) | **C44** | 直接(Phase3) | **C03** | 直接 |
| **C06** | 直接 | **C08** | 直接 | **C46** | 直接 | C01 | 間接 | C04 | 間接 |
| C05 | 間接 | C07 | 間接 | C09 | 間接 | C10 | 間接 | C11 | 間接 |
| C12 | 間接 | C15 | 間接 | C18 | 間接 | C20 | 間接 | C26 | 間接 |
| C28 | 間接 | C30 | 間接 | C33 | 間接 | C34 | 間接 | C37 | 間接 |
| C38 | 間接 | C39 | 間接 | C40 | 間接 | C48 | 間接 | C02 | 後続 |
| C13 | 後続 | C14 | 後続 | C16 | 後続 | C17 | 後続 | C19 | 後続 |
| C21 | 後続 | C22 | 後続 | C23 | 後続 | C24 | 後続 | C25 | 後続 |
| C27 | 後続 | C29 | 後続 | C31 | 後続 | C32 | 後続 | C35 | 後続 |
| C36 | 後続 | C47 | 後続 | C49 | 後続 | C50 | 後続 | C45 | 禁止/Future隔離 |

## 10. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| P3-CT-1 CI green 完了 | run 28944487139 success・74/0・growth_control_tower 2件 green | 緑 |
| 純ロジック精緻化 | growth-control-tower.ts の score=impact×(base+urgency)×confidence・上限100 | deterministic |
| urgency 飽和 | urgencyFromCount=min(count/cap,1)・単体テスト（20と1000が同score） | 過剰釣り上げなし |
| redaction 不変 | financeGated&!canViewFinance→count=null・redacted・notice・単体テスト | 担当者に実値なし |
| PII 非増加 | 既存顧客は件数のみ・Contact 未参照 | 据え置き |
| schema/RBAC/seed 非変更 | git status に該当差分なし・signals 不変 | 既存のみで成立 |
| 単体テスト緑 | pnpm test 278 passed / 0 failed（新規7含む） | 回帰なし |
| 型/lint/safety 緑 | web/shared typecheck・lint・safety exit 0 | 緑 |

## 11. Assumption Log

- businessImpact/urgencyCap/confidence は v0/P3-CT-2 仮置き（deterministic）。実運用値は後続で調整。
- 純ロジック変更は card の title/heading/redaction 表示を変えないため、既存 e2e（担当者 redaction 2件・社長 0件）は不変で緑を維持できる。
- signals interface を変えていないため lib/page は変更不要。

## 12. Unknowns Log

- 実運用での最適 businessImpact/urgencyCap/confidence 閾値。
- P3-CT-3 以降の状態管理（dismiss/snooze 等）は新規 schema が必要になるため別承認（本段では不採用）。
- score の UI 表示（scoreBreakdown の可視化）は将来検討（本段では page 未変更）。

## 13. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 担当者に finance 実値露出 | 高 | redaction 不変（count=null・notice・pure logic でも担保）・単体＋e2e で確認 |
| R2 | 既存 e2e 74/0 の回帰 | 中 | 見出し・redaction 表示不変・push 後 CI で 74/0 確認 |
| R3 | スコア誤判定（重要度の偏り） | 中 | scoreBreakdown で説明可能・v0 仮置きと明記・後続で調整 |
| R4 | 将来 schema が必要になる（状態永続化） | 低 | 本段は不採用・必要時 STOP・別承認 |
| R5 | AI 提案が外部送信/実LLM に滑る | 中 | 純ロジックのみ・LLM 未使用・送信導線なし |

## 14. Definition of Done

- 純ロジック精緻化（重要度×緊急度×信頼度・上限100・empty=0・redacted 中位・安定ソート・scoreBreakdown）＋単体テスト 13 件／`pnpm test` 278 passed・web/shared typecheck・lint・safety・diff-check・secret NONE 緑／禁止領域差分なし・artifact なし・369-vault非編集／**業務 mutation なし・schema/migration/RBAC/seed 変更なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・redaction 不変・PII 非増加**／e2e 実緑は push 後 CI（74/0 見込み）／commit-only（push は別承認）。

## 15. 次回推奨プロンプト案

> 「P3-CT-2 push-only ミッション（別承認）: 優先度ロジック精緻化 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI（stage1・stage3_e2e）を read-only 確認し、Run E2E が **74 passed / 0 failed**（growth_control_tower の社長閲覧・担当者 redaction 2件が引き続き green）であることを確認。in_progress は報告して停止・failure は失敗 job/step のみ報告（修正/rerun なし）。緑なら次は P3-CT-3 設計（状態管理が必要なら schema 影響を実装前 Gate で判定・別承認）を提案。」

## 16. 判定

判定: **P3-CT-2 優先度ロジック精緻化 完了（commit-only・純ロジック中心）／業務 mutation なし・read-only／STOP 非該当（既存 schema・RBAC・seed のみで成立）／単体 278 passed・型/lint/safety 緑／e2e 実緑は push 後 CI（74/0 見込み）／redaction 不変（担当者に原価・粗利・未回収の実値なし）／Customer・Contact の生 PII 非増加**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。P3-CT-1 CI green 完了の根拠は run 28944487139。次は P3-CT-2 push-only（別承認）→ CI で 74/0 確認 → P3-CT-3 設計（別承認）。
