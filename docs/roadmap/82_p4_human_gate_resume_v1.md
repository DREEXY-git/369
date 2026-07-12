# roadmap82 — Phase 4 安全実行 Bridge: AI 承認ゲートの人間判断（approve→内部再開 / reject→終了）v1

> 種別: 設計 Gate ＋ 薄い縦切り実装（本 branch `claude/p4-human-gate-resume-v1`・PR #18 へ混在させない）。
> 前提: v7.0 指令 §8。**現行 schema のみで成立する**と判定したため実装まで進める（§2）。
> 位置づけ: v5.8 Medium-2 で「bridge 設計 Gate まで read-only」と封印した AIApprovalGate の判断導線を、
> C21 で実証した transaction/CAS パターンの再利用で開通する。

## 1. スコープと絶対禁止

- **含む**: `/approvals` の AI 承認ゲート一覧からの人間 approve/reject。approve = run を `NEEDS_APPROVAL→RUNNING→SUCCEEDED` へ**内部 Fake 処理のみ**で再開完了（AIAgentAction に記録）。reject = `NEEDS_APPROVAL→FAILED`（再開不可）。決定の 1:1 記録として `ApprovalRequest(type='ai_run_resume')` を**決定済み状態で同一 transaction 内に作成**。
- **含まない**: 実 queue への再投入（Lane P4Q・BullMQ 証拠とは独立）、外部送信・実 LLM・実行系の外部作用、schema/migration。
- AI 自身は approve/reject/resume/delete/external_send 不可（action 境界 `user.isAi` 拒否＋core `actorIsAi` 拒否の二重防御・RBAC 不変）。

## 2. SCHEMA_CHANGE 判定（結論: 変更不要）

| 要件 | 実現手段（既存 schema） |
| --- | --- |
| 原子的な二重判断防止 | `AIApprovalGate.status`(PENDING→APPROVED/REJECTED) の条件付き updateMany = C21 と同型の行ロック CAS |
| 判断者・時刻の記録 | `ApprovalRequest.decidedById/decidedAt`（gate には列が無いが、1:1 決定レコード側に保存） |
| ApprovalRequest ⇔ gate/run の一対一 | CAS の勝者だけが `ApprovalRequest(entityType='ai_approval_gate', entityId=gateId)` を作成＝構造的に 1:1 |
| run の遷移 | `RUN_TRANSITIONS` 準拠: approve = NEEDS_APPROVAL→RUNNING→SUCCEEDED（2段 updateMany・count 必須）/ reject = NEEDS_APPROVAL→FAILED |
| 冪等・並行一方収束 | gate CAS 敗者は `already`（DB へ何も書かない） |
| 監査・metadata-only | 既存 AuditLog / DataAccessLog（gateId/runId/action 名のみ・input/output/error/reason 本文は複製しない） |

→ 列追加・migration 不要。`P4_SCHEMA_CHANGE_APPROVAL_REQUIRED` には該当しない。
（将来「実 queue への再投入・再実行パラメータ・版管理」まで踏み込む場合は schema Gate = 別承認。）

## 3. 設計（transaction 正本 = `apps/web/lib/ai-gate-bridge.ts`）

`decideAiGateCore(db, { tenantId, gateId, decision, decidedById, note, actorIsAi })`:

1. `actorIsAi` → DB 接触前に `forbidden`。
2. 単一 `$transaction`:
   a. gate CAS: `updateMany({ id, tenantId, status:'PENDING' } → APPROVED/REJECTED)`。count 0 → `already`（並行判断の敗者・二重 submit）。
   b. gate 行を tenant スコープで取得（runId/action）。
   c. `runId` が非 null のとき（null gate は判断のみで完結＝孤立 gate の一貫した扱い）:
      - approve: `updateMany({ id: runId, tenantId, status:'NEEDS_APPROVAL' } → RUNNING)` count===1 必須 →
        `updateMany({ id: runId, tenantId, status:'RUNNING' } → SUCCEEDED, finishedAt, humanReviewed:true)` count===1 必須 →
        `AIAgentAction` 作成（「人間承認により再開・内部処理のみで完了（外部作用なし）」）。
      - reject: `updateMany({ ..., status:'NEEDS_APPROVAL' } → FAILED, finishedAt, humanReviewed:true, error:'人間の判断により却下（承認ゲート）')` count===1 必須。
      - count!==1（run 消失 / 既に terminal / stale 巻き戻り）→ throw = **判断ごと rollback**（gate は PENDING のまま人間が再確認）。
   d. `ApprovalRequest` 1:1 決定レコード作成: type/requestedForAction=`ai_run_resume`・entityType=`ai_approval_gate`・
      entityId=gateId・status=APPROVED/REJECTED・decidedById/decidedAt/decisionNote・payload はメタのみ（runId/action）。
   e. AuditLog（approve/reject）＋ DataAccessLog（metadata-only）。
3. 戻り値: `decided` / `already` / `forbidden`。

Server Action `decideAiGateAction`: 認証 → `approval:approve` かつ `!user.isAi` → cuid 検証 → core → revalidate（/approvals・/ai-office・/ai-agents）。
UI: `/approvals` AI ゲート節の read-only 注記を撤去し、approve/reject フォーム＋run への deep link（`/ai-agents/<agentId>`・tenant スコープで解決できた場合のみ）。
状態反映: `deriveAgentState` は run/gate から導出済みのため、決定後の AI 社員詳細・3D Office は既存ロジックで自動更新（E2E で assert）。
reject 後の再開不可: FAILED は terminal（`RUN_TRANSITIONS`）＋ gate は REJECTED（CAS 対象外）＝構造的に再開経路なし。retry は「新しい run」の既存規約のまま。

## 4. DoD / テスト

- 契約 unit（mock db・失敗注入・呼び出し順・tenant スコープ）
- **実 PostgreSQL 証拠**（使い捨て DB・最終状態 re-fetch）: 並行 approve/reject 一方収束・二重 submit 冪等・run 消失/terminal 時 rollback・runId null gate・cross-tenant 非開示・AI 拒否・ApprovalRequest 1:1・監査 metadata-only（reason/input/output/error 非複製）
- E2E: /approvals から approve → gate が PENDING 一覧から消え、AI 社員詳細で run 完了表示・reject 経路・AI ロール（権限誤設定 fixture）denied・二重 submit
- 既存回帰: AIApprovalGate read-only 表示前提のテスト（work_evidence の Inbox・approvals 表示）を更新分含め green

## 5. rollback 条件

- 承認経路に外部作用が観測されたら即 revert（本 bridge は Fake/internal のみ）。
- gate REJECTED / run FAILED 後に再開できる経路が見つかったら該当 action を無効化して revert。
- 二重判断・cross-tenant 判断が実 DB で再現したら revert。
- revert 単位は本 branch の commit 単位（PR #18 とは独立）。

## 6. 安全宣言

「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。実 queue 再投入・外部作用は本 Gate の外（P4Q は証拠のみ・実行制御の解禁は別の人間 Gate）。

---

## v7.0 R2 追補（2026-07-12・Codex CODEX_P4_PREAUDIT_V70 comment 4951050657 対応）

本追補が §上記の approve 意味論を**上書き**する（正本は本追補＋実装コード）。

### P2-3 是正: approve は SUCCEEDED にしない（実行証拠なしに成果を記録しない）
- approve = `NEEDS_APPROVAL → QUEUED`（**人間承認済み・再開待ち**）。`RUN_TRANSITIONS` に `NEEDS_APPROVAL→QUEUED` を追加。
- `startedAt=null`・`humanReviewed=true`・**finishedAt/SUCCEEDED は付けない**。AIAgentAction は「再開待ち・実行はまだ行われていません」。
- 実 queue 再投入・実行・SUCCEEDED 化は P4Q Gate の worker 側でのみ発生（承認・再開待ち・実行済みを状態として分離）。
- deriveAgentState 上は QUEUED = planning（キュー待ち）として表示される（働いた事実の捏造なし）。

### P2-2 是正: stale gate 規約（shared 正本）
- `isStaleApprovalGate`（`packages/shared/src/agent-run-lifecycle.ts`・`GATE_DECISION_MAX_AGE_MS=24h`）:
  gate.createdAt null / 24h 超 / NEEDS_APPROVAL run の startedAt null → stale（fail-closed）。
- stale の approve は core が **何も変更せず `stale`** を返す。人間の明示再確認（UI checkbox → `confirmStale`）でのみ承認可能
  （`staleConfirmed` が ApprovalRequest payload / 監査 metadata に記録される）。reject は安全側（終了）として stale でも可。

### P2-1 是正: AI 誤権限の閲覧境界
- `/approvals` は `hasPermission(approval:approve) && !user.isAi` を**データ取得前**に判定（AI は誤設定でも gate reason・
  判断フォームを閲覧不能・action/core の拒否と三重防御）。

### 証拠の増分
- downstream 失敗注入（Action/ApprovalRequest/Audit/DataAccess）→ gate/run/action/approval/audit/access **全表 re-fetch** で
  rollback 0 部分 commit・実 retry 確定（実 PostgreSQL）。
- UI E2E: reject・二重 submit（2タブ・一方のみ確定）・stale badge/checkbox/banner・AI 誤権限 fixture 遮断・
  詳細ページで run=QUEUED 表示（Inbox→詳細の状態一致）。
- metadata-only: run input/output/error・gate reason の負の sentinel fixture で決定系レコードへの非複製を実測。
- BullMQ: 稼働 worker の停止→再起動（停止中 job は waiting 維持→新 instance が処理）＋ job data allowlist
  （{tenantId, task} のみ・秘密形状 0 を raw Redis で実測）。

### 残る正直な Gap（本追補でも未解消）
- production worker registry / 実 handler での queue 証拠（itest は専用 Worker＋in-memory LifecycleDb）。
- CI 上の Redis service 不在による `BULLMQ_REAL_QUEUE_EVIDENCE_GAP`（workflows は Claude 編集対象外）。
- stalled recovery（`stalledInterval` 経由の回収）は未検証。
