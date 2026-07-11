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
