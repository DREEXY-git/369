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
- revision 3 rework2（revisionは3のまま維持）: rev3初版（head `f0cca809abd6ff37dc5f6182ff44e4cda39269df`）へのB/H再監査（B: `B_PRECHECK_NG` / H: `H_OVERSIGHT_HOLD`）で確定した release-blocking findings を修正。
  - B-P5-GOV-01 (HIGH): 06/07のTask Packet必須欄から `human_approval` を除去し、外部append-only Human Approval Event（8項目一致検証・fail-closed）へ置換。
  - H-P5-R3-01 (MEDIUM): 01/02/03/05/06/07のEOF余分空行を除去し `git diff --check` exit 0、version/manifest整合。
  - B-P5-GOV-R3-01 (MEDIUM): EvidenceとPacketのfinding ID対応を正しい対応へ修正。
  - B-P5-GOV-04 (Evidence制約): raw baseline_diffをGitへ保存しないこと、証拠限界を人間が明示受容したことをEvidenceへ正確に記録。
  - Commit F（pre-rework Evidence attestation）/ G（prompt・manifest修正）/ H（Packet・最終Evidence）。
- 最終Packet承認（`PHASE5_TASK_PACKET_APPROVED`）は本revisionでも未実施。rework2作成後のHuman Gateとして残す。承認者は人間のみ、Codex B/Hは独立確認者。

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

Commit G（rework2でB/H findingを反映したremediation commit）を、remediated Prompt Systemの正本とする。

- Prompt system commit SHA (Commit G): `1ca066ef491acc6dbd08d81b4f42ad29f1e67628`
- Bootstrap commit A（初回Git追跡）: `f71837efd5866427f0ba6f3b3b9462fd093286ad`
- rev3初版 Commit C: `6df876ec6bd56982702ef63830a982dccb399dca`
- Base main SHA at approval: `f822a73998d0dd936f18ad4ac305d01643ed8f83`
- Prompt directory: `369-vault/プロンプト/Phase5/`
- Manifest content hash (Commit G時点): `73d0fe7a3e7a1ecab3665be042bc0729b2d19d0bae34576f70a980a4aa76e53d`
- Related design audit: B/H re-audit of Draft PR #129（B: B_PRECHECK_NG / H: H_OVERSIGHT_HOLD）
- Related prior implementation: P5-GOV-000 revision 3 initial (`f0cca809abd6ff37dc5f6182ff44e4cda39269df`)

### Prompt SHA-256（Commit G時点の各ファイル内容）

| # | Path | prompt_id | version | SHA-256 | rework2変更 |
|---|---|---|---|---|---|
| 00 | `369-vault/プロンプト/Phase5/00_PHASE5_PROMPT_SYSTEM.md` | 369-PHASE5-PROMPT-SYSTEM | 1.1 | `ee356ea54671c9ce75a0e78fb31dc0936a6b5ba3fa67a1049699d0ecd2ece90d` | no |
| 01 | `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md` | 369-PHASE5-PROGRAM-CHARTER | 1.1 | `0a2a89a30cb3e9381f92f4e7a7e99a3d4951fdc6acb9681645f7b35882dbad8e` | YES (EOF) |
| 02 | `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md` | 369-PHASE5-CLAUDE-IMPLEMENTER | 1.1 | `d5ecf067fe9251f741127f3a7ea2bbfbb21e4d35caa4a877fa6fa5149eae749a` | YES (EOF) |
| 03 | `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md` | 369-PHASE5-CODEX-A-H | 14.1 | `03cafb8b2b34ddbe3726ce55bcbef8f7ac9d406baf3224d2f0b8b581f72dd5ba` | YES (EOF) |
| 04 | `369-vault/プロンプト/Phase5/04_PHASE5_TASK_PACKET_TEMPLATE_V1.md` | 369-PHASE5-TASK-PACKET-TEMPLATE | 1.1 | `0298f5391bfee2c3771e24b7b51aedd08580de4d6cc79a73651a3d9c5720d6b1` | no |
| 05 | `369-vault/プロンプト/Phase5/05_PHASE5_BUSINESS_CLOSE_PROMPT_V1.md` | 369-PHASE5-BUSINESS-CLOSE | 1.1 | `65add1032baaaa595cf4eda63d5b7b10805b720cab6766a1940ff5b794338cad` | YES (EOF) |
| 06 | `369-vault/プロンプト/Phase5/06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md` | 369-PHASE5-CLAUDE-SINGLE | 1.2 | `ee2ea1d9908f473ec91a5fd43169ecc5068ca9365757f7a30b50ec415d81c1eb` | YES (human_approval除去 + EOF) |
| 07 | `369-vault/プロンプト/Phase5/07_PHASE5_CODEX_SINGLE_PROMPT_V15.md` | 369-PHASE5-CODEX-SINGLE | 15.2 | `84ea784c4b1d3ed615bc127572650dfc1c12cdf24ba0800cc18324d8049c68a7` | YES (human_approval除去 + EOF) |
| — | `369-vault/プロンプト/Phase5/PROMPT_MANIFEST.json` | 369-phase5-prompt-manifest-v1 | — | `73d0fe7a3e7a1ecab3665be042bc0729b2d19d0bae34576f70a980a4aa76e53d` | YES |

manifestはcontent hash（各prompt本文のSHA-256）だけを管理する。commit SHAはmanifest本文へ書き込まない（循環参照なし）。commit SHAとcontent hashの対応付けは、本Packetと外部Human Approval Event（append-only）が併記して固定する。06/07はTask Packet必須欄から `human_approval` を除去し、外部Human Approval Eventへ置換済み。

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `f822a73998d0dd936f18ad4ac305d01643ed8f83`。
- commit chainは実施済み: rev2（Commit A→B）、rev3初版（Commit C→D→E, head `f0cca809…`）、rework2（Commit F→G→H, head `4225273…`）はすべて完了・push済み。本provenance correctionはその上にCommit I→Jを積む（amend/rebase/resetなし）。
- 現行Prompt System正本はCommit G（`1ca066ef…`）。§4のhash照合対象はCommit Gである。Commit G時点で再計算したprompt SHA-256とmanifest content hashは§4の値と一致する（cross-check `MANIFEST_ALL_MATCH`）。Prompt 00〜07とmanifestはprovenance correctionで変更しない。
- 元のローカルcheckout（branch `codex/f1d-e2e-locators`）はdirtyであり、本作業では一切編集しない。byte単位/SHA-256でbaseline不変を確認済み（HEAD/STATUS/DIFF/STASH = SAME）。
- 作業はcleanな別worktree（branch `claude/p5-entry-gate-v1`）のみで実施。

### UNKNOWN

- 本Packet本文（rev3）の最終SHA-256（外部証拠として計算・報告し、人間とCodex B/Hが確認するまで最終承認しない）。

## 6. Scope

### IN_SCOPE

- B/H監査findingの修正（rev3初版 = Commit C、rework2 = Commit F/G/H）。Prompt System 00〜07 + manifest、Packet、Evidence。
- P5-GOV-000 Packetのrevision 3化（本ファイル）: 初版 = Commit D、rework2更新 = Commit H、provenance correction = Commit I（現行）。
- baseline/after証拠の永続化（evidenceファイル）: 初版 = Commit E、rework2 pre/after = Commit F/H、provenance最終 = Commit J（現行）。
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

1. finding ID対応（B-P5-GOV-R3-01で確定した正しい対応）で各findingが解消される:
   - B-P5-GOV-01: `human_approval` をTask Packet必須欄から除去し外部append-only Human Approval Event方式へ統一。Packet immutable、8項目一致検証、mismatch/stale/自己承認はfail-closed。
   - B-P5-GOV-02: C/D/E Role RouteをREQUIREDへ統一。
   - B-P5-GOV-03: manifestはcontent hashのみ管理、循環hash解消。
   - B-P5-GOV-04: dirty checkout baseline Evidenceを、raw diff非保存でhash・手順・制約付きに永続化。
   - H-P5-001: 承認者は人間のみ、B/Hは独立確認者であることをprompt/Packetへ明記。
   - H-P5-R3-01: 01/02/03/05/06/07のEOF正規化とversion/manifest整合で `git diff --check` exit 0。
2. 06/07のTask Packet必須欄に `human_approval` が存在しない。
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
- commit chain（実在・完全SHA）: base `f822a73…` → A `f71837e…` → B `509f3b9…`（rev2）→ C `6df876e…` → D `345c8a4…` → E `f0cca80…`（rev3初版）→ F `ade469f…` → G `1ca066e…` → H `4225273…`（rework2）→ I / J（provenance correction）→ head
- 各prompt SHA-256（rev3初版→rework2のbefore/after。provenance correctionでは不変）
- manifest content hash（`73d0fe7a…`、provenance correctionで不変）
- Packet SHA-256（provenance correction後の再計算値, 外部証拠）
- Evidence SHA-256（外部証拠）
- 検証コマンドとexit status
- baseline/after SHA-256とSAME結果
- Draft PR #129 URL（Draft維持）
- Evidence path: `docs/coordination/phase5/evidence/P5-GOV-000-revision3-evidence.md`
- migration / rollback evidence: NOT_APPLICABLE（schema対象外）

## 17. Rollback

- Code rollback: 本branchは未merge。実在のcommit chain（A→B→C→D→E→F→G→H→I→J）は既存branch `claude/p5-entry-gate-v1` 上に積まれているのみで、Draft PR #129をclose、または不要ならbranch削除（人間判断）で完全に取り消せる。製品コード・DB・mainへは一切影響しない。
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

C（security/correctness）・D（test/evidence）・E（integration）はすべての実装Task PacketでREQUIREDに統一した（rev2のNOT_REQUIRED_WITH_REASONを廃止）。Role Route自体はB/Hのfinding B-P5-GOV-02に従いREQUIREDを正本とする。B/Hは独立確認者として本rev3をread-only再監査し、承認者は人間のみ。

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
