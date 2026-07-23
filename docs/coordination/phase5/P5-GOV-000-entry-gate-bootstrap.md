---
schema: 369-phase5-task-packet-v1
packet_id: P5-GOV-000
revision: 3
status: PROPOSED
phase: 5
workstream: WS-GOV
risk_tier: RT4
repository: DREEXY-git/369
base_sha: f822a73998d0dd936f18ad4ac305d01643ed8f83
branch: claude/p5-entry-gate-v1
target_pr: https://github.com/DREEXY-git/369/pull/129
created_at: 2026-07-23
created_by: DREEXY-git
human_approver_github_login: DREEXY-git
packet_sha256: EXTERNAL
---

# P5-GOV-000 — Phase 5 Entry Gate Bootstrap

## 0. Revision History

- revision 1 → 2: Bootstrap（prompt 00〜07 + manifestのGit追跡、Packet作成、Draft PR #129引渡し）。
- revision 2 → 3: 既存Draft PR #129に対するB/H監査finding（B-P5-GOV-01〜04, H-P5-001）のremediation。新機能・新WIP・Phase 5実行開始ではない。
  - previous_head（rev2 head）: `509f3b9cc380b961c4e412b3c05056480e285f52`
  - previous_packet_sha256（rev2 Packet本文）: `0e9ed7da3799ac38257d6e35e89d35a66d1cb833c319d10075213faf44274835`
- 最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）は本revisionでも未実施。Revision 3作成後のHuman Gateとして残す。承認者は人間のみ、Codex B/Hは独立確認者。

## 1. Objective

既存のPrompt SystemとP5-GOV-000 PacketのB/H監査findingだけを修正し、P5-GOV-000 revision 3を再監査可能な状態にする。Phase 5の製品実装・新WIP・実行開始は含まない。

## 2. User Value

非エンジニアの承認者が、「AIの分業と承認の統制ルール」がGit上で一貫し、承認者は人間だけであること、監査（C/D/E）が必須であること、hashに循環がないことを、コミットとハッシュで確認できる。以後のPhase 5作業が、曖昧さのない統制の下でのみ進む。人間の安全な統制（時間とリスクの節約）に効く。

## 3. IDs

- Phase: `5`
- Workstream: `WS-GOV`
- Task ID: `P5-GOV-000`
- Function IDs: `WS-GOV-BOOTSTRAP-000`
- Authorized findings: `B-P5-GOV-01`, `B-P5-GOV-02`, `B-P5-GOV-03`, `B-P5-GOV-04`, `H-P5-001`
- Checkpoint: `1`

## 4. Source of Truth

Commit C（B/H findingを反映したremediation commit）を、remediated Prompt Systemの正本とする。

- Prompt system commit SHA (Commit C): `6df876ec6bd56982702ef63830a982dccb399dca`
- Bootstrap commit A（初回Git追跡）: `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- Base main SHA at approval: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- Prompt directory: `369-vault/プロンプト/Phase5/`
- Manifest content hash (Commit C時点): `93c450f1f7ef326f821277fdbe17ffdb7a79890de6d145060a04c5e346fd6dad`
- Related design audit: B/H audit of Draft PR #129
- Related prior implementation: P5-GOV-000 revision 2 (`509f3b9cc380b961c4e412b3c05056480e285f52`)

### Prompt SHA-256（Commit C時点の各ファイル内容）

| # | Path | prompt_id | version | SHA-256 | rev3変更 |
|---|---|---|---|---|---|
| 00 | `369-vault/プロンプト/Phase5/00_PHASE5_PROMPT_SYSTEM.md` | 369-PHASE5-PROMPT-SYSTEM | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | YES |
| 01 | `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md` | 369-PHASE5-PROGRAM-CHARTER | 1.0 | `46b223208a478c470a8f9983910325b1e08abbe2520d0a4c62926c4614a16099` | no |
| 02 | `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md` | 369-PHASE5-CLAUDE-IMPLEMENTER | 1.0 | `17631eb65f68afb3bf39fcdfac1b46c30b7411a8db536125903c65c27a03db92` | no |
| 03 | `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md` | 369-PHASE5-CODEX-A-H | 14.0 | `cba186eb0d5fda3c7b9a99ea0fb6c819e8ba72b6b439b74249ba96fd473fc7c5` | no |
| 04 | `369-vault/プロンプト/Phase5/04_PHASE5_TASK_PACKET_TEMPLATE_V1.md` | 369-PHASE5-TASK-PACKET-TEMPLATE | 1.1 | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | YES |
| 05 | `369-vault/プロンプト/Phase5/05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md` | 369-PHASE5-BUSINESS-CLOSE | 1.0 | `a5d64bc0e00704d557627c7c5e3390cdec94a6116b6371750c5ed6bb4de538fd` | no |
| 06 | `369-vault/プロンプト/Phase5/06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md` | 369-PHASE5-CLAUDE-SINGLE | 1.1 | `79e9f070e4e343b5774f0e4390bc6c95895211ea8abe8a64a14f9b53453c3be4` | YES |
| 07 | `369-vault/プロンプト/Phase5/07_PHASE5_CODEX_SINGLE_PROMPT_V15.md` | 369-PHASE5-CODEX-SINGLE | 15.1 | `9810c9c0fe9476880ca8a3f2207b50127a47e56df04b896743c7de064af068e9` | YES |
| — | `369-vault/プロンプト/Phase5/PROMPT_MANIFEST.json` | 369-phase5-prompt-manifest-v1 | 1.1 | `93c450f1f7ef326f821277fdbe17ffdb7a79890de6d145060a04c5e346fd6dad` | YES |

manifestはcontent hash（各prompt本文のSHA-256）だけを管理する。commit SHAはmanifest本文へ書き込まない（循環参照なし）。commit SHAとcontent hashの対応付けは、本Packetと外部Human Approval Event（append-only）が併記して固定する。

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `f822a73998d0dd936f18ad4ac305d01643ed8f83`。
- rev2 head `509f3b9…` は既にpush済み（Draft PR #129）。rev3はその上にCommit C/D/Eを積む（amend/rebase/resetなし）。
- Commit C時点で再計算したprompt SHA-256とmanifest content hashは§4の値と一致する（cross-check `ALL_MATCH`）。
- 元のローカルcheckout（branch `codex/f1d-e2e-locators`）はdirtyであり、本作業では一切編集しない。byte単位/SHA-256でbaseline不変を確認済み（HEAD/STATUS/DIFF/STASH = SAME）。
- 作業はcleanな別worktree（branch `claude/p5-entry-gate-v1`）のみで実施。

### UNKNOWN

- 本Packet本文（rev3）の最終SHA-256（外部証拠として計算・報告し、人間とCodex B/Hが確認するまで最終承認しない）。

## 6. Scope

### IN_SCOPE

- B-P5-GOV-01〜04・H-P5-001の修正（Prompt System 00/04/06/07 + manifest = Commit C）。
- P5-GOV-000 Packetのrevision 3化（本ファイル = Commit D）。
- baseline/after証拠の永続化（evidenceファイル = Commit E）。
- 同一既存branch `claude/p5-entry-gate-v1` への通常push（既存Draft PR #129を維持）。

### NON_SCOPE

- `tasks/CURRENT_STATE.md` の変更。
- `tasks/DELIVERY_CONTRACT.md` の変更。
- `tasks/PHASE5.md` の作成。
- `docs/coordination/codex-queue/**`（queue README等）の変更。
- `369-vault/index.md` の変更。
- PADN role / config / workflow の変更。
- 製品コード（`apps/**`, `packages/**`, `infra/**`）の変更。
- 新規branch・新規PR・PR本文更新・Draft解除・main merge。
- GitHub Issue/PRのclose・追加コメント。
- Phase 5製品機能の実装。

## 7. ALLOWED_PATHS（これ以外へのwrite禁止）

- `369-vault/プロンプト/Phase5/**`
- `docs/coordination/phase5/P5-GOV-000-entry-gate-bootstrap.md`
- `docs/coordination/phase5/evidence/P5-GOV-000-revision3-evidence.md`

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
  - id: governance.entry_gate_evidence
    level: WRITE
```

## 10. Authorization

```yaml
authorization:
  read_only: true
  edit_local: true
  run_local_checks: true
  normal_commit: true
  normal_push_to_existing_branch: true
```

各trueはP5-GOV-000 revision 3 remediationとして人間（DREEXY-git）が承認した値。新規branch・新規PR・force push・amend・rebase・reset・PR本文更新・Draft解除・main mergeは承認外でfalseのまま。

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
  final_packet_approval: REQUIRED
  business_phase_close: REQUIRED
```

本remediationはdocs-only。main merge・Production・DB・schema・migration・seed・backfill・secrets/env/OAuth・外部送信・課金/支払・RBAC/ABAC/機密ラベル・PADN config/workflowはいずれも本Packet非対象で、実行が必要になった場合はすべて人間Gate（Claude Codeは実行しない）。最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）も人間Gateで、Codex B/H再監査後に人間だけが行う。

## 12. Required Design

- 採用する設計: B/H findingを、Prompt SystemとPacketの一貫性を高める方向にだけ最小修正する。すべての変更は安全制御を強化・明確化する方向であり、いかなる制御も弱めない。
- 守る不変条件:
  - 承認者は人間だけ。Codex A〜H（B・Hを含む）は独立確認者で、承認・PASS代行・mergeをしない。
  - C・D・E監査は実装Task PacketでREQUIRED（省略・免除しない）。
  - manifestはcontent hashのみ管理。Packet本文へ自身のhashを書かない。commit SHAをmanifestへ書かない（循環参照なし）。
  - 承認は外部Human Approval Event（append-only）で記録する。
- 既存パターン: `docs/coordination/phase5/` を踏襲し、証拠は `evidence/` サブディレクトリへ。
- データ所有者: 正本はGitHub（コミット・PR #129）。Obsidianは要約・安定知識のみ。
- 失敗時の挙動: base SHA不一致・prompt hash不一致・ALLOWED_PATHS外の必要・baseline不変が崩れた場合は編集せず停止する。
- 注記: finding B-P5-GOV-01〜04 / H-P5-001の逐語テキストは、承認では各Commitの「目的」として与えられた。本Packetと§Evidenceは、実際に行った変更を透明に記録し、Codex B/Hが独立再監査できるようにする。

## 13. Acceptance Criteria

1. B-P5-GOV-01〜04が解消される（外部Human Approval Event方式への統一、B/Hの承認者→独立確認者化、C/D/EのREQUIRED統一、manifest/commit/Packet hash循環の解消）。
2. H-P5-001が解消される（baseline/after証拠の永続化、prompt hashの再計算）。
3. 本Packetのstatusが `PROPOSED` である。
4. 最終承認者が人間のみであり、Codex B/Hは独立確認者であることが本Packetとprompt本文に明記される。
5. 本Packet §19 Role RouteのC/D/Eが `REQUIRED` である。
6. manifestがcontent hashのみを管理し、循環hashが存在しない。
7. baseline evidenceが `docs/coordination/phase5/evidence/P5-GOV-000-revision3-evidence.md` に永続化される。
8. `git diff --name-only origin/main...HEAD` がALLOWED_PATHS内のみで、ALLOWED_PATHS外の変更が0件である。
9. 作成済みDraft PR #129がDraftのまま維持され、auto-merge / merge-on-greenが設定されない。
10. main / Production / DB / schema / workflow / PADN等の禁止事項が維持され、変更0件である。
11. 本Packetに角括弧プレースホルダ（未置換のテンプレート項目）が0件である。
12. 本Packet本文（rev3）のSHA-256が外部証拠として算出・報告される（本文には書き込まない）。

## 14. Negative Acceptance Criteria

1. ALLOWED_PATHS外（特にFORBIDDEN_PATHS）へのwriteが発生してはならない。
2. 元のdirty checkoutのユーザー差分・untrackedを変更・stage・commitしてはならない。
3. main merge・Draft解除・auto-merge・force push・amend・rebase・reset・新規branch・新規PR・PR本文更新をしてはならない。
4. 本Packetに `PHASE5_TASK_PACKET_APPROVED` を自己宣言してはならない（最終承認は人間Gate）。
5. 承認された finding 範囲を超える prompt 変更や、いかなる安全制御（承認者=人間、C/D/E必須、AIの非承認、外部作用OFF、RBAC/機密ラベル）を弱める変更をしてはならない。

## 15. Test Plan

| Level | Case | Command / Evidence | Required |
|---|---|---|---|
| Unit | prompt hash再計算がmanifest値と一致 | `shasum -a 256 369-vault/プロンプト/Phase5/*` + manifest cross-check | YES |
| Integration | ALLOWED_PATHS外差分0件 | `git diff --name-only origin/main...HEAD` | YES |
| Integration | manifest JSONがparse可能・content-hash-only | `python3 -c "import json;json.load(open('369-vault/プロンプト/Phase5/PROMPT_MANIFEST.json'))"` | YES |
| Negative | trailing whitespace / conflict marker無し | `git diff --check` | YES |
| Negative | 元checkout status不変 | `git -C /Users/konishimasayuki/Desktop/369-app/369 status --porcelain=v2 --branch` の作業前後byte比較 | YES |
| Negative | C/D/EがREQUIRED（NOT_REQUIREDが残らない） | `grep -n "NOT_REQUIRED" 本Packet §19` = C/D/E行に無し | YES |

禁止:

- test skip / only / fixme
- RBACや安全条件を弱める
- 期待値を根拠なく実装に合わせる
- 0件実行をPASS扱いする

## 16. Evidence Required

- changed files（`git diff --name-only origin/main...HEAD`）
- base完全SHA / Commit A / Commit C / Commit D / Commit E / head完全SHA
- 各prompt SHA-256（rev2→rev3のbefore/after）
- manifest content hash
- Packet SHA-256（rev3, 外部証拠）
- 検証コマンドとexit status
- baseline/after SHA-256とSAME結果
- Draft PR #129 URL（Draft維持）
- Evidence path: `docs/coordination/phase5/evidence/P5-GOV-000-revision3-evidence.md`
- migration / rollback evidence: NOT_APPLICABLE（schema対象外）

## 17. Rollback

- Code rollback: 本branchは未merge。Commit C/D/Eは既存branchへ積むだけで、Draft PR #129をclose、または不要ならbranch削除（人間判断）で完全に取り消せる。製品コード・DB・mainへは一切影響しない。
- Data rollback: none（データ変更なし）。
- Feature flag: none。
- Unsafe partial state prevention: docs-onlyのため部分適用による不整合は発生しない。mainへのmergeは人間Gate。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES`（Prompt SystemのB/H finding修正。承認者=人間、B/H=独立確認者、C/D/E必須、hash非循環を明文化）
- Vault files allowed: `369-vault/プロンプト/Phase5/**`
- Evidence path allowed: `docs/coordination/phase5/evidence/P5-GOV-000-revision3-evidence.md`
- `CURRENT_STATE` update: `POST_MERGE_ONLY`
- `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`
- Function Evidence update: `NO`
- Temporary branch / PR state must not be written to vault.

## 19. Role Route

```yaml
route:
  B_architecture_preflight: REQUIRED
  claude_implementation: REQUIRED
  C_security_correctness: REQUIRED
  D_test_evidence: REQUIRED
  E_integration: REQUIRED
  human_merge: REQUIRED
  F_governance_sync: REQUIRED
  H_oversight: REQUIRED_AT_CHECKPOINT
```

C（security/correctness）・D（test/evidence）・E（integration）はすべての実装Task PacketでREQUIREDに統一した（rev2のNOT_REQUIRED_WITH_REASONを廃止）。本remediationはdocsのみを変更するが、Role Route自体はB/Hのfinding B-P5-GOV-03に従いREQUIREDを正本とする。B/Hは独立確認者として本rev3をread-only再監査し、承認者は人間のみ。

## 20. Stop Conditions

- base SHA mismatch（`origin/main` ≠ `f822a73998d0dd936f18ad4ac305d01643ed8f83`）
- Packet / prompt hash mismatch
- ALLOWED_PATHS外のwriteが必要
- user-owned dirty diffとの衝突、またはbaseline不変が崩れる
- schema / DB / Production / Secret等の未承認Gate
- force push / amend / rebase / reset / 新規branch / 新規PR / Draft解除が必要になった場合
- evidenceを取得できない
- 最終Packet承認前にEntry Gate本文（後続の製品/queue/state作業）へ進む要求

## 承認状態（本文外イベントで確定）

本Packet本文には自身のSHA-256を書き込まない（循環参照回避）。Packet本文（rev3）確定後にファイル全体のSHA-256を計算し、外部証拠として報告する。`PHASE5_TASK_PACKET_APPROVED` マーカーは、Codex B/Hが独立にread-only再監査し、人間（DREEXY-git）がそのSHA-256を最終確認するまで付与しない。承認者は人間のみ。現時点のstatusは `PROPOSED`。
