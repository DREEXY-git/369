# Audit 163: /growth・/growth/events 財務情報境界の適用（WIP-3）

- 日付: 2026-07-11
- 種別: 境界修正（財務情報の閲覧境界）＋ over-fetch 解消
- 対応 roadmap: `docs/roadmap/64_growth_finance_boundary_gate_candidate.md`
- 対象 commit: `f9907f2`
- ブランチ: `claude/ci-stage3-e2e-f1d-selectors-hikwbg`

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `apps/web/lib/growth.ts` | `summarizeGrowthEventCounts` 新設（type/timeSavingMinutes のみ select・金額 0 委譲） |
| `apps/web/app/(app)/growth/page.tsx` | dashboard:read ゲート・金額の finance:read 分岐（DB select 段階）・finance カテゴリ遮断・円換算の権限化・代替表示 |
| `apps/web/app/(app)/growth/events/page.tsx` | dashboard:read ゲート・explicit select・売上影響列の権限化・finance 行遮断・cat=finance 無効化 |
| `apps/web/app/(app)/growth/control-tower/page.tsx` | 非財務閲覧者の集計を counts 変種へ切替（取得段階の統一） |
| `apps/web/tests/e2e/growth_boundary.spec.ts` | 新規 3 テスト（値・件数非依存） |

## 検証

- ローカル: tsc 0 / lint 0 / unit 278 passed 0 failed / safety script 0 / secret scan NONE。
- 敵対的レビュー 3 視点（金額取得経路・存在シグナル整合・E2E回帰）: High 2・Medium 2・Low 3・Info 2 を検出。
  反映内容は roadmap64 §6 追補の表を正とする（裏口 Server Action 削除・/dx 4ページの marketing:read ゲート・
  control-tower の dashboard:read ゲート・counts 変種の finance 行遮断・cat 配列正規化・finance 種別の
  記録対称性・e2e の空振り防止）。
- CI: push 後に run ログ本文で `88 passed / 0 failed` と封印 env（fake/log/false）を確認し追補に記録。

## fix commit 変更ファイル（レビュー反映）

| ファイル | 変更 |
|---|---|
| `apps/web/app/(app)/growth/actions.ts` | 裏口アクション削除・finance 種別の作成ガード |
| `apps/web/lib/growth.ts` | counts 変種 where に `category: { not: 'finance' }` |
| `apps/web/app/(app)/growth/control-tower/page.tsx` | dashboard:read ゲート |
| `apps/web/app/(app)/growth/events/page.tsx` | cat 配列正規化・finance 種別の選択肢除外 |
| `apps/web/app/(app)/dx/page.tsx` ほか /dx 系 4 ページ | marketing:read ページゲート |
| `apps/web/tests/e2e/growth_boundary.spec.ts` | finance イベント実作成による不在検証・選択肢除外検証 |

## 残課題（本 WIP scope 外）

- quote ドメイン金額（原価・粗利）の境界判断 → roadmap65（WIP-4）。
- /growth 系の DataAccessLog（一覧集計の機密参照記録）は control-tower P3-CT-3 判断（金額は集計値であり顧客 PII 非含有）を踏襲し未追加。WIP-6 の機械監査で再判定。
