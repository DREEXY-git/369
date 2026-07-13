# P3-Q2C A/B/C: 領収書発行 + 売掛エイジング + 督促多段 v1

- Stream: **P3-Q2C（見積〜入金 / Quote-to-Cash）— 右側（回収・締め）の 3 縦切り**
- Branch: `claude/p3-q2c-collections-abc-v1`（base = main `a1bde2f`＝Q2C hardening 反映後）
- Evidence 段階目標: **CI_VERIFIED**（MAIN_MERGED / PRODUCTION は人間 Gate）
- 外部作用: **なし**（外部送信・実支払・課金・実 LLM・削除ゼロ）。DB は**追加のみの非破壊マイグレーション1本**。
- 土台: hardening（PR #39）と同じ **単一 transaction + AI 拒否 + unique barrier + narrow P2002 catch** を踏襲。

## A 領収書（Receipt）発行

- schema: `Receipt`（`invoiceId @unique`＝1請求→最大1領収書の並行 barrier）＋ `Invoice.receipt?` 逆参照。
- 純ロジック: `canIssueReceipt(status)`（PAID のみ）。
- bridge: `lib/receipt-bridge.ts` `issueReceiptCore` — Receipt+監査を単一 `$transaction`（監査失敗→孤児 0）。
  invoiceId の P2002 のみ 'already'、他 unique は再 throw。AI は DB 接触前 forbidden。
- action: `issueReceiptAction`（invoice:update＋finance:read・AI 不可・PAID のみ・冪等）。
- UI: `/invoices/[id]` に領収書カード（PAID で発行ボタン／発行済みは番号＋印刷）。印刷 `/print/receipts/[id]`
  （請求書印刷と同じ FINANCIAL_CONFIDENTIAL ABAC をデータ取得前に適用）。
- demo: seed の PAID 請求に領収書 `RCT-2026-1`。

## B 売掛エイジング（AR aging）read-only

- 新テーブルなし（Receivable/Invoice の read-only 集計）。
- 純ロジック: `agingBucketOf(days)` / `bucketReceivablesByAge(items, now)` — 経過日数で
  current / 1-30 / 31-60 / 61-90 / 91+ に集計（未回収 0 以下は除外・合計/延滞分/件数）。
- UI: `/finance/receivables`（finance:read gate・STAFF 遮断）。バケットタイル＋一覧、各行から
  `/invoices/[id]#dunning`（既存督促フロー）へ deep link。実行ボタン・外部送信なし。nav＋nav-permissions 登録。

## C 督促の多段（Dunning cadence）

- schema: `CollectionReminder` に `stage Int @default(1)` / `scheduledAt DateTime?`（既存は stage=1 で有効）。
- 純ロジック: `clampDunningStage` / `nextDunningStage(priorSentCount)` / `dunningStageMeta(stage)`。
  `buildDunningDraft` は stage で件名・書き出しを段階化（1=やんわり確認→3=最終確認）。**全段で威圧・法的断定・
  強制回収の表現なし**（確認ベース・行き違い配慮を維持・禁止語テストで担保）。
- domain: `createDunningDraft` が送信済み回数から次段数を算出して下書きを作成（stage 保存）。`getDunningContext`
  が現在/次段を返す。UI に段数バッジ。**自動送信はしない**（scheduledAt は表示のみ・送信は従来どおり承認後）。

## 検証（ローカル）
- 単体 **568 passed**（+A/B/C 純ロジック＋receipt/quote-convert bridge mock 契約）。typecheck/lint/build clean。
- E2E（実 PostgreSQL・実 UI・並列2worker）: `quote_collections_abc` 5（A 発行/冪等/印刷・A STAFF 遮断・
  B バケット・B STAFF 遮断・C 段数バッジ）＋ invoice_payment/dunning 回帰。NAV 静的契約は 68 件へ更新。

## 非対象（後続）
- 督促の自動スケジューラ/実送信（scheduledAt は表示のみ）。領収書の再発行/訂正フロー。実送金・税務断定は HUMAN_ONLY。
