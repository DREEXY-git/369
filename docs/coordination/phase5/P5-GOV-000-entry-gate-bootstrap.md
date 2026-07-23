---
schema: 369-phase5-task-packet-v1
packet_id: P5-GOV-000
revision: 2
status: PROPOSED
phase: 5
workstream: WS-GOV
risk_tier: RT4
repository: DREEXY-git/369
base_sha: f822a73998d0dd936f18ad4ac305d01643ed8f83
branch: claude/p5-entry-gate-v1
target_pr: null
created_at: 2026-07-23
created_by: DREEXY-git
human_approver_github_login: DREEXY-git
packet_sha256: EXTERNAL
---

# P5-GOV-000 — Phase 5 Entry Gate Bootstrap

## 1. Objective

Phase 5の製品実装を始める前に、GitHub・Task Packet・Prompt Systemの正本（Source of Truth）をGit上で固定し、Codex A〜Hのread-only監査とClaude Code唯一のwrite laneを安全に開始できる状態を作る。

## 2. User Value

非エンジニアの承認者が、「どのプロンプトとルールでAIが動くか」をGitのコミットとハッシュで確定できる。以後のAI作業が承認済みの正本に対してのみ行われることが保証され、勝手なルール変更・二重作業・監査不能な変更を防ぐ。人間の安全な統制（時間とリスクの節約）に効く。

## 3. IDs

- Phase: `5`
- Workstream: `WS-GOV`
- Task ID: `P5-GOV-000`
- Function IDs: `WS-GOV-BOOTSTRAP-000`
- Checkpoint: `1`

## 4. Source of Truth

Bootstrap commit A（Phase 5 prompt systemをGit追跡した最初のコミット）を正本とする。

- Prompt system commit SHA (commit A): `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- Base main SHA at approval: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- Prompt directory: `369-vault/プロンプト/Phase5/`
- Related design audit: `NONE`
- Related prior implementation: `NONE`

### Prompt SHA-256（commit A時点の各ファイル内容）

| # | Path | prompt_id | version | SHA-256 |
|---|---|---|---|---|
| 00 | `369-vault/プロンプト/Phase5/00_PHASE5_PROMPT_SYSTEM.md` | 369-PHASE5-PROMPT-SYSTEM | 1.0 | `27330d2b9ad72d19d52dba0dbb0348c7bc6f90642879fb4dd4cdc7e2b7c8caa4` |
| 01 | `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md` | 369-PHASE5-PROGRAM-CHARTER | 1.0 | `46b223208a478c470a8f9983910325b1e08abbe2520d0a4c62926c4614a16099` |
| 02 | `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md` | 369-PHASE5-CLAUDE-IMPLEMENTER | 1.0 | `17631eb65f68afb3bf39fcdfac1b46c30b7411a8db536125903c65c27a03db92` |
| 03 | `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md` | 369-PHASE5-CODEX-A-H | 14.0 | `cba186eb0d5fda3c7b9a99ea0fb6c819e8ba72b6b439b74249ba96fd473fc7c5` |
| 04 | `369-vault/プロンプト/Phase5/04_PHASE5_TASK_PACKET_TEMPLATE_V1.md` | 369-PHASE5-TASK-PACKET-TEMPLATE | 1.0 | `9e04893f78762581cee6515420ab3086537f398c41a1832a066cd4c2ef55ca7a` |
| 05 | `369-vault/プロンプト/Phase5/05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md` | 369-PHASE5-BUSINESS-CLOSE | 1.0 | `a5d64bc0e00704d557627c7c5e3390cdec94a6116b6371750c5ed6bb4de538fd` |
| 06 | `369-vault/プロンプト/Phase5/06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md` | 369-PHASE5-CLAUDE-SINGLE | 1.0 | `e09ce4f1db2da55569ed5b1260d78822792be3cf4b16c185144a6f18135edd6a` |
| 07 | `369-vault/プロンプト/Phase5/07_PHASE5_CODEX_SINGLE_PROMPT_V15.md` | 369-PHASE5-CODEX-SINGLE | 15.0 | `250ca8199e6273128fc95a41380daf57f41f0733290398d0f3f6525bc2efa5b7` |
| — | `369-vault/プロンプト/Phase5/PROMPT_MANIFEST.json` | 369-phase5-prompt-manifest-v1 | 1.0 | `8096d57e90e2c3a99ecf1d33265e526e3d25ba8acc442f4808bd8ca6f264e0bb` |

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `f822a73998d0dd936f18ad4ac305d01643ed8f83`（fetch後のlive値）。
- Bootstrap前、Phase 5 prompt 00〜07とmanifestは元のローカルcheckoutでuntrackedだった。
- 再計算した各prompt SHA-256は承認入力の期待値と一致した。
- 元のローカルcheckout（branch `codex/f1d-e2e-locators`）はdirtyであり、本作業では一切編集しない。
- Bootstrapは `origin/main` から作成したcleanな別worktree（branch `claude/p5-entry-gate-v1`）で実施した。

### UNKNOWN

- 本Packet本文の最終SHA-256（外部証拠として計算・報告し、人間とCodex B/Hが承認するまで後続作業は停止する）。

## 6. Scope

### IN_SCOPE

- Phase 5 prompt 00〜07とmanifestのGit追跡（Bootstrap commit A）。
- P5-GOV-000 revision 2 Packet（本ファイル）の作成（Bootstrap commit B）。
- Prompt hash・commit A SHA・Packet SHA-256の固定。
- Draft PRによるCodex B/Hへの引渡し。

### NON_SCOPE

- `tasks/CURRENT_STATE.md` の変更。
- `tasks/DELIVERY_CONTRACT.md` の変更。
- `tasks/PHASE5.md` の作成。
- `docs/coordination/codex-queue/**`（queue README等）の変更。
- `369-vault/index.md` の変更。
- PADN role / config / workflow の変更。
- 製品コード（`apps/**`, `packages/**`, `infra/**`）の変更。
- GitHub Issue/PRのclose・追加コメント。
- Phase 5製品機能の実装。

## 7. ALLOWED_PATHS（これ以外へのwrite禁止）

- `369-vault/プロンプト/Phase5/**`
- `docs/coordination/phase5/P5-GOV-000-entry-gate-bootstrap.md`

## 8. FORBIDDEN_PATHS

- `.env*`
- `.github/**`
- `config/padn/**`
- `apps/**`
- `packages/**`
- `infra/**`
- `tasks/**`
- `docs/coordination/codex-queue/**`
- `369-vault/index.md`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `package.json`
- `pnpm-lock.yaml`
- `AGENTS.md`

## 9. Semantic Resource Lock

```yaml
resources:
  - id: governance.phase5_prompt_system
    level: WRITE
  - id: governance.entry_gate_packet
    level: WRITE
```

## 10. Authorization

```yaml
authorization:
  read_only: true
  edit_local: true
  run_local_checks: true
  commit: true
  push: true
  open_draft_pr: true
```

各trueはP5-GOV-000 revision 2 Bootstrapとして人間（DREEXY-git）が個別に承認した値。`open_draft_pr=true`でもDraft解除、main merge、auto-mergeはfalseのまま。

## 11. Human Gates

```yaml
human_gates:
  main_merge: REQUIRED
  production: REQUIRED
  schema_migration: NOT_IN_SCOPE
  backfill_execution: NOT_IN_SCOPE
  package_lock: NOT_IN_SCOPE
  secrets_env_oauth: NOT_IN_SCOPE
  real_llm_business: NOT_IN_SCOPE
  external_send: NOT_IN_SCOPE
  billing_payment: NOT_IN_SCOPE
  rbac_abac_labels: NOT_IN_SCOPE
  padn_config_workflow: REQUIRED
  destructive_data: FORBIDDEN
  scope_expansion: REQUIRED
  business_phase_close: REQUIRED
```

本Bootstrapはdocs-only。main merge・Production・DB・schema・migration・seed・backfill・secrets/env/OAuth・外部送信・課金/支払・RBAC/ABAC/機密ラベル・PADN config/workflowはいずれも本Packet非対象であり、実行が必要になった場合はすべて人間Gate（Claude Codeは実行しない）。

## 12. Required Design

- 採用する設計: Phase 5 prompt 00〜07とmanifestを本文無改変でGit追跡し、その内容をSHA-256で固定。Packetは04テンプレートに従い、prompt commit SHAとprompt SHA-256を参照として保持する。
- 守る不変条件: prompt本文はBootstrapで変更しない（コピーのみ）。ALLOWED_PATHS外へのwriteは0件。元のdirty checkoutは不変。
- 既存パターン: `docs/coordination/` 配下にcoordination文書を置く既存慣習に従い、`docs/coordination/phase5/` を新設。
- データ所有者: Prompt SystemとPacketの正本はGitHub（GitのコミットとPR）。Obsidianは要約・安定知識のみ。
- 失敗時の挙動: base SHA不一致・prompt hash不一致・同名branch既存・ALLOWED_PATHS外の必要が生じた場合は編集せず停止する。

## 13. Acceptance Criteria

1. prompt 00〜07とmanifestが `claude/p5-entry-gate-v1` のGit履歴（commit A）で追跡される。
2. commit A時点で再計算した各prompt SHA-256が本Packet §4の値と一致する。
3. 本Packetに角括弧プレースホルダ（未置換のテンプレート項目）が0件である。
4. 本Packetの `base_sha`（40文字）とprompt commit SHA（commit A, 40文字）がともに完全SHAである。
5. `git diff --name-only origin/main...HEAD` の結果がALLOWED_PATHS内のみで、ALLOWED_PATHS外の変更が0件である。
6. 元のdirty checkout（`codex/f1d-e2e-locators`）のgit statusが作業前と不変である。
7. 製品コード・DB・schema・migration・workflow・PADNの変更が0件である。
8. 作成されるPRがDraftであり、auto-merge / merge-on-greenが設定されない。
9. 本Packet本文のSHA-256が外部証拠として算出・報告される。

## 14. Negative Acceptance Criteria

1. ALLOWED_PATHS外（特にFORBIDDEN_PATHS）へのwriteが発生してはならない。
2. 元のdirty checkoutのユーザー差分・untrackedを変更・stage・commitしてはならない。
3. main merge・Draft解除・auto-merge・force pushを行ってはならない。
4. 本Packetに `PHASE5_TASK_PACKET_APPROVED` を自己宣言してはならない（Packet hashの人間承認前）。
5. prompt本文を1バイトでも改変してはならない。

## 15. Test Plan

| Level | Case | Command / Evidence | Required |
|---|---|---|---|
| Unit | prompt hash再計算が期待値と一致 | `shasum -a 256 369-vault/プロンプト/Phase5/*` | YES |
| Integration | ALLOWED_PATHS外差分0件 | `git diff --name-only origin/main...HEAD` | YES |
| Integration | manifest JSONがparse可能 | `python3 -c "import json,sys;json.load(open(sys.argv[1]))"` | YES |
| Negative | trailing whitespace / conflict marker無し | `git diff --check` | YES |
| Negative | 元checkout status不変 | `git -C /Users/konishimasayuki/Desktop/369-app/369 status --porcelain=v2 --branch` の作業前後比較 | YES |

禁止:

- test skip / only / fixme
- RBACや安全条件を弱める
- 期待値を根拠なく実装に合わせる
- 0件実行をPASS扱いする

## 16. Evidence Required

- changed files（`git diff --name-only origin/main...HEAD`）
- base完全SHA / commit A完全SHA / head完全SHA
- 各prompt SHA-256
- Packet SHA-256（外部証拠）
- 検証コマンドとexit status
- Draft PR URL
- CI run（存在すればhead相関）
- migration / rollback evidence: NOT_APPLICABLE（schema対象外）

## 17. Rollback

- Code rollback: 本branchは未merge。Draft PRをclose、または不要ならbranch削除（人間判断）で完全に取り消せる。製品コード・DB・mainへは一切影響しない。
- Data rollback: none（データ変更なし）。
- Feature flag: none。
- Unsafe partial state prevention: docs-onlyのため部分適用による不整合は発生しない。mainへのmergeは人間Gate。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `NO`（prompt本文は無改変でGit追跡のみ）
- Vault files allowed: `369-vault/プロンプト/Phase5/**`
- `CURRENT_STATE` update: `POST_MERGE_ONLY`
- `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`
- Function Evidence update: `NO`
- Temporary branch / PR state must not be written to vault.

## 19. Role Route

```yaml
route:
  B_architecture_preflight: REQUIRED
  claude_implementation: REQUIRED
  C_security_correctness: NOT_REQUIRED_WITH_REASON
  D_test_evidence: NOT_REQUIRED_WITH_REASON
  E_integration: NOT_REQUIRED_WITH_REASON
  human_merge: REQUIRED
  F_governance_sync: REQUIRED
  H_oversight: REQUIRED_AT_CHECKPOINT
```

理由: 本PacketはWS-GOVのdocs-only bootstrapであり、製品コード・DB・実行経路を変更しない。C（security/correctness）・D（test evidence）・E（integration）は製品slice実装時に必須化する。Bootstrapの正本固定はB（設計・完全性）とH（監督）、およびF（GitHub/Obsidian同期整合）で監査する。

## 20. Stop Conditions

- base SHA mismatch（`origin/main` ≠ `f822a73998d0dd936f18ad4ac305d01643ed8f83`）
- Packet / prompt hash mismatch
- ALLOWED_PATHS外のwriteが必要
- user-owned dirty diffとの衝突
- schema / DB / Production / Secret等の未承認Gate
- 同名branch `claude/p5-entry-gate-v1` が既存
- evidenceを取得できない
- Packet hashの人間承認前にEntry Gate本文（後続の製品/queue/state作業）へ進む要求

## 承認状態（本文外イベントで確定）

本Packet本文には自身のSHA-256を書き込まない（循環参照回避）。Packet本文確定後にファイル全体のSHA-256を計算し、外部証拠として報告する。`PHASE5_TASK_PACKET_APPROVED` マーカーは、人間（DREEXY-git）とCodex B/HがそのSHA-256を確認・承認するまで付与しない。現時点のstatusは `PROPOSED`。
