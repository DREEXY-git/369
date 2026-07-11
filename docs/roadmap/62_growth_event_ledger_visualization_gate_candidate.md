# 62. Growth Event Ledger 成果可視化（WIP 2）— 設計＋実装前 Gate（Candidate・docs-only）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/161_growth_event_ledger_visualization_gate.md`
- 前提: **WIP 1 CI green 確認済み**（run 29135772068 #159・`Running 83 tests using 2 workers`→`83 passed (1.2m)`/0 failed・env fake/log/false・customers_boundary 3件 ✓ をログ本文で確認）
- Function ID binding（`ATOMIC_LEDGER_SYNC_PENDING`）: C18-001/031/037・C28-002・USR-004・C46-032/033/048

## 1. read-only 実査結果

- `GrowthEvent` model（schema.prisma:3320-）: type/category/title/description/amount/revenueImpact/costSaving/timeSavingMinutes/metric/payload/occurredAt。**seed に GrowthEvent の投入なし（0件）**— 実行時に golden path / finance / operations の既存 action が `emitGrowthEvent` で発火する。CI では e2e ファイル間の実行順が非決定のため、Control Tower 表示時点の件数は 0 にも正にもなり得る → **e2e は件数非依存で設計する**。
- `emitGrowthEvent`（apps/web/lib/growth.ts:27）: 既存 emit ヘルパ。**今回 WIP では一切呼ばない**（新規発火なし）。
- `summarizeGrowthEvents(tenantId, sinceDays)`（growth.ts:67）: tenantId スコープ・**select は type/revenueImpact/costSaving/timeSavingMinutes のみ（PII・payload・description 非取得）**→ 純関数 `summarizeGrowth`（shared/growth.ts:189）で {total, revenueRelated, byCategory, totalRevenueImpact, totalCostSaving, totalTimeSavingMinutes}。
- 詳細画面: `/growth/events` が既存（安全なリンク先）。
- 既存 /growth ページは集計値を権限ゲートなしで表示（既存挙動・scope 外・Unknown として記録）。Control Tower 側は本 WIP で finance ゲートを適用する。

## 2. 設計

Control Tower に read-only セクション**「成果と削減時間（Growth Event Ledger）」**を追加する。

| 表示 | 内容 | redaction |
|---|---|---|
| 件数 | 直近7日 / 直近30日のイベント件数（summarize 2回） | 全員表示（金額でない） |
| category 別件数（30日） | marketing/sales/dx/ai 等 | **finance カテゴリの件数は canViewFinance=false に伏せ字（—）**（Control Tower の「担当者に finance 件数を見せない」不変条件に整合） |
| revenueImpact / costSaving 合計（30日） | 金額 | **canViewFinance のみ**。権限なしには「金額の集計は財務閲覧権限のある人にのみ表示されます。」 |
| timeSavingMinutes 合計（30日） | 削減時間（分） | 全員表示。**0 は「未計測」表示**・「AI・自動化による自己申告値を含む集計であり、検証済みの実績とは呼ばない」旨を明記 |
| データ不足 | total=0 のとき「未計測（イベントなし・データ不足）」を表示（空画面にしない） | — |
| 集計期間 | 「集計期間: 直近7日 / 30日」を明記 | — |
| リンク | 「イベント台帳を開く」→ `/growth/events`（`data-testid="ct-link-growth-events"`・リンクのみ） | — |

不変条件: イベントの新規発火・状態変更・外部送信・AI 提案の自動実行なし。追加は read model 呼び出し（既存関数）・表示・テストのみ。payload/description/PII は取得も表示もしない。

## 3. 実装前 Gate（§11・全 PASS）

既存 GrowthEvent のみで成立 PASS／schema/migration/seed 不要 PASS（summarize 既存関数）／tenantId PASS（関数内でスコープ）／role 別 redaction PASS（page 既存の canViewFinance を利用）／PII・payload 非取得 PASS（select 4列のみ）／Control Tower 既存 UI 非破壊 PASS（追加セクションのみ）／既存 83 件維持 PASS（新規文言は既存アサーション文字列と非重複・testid ベース）。

## 4. 実装計画（変更2ファイルのみ）

1. `apps/web/app/(app)/growth/control-tower/page.tsx`: `summarizeGrowthEvents` を 7日/30日で呼び、上記セクションを追加。
2. `apps/web/tests/e2e/growth_control_tower.spec.ts`: 2件追加（83→85 見込み・件数非依存）: ①社長: セクション見出し・集計期間・`ct-link-growth-events` 可視＋金額行（値または「未計測」）表示 ②担当者: セクション可視＋「金額の集計は財務閲覧権限のある人にのみ表示されます。」可視＋金額値の非表示。

触らない: growth.ts・shared/growth.ts・/growth 配下の既存画面・emit 呼び出し元・schema/seed/RBAC/labels・ci.yml/playwright.config/package/lockfile。

## 5. Evidence / Unknown / Risk

- Evidence: growth.ts:27-90・shared/growth.ts:189-211・schema.prisma:3320-・seed grep（growthEvent 0件）・WIP1 CI ログ本文。
- Unknown: 既存 /growth ページの集計値が権限ゲートなしで表示される点（既存挙動・次 WIP 候補）。
- Risk: R1 CI 実行順による件数の非決定 → e2e は件数値を一切アサートしない／R2 「削減時間」の過大解釈 → 自己申告集計である旨を UI に明記（§13 の「検証済みと呼ばない」遵守）。

## 6. 判定

**Gate 全 PASS・STOP 非該当 → 実装フェーズへ続行**。

## 7. 追補（push 前独立レビューによる修正・2026-07-11）

2視点（redaction/PII/集計精度・E2E回帰/レイアウト）の独立レビューを実装 commit `662e745` に対して実施。**tenantId・select 4列・金額の RSC 分岐内限定・副作用ゼロ・既存85件との文言/strict-mode 衝突なし（バイト単位照合）は PASS 証明**。以下を push 前に修正した。

- **medium: finance 件数の算術復元を遮断** — 伏せ字（—）方式は total −他カテゴリ和で件数が復元でき、バッジの存在自体が finance イベント発生を開示していた。非財務閲覧者には **finance カテゴリを件数集計（7日/30日 total・カテゴリ列挙）から完全に除外**し、方針文（「財務カテゴリのイベントは財務閲覧権限のある人の集計にのみ含まれます」）を明示する方式へ変更。
- **low: 負値・計測済み0の「未計測」誤表示を解消** — `> 0` 判定を `=== 0` に変更し、負値（operations.ts の粗利 emit で実データ発現あり得る損失合計）は formatJpy で表示する。
- **low: CEO 側の分岐退行監視を追加** — 社長テストに権限案内文言の toHaveCount(0) を追加（分岐が壊れて両方描画される退行を両面から検知）。
- 記録（修正なし）: timeSaving は HOURLY_LABOR_COST による円換算推定が可能だが、実 costSaving/revenueImpact とは独立フィールドで自己申告集計と明記済みのため不変条件非抵触と判断／Control Tower ページ自体の resource 権限ゲート不在（READ_ONLY/EXTERNAL も到達可能）は既存挙動・次 WIP 候補。
