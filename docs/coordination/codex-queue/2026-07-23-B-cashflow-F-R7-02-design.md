---
chat: B
type: design-review
target: F-R7-02 / apps/web/lib/domains/finance/cashflow.ts / packages/shared/src/finance.ts / finance-event-identity.ts @ commit 989ab67
push-to: codex/reaudit-B-cashflow
status: OPEN
---

# 【独立設計レビュー依頼｜B: 会計/資金繰り】F-R7-02 資金ショート予兆の会計イベント調停

あなたは 369（IKEZAKI OS）の独立設計レビュアーです。以下の設計課題について、私(Claude)の案の穴を突き、
より良い代替を提案してください。read-only・docs-only。main/DB/本番には触れない。結果は
`codex/reaudit-B-cashflow` に Markdown 設計メモとして push（推奨案・リスク・最小安全増分を明記）。

## 現状（commit 989ab67 の cashflow.ts / finance.ts を実際に読むこと）
- `getCashflowShortageProjection` は今、`type='cashflow_expected'` の予定のみを読む（B-CF-01 の修正）。
- 理由: Finance Bridge は 1件の支払(PO)を `cashflow_expected` と `payment_expected` の両方で表現するため、
  両方読むと支払を二重計上して偽のショートを出す。
- 副作用(F-R7-02): 請求書送付は `payment_expected(inflow)` のみを作り `cashflow_expected` の対を作らない。
  よって `cashflow_expected` だけ読むと請求入金が予測から欠落し、過少計上＝実際より悲観的（警告し過ぎ）になる。
  ※方向は fail-safe だが精度が落ちる。

## 設計課題
「二重計上せず、かつ請求入金も取りこぼさない、canonical（正本）な予定キャッシュフロー行の集合」を
どう得るか。純関数 `forecastCashflow` は既存で再利用可。`finance-event-identity.ts` が既にある。

## 私の候補案（各々を独立評価し、推奨を1つ選び、理由と落とし穴を述べよ）
A. producer側で `FinanceEvent` に canonical identity（正本ID/dedupキー）を付け、reader が重複排除。
   （`finance-event-identity.ts` を使う設計は可能か？schema変更は要るか？）
B. reader側 union: `cashflow_expected` ∪（対の `cashflow_expected` を持たない `payment_expected`）。
   対応関係をどのキーで判定すれば誤結合しないか。
C. 別の materialized/derived view。

## 制約・観点
- 可能なら本番DBマイグレーションを避ける（避けられないなら人間ゲートと明記）。
- `tenantId` スコープ必須。テスト可能な純関数境界を保つ。
- 「最小の安全な一歩（thin slice）」を必ず提示（全部作り直す前に、まず何を1本入れるべきか）。
- 旧 verdict 流用禁止・現コードを読んで判断。
