# Audit 173: Agent Control Plane v0（Phase 4 Stream B2）

- 日付: 2026-07-11
- 対応 roadmap: `docs/roadmap/74_agent_control_plane_gate_candidate.md`（正本）
- ブランチ: `claude/stream-b-ai-office-v55`（基準 3968467）
- 変更: shared `agent-run-lifecycle.ts`（遷移許可表・重複ゲート・stale 閾値・エラーマスク・unit）/
  shared `ai-workforce.ts` の stale 導出（`deriveAgentState(e, now?)`）/ worker `agent-lifecycle.ts`
  （`runWithAgentLifecycle`・MORNING_REPORT_JOB を producer 1本としてラップ）/ web read model の
  now 伝搬 / ナビ権限フィルタ（`lib/nav-permissions.ts`＋layout/Sidebar/MobileNav/Topbar props）/
  3D `webglcontextlost` フォールバック / CI stage3_e2e にスクリーンショット artifact（always・
  run ID 名・retention 3日）/ e2e `nav_permissions.spec.ts` 3件。
  **schema・migration・seed・RBAC・labels 不変。外部送信・実 LLM・課金・承認/却下の AI 実行なし。**
- Audit 170 の制約解消: 「スクリーンショットは artifacts アップロード未設定のため取得物として
  残らない」→ 本 WIP の CI artifact 追加（v5.6 §9 で明示許可された唯一の workflow 変更）で解消。
- 検証結果・レビュー・CI は追補に記録。

## 追補（レビュー反映と CI・2026-07-11）

- 実装＋レビュー反映 commit `442d408`（stale currentTask 整合・startedAt 不明時の理由文・
  webglFailed effect deps。詳細は roadmap74 §4 が正）。
- ローカル電池: unit 299/0・tsc 0・lint 0（警告 0）・safety 0。
- CI: run 29149576645（#190・stage1/stage3_e2e とも success）・head `442d408`・
  `100 passed (1.5m)` / 0 failed をログ本文で確認（期待 100 = 97+3 と一致）。
- スクリーンショット artifact: `e2e-screenshots-29149576645`（2 files・272,719 bytes・retention 3日）
  https://github.com/DREEXY-git/369/actions/runs/29149576645/artifacts/8247804691
  → Audit 170 の制約（取得物なし）を解消。DEMO データのみ・実顧客 PII なし。
- Stream B2 はこれでクローズ。C04 全体の完成宣言ではない。
