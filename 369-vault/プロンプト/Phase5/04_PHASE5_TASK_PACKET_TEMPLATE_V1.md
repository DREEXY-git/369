---
title: Phase 5 Task Packet Template
prompt_id: 369-PHASE5-TASK-PACKET-TEMPLATE
version: 1.0
status: proposed
date: 2026-07-23
tags:
  - phase5
  - prompt
  - task-packet
  - github
---

# Phase 5 Task Packet Template V1

このファイルは、Phase 5の1件のWIPをGitHub経由でClaude CodeとCodexへ渡すテンプレートである。

## 使用規則

- 1 Packet = 1目的 = 1 active write WIP = 原則1 Draft PR。
- `<...>`を残したPacketは無効。
- 完全SHAは40文字、prompt hashは64桁SHA-256。
- 権限の既定値はすべてfalse。
- Packet本文を確定後にファイル全体のSHA-256を計算し、その値はPacket外部のGitHub承認コメントと`PROMPT_DISPATCHED`へ保存する。Packet自身へ自分のhashを書き込む循環参照は作らない。
- scope変更時は`revision`を上げ、新しいhashと人間承認を取得する。
- 承認後のPacketはimmutable。Claude CodeもGovernance laneも本文を変更しない。進捗・判定・完了はGitHubのappend-only eventへ記録する。
- CodexはPacketの完全性と実装結果を監査する。
- Packet承認はmain merge、Production、schema適用、Phase Closeの承認を兼ねない。

---

以下を新しいMarkdownへコピーし、`<...>`を埋める。

````markdown
---
schema: 369-phase5-task-packet-v1
packet_id: P5-<WORKSTREAM>-<NNN>
revision: 1
status: PROPOSED
phase: 5
workstream: WS-GOV | WS-FIN | WS-RUN | WS-MEET | WS-SYNC
risk_tier: RT0 | RT1 | RT2 | RT3 | RT4
repository: DREEXY-git/369
base_sha: <FULL_40_CHAR_SHA>
branch: claude/<short-task-name>
target_pr: null
created_at: <ISO-8601>
created_by: <HUMAN_OR_DIRECTOR>
human_approver_github_login: DREEXY-git
packet_sha256: EXTERNAL
---

# <PACKET_ID> — <短い題名>

## 1. Objective

<1つだけ。何を完成させるか>

## 2. User Value

<非エンジニアが理解できる利用者価値。人間の時間、売上、粗利、回収、安全のどれに効くか>

## 3. IDs

- Phase: `5`
- Workstream: `<WS-...>`
- Task ID: `<F-R7-02 / M2 / MEET-01 等>`
- Function IDs: `<Cxx-nnn / FMR-* / FMxxx-nnn / Bxx-nnn / USR-nnn>`
- Checkpoint: `<0-7>`

## 4. Source of Truth

- Program Charter path: `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md`
- Program Charter commit SHA: `<FULL_40_CHAR_SHA>`
- Program Charter SHA-256: `<64_HEX>`
- Claude prompt path: `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md`
- Claude prompt commit SHA: `<FULL_40_CHAR_SHA>`
- Claude prompt SHA-256: `<64_HEX>`
- Codex prompt path: `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md`
- Codex prompt commit SHA: `<FULL_40_CHAR_SHA>`
- Codex prompt SHA-256: `<64_HEX>`
- Current main SHA at approval: `<FULL_40_CHAR_SHA>`
- Related design audit: `<URL_OR_PATH_OR_NONE>`
- Related prior implementation: `<PR_OR_SHA_OR_NONE>`

## 5. FACT / UNKNOWN

### FACT

- <git/code/test/CIの一次証拠>

### UNKNOWN

- <今回の作業で解消する不明点>

## 6. Scope

### IN_SCOPE

- <実装する最小範囲>

### NON_SCOPE

- <実装しないもの>

## 7. ALLOWED_PATHS（これ以外へのwrite禁止）

- `<path-or-glob>`

## 8. FORBIDDEN_PATHS

- `.env*`
- `packages/db/prisma/migrations/**` <不要なら禁止>
- `packages/db/prisma/schema.prisma` <不要なら禁止>
- `.github/**` <不要なら禁止>
- `config/padn/**` <不要なら禁止>
- `pnpm-lock.yaml` <不要なら禁止>
- `<task-specific-forbidden-path>`

## 9. Semantic Resource Lock

```yaml
resources:
  - id: <finance.cashflow_obligation / worker.execution_receipt 等>
    level: SNAPSHOT_READ | INTENT_WRITE | WRITE | EXCLUSIVE
```

## 10. Authorization

```yaml
authorization:
  read_only: true
  edit_local: false
  run_local_checks: false
  commit: false
  push: false
  open_draft_pr: false
```

各trueは人間が個別に確認する。`open_draft_pr=true`でもDraft解除、merge、auto-mergeはfalseのまま。

## 11. Human Gates

```yaml
human_gates:
  main_merge: REQUIRED
  production: REQUIRED
  schema_migration: REQUIRED | NOT_IN_SCOPE
  backfill_execution: REQUIRED | NOT_IN_SCOPE
  package_lock: REQUIRED | NOT_IN_SCOPE
  secrets_env_oauth: REQUIRED | NOT_IN_SCOPE
  real_llm_business: REQUIRED | NOT_IN_SCOPE
  external_send: REQUIRED | NOT_IN_SCOPE
  billing_payment: REQUIRED | NOT_IN_SCOPE
  rbac_abac_labels: REQUIRED | NOT_IN_SCOPE
  destructive_data: FORBIDDEN
  scope_expansion: REQUIRED
  business_phase_close: REQUIRED
```

## 12. Required Design

- <採用する設計>
- <守る不変条件>
- <既存パターン>
- <データ所有者>
- <失敗時の挙動>

## 13. Acceptance Criteria

1. `<機械判定可能な条件>`
2. `<機械判定可能な条件>`
3. `<機械判定可能な条件>`

## 14. Negative Acceptance Criteria

1. `<起きてはいけないこと>`
2. `<越境・二重・無承認等>`
3. `<失敗を成功表示しない等>`

## 15. Test Plan

| Level | Case | Command / Evidence | Required |
|---|---|---|---|
| Unit | <case> | `<command>` | YES |
| Integration | <case> | `<command or CI job>` | YES / HUMAN_GATE |
| E2E | <case> | `<command or CI job>` | YES / DEFERRED |
| Negative | <case> | `<command>` | YES |

禁止:

- test skip / only / fixme
- RBACや安全条件を弱める
- 期待値を根拠なく実装に合わせる
- 0件実行をPASS扱いする

## 16. Evidence Required

- changed files
- before / after
- complete base SHA
- complete head SHA
- test commandとexit status
- CI run IDとhead相関
- screenshot / artifact。UI対象の場合
- migration / rollback evidence。schema対象の場合
- C/D same-SHA verdict

## 17. Rollback

- Code rollback: <revert / feature off等>
- Data rollback: <none / forward-fix / explicit plan>
- Feature flag: <none / name>
- Unsafe partial state prevention: <transaction / dual-read / compatibility>

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES | NO`
- Vault files allowed: `<paths or NONE>`
- `CURRENT_STATE` update: `YES | NO | POST_MERGE_ONLY`
- `DELIVERY_CONTRACT` update: `YES | NO | POST_MERGE_ONLY`
- Function Evidence update: `YES | NO`
- Temporary branch / PR state must not be written to vault.

## 19. Role Route

```yaml
route:
  B_architecture_preflight: REQUIRED | COMPLETE | NOT_REQUIRED_WITH_REASON
  claude_implementation: REQUIRED
  C_security_correctness: REQUIRED
  D_test_evidence: REQUIRED
  E_integration: REQUIRED
  human_merge: REQUIRED
  F_governance_sync: REQUIRED | NOT_REQUIRED_WITH_REASON
  H_oversight: REQUIRED_AT_CHECKPOINT | NOT_REQUIRED_WITH_REASON
```

## 20. Stop Conditions

- base SHA mismatch
- Packet / prompt hash mismatch
- ALLOWED_PATHS外が必要
- user-owned dirty diffと衝突
- schema / DB / Production / Secret等の未承認Gate
- tenant boundaryが不明
- rollbackが成立しない
- 同一原因のreworkが2回失敗
- evidenceを取得できない

````

## GitHub外部イベントテンプレート

以下は承認済みPacket本文へ追記しない。Packetの完全SHA-256を計算した後、WIP IssueまたはControl Rootへ別のappend-onlyコメントとして記録する。

## 21. Human Approval Record

```yaml
approval:
  marker: PHASE5_TASK_PACKET_APPROVED
  packet_id: <PACKET_ID>
  revision: 1
  packet_sha256: <64_HEX>
  approver: DREEXY-git
  approved_at: <ISO-8601>
  authorization:
    edit_local: false
    run_local_checks: false
    commit: false
    push: false
    open_draft_pr: false
```

## 22. PROMPT_DISPATCHED

```json
{
  "schema": "369-phase5-dispatch-v1",
  "event": "PROMPT_DISPATCHED",
  "packet_id": "<PACKET_ID>",
  "packet_revision": 1,
  "packet_sha256": "<64_HEX>",
  "base_sha": "<FULL_40_CHAR_SHA>",
  "program_charter_sha256": "<64_HEX>",
  "claude_prompt_sha256": "<64_HEX>",
  "codex_prompt_sha256": "<64_HEX>",
  "branch": "claude/<short-task-name>",
  "allowed_paths": ["<path>"],
  "risk_tier": "<RT0-RT4>",
  "human_approver": "DREEXY-git"
}
```

## 23. Completion Record

実装後にClaudeが提案し、WIP Issue、PR、Control Rootのappend-only eventとして記録する。承認済みPacket本文は変更しない。

```yaml
completion:
  status: IMPLEMENTATION_READY_FOR_CODEX_REVIEW | CHANGES_REQUIRED | READY_FOR_HUMAN_GATE | MERGED | CLOSED
  head_sha: <FULL_40_CHAR_SHA>
  draft_pr: <URL_OR_NULL>
  C_verdict: <URL_OR_NULL>
  D_verdict: <URL_OR_NULL>
  E_verdict: <URL_OR_NULL>
  merged_main_sha: <FULL_40_CHAR_SHA_OR_NULL>
  post_merge_ci: <URL_OR_NULL>
  governance_sync: <URL_OR_NULL>
```

## Packetの最終検査

発行前に確認:

- `<...>`が0件
- 完全SHAが40文字
- SHA-256が64桁
- ALLOWED_PATHSが空でない
- FORBIDDEN_PATHSがある
- authorizationが明示
- Human Gatesが明示
- acceptance criteriaが3件以上
- negative criteriaが1件以上
- rollbackがある
- B/C/D/E routeがある
- auto-merge権限が存在しない
