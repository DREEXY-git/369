# P3-Q2C-01: 見積 → 請求 変換（Quote → Invoice conversion）v1

- Stream: **P3-Q2C（見積〜入金 / Quote-to-Cash）**
- Evidence 段階: **CI_VERIFIED 目標**（Claude 自己申告は CI_VERIFIED まで。MAIN_MERGED / PRODUCTION は人間 Gate）
- Branch: `claude/p3-q2c-quote-to-invoice-v1`（base = main `c8dc1f4`）
- 外部作用: **なし**（外部送信・実支払・課金・実 LLM・削除は一切なし）

## 背景（塞ぐ欠落）

Quote→Invoice→Payment→Dunning のうち **右半分（請求→入金→督促）は既存で一気通貫**だが、
**見積と請求の間が繋がっていなかった**:

1. 見積は承認後も `pending_approval` のまま取り残される — `quote_issue` 承認を承認しても
   `decideApprovalAction` に分岐が無く、ApprovalRequest だけ APPROVED になり Quote が遷移しない
   **dangling half-slice**。
2. 見積 → 請求への変換手段が無い（`Invoice.quoteId` も変換 action も存在せず）。利用者は請求書を
   手入力で再キーする必要があった。

## この縦切りで実装したもの（table + action + UI + demo + 権限 + 監査）

### schema（非破壊・追加のみ）
- `Invoice.quoteId String? @unique` ＋ `Quote?` relation ＋ `Quote.invoices Invoice[]` 逆参照。
- migration `20260712140000_q2c_invoice_quote_link`（列追加 + unique index + FK・ON DELETE SET NULL）。
- `@unique` が「1見積→最大1請求」を保証し、**並行変換の DB レベル barrier**（敗者は P2002 → 既存へ収束）。
  Postgres の unique index は NULL を相互に別扱いするため `quoteId=null`（手入力/InvoiceCandidate 由来）は複数可。

### 純ロジック（`packages/shared/src/finance.ts`・unit 済み）
- `quoteStatusOnIssueDecision(decision)` — approve→approved / reject→rejected。
- `canConvertQuoteToInvoice(status)` — approved のみ true（他は fail-closed）。
- `buildInvoiceDraftFromQuote(quote, lines)` — 値引きを各明細へ按分し 2 桁丸め、Σ(行金額)=小計・
  合計=小計+税 を保証（Invoice に値引き列が無いため明細へ織り込む・原価は持たせない）。

### bridge core（`apps/web/lib/quote-issue-bridge.ts`・mock 契約 unit 済み）
- `decideQuoteIssueCore` — content-review / suggestion-review と同型。AI は DB 接触前に forbidden。
  ApprovalRequest CAS → Quote 遷移 count===1 → 監査 を単一 `$transaction`。count!==1 は決定ごと rollback。

### server action（`quotes/actions.ts`）
- `convertQuoteToInvoiceAction` — 権限 `invoice:create` かつ `finance:read`（AI 不可）。approved のみ変換。
  既変換は unique 制約＋存在確認で既存請求書へ冪等収束。`buildInvoiceDraftFromQuote` でサーバ権威計算。
  監査 `invoice_create_from_quote`。生成物は **DRAFT 請求書**（発行/送信は従来の invoices 側 action＋承認）。

### decideApprovalAction 分岐（`approvals/actions.ts`）
- `quote_issue` を `decideQuoteIssueCore` へ。承認で Quote pending_approval→approved（発行確定）。
  承認しても外部送信・請求書化・課金は発生しない。

### UI
- `/quotes/[id]`: approved かつ未変換 → 「この見積から請求書を作成」ボタン。変換済み → 請求書への
  「請求書化済み」バッジ＋deep link。`/invoices/[id]`: 生成元見積への逆リンク。`/approvals`: quote_issue の
  元見積 deep link。
- 権限 UI: STAFF（`finance:read` なし）は approved 見積を閲覧できてもボタン非表示（server 側でも遮断）。

### demo（seed）
- i=0 の見積(approved)↔請求(PAID) を `quoteId` 連携し「見積→請求→入金」の一気通貫デモ。
- 従来 `entityId:'Q-2026-101'`（番号文字列）だった `quote_issue` 承認を実 Quote.id へ修正
  （承認で実際に Quote が遷移するように）。

## 検証（ローカル）
- 単体 **551 passed**（+11: finance 純ロジック 3群・quote-issue bridge 6）。
- typecheck / lint / `next build` clean。
- E2E（実 PostgreSQL・実 UI）: `quote_to_invoice.spec.ts` **3 passed**（承認→変換→逆リンク→冪等バッジ /
  却下→変換不可 / STAFF 権限境界）＋ 承認系回帰（content/ads bridge）**8 passed**＝計 11 passed。

## 非対象（後続の別 WIP）
- 見積の sent/accepted ライフサイクル（本 slice は approved から変換）。領収書(Receipt)発行。AR エイジング表。
  督促の多段スケジュール。実送金・税務断定・課金は HUMAN_ONLY 維持。
