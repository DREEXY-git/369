# 49. P3-CT-1 AI Growth Control Tower v0 read-only 画面 実装 Candidate（実装あり・read-only）

> 出典＝GitHub 正本 docs＋roadmap48/doc147（実装前 Gate PASS）＋既存コード read-only 実査。本書は Control Tower v0 の最初の縦切り **P3-CT-1（read-only 画面）** を実装した記録。**業務データは read-only（mutation なし）**。監査は既存方針の最小記録のみ。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。

## 1. 目的と範囲

Phase 3 GO（doc145/46）→設計（doc146/47）→実装前 Gate PASS（doc147/48）を受け、`/growth/control-tower` の **read-only 成長機会管制塔** を最小実装した。既存データ（LeadMap リード・商談・Company Brain・Golden Path・Finance Bridge・CRM 件数）を tenantId スコープで read-only 集約し、優先度つきカードで表示。財務値は権限者のみ、担当者には redaction。**mutation / Server Action / form POST / 外部送信導線は作らない**（重要操作は既存導線への deep link まで）。

## 2. 実装前 CI 前提（read-only 実測）

- doc147/roadmap48 push 起動の **run 28940565283（run_number 147・head_sha a5708e3）= completed / success・stage1 success・stage3_e2e success・Run E2E「72 passed (1.0m)」・Upload report on failure=skipped・env fake/log/false**。stage3_e2e は **6 run 連続 72/0**。この緑の上に P3-CT-1 を実装。

## 3. STOP 判定（実装前・該当なし）

Gate PASS どおり、実装は既存 schema・既存 RBAC・既存 seed のみで成立し、**STOP 条件に一切該当しなかった**: 新規 table/column/enum/migration なし・状態永続化なし（dismiss/snooze/read/pin/priority override なし）・新規 RBAC action/role なし・新規 seed なし・redaction で塞げない機密表示なし・ci.yml/playwright.config.ts/package/lock 変更なし。

## 4. 追加・変更ファイル

- 新規 `packages/shared/src/growth-control-tower.ts`（DB非依存の純ロジック：カード型・優先度スコアリング・`buildControlTowerCards`・`countActionableCards`・redaction 文言定数。状態永続化なし・乱数/時刻非依存で deterministic）。
- 新規 `packages/shared/src/__tests__/growth-control-tower.test.ts`（純ロジック単体テスト 6 件：優先度降順・finance redaction・空データ・deterministic・actionable 件数）。
- 変更 `packages/shared/src/index.ts`（barrel に `growth-control-tower` を1行 export 追加）。
- 新規 `apps/web/lib/domains/growth/control-tower.ts`（データ整形層：tenantId スコープの read-only prisma count＋既存 `getGoldenPathExecutiveDashboardData` 再利用＋finance gating＋finance 参照時のみ `writeDataAccess(confidential_view)` 最小1件）。
- 新規 `apps/web/app/(app)/growth/control-tower/page.tsx`（RSC・`force-dynamic`・`requireUser`・`canViewFinance=hasPermission(user,'finance','read')`・既存 UI プリミティブ再利用・mutation/Server Action/form なし）。
- 変更 `apps/web/components/shell/nav.ts`（`Radar` アイコン import 追加＋「Growth・DX OS」グループに `Growthコントロールタワー → /growth/control-tower` を1行追加）。
- 新規 `apps/web/tests/e2e/growth_control_tower.spec.ts`（read-only smoke＋redaction：CEO 閲覧／担当者は finance 実値なし）。
- docs/tasks: 本書＋`docs/audit/148`＋`tasks/CURRENT_STATE.md`＋`tasks/PROGRESS.md`＋`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`。

## 5. 初期カード（9枚・read-only 集約）

各カードは `{ key, title, description, reason, count, priority, score, href, source, financeGated, redacted, empty }` を持つ。

- 社長が見るべき成長機会（Golden Path `overall.attentionCount`）→ /planning-hokko。
- 未回収リスク（finance-gated・Finance Bridge・受取延滞/未回収件数）→ /planning-hokko。
- 停滞商談（Deal：更新なし14日超・未失注）→ /deals。
- 低粗利改善候補（finance-gated・`overall.lowMarginCount`）→ /planning-hokko。
- 未追客リード（LocalBusinessLead：lastContactAt null）→ /leadmap。
- 高機会リード（LocalBusinessLead：priority>=70）→ /leadmap。
- 次回接触推奨（LocalBusinessLead：lastContactAt が30日超）→ /leadmap。
- Company Brain 改善候補（ProductCatalogItem：active かつ targetPain 欠落）→ /brain/catalog。
- 既存顧客追加提案候補（Customer 件数＝匿名指標のみ・PII 非表示）→ /customers。

## 6. 権限・redaction

- `requireUser` 必須・`tenantId` 全 count スコープ。財務は `canViewFinance=hasPermission(user,'finance','read')`。
- finance 系カード（未回収リスク・低粗利改善候補）は `canViewFinance=false` のとき **データ整形層で件数を集計せず null**（redacted）とし、UI は `原価・粗利は財務閲覧権限が必要です（機密情報）。`（app 既存文言）を表示。**担当者に金額実値は渡さない（lib 段階で担保）**。
- Customer 一覧行レベル・Contact 単体は据え置き。**生 PII 列を増やさない**（既存顧客カードは件数のみ）。
- AI ロールの送信/承認/削除権限は不変（`ROLE_PERMISSIONS` 非変更）。

## 7. 監査・AI 境界

- 業務データは read-only。finance 機密に触れる閲覧（canViewFinance=true）時のみ `writeDataAccess(action=confidential_view, entityType=GrowthControlTower, label=INTERNAL, purpose=growth_control_tower_view)` を最小1件。**金額・PII・secret を metadata に入れない**（件数系のみ）。UsageEvent は追加しない。
- FakeLLM 前提・実LLM/AIコストなし。AI は外部送信/承認/削除/重要操作を直接実行しない。改善候補は下書き扱い（v0 は deterministic 文言のみで LLM 呼び出しもしない）。重要操作は既存 `ApprovalRequest`/`/approvals` へ deep link。

## 8. 検証結果

- 単体テスト（`pnpm test`）: **271 passed / 0 failed**（従来 265＋新規 6・回帰なし）。新規 `growth-control-tower.test.ts` 6 件 green。
- `pnpm --filter @hokko/web typecheck`: exit 0。`pnpm --filter @hokko/shared typecheck`: exit 0。
- `pnpm lint`: exit 0。`node scripts/check-company-brain-safety.mjs`: exit 0（ui files 156→157）。
- `git diff --check`: OK。secret scan: NONE。禁止領域差分: なし（schema/migration/seed/rbac.ts/ci.yml/playwright.config.ts/package/lock/369-vault 非変更）。artifact 混入: なし。
- **e2e（growth_control_tower.spec.ts＋既存全 spec）: 本サンドボックスでは実走不能（Postgres/Actions/ブラウザなし）→ push 後の CI（stage3_e2e）で確認**。既存 72 件は不変・新規 2 件追加で **74 件 / 0 failed** を見込む（0 failed 維持が要件）。

## 9. Phase 3 現在地

Phase 3 GO 済み。Control Tower v0 は **P3-CT-1（read-only 画面）実装完了（commit-only）**。CI 実緑（74/0 見込み）は push 後に確認。以降 P3-CT-2（優先度ロジック精緻化）〜CT-7 は別承認。**状態永続化・外部送信・実LLM・課金・本番は未着手（個別承認制）**。

## 10. Complete Function Coverage Matrix（50カテゴリ）

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

## 11. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 実装前 CI 緑 | run 28940565283 success・72/0・6 run 連続 | 緑 |
| read-only 実装 | page.tsx に mutation/Server Action/form なし・lib は count/read のみ | 業務 mutation なし |
| 既存関数再利用 | getGoldenPathExecutiveDashboardData・redactExecutiveFinance・writeDataAccess・requireUser・hasPermission | 新規権限/redact コードなし |
| finance redaction | control-tower.ts で canViewFinance=false 時 lowMargin/unpaid=null・buildControlTowerCards で redacted=true・count=null | 担当者に金額実値なし |
| PII 非増加 | Customer は count のみ・Contact 未参照・生 PII 列なし | 据え置き維持 |
| schema/RBAC/seed 非変更 | git status に schema/migrations/seed/rbac.ts 差分なし | 既存のみで成立 |
| 単体テスト緑 | pnpm test 271 passed / 0 failed（新規6含む） | 回帰なし |
| 型/lint/safety 緑 | web/shared typecheck exit 0・lint exit 0・safety exit 0 | 緑 |

## 12. Assumption Log

- v0 のしきい値（停滞14日・次回接触30日・高機会 priority>=70）は仮置き（deterministic・状態永続化なし）。実運用値は P3-CT-2 で調整（seed 影響が出れば別承認）。
- 停滞商談は「更新14日超かつ未失注（lostReason null）」で近似（DealStage enum に依存しない安全側ヒューリスティック）。
- 既存 seed に LocalBusinessLead/Deal/CompanyPolicy/ProductCatalogItem/Customer/EventProject が存在するため、CI で各カードが件数表示できる。

## 13. Unknowns Log

- 各カードの最適スコアリング式・しきい値（P3-CT-2 で純ロジックを精緻化・単体テストで担保）。
- Company Brain 改善候補の下書き粒度（v0 は deterministic 文言・LLM 未使用）。
- e2e の実緑（74/0 見込み）は push 後の CI で確定。

## 14. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 担当者に finance 実値露出 | 高 | lib 段階で null 化＋UI redaction＋e2e（sales で redaction 表示・非表示 Stat）で担保 |
| R2 | 既存 e2e 72/0 の回帰 | 中 | read-only 追加のみ・既存 spec 不変・push 後 CI で 74/0 確認 |
| R3 | RSC 描画中の writeDataAccess 二重記録 | 低 | force-dynamic で1リクエスト1描画・finance 参照時のみ1件・金額/PII を metadata に入れない |
| R4 | AI 提案が外部送信/実LLM に滑る | 中 | v0 は LLM 未呼び出し・deterministic 文言・送信導線なし・deep link のみ |
| R5 | しきい値仮置きで誤検知 | 低 | v0 仮置きと明記・P3-CT-2 で調整・状態永続化なし |

## 15. Definition of Done

- P3-CT-1 read-only 画面・純ロジック・データ整形層・nav・e2e・docs/tasks/dashboard を最小実装／単体 271 passed・web/shared typecheck・lint・safety・diff-check・secret NONE 緑／禁止領域差分なし・artifact なし・369-vault非編集／**業務データ mutation なし・schema/migration/RBAC/seed 変更なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし**／e2e 実緑は push 後 CI（74/0 見込み）／commit-only（push は別承認）。

## 16. 次回推奨プロンプト案

> 「P3-CT-1 push-only ミッション（別承認）: Control Tower v0 read-only 実装 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI（stage1・stage3_e2e）を read-only 確認し、Run E2E が **74 passed / 0 failed**（既存72＋新規2）であること、とくに growth_control_tower の CEO 閲覧・担当者 redaction（sales に原価・粗利の実値が出ない）を確認。in_progress は報告して停止・failure は失敗 job/step のみ報告（修正/rerun なし）。緑なら次は P3-CT-2（優先度ロジック精緻化・純ロジック＋単体テスト・別承認）。」

## 17. 判定

判定: **P3-CT-1 AI Growth Control Tower v0 read-only 画面 実装完了（commit-only）／業務データ mutation なし・read-only／STOP 条件非該当（既存 schema・RBAC・seed のみで成立）／単体 271 passed・型/lint/safety 緑／e2e 実緑は push 後 CI（74/0 見込み）**。**担当者に原価・粗利・未回収の実値は出さない（lib redaction＋UI＋e2e で担保）／Customer・Contact の生 PII は増やしていない**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は P3-CT-1 push-only（別承認）→ CI で 74/0 確認 → P3-CT-2。
