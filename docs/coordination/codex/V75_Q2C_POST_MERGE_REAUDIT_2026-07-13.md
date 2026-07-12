# Codex V75 Q2C Post-Merge再監査

## 判定

- 対象main: `37096714882c79f0dd5a30728497c55d87ef06be`
- PR #37 source: `be0ab807ebc2fd09d0f8ccacd23b240a396d84e8`
- 判定: `CHANGES_REQUIRED / HOLD`
- Evidence: `CI_VERIFIED`止まり
- Production verified: `NO`

## CI証拠

- run `29212191615`: stage1 success、stage3_e2e success
- unit: 551 passed（45 files）
- E2E: 206 passed / 0 failed
- artifact: `8265549704`
- digest: `573e6bf5f9817bdc2c047c11131c4c5af25bf89ab7e0a94b16d525c9de7663b3`
- sealed env: Fake LLM、log mail、external send disabled

## Q2C再監査要求

### P2-1 Quote作成transaction

`apps/web/app/(app)/quotes/actions.ts:91-147` はQuote、ApprovalRequest、writeAuditを別処理で実行している。ApprovalRequestまたは監査失敗時に、pending_approvalのQuoteだけが残る可能性がある。all-or-nothingまたは明示的補償設計と、失敗注入による孤児0の証拠が必要。

### P2-2 Invoice変換transaction

同ファイル:203-244はInvoiceとlineItemsの作成後にwriteAuditを別実行している。監査失敗時に請求書だけが残る可能性がある。Invoice、lineItems、監査の整合性、retry、失敗時rollbackまたは補償設計の実DB証拠が必要。

### P2-3 related tenant境界

同ファイル:171-174、199でQuoteをtenant scopeしているが、関連Deal/Customerのtenant整合を同じ境界で明示していない。own-tenant Quote→foreign-tenant Deal/Customer、およびforeign child fixtureで、foreign sentinelが請求書、顧客ID、表示、監査へ出ないことが必要。

### P2-4 入力・並行性・一意制約

- Quote番号のtenant内count依存による並行作成時の重複
- 負数、NaN、Infinity、巨大JSON、明細上限、税率・値引き上限
- Invoice変換の広いP2002捕捉がquoteId以外のunique失敗を`already`扱いしないこと

## 既存HOLDの継承

C22、Control Tower、Control PlaneのV75変更要求は最新mainにも継承されている。PR #36は旧main基点のため、最新mainのEvidenceとして再利用しない。

Phase 3/3.5/4のPhase Matrixは、Q2Cを含むblocking evidenceが解消するまで作成・格上げしない。
