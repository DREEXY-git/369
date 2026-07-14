# TEST_HYGIENE_BACKLOG（テスト後始末の衛生）

> EMERGENCY Gate-0（V82/V83）で機械スキャンした「共有 seed テナント上で entityType 単位に Audit/DataAccessLog を削除する」cleanup の一覧。
> これらは並行 CI で兄弟テスト／seed の同 entityType 行を巻き込み得る（wave2_receivable_overdue.itest.ts と同一 root cause）。

## Gate-0 で修正済み（Codex #4965087729 で名指し）
- `packages/db/src/__tests__/wave2_receivable_overdue.itest.ts` cleanup: `auditLog.deleteMany({ tenantId:{in:[T1,T2]} })` →
  `action: 'receivable_overdue_transition'` を追加して限定。

## 残（同一 root cause・後続 WIP で作成 entityId 限定へ縮小する）
共有 seed テナント（ceo の tenantId）上で **entityId を指定せず** entityType 単位に削除している箇所。
修正方針: 各テストが作成した行の id を控え、`entityId: { in: [...createdIds] }` に限定する。

| ファイル | 行 | 現状 | 由来 |
|---|---|---|---|
| `apps/web/tests/e2e/inventory_atomicity_evidence.spec.ts` | 62 | `auditLog.deleteMany({ tenantId:t, entityType:'InventoryMovement' })` | #47 |
| `apps/web/tests/e2e/po_receive_idempotency_evidence.spec.ts` | 71 | 同上 | #48 |
| `apps/web/tests/e2e/lease_double_booking_evidence.spec.ts` | 80 | 同上 | #50 |
| `apps/web/tests/e2e/referral_readonly.spec.ts` | 80,146,234 | `dataAccessLog.deleteMany({ tenantId, entityType:'ReferralAnalysis' })` | 既存 |
| `apps/web/tests/e2e/growth_control_tower.spec.ts` | 158,168,177 | `dataAccessLog.deleteMany({ tenantId, entityType:'GrowthControlTower' })` | 既存 |

これらは各 Lane の後続 WIP（在庫=Lane-INVENTORY、referral/growth=別途）で、当該テストを触る際に作成 id 限定へ縮小する。Gate-0 では**範囲拡大を避けるため未修正**（機能非退行・並行競合は低頻度）。

## 安全（tenant 全体削除だが合成テナント＝影響局所・要修正ではない）
以下は各テストが**自前で作成した合成テナント**（`tid`/`A`/`B`/`T1`/`T2`/`tenantA`/`t`）に対する tenant 全体削除で、共有 seed を巻き込まないため衛生上の問題はない（記録のみ）:
`packages/db/src/__tests__` の p0/p1_* itest 群、`suggestion_review_db_evidence.spec.ts`、`content_review_db_evidence.spec.ts`、`quote_convert_db_evidence.spec.ts`。
