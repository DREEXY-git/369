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
