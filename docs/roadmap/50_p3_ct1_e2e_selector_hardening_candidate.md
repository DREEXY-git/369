# 50. P3-CT-1 E2E selector hardening Candidate（tests-only）

> 出典＝GitHub 正本 docs＋P3-CT-1 実装（doc148/roadmap49・commit 6cc9d2c）の read-only 確認。本書は push 前の **tests-only** 品質補正（e2e selector を strict-mode 安全化）の記録。**実装本体変更なし・app変更なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。

## 1. 目的

P3-CT-1 実装 commit `6cc9d2c` を push する前に、`apps/web/tests/e2e/growth_control_tower.spec.ts` の担当者 redaction assertion を **Playwright strict mode で不安定化しない形**に tests-only で最小補正する。実装本体・UI・redaction 方針は変えない。

## 2. 対象

- `apps/web/tests/e2e/growth_control_tower.spec.ts`（tests-only 補正）。
- 参照（read-only・変更なし）: `apps/web/app/(app)/growth/control-tower/page.tsx`、`packages/shared/src/growth-control-tower.ts`。

## 3. なぜ修正が必要か（strict mode risk）

- Control Tower v0 の finance-gated カードは **「未回収リスク」「低粗利改善候補」の2枚**。担当者（canViewFinance=false）ではこの2枚がともに redaction 文言 `原価・粗利は財務閲覧権限が必要です（機密情報）。`（`CONTROL_TOWER_REDACTION_NOTICE`）を描画する。
- 補正前は `await expect(page.getByText('原価・粗利は財務閲覧権限が必要です', { exact: false })).toBeVisible();` としており、**2要素が一致 → Playwright strict mode violation**（`toBeVisible()` は単一要素前提）で CI の該当テストが赤化するリスクがあった。
- ページ脚注は実装時に当該文言を含まない文へ変更済みのため、担当者では redaction は **ちょうど 2 件**、社長（canViewFinance=true）では **0 件**。この件数を明示することで安定かつ意味の強い検証にできる。

## 4. 修正内容（最小・tests-only）

- 担当者テスト: redaction locator を変数化し、`await expect(redactionMessages).toHaveCount(2);`（finance-gated 2枚の redaction を明示）＋ `await expect(redactionMessages.first()).toBeVisible();`（可視性）に変更。`非表示` Stat も `.first()` を付与し strict-mode を回避。
- 社長テスト: 対比を明示するため `await expect(getByText(redaction)).toHaveCount(0);`（財務権限ありでは redaction が出ない）を追加し、`表示可` Stat に `.first()` を付与。
- **意図は不変**: 担当者に原価・粗利・未回収の実値が出ないこと（redaction 表示）を引き続き担保。むしろ「finance-gated 2枚とも redacted・社長は 0」を件数で厳密化した。

## 5. 実装本体変更なし

- `page.tsx`・`control-tower.ts`（lib）・`growth-control-tower.ts`（純ロジック）・`nav.ts`・`index.ts` は**一切変更していない**。変更は e2e spec 1本のみ（＋docs/tasks）。

## 6. 安全境界（不変）

- **schema/migration/RBAC/seed 変更なし**。redaction 方針不変（finance 系は lib 段階で null 化・担当者に金額実値を渡さない）。**PII 非増加**（Customer は件数のみ・Contact 未参照）。外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・状態永続化なし。**369-vault 非編集**。

## 7. 検証結果

- `pnpm test`: 271 passed / 0 failed（tests-only e2e 補正・単体には影響なし・回帰なし）。
- `pnpm --filter @hokko/web typecheck`: exit 0。`pnpm --filter @hokko/shared typecheck`: exit 0。
- `pnpm lint`: exit 0。`node scripts/check-company-brain-safety.mjs`: exit 0。
- `git diff --check`: OK。secret scan: NONE。禁止領域差分: なし。artifact 混入: なし。369-vault 差分: なし。
- **e2e 実走は本サンドボックスでは不能（Postgres/Actions/ブラウザなし）→ push 後の CI（stage3_e2e）で growth_control_tower 2件を含む 74 passed / 0 failed を確認**。

## 8. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| finance-gated は2枚 | `growth-control-tower.ts` の CARD_SPECS（unpaid_risk・low_margin_projects が financeGated:true） | redaction 2件 |
| 補正前は strict-mode risk | 旧 spec 行 `getByText(redaction).toBeVisible()`（2一致） | 赤化リスク |
| 補正後は安定 | `toHaveCount(2)`＋`.first().toBeVisible()`／社長は `toHaveCount(0)` | strict-mode 回避＋意味強化 |
| 実装本体不変 | git status に page/lib/shared/nav 差分なし（e2e spec のみ） | tests-only |
| 単体・型・lint・safety 緑 | pnpm test 271 passed・typecheck/lint/safety exit 0 | 緑 |

## 9. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 将来 finance-gated カードが増減し toHaveCount(2) が破綻 | 低 | v0 は2枚固定・増減時はテスト更新（意図的シグナル） |
| R2 | 担当者に finance 実値露出 | 高 | lib redaction 不変・本補正で redaction 2件を件数明示・むしろ担保強化 |
| R3 | 既存 e2e 72/0 の回帰 | 中 | e2e spec 1本の assertion 補正のみ・push 後 CI で 74/0 確認 |

## 10. 次回 push-only プロンプト案

> 「P3-CT-1 push-only ミッション（別承認）: P3-CT-1 実装＋e2e hardening commit を feature branch `claude/ci-stage3-e2e-f1d-selectors-hikwbg` へ push（main へ push しない・force なし・amend/rebase/reset なし）。push 後 CI（stage1・stage3_e2e）を read-only 確認し、Run E2E が **74 passed / 0 failed**（既存72＋新規 growth_control_tower 2件）であること、担当者（sales）に redaction が2件出て原価・粗利の実値が出ないこと、社長は redaction 0 件で閲覧できることを確認。in_progress は報告して停止・failure は失敗 job/step のみ報告（修正/rerun なし）。緑なら次は P3-CT-2（優先度ロジック精緻化・別承認）。」

## 11. 判定

判定: **P3-CT-1 E2E selector hardening 完了（tests-only・commit-only）／実装本体変更なし／redaction 方針不変（担当者に金額実値なし・むしろ redaction 2件を件数明示で担保強化）／schema/migration/RBAC/seed 変更なし・PII 非増加・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・369-vault非編集**／単体271 passed・型/lint/safety 緑・diff-check OK・secret NONE／e2e 実緑は push 後 CI（74/0 見込み）／push なし（commit-only）。次は **P3-CT-1 push-only（別承認）→ CI で 74/0 確認 → P3-CT-2**。
