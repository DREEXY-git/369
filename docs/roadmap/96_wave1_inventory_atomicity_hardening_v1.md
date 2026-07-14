# Wave1 在庫原子性 hardening v1（在庫破損の根絶）

- Stream: 完成度ギャップ監査 Wave1（在庫）
- Branch: `claude/inventory-atomicity-hardening-v1`（base = main `a758d17`）
- 外部作用なし・DBスキーマ変更なし。

## 背景（監査95 で最も危険と判定）
`applyInventoryMovement`（`lib/operations.ts`・全在庫操作の基盤・呼び出し元5経路）は
資産読取→数量更新→移動台帳→監査を **transaction 外で逐次実行**し、`receive` は
`quantity = asset.quantity + qty` の **read-modify-write**。並行入庫で lost update＝**在庫数破損**。

## 修正
- 全書き込みを単一 `$transaction` で確定（監査は `tx.auditLog.create`）。
- 対象 `ProductAsset` 行を `SELECT ... FOR UPDATE` でロックし、同一資産への並列在庫操作を直列化。
- growth event は commit 後に emit。receive/dispatch/adjust/棚卸/調達 の5経路が一括で保護される。

## 検証（実 PostgreSQL・実 UI）
- `inventory_atomicity_evidence.spec.ts`（新規）: 同一資産へ**6並列入庫**→ quantity=移動台帳=6 が厳密一致（FOR UPDATE 無しなら lost update で <6）。
- 回帰 operations / operations_exec 全 green（10/10）。単体 passed・typecheck/lint clean。

## 残（後続 Wave1）
発注入庫の冪等化・リース/イベント二重引当チェック・CRM変換6書込の$transaction化。
