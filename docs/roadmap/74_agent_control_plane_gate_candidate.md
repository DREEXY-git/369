# 74. Agent Control Plane v0（Phase 4 Stream B2・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/173_agent_control_plane.md`
- ブランチ: `claude/stream-b-ai-office-v55`（基準 3968467 = v56 Evidence 補正取込済み・Draft PR #5・merge しない）
- 上位: v5.6 §7（C04 Agent Control Plane v0）＋§9（3D/権限ハードニング・CI artifact）
- Function ID（保守的・v0 証拠のみ・完成扱いにしない）: C04-005/006（lifecycle 記録・部分）・C04-011 追補・C28-036（部分）

## 1. 設計原則（Gate 回答）

- **schema 変更なし**: 既存 enum RunStatus（QUEUED/RUNNING/SUCCEEDED/FAILED/NEEDS_APPROVAL）のみ使用。
  - **COMPLETED は SUCCEEDED の別名**（保存は SUCCEEDED・表示名として扱う）。
  - **BLOCKED は保存しない**。AIApprovalGate（REJECTED）＋「再実行証拠なし」からの導出状態（`deriveAgentState`・v5.5 既存）。
- **遷移は許可表で固定**（`RUN_TRANSITIONS`・shared 純ロジック）:
  QUEUED→{RUNNING,FAILED} / RUNNING→{SUCCEEDED,FAILED,NEEDS_APPROVAL} / NEEDS_APPROVAL→{RUNNING,FAILED} / SUCCEEDED・FAILED→遷移不可（terminal）。
  - terminal からの巻き戻し禁止（finish 時に現在値を再読して許可表を通す）。
  - NEEDS_APPROVAL→SUCCEEDED 直行不可（承認後は RUNNING 経由。**AI は承認・却下しない**＝AIApprovalGate は PENDING を作るだけで、判断は人間の既存承認導線）。
- **retry は新しい run**（既存 run を巻き戻さない・履歴を改竄しない）。
- **二重 Run 禁止**: `shouldCreateRun` が同一 agent×task の新鮮な RUNNING/QUEUED/NEEDS_APPROVAL を拒否。RUNNING が `STALE_RUNNING_MS`（2h）超はクラッシュ残骸とみなし新規作成を許可（残骸はそのまま履歴）。
- **prompt 全文・PII・Secrets・承認 payload 本文を保存しない**: task 名は固定リテラル・summary は定型文・エラーは `maskRunError`（URL/email/token/長数値マスク・200字制限）。
- **AIApprovalGate と ApprovalRequest を混同しない**: 前者は AI run の状態記録（本 v0 の対象）、後者は人間の意思決定台帳（既存・変更しない）。

## 2. 実装

| 層 | 内容 |
|---|---|
| shared | `agent-run-lifecycle.ts`: `RUN_TRANSITIONS`・`canTransitionRun`・`isTerminalRunStatus`・`shouldCreateRun`（重複/承認待ち優先/stale 許可）・`STALE_RUNNING_MS`・`maskRunError`。unit `agent_run_lifecycle.test.ts` |
| worker | `agent-lifecycle.ts`: `runWithAgentLifecycle` — agent 検索→重複ゲート→RUNNING 作成→fn 実行→`{needsApproval}` なら NEEDS_APPROVAL＋AIApprovalGate(PENDING) 作成→成功 SUCCEEDED／失敗 FAILED＋マスク済みエラー→AIAgentAction 記録。finish は現在値再読＋許可表で terminal 巻き戻し拒否 |
| producer | `jobs.ts` の MORNING_REPORT_JOB のみラップ（producer 1本・薄い縦切り）。NEEDS_APPROVAL パスは wrapper API として実装し unit で担保（実 producer 接続は次 WIP＝outreach 系） |
| read model（§9） | `deriveAgentState(e, now?)`: RUNNING が `STALE_RUNNING_MS` 超で finishedAt なし→ **unknown（stale・実行中と断定しない）**。now 省略時は従来どおり（後方互換）。read-model.ts が now を伝搬 |
| ナビ権限（§9） | `lib/nav-permissions.ts`: href→[resource,action]（**ページ側の取得前全面拒否ゲートを確認済みの href のみ登載**・部分ゲートは載せない）。layout がサーバーで allowedHrefs を計算→Sidebar/MobileNav へ props（UX 整理であり境界ではない・境界は各ページが正） |
| 3D（§9） | `ai-office.tsx`: `webglcontextlost` → preventDefault＋2D フォールバック固定。webglFailed を effect deps に含め RAF 停止＋dispose を保証 |
| CI（§9・許可された唯一の workflow 変更） | stage3_e2e に `Upload E2E evidence screenshots`（`actions/upload-artifact@v4`・`if: always()`・`apps/web/test-results/**/*.png`・名前 `e2e-screenshots-${run_id}`・retention 3日・DEMO データのみ） |
| e2e | `nav_permissions.spec.ts` 3件: sales に承認待ち/財務サマリー非表示（肯定アサーション併記）・ceo に表示（回帰）・モバイルドロワー同一フィルタ |

## 3. テスト対応（v5.6 §7 要求 → 担保箇所）

- 正常（RUNNING→SUCCEEDED）/ 失敗（FAILED＋マスク）/ 承認待ち（NEEDS_APPROVAL＋Gate PENDING）→ unit（lifecycle）＋wrapper 実装
- retry=新run・重複 Run 拒否・クラッシュ（stale RUNNING）→ unit（shouldCreateRun）
- terminal 巻き戻し禁止・NEEDS_APPROVAL→SUCCEEDED 直行不可 → unit（RUN_TRANSITIONS）
- 他 tenant: wrapper の全クエリが tenantId スコープ（agent 検索・existing 検索・finish の update where）
- 権限なし: ナビ e2e＋既存ページゲート（変更なし）

## 4. Gate 判定

- [ ] ローカル電池 green（unit/tsc/lint/safety）
- [ ] 敵対的レビュー→反映
- [ ] CI green をログ本文で確認（97＋nav 3件 = 100 期待）
- [ ] PR #5 本文更新

（チェックは audit173 追補で確定させる）
