# Audit 165: Topbar 承認バッジと /dashboard のページ基礎権限（WIP-5）

- 日付: 2026-07-11
- 種別: 境界修正（承認件数の存在シグナル・経営ダッシュボードのページ基礎権限）
- 対応 roadmap: `docs/roadmap/66_topbar_dashboard_boundary_gate_candidate.md`
- ブランチ: `claude/ci-stage3-e2e-f1d-selectors-hikwbg`

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `apps/web/app/(app)/layout.tsx` | 承認件数クエリを approval:read∨approve のみ実行・showApprovals を Topbar へ |
| `apps/web/components/shell/topbar.tsx` | showApprovals=false で /approvals 入口・バッジごと非表示 |
| `apps/web/app/(app)/dashboard/page.tsx` | dashboard:read ゲート（データ取得前） |
| `apps/web/tests/e2e/topbar_dashboard_boundary.spec.ts` | 新規 2 テスト |

## 検証

- ローカル電池・レビュー・CI の結果は追補に記録。

## 追補（レビュー反映と CI 確認・2026-07-11）

- 敵対的レビューで High 2（/dashboard 本体の承認件数表示・/dashboard/ceo の無ゲート迂回）・
  Medium 2 ほかを検出し、fix commit `ea6e0b9` で反映（詳細は roadmap66 §6 の表を正とする）。
  追加変更: `dashboard/page.tsx`（count 遮断＋導線条件化）・`dashboard/ceo/page.tsx`（dashboard:read
  ゲート＋承認 findMany/Stat 条件化）・`reports/morning/page.tsx`（dashboard:read ゲート＋承認件数
  redact）・`layout.tsx`（入口条件を approval:approve 単独に改訂）。
- CI: run 29139617815（#163・stage1/stage3_e2e とも success）・head ea6e0b9。
  ログ本文で `93 passed (1.3m)`・失敗 0 を確認（topbar_dashboard_boundary 2件を含む）。
  workflow ファイル未変更のため封印 env は run #160 での確認と同一。**WIP-5 クローズ。**
