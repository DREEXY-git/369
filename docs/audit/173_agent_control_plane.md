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
