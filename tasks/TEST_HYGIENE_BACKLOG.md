# TEST_HYGIENE_BACKLOG（テスト後始末の衛生）

> EMERGENCY Gate-0（V82/V83）で機械スキャンした「共有 seed tenant 上で entityType 単位に Audit/DataAccessLog を削除する」cleanup の記録。
> これらは並列 CI（Playwright 2 workers）で兄弟テスト／seed 行を巻き込み得るため、**作成 id 限定**へ縮小する。

## Gate-0 R2/R3 で修正済み（Codex #4965087729 / #4965315275）
- `packages/db/src/__tests__/wave2_receivable_overdue.itest.ts`: `auditLog.deleteMany({ tenantId:{in:[T1,T2]} })` → `action:'receivable_overdue_transition'` 限定（R2）。
- `apps/web/tests/e2e/inventory_atomicity_evidence.spec.ts` / `po_receive_idempotency_evidence.spec.ts` / `lease_double_booking_evidence.spec.ts`:
  `auditLog.deleteMany({ tenantId, entityType:'InventoryMovement' })` → **fixture 資産の movement id を控え `entityId: { in: movementIds }` 限定**（R3）。
- `apps/web/tests/e2e/referral_readonly.spec.ts`（3箇所）: `dataAccessLog.deleteMany({ tenantId, entityType:'ReferralAnalysis' })` →
  beforeAll で **実行前 snapshot**（baseline id）を取得し `id: { notIn: baseline }` で本 spec 生成分のみ削除（R3・snapshot 差分）。
- `apps/web/tests/e2e/growth_control_tower.spec.ts`（3箇所）: 閲覧前後の **snapshot 差分**で各フェーズの新規 id を特定し、
  cleanup は `id: { in: createdIds }` のみ（mid-test の entityType 全削除も廃止）（R3）。

## 現状（残・要監視ではないが記録）
上記の修正で、**共有 seed tenant の entityType 全削除は E2E から解消**。以下は各テストが**自前で作成した合成テナント**
（`tid`/`A`/`B`/`T1`/`T2`/`tenantA`/`t`）への tenant 全体削除で、共有 seed を巻き込まないため衛生上の問題はない（記録のみ）:
`packages/db/src/__tests__` の p0/p1_* itest 群、`suggestion_review_db_evidence.spec.ts`、`content_review_db_evidence.spec.ts`、`quote_convert_db_evidence.spec.ts`。

## スキャン方法（再点検用）
`grep -rnE "deleteMany\(\{ where: \{ (tenantId|entityType)" apps/web/tests/e2e packages/db/src/__tests__` で棚卸しし、
共有 seed tenant（ceo の tenantId）に対する entityType 単位削除が無いことを確認する。
