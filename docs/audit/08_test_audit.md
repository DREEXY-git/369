# 08 — テスト監査

## 現状（6ファイル / 約51 unit）

| ファイル | 種別 | 対象 |
|---|---|---|
| `packages/shared/src/__tests__/rbac.test.ts` | unit | RBAC 判定 |
| `packages/shared/src/__tests__/rules.test.ts` | unit | finance/inventory/leads 等の純ロジック |
| `packages/ai/src/__tests__/tasks.test.ts` | unit | FakeLLM タスク |
| `packages/integrations/src/__tests__/integrations.test.ts` | unit | maps/email/fetcher |
| `packages/db/src/__tests__/integration.itest.ts` | integration(要DB) | DB 結合 |
| `apps/web/tests/e2e/smoke.spec.ts` | e2e | スモーク |

`pnpm test` は 51 件 green（純ロジック/FakeLLM）。

## 要件 §19 との差分（未整備の代表）

- **Unit**: ABAC / tenant isolation / data masking / **prompt injection detector** / quote gross margin / **signage estimate** / invoice overdue / cashflow forecast / journal suggestion / inventory reservation conflict / EC order accounting event / suppression list / approval gate / knowledge chunking / **retrieval permission filtering** / location access permission / recording consent
- **Integration**: quote→contract→invoice→payment フロー / receipt OCR→仕訳 / meeting→minutes→task / knowledge save+search / outreach 承認→送信(+suppression遮断) / inventory 予約衝突 / EC order→在庫減/会計イベント / **cross tenant access denied**
- **E2E**: 主要業務フロー、承認フロー、staff が HR機密を見られない、AIが未許可データにアクセスできない
- **Security**: SQLi/XSS/CSRF/SSRF/不正MIME/過大ファイル/Webhook不正署名/prompt injection/RAG poisoning/外部送信は承認必須/位置・録音アクセスのログ

## 結論

**安全性・業務クリティカルパスのテストがほぼ皆無**。Phase 8 で security/integration/e2e を集中整備。まずは「クロステナント拒否」「外部送信は承認必須」「機密ラベル拒否」の3本を最優先で追加すべき。

## Phase 1-2 更新（2026-06-23）

- 追加 unit（DB非依存・`pnpm test`）: policy(14)/consent(6)/events(4)/webhook(5)/retention(4)/approval(3) = **+36**。合計 **85 passed**。
- 追加 integration（要DB・`pnpm --filter @hokko/db test:integration`）: `p0_foundations.itest.ts`（イベント冪等/クロステナント分離/同意付与→撤回/ポリシー deny 記録）= 4 tests。**14 passed**。
- カバー: ABAC allow/deny、HR機密拒否、AI不正参照拒否、位置/録音の同意必須、営業時間外拒否、外部送信/エクスポート承認必須、同意撤回ブロック、リテンション失効、冪等防止、Webhook署名/リプレイ。
- 残: e2e（承認フロー/権限分離の画面操作）、SSRF/XSS/CSRF の自動テスト。

## Phase 1-3 更新（2026-06-24）

- 追加 unit（`policy_rollout.test.ts`）: 承認ゲート(export/external/highAI)、ABAC(invoice deny staff / finance allow admin・owner)、outbox backoff = **+7** → 合計 **92 passed**。
- 追加 integration（`p1_3_outbox_jobrun.itest.ts`）: JobRun ライフサイクル(2)/Outbox 配送(delivered)/失敗→retry＋WebhookDelivery/同意×ポリシー(location allow・deny) = **+6** → 合計 **20 passed**。
- 残: e2e（権限分離・承認フロー画面操作）、SSRF/XSS/CSRF。

## Phase 1-4 更新（2026-06-24）

- 追加 unit: ai-safety(11: injection/pii/toolperm/runSafetyChecks)、growth(5: 型/カテゴリ/DXインパクト/集計)、growth_marketing(3: 権限/承認非送信/優先度) = **+19** → 合計 **111 passed**。
- 追加 integration（`p1_4_growth.itest.ts`）: 成長台帳記録＋集計、テナント分離、DX診断→改善機会(優先度計算)、マーケ資産→承認(非送信) = **+4** → 合計 **24 passed**。
- カバー: 命令注入検出、PIIマスク、AIツール権限、DXインパクト計算、成長集計、承認なし送信不可、tenant分離。
