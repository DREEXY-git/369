# roadmap85 — Phase 4 Control Plane read-only v1（v7.2 Lane C）

> 種別: 実装（read-only 可視化のみ・schema-free）。branch `claude/p4-control-plane-readonly-v1`
> （base = PR #20 `9080df1`）。実行・承認・削除・外部送信・実 LLM・課金の導線は追加しない。

## 1. スコープ（作ったもの）

- **shared 純ロジック** `control-plane.ts`: `summarizeAgentRuns`（AI社員別の成功/失敗/待機/承認待ち/
  **承認済み再開待ち**区分＋実測処理時間。実測は terminal＋両 timestamp のみ・無ければ **null=未計測**・
  負の時間や推測 ROI を作らない）／`buildExecutionReceipts`（ApprovalRequest(ai_run_resume) 正本に
  AuditLog・AIAgentAction を相関。**欠落は correlated=false で可視化**・承認=「再開待ち（実行なし）」で
  成果を捏造しない）＋unit 10。
- **`/ai-control`**（dashboard:read・read-only）: ①summary tiles ②**AI Native Inbox**（判断待ちゲート
  （stale 判定は shared `isStaleApprovalGate`）・承認済み再開待ち・stale active・直近失敗＝すべて deep link
  のみで実行導線なし）③**Execution Receipt 時系列**（決定/監査/run 記録の相関チップ・stale 再確認 badge・
  判断者名）④**AI社員別実測**（canonical `deriveAgentState`＋`AI_WORKFORCE_STATE_LABEL`＝一覧・詳細・3D と
  同一正本・設定値(autonomy)と実測値と未計測を分離）。導線は NAV 67 契約を変えず /ai-office から deep link。
- **境界**: run の **input/output/error・承認 payload 本文・Secrets・PII を select しない**。承認由来
  セクション（Inbox ゲート・Receipt・判断待ち件数）は **approval:approve かつ人間のみ**（WIP-5 承認シグナル
  遮断＋v7.0 R2 AI 閲覧境界と同一規律・取得段階で遮断）。AI ロールは dashboard:read 非保持のためページ自体不可。

## 2. 受入条件と証拠

- unit: `control_plane.test.ts`（未計測 null・壊れた timestamp 除外・再開待ち≠成功・相関欠落の可視化・
  staleConfirmed 伝播・降順・決定論）。
- E2E: `control_plane.spec.ts` 6件（tiles=実 DB 件数一致・Inbox 4区分・Receipt 相関✓/stale 再確認/実行なし
  ラベル・raw 本文 sentinel 非描画・canonical 状態が /ai-agents 一覧と data-agent-state 一致・STAFF の
  承認シグナル遮断・AI 遮断・deep link・mobile 390 overflow 0＋screenshot 3枚）。

## 3. 作っていないもの（正直な境界）

- この画面からの承認・却下・再実行（判断は /approvals のみ）。実 queue 再投入・実行は P4Q Gate。
- 成果金額・削減時間・ROI の推測表示（実測がない値は未計測のまま）。
- schema 変更（不要と判定。必要になった時点で `SCHEMA_CHANGE_APPROVAL_REQUIRED` へ戻す）。

本書は「脆弱性ゼロ」「完全無欠」「全機能完成」を宣言しない。
