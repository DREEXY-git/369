# P3-Q2C hardening — Codex V75 Q2C Post-Merge 再監査（HOLD）への対応 v1

- 対象 Codex 監査: `docs/coordination/codex/V75_Q2C_POST_MERGE_REAUDIT_2026-07-13.md`（判定 `CHANGES_REQUIRED / HOLD`）
- 対象 main（監査時点）: `3709671`
- 本対応 branch: `claude/p3-q2c-hardening-v1`
- Evidence 段階目標: **CI_VERIFIED**（MAIN_MERGED / PRODUCTION は人間 Gate）
- 外部作用: **なし**（外部送信・実支払・課金・実 LLM・削除ゼロ）・**schema 変更なし**（コードとテストのみ）

## 各指摘への対応

### P2-1 Quote 作成 transaction（`quotes/actions.ts` createQuoteAction）
`Quote` → `ApprovalRequest` → `writeAudit` の別処理を **単一 `prisma.$transaction`** に統合。
`quote.create` /（承認要時）`approvalRequest.create` / `auditLog.create` を all-or-nothing 化し、
ApprovalRequest・監査の失敗時は Quote ごと rollback（pending_approval の孤児を残さない）。

### P2-2 Invoice 変換 transaction（`quotes/actions.ts` convertQuoteToInvoiceAction）
変換の DB 書き込みを新 core `lib/quote-convert-bridge.ts` `convertQuoteToInvoiceCore` へ集約し、
**Invoice + lineItems + 監査（invoice_create_from_quote）を単一 `$transaction`** で確定。
監査失敗でも請求書ごと rollback（孤児 0・利用者 retry で 1 件収束）。AI 主体は DB 接触前に forbidden。
実 PostgreSQL 証拠: `tests/e2e/quote_convert_db_evidence.spec.ts`（監査失敗注入→請求書 0・retry で 1／
Invoice 作成失敗注入→監査 0／並行同一 quoteId→1 件収束／逐次 re-convert→already／AI→行不変）。

### P2-3 related tenant 境界（convertQuoteToInvoiceAction）
変換の場でも `customerId`/`dealId` を **tenant ＋ 可視ラベルで再検証**（`createInvoiceAction` と同方針）。
不整合・越境参照は `null` に落として請求書へ複製しない（fail-closed）。
実 UI 証拠: `tests/e2e/quote_to_invoice.spec.ts` に「別 tenant 顧客を指す見積を変換→請求書 customerId=null・
foreign sentinel は DOM に出ない」を追加。

### P2-4 入力・並行性・一意制約
- **P2002 catch の絞り込み**: 変換の unique 違反は **quoteId のときだけ `already` に収束**させ、それ以外の
  unique 失敗（`meta.target` に quoteId を含まない）は握りつぶさず再 throw（`isQuoteIdUniqueViolation`）。
  unit `tests/quote_convert_bridge.test.ts` で quoteId/制約名文字列→already、number→再 throw を検証。
- **並行性**: `Invoice.quoteId @unique` が DB 直列化 barrier。並行変換は 1 件のみ commit（実 DB 証拠あり）。
- **Quote 番号の count 依存（未変更・意図的）**: `Quote.number`/`Invoice.number` は識別子ではなく表示用で
  unique 制約を持たない。並行作成時の重複は表示上の衝突に留まり、データ整合・変換の一意性（quoteId barrier）
  には影響しない。番号の一意化は採番方式の別 WIP（sequence 化）として切り出す。
- **数値入力（負数/NaN/Infinity/上限）**: 変換 action は承認確定済み Quote の検証済みデータのみ読むため
  ユーザ数値入力を受けない（該当は createQuote 側の既存 `Math.max(0, Number(...) || 0)` clamp）。

## 検証（ローカル）
- 単体 **558 passed**（+7: convert bridge mock 契約）。typecheck / lint / `next build` clean。
- E2E（実 PostgreSQL・実 UI・並列2worker）: quote_convert_db_evidence 6 ＋ quote_to_invoice 4（tenant 境界追加）
  ＋ quotes_boundary 3 ＝ **13 passed**（回帰含む）。

CI 緑まで確認後 freeze・人間最終確認を経て merge。Codex への再監査依頼は本対応 head の freeze SHA で行う。
