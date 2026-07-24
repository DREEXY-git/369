---
schema: 369-phase5-task-packet-v1
packet_id: P5-FIN-002
revision: 2
status: PROPOSED
phase: 5
workstream: WS-FIN
risk_tier: RT4
repository: DREEXY-git/369
base_sha: 061d652264f97633379b5951243dd27776d0b8b7
branch: claude/p5-fin-002-canonical-producer-v1
target_pr: 133
created_at: 2026-07-24
created_by: DREEXY-git
human_approver_github_login: DREEXY-git
task_id: F-R7-02
checkpoint: 2 / Financial Truth
packet_sha256: EXTERNAL
---

# P5-FIN-002 — Canonical Cashflow Obligation Producer（予定入出金の永続正本化）

## 0. Registration State

- 本 Packet の現行 revision は Revision 2（PROPOSED）であり、FIN-02 の単一実装契約を確定する **最終 remediation 契約**として Git 正本候補に登録する。
- Revision 2 の新しい Human Approval Event が投稿されるまで、schema・migration・製品コードの実装は禁止する。本 Packet の登録だけでは何の実装権限も生じない。
- Packet の `target_pr` と固定 head が確定し、Codex B/C/D/E/H の独立監査を通過し、人間が GitHub Human Approval Event を投稿するまで実装へ進まない。
- 人間承認後は本 Packet を immutable とし、scope 変更が必要なら新 revision と新しい外部 SHA-256 と新しい人間承認を要求する。
- 本 Task は Phase 5 内の FIN-02 であり、Phase 5.1 等の追加 Phase を作らない。

## 0.R2 Revision 2 — Final Remediation Contract

本節は Revision 2 でのみ有効な追加契約である。Revision 2 は、Revision 1 実装に対する独立監査で確定した audit findings を閉じ、承認と head の曖昧さを除去するための **一回限りの最終 remediation 実行契約** である。本 Packet 本文は `PROPOSED`。人間承認後は immutable とし、以降の descendant 実装 commit でも本 Packet ファイルを変更しない。

### 0.R2.0 Revision 間の優先規則（precedence）

- **Revision 2 §0.R2 は、それに矛盾する Revision 1 由来の継承文言をすべて override する。** 承認・head binding・writer lease・stop condition に関しては §0.R2 が唯一の権威ある解釈である。
- §0.R2 と矛盾しない継承セクション（§1〜§19 の Objective / 設計 / Acceptance / Test Plan / Rollback 等）は、そのまま有効に残る。
- 継承文言と §0.R2 が衝突した場合は常に §0.R2 を優先し、両立し得る二重解釈（ambiguous dual interpretation）を残さない。曖昧が生じた箇所は §0.R2 の文言で読む。

### 0.R2.1 現行 remote head は歴史的入力であり merge-ready ではない

- 現行 remote 実装 head `9673cbfead2f9ba20b2df49c34f459ed47406732`（branch `claude/p5-fin-002-canonical-producer-v1` / PR #133）は **歴史的入力**であり、**merge-ready ではない**。
- 当該 head は下記 remediation matrix の findings（High 5 件・Medium 2 件）を未解決に含むため、Revision 2 承認・実装の起点候補としてのみ扱い、正本完成物としては扱わない。
- head が 1 commit でも変われば、当該 head に対する過去の C/D/E/H PASS・exact-head CI 結果はすべて stale として失効する。

### 0.R2.2 Remediation Matrix（固定・網羅）

各 finding は Prompt 07 §22 の finding 規則語彙（`severity` / `file_or_evidence` / `minimum_remediation` / `acceptance_test`）に対応する。affected paths は §7 の実装 ALLOWED_PATHS の範囲内に限る。

| Finding ID | Severity | Affected §7 allowed paths | Minimum fix | Acceptance test |
|---|---|---|---|---|
| `D-FIN002-001` | High | `packages/db/src/canonical-obligation.ts`, `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts` | tenant 不一致 event の link で、event update 件数が正確に 1 でない場合は throw して transaction を rollback し、obligation / alias を作らず event を不変に保つ。update 0 件で `linked=true` を返さない。 | tenant 不一致 fixture で link を試み、event 更新 0 件・obligation 0 件・alias 0 件・呼び出しが fail する itest。 |
| `D-FIN002-002` / `H-FIN002-002` | High | `packages/db/src/canonical-obligation.ts`, `packages/db/src/fin02-canonical-obligation-backfill.ts`, `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts` | Candidate/Invoice alias collision を検知したら link せず、安全な場合は関連 obligation を `coverage_incomplete` にし、明示的な conflict result / count を返す。version mismatch を含む必要分類を欠落させない。 | alias collision fixture で link されず conflict count>0・`coverage_incomplete` 遷移を検証する itest。 |
| `D-FIN002-003` / `H-FIN002-003` | High | `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts` | 独立 transaction を重なるよう同期させる真の並列 producer retry test を追加する。単なる直列反復を並列と偽装しない。 | 2 つの独立 transaction を意図的に overlap させ、duplicate obligation / alias が 0 件になる concurrent itest。 |
| `D-FIN002-004` / `H-FIN002-002` | High | `packages/db/src/fin02-canonical-obligation-backfill.ts`, `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts` | backfill に direction / currency / lifecycle / duplicate alias candidate / version mismatch の 5 conflict 分類の件数と fail-closed 挙動を実装する。dry-run は write 0、execute は推測・上書きせず、未解決 conflict は link しない。 | 5 分類それぞれの conflict fixture で dry-run write 0・execute で当該行が link されず count が正しい itest。 |
| `D-FIN002-005` | Medium（release-blocking） | `packages/db/prisma/migrations/20260724123000_p5_fin002_canonical_obligation/migration.sql`, `docs/coordination/phase5/evidence/P5-FIN-002-implementation-evidence.md` | migration SQL の EOF 余分な空行を除去する。Evidence は `git diff --check` の実際の結果を正しく記載する。 | `git diff --check` を範囲 `approved_starting_head_sha..candidate_fixed_head_sha` で実行して exit 0。Evidence が実 exit status を記録。 |
| `H-FIN002-001` | High（governance） | （実装 code path なし。本 §0.R2.3 の承認・descendant 契約と Evidence で閉じる） | 承認起点 head と、その authorized descendant 実装 commit との binding を §0.R2.3 で一意に定義する。 | §0.R2.3 の全条件（ancestry / branch / PR / actor-session / commit-count / path-scope / forbidden-op evidence）を満たすことを Evidence で証明。 |
| `H-FIN002-004` | Medium（non-blocking） | `docs/coordination/phase5/evidence/P5-FIN-002-implementation-evidence.md` | 停止済み未 push の local-only 並列 Claude commit `2322d3ab7242063589990d9e19dc87332ca6331e` を歴史的実行証拠として透明に記録する。当該 commit を含めず・再利用せず・cherry-pick しない。 | Evidence に incident（停止済み・未 push・remote 完全性に影響なし）を記録し、descendant chain に当該 SHA が祖先として存在しないことを示す。 |

- 上記以外の新規 scope 追加は行わない。matrix 外の findings が判明した場合は実装せず停止し、新 revision と新しい人間承認を取り直す。
- H-FIN002-004 の commit は remote 完全性に影響を与えなかった。透明性のため記録するのみで、本 remediation の入力にしない。

### 0.R2.3 Human Approval Event と authorized descendant 実行

Revision 2 の承認・実装の起点と権限は次の通り一意に定める。承認契約自体は Prompt 04/06/07 §21 と同一（同じ comment body payload と本文外 envelope、strict verifier）を用いる。

```yaml
revision_2_execution:
  approval_event:
    posted_only_after: THIS_PACKET_REV2_PROPOSAL_COMMIT_PUSHED
    schema: identical_to_prompt_04_06_07_section_21
    verify_time_binding:
      event_fixed_head_sha_must_equal: live_PR_head_at_verification
      becomes: approved_starting_head_sha
  authorized_descendant_session:
    count: exactly_one_named_claude_code_session
    same_branch: claude/p5-fin-002-canonical-producer-v1
    same_pr: 133
    commit_shape: normal_linear_first_parent_descendant_only
    forbidden_operations:
      - merge_commit
      - force_push
      - amend
      - rebase
      - reset
      - branch_change
      - pr_body_update
      - draft_removal
      - auto_merge
      - second_writer
  path_scope:
    every_changed_byte_in: approved_starting_head_sha..candidate_fixed_head_sha
    must_be_within: SECTION_7_FOURTEEN_ALLOWED_PATHS
    packet_file_mutable_after_event: false
  commit_budget:
    max_commits_after_approval: 2
    commit_1: remediation_implementation_commit
    commit_2: final_remediation_commit_only_if_exact_head_ci_exposes_test_or_evidence_only_defect_within_allowed_paths
    this_is_final_remediation_round: true
    further_failure: REPLAN_REQUIRED  # 新 revision / 新承認が必要
  candidate_head_rules:
    strict_descendant_of_approved_starting_head: true
    remote_chain_linear: true
    all_prior_pass_results_stale_after_head_change: true
  audit_scope:
    C_D_E_H_and_exact_head_ci_audit: final_candidate_head_only
    approval_event_validated_at: session_start_against_approved_starting_head
    descendant_authorization_verified_by:
      - ancestry
      - branch
      - pr
      - actor_or_session
      - commit_count
      - path_scope
      - forbidden_operation_evidence
    do_not_reinterpret_event_fixed_head_as_final_post_write_head: true
  fail_closed_on:
    - non_descendant_candidate_head
    - another_writer
    - path_expansion
    - extra_commit
    - stale_starting_head
    - unknown_actor_or_session
    - missing_evidence
```

補足規則:

- Human Approval Event は、**本 Rev2 proposal commit を push した後**にのみ人間が投稿する。承認前に本プロンプトや本 Packet を根拠に実装権限を得ない。
- 承認検証時、Event の `fixed_head_sha` は live PR head と一致しなければならず、一致した値が `approved_starting_head_sha` になる。承認起点 head を Packet 本文へ埋め込んで循環参照を作らない。
- 承認後、**唯一の named Claude Code session** が同一 branch・同一 PR 上で、normal・linear・first-parent の descendant commit のみを作る。merge/force/amend/rebase/reset/branch 変更/PR 本文更新/Draft 解除/auto-merge/second writer は禁止。
- `approved_starting_head_sha..candidate_fixed_head_sha` の**全変更 byte** は §7 の 14 ALLOWED_PATHS 内に収まらなければならない。Packet ファイルは Event 後 immutable であり descendant 実装 commit で変更しない。
- 承認後の commit は最大 2 件: (1) remediation 実装 commit、(2) exact-head CI が ALLOWED_PATHS 内の test/evidence-only 欠陥を露呈した場合に限る最終 remediation commit。本 round が最終であり、以降の失敗は `REPLAN_REQUIRED` として新 revision・新承認を要求する。
- candidate fixed head は approved starting head の strict descendant であり、remote chain は linear。head 変更後は旧 audit PASS がすべて stale。
- C/D/E/H と exact-head CI は **final candidate head のみ**を監査する。Approval Event は session 開始時に approved starting head に対して検証し、descendant 権限はその後 ancestry + branch + PR + actor/session + commit-count + path-scope + forbidden-operation evidence で検証する。Event.`fixed_head_sha` を最終 post-write head と再解釈しない。
- non-descendant / another writer / path expansion / extra commit / stale starting head / unknown actor・session / missing evidence はすべて fail-closed。

### 0.R2.4 Exclusive Writer Lease（task-scoped Git/GitHub evidence lease）

永続 lease service は存在しないため、この一回の実行に限る **task-scoped Git/GitHub evidence lease** を定義する。この lease は **evidence（証拠記録）であって、外部 writer を技術的に排他できる persistent lock ではない**。write 開始前に取得し、commit/push 直前に再確認する。workflow / PADN は変更しない。

lease は固定値と、承認後の実装 session が実行時に解決する runtime 値からなる。本 Packet 本文にはプレースホルダ値を残さない。各フィールドは次の field contract（型 / source / validation）で定義し、解決値は本文ではなく `recorded_in` の Evidence へ secrets 抜きで記録する。

| Field | 型 / source | Validation |
|---|---|---|
| `scope` | 固定文字列 `single_revision_2_remediation_run` | 常にこの値。 |
| `repository` | 固定 `DREEXY-git/369` | Packet header と一致。 |
| `pr` | 固定 `133` | `target_pr` と一致。 |
| `branch` | 固定 `claude/p5-fin-002-canonical-producer-v1` | Packet `branch` と一致。 |
| `owner_session_id` | 唯一の Claude 実行が emit する非空 identifier | 非空。当該実装 session が emit した値であること。secrets を含めない。 |
| `approved_starting_head` | 検証時に捕捉した Human Approval Event の exact fixed head（= `approved_starting_head_sha`） | 40 桁 hex。§0.R2.3 の verify-time binding で確定した値と exact 一致。 |
| `acquired_at` | lease 取得時刻（RFC3339 タイムスタンプ） | RFC3339。`acquired_at < expires_at`。 |
| `expires_at` | lease 失効時刻（RFC3339 タイムスタンプ） | RFC3339。commit/push を含む実行全体をカバーする（push 時点で未失効）。 |
| `fencing_token` | 実行開始時に一度だけ生成する非 secret の random/monotonic run token | 非空・非 secret。commit/push 直前に同値の再確認（recheck）を通ること。 |
| `recorded_in` | 固定 `docs/coordination/phase5/evidence/P5-FIN-002-implementation-evidence.md` | 実装 Evidence path と一致。 |
| `secrets_in_record` | 固定 `NONE` | Evidence に secrets を一切含めない。 |

- runtime 値（`owner_session_id` / `approved_starting_head` / `acquired_at` / `expires_at` / `fencing_token`）は承認後の実装 session が上表の validation を満たすよう解決し、解決値を `recorded_in` の Evidence へ secrets 抜きで記録する。**本 proposal run では解決せず、本文にプレースホルダを残さない**（本 run は Packet のみ編集し product を実装しないため）。
- この lease は evidence であり、外部 writer を技術的に阻止できない。したがって edit・commit・push の**各直前に remote head を再取得**し、期待する approved descendant と一致することを確認する。
- いずれかの checkpoint で remote head が期待 approved descendant と相違した場合は fail-closed で停止する。
- 実行前に、本 branch に対して別の Claude / Codex の write process・worktree が active でないことを確認する。
- 別の live writer が存在する、fencing token の recheck が不一致、または上表 validation を満たせない場合は run を停止する。
- 上記のチェック結果と、lease が persistent lock ではないという limitation を実装 Evidence に記録する。lease は本 proposal run では取得しない。承認後の実装 session が使用する。

### 0.R2.5 Required Product Fixes and Tests（承認後の実装で必須）

承認後の descendant 実装 session は次を必須で満たす。すべて §7 の 14 ALLOWED_PATHS 内に収める。

- **tenant mismatch**: event update 件数が正確に 1 であることを要求する。1 でなければ throw して transaction を fail させ、obligation / alias を rollback し、event を不変に保つ。
- **alias collision**: link しない。安全な場合は該当 obligation を `coverage_incomplete` とする。明示的な conflict result / count を露出する。
- **backfill 5 conflict 分類**: direction / currency / lifecycle / duplicate alias candidate / version mismatch。dry-run は write 0、execute は推測・上書きせず、未解決 conflict は link しない。
- **already-linked 行**: 単純に `already_linked` と数えず、tenant / version / canonical identity・alias / direction・currency・lifecycle を検証する。
- **真の並列 producer retry test**: 独立 transaction を overlap するよう同期させる。可能なら Candidate/Invoice alias collision と producer-vs-backfill collision も現行ファイル内でカバーする。最低でも Packet の concurrent acceptance を証明する。
- **interrupted/resume test**: 2 回目実行の delta 0、orphan obligation / alias なし。
- **migration EOF blank line 除去**: `git diff --check` を範囲 `approved_starting_head_sha..candidate_fixed_head_sha` で実行して exit 0。
- **Evidence**: PR の実 total changed files を実装 delta と**別に**報告する。commands / counts / conflicts / CI、および停止済み未 push の local-only writer incident（H-FIN002-004）を記録する。

### 0.R2.6 この proposal run の権限境界

- 本 proposal run で許可される write path は `docs/coordination/phase5/P5-FIN-002-canonical-obligation-producer.md` のみ。
- **本 proposal commit での Packet 編集は、承認後の実装 ALLOWED_PATHS（§7 の 14 paths）には含まれない**。§7 は承認後の product 実装専用であり、Packet 自体は §8 の趣旨どおり実装 commit では不変。
- 本 run では product / schema / migration / test / Evidence / prompt / manifest / CURRENT_STATE / DELIVERY_CONTRACT / vault / workflow / PADN を変更しない。

## 1. Objective

FIN-01 で確定した tenant 込み versioned canonical obligation identity を、DB 上の永続的な予定入出金正本へ接続する。既存 `FinanceEvent` を後方互換のため維持しながら、PurchaseOrder・Invoice・InvoiceCandidate・未知の `cashflow_expected` を tenant-scoped な一つの `CashflowObligation` へ収束させる。

FIN-02 は schema・producer dual-write・lifecycle 同期・再実行可能 backfill を完成させる。reader 統一は FIN-03 とし、本 Packet では変更しない。

## 2. User Value

資金ショート予兆が、同じ支払・入金予定を二重に数えたり、入金取消後の予定を落としたりしないための「お金の正本」を作る。金額と期日の類似による推測ではなく、PO・Invoice・Candidate の正本 ID と tenant 境界で同一性を確定する。不確実なデータは安全側に `coverageIncomplete` として残し、「足りないのに大丈夫」と表示する危険を防ぐ。

## 3. IDs

- Phase: `5`
- Workstream: `WS-FIN`
- Task ID: `F-R7-02`
- Packet ID: `P5-FIN-002`
- Checkpoint: `2 / Financial Truth`
- Function IDs: `NONE` — 対応する Function Master ID は一次証拠未確認のため推測しない。
- Related prior implementation: PR #131 / FIN-01 post-merge main `061d652264f97633379b5951243dd27776d0b8b7`

## 4. Source of Truth

- Program Charter path: `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md`
- Program Charter commit SHA: `061d652264f97633379b5951243dd27776d0b8b7`
- Program Charter SHA-256: `0d96adf98ebe737b1dfd50907191baebdca084d7db9fbfaa96d54c7cdce6b9fe`
- Claude prompt path: `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md`
- Claude prompt commit SHA: `061d652264f97633379b5951243dd27776d0b8b7`
- Claude prompt SHA-256: `67cc351ddbdb832b5649b651427e7aa423224310288a9b9a956a49c71962cd01`
- Codex prompt path: `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md`
- Codex prompt commit SHA: `061d652264f97633379b5951243dd27776d0b8b7`
- Codex prompt SHA-256: `bb70be8b52d11a5ebaced83e1bcab7dfda94cdcbbc74de1dbdb4321513707bfb`
- Prompt manifest SHA-256: `2dd6053ba18a8c6f862488c26149d434829fc011ab5811bfbb64ae798c59c984`
- Current main SHA at registration: `061d652264f97633379b5951243dd27776d0b8b7`
- Related design audit: Codex `P5_CODEX_SOLO_READONLY_PREPARATION`（2026-07-24、GitHub への書込みなし）
- Identity contract: `packages/shared/src/cashflow-obligation.ts`
- Identity tests: `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- FIN-01 Packet: `docs/coordination/phase5/P5-FIN-001-canonical-obligation-identity.md`

## 5. FACT / UNKNOWN

### FACT

- FIN-01 identity は次で確定済みであり、FIN-02 は変更しない。

  ```ts
  JSON.stringify([
    "cashflow-obligation",
    "v1",
    tenantId,
    namespace,
    sourceId,
  ])
  ```

- namespace は `po` / `inv` / `cand` / `evt`。
- 現行 `FinanceEvent` は `tenantId` / `type` / `sourceType` / `sourceId` / `direction` / `amount` / `currency` / `dueAt` / `status` を持つが、永続 canonical obligation ID を持たない。
- PurchaseOrder bridge は同じ PO から `payment_expected` と `cashflow_expected` を作る。
- InvoiceCandidate の `cashflow_expected` は Candidate 正式化後も DB 上では Candidate source のまま残る。
- Invoice external send は `payment_expected` を write-ahead claim として作る。
- 全額入金は Invoice source の expected event を `posted` にするが、Candidate source の legacy event は raw reader 上で残り得る。
- payment reversal は実績相殺 `payment_reversal` を作るが、全額入金時に閉じた expected obligation を再 OPEN する正本を持たない。
- FIN-01 canonical selector は reader 側で二重計上を抑制するが、DB producer の正本化ではない。
- 現在の主要 reader には canonical selector 使用系と raw `FinanceEvent` 集計系が混在している。

### UNKNOWN

- Production データに存在する sourceType / lifecycle conflict の件数。
- orphan `InvoiceCandidate`、sourceId 欠落、未知 `payment_expected` の実件数。
- backfill が分類する conflict 件数と、手動解決が必要な行数。
- 本 Packet Revision 2 の確定 SHA-256。本文確定後に外部証拠として計算し、本文へ埋め込まない。

## 6. Scope

### IN_SCOPE

- additive Prisma schema。
- canonical obligation persistence service。
- 既存 producer の同一 transaction dual-write。
- Candidate から Invoice への alias 収束。
- payment / void / reversal / reopen lifecycle 同期。
- dry-run 対応の idempotent backfill program。
- tenant isolation、並列 retry、backfill 再実行の統合テスト。
- FIN-02 専用 E2E Evidence。
- migration artifact と rollback / forward-fix 設計。

### NON_SCOPE

- FIN-01 identity encoding の変更。
- FIN-03 reader 統一。
- legacy `FinanceEvent` の削除。
- 既存 reader の出力契約変更。
- destructive migration / destructive down migration。
- Production migration 実行。
- Production backfill 実行。
- Production deploy。
- DB reset / seed。
- workflow / PADN / RBAC / Secrets / 外部送信 / 実 LLM / 課金。
- `pnpm-lock.yaml` / package dependency の変更。
- Draft 解除 / main merge / auto-merge。
- 一時的な branch / PR 状態の Obsidian 固定。

## 7. ALLOWED_PATHS（承認後の FIN-02 実装）

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260724123000_p5_fin002_canonical_obligation/migration.sql`
- `packages/db/src/canonical-obligation.ts`
- `packages/db/src/fin02-canonical-obligation-backfill.ts`
- `packages/db/src/index.ts`
- `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts`
- `apps/web/lib/domains/finance/finance-bridge.ts`
- `apps/web/lib/domains/finance/formalize.ts`
- `apps/web/lib/domains/finance/invoice-send.ts`
- `apps/web/lib/domains/finance/payments.ts`
- `apps/web/lib/invoice-void-bridge.ts`
- `apps/web/app/(app)/approvals/actions.ts`
- `apps/web/tests/e2e/fin02_canonical_obligation_producer_evidence.spec.ts`
- `docs/coordination/phase5/evidence/P5-FIN-002-implementation-evidence.md`

承認前の独立監査で、実在 producer の取りこぼしまたはテスト fixture の不足が判明した場合は実装せず停止し、revision を上げて人間承認を取り直す。承認後の ALLOWED_PATHS 自動拡張は禁止する。

本 §7 は Revision 2 でも上記 **14 paths のまま**であり、承認後の product 実装専用の ALLOWED_PATHS である。Revision 2 proposal commit における本 Packet ファイル（`docs/coordination/phase5/P5-FIN-002-canonical-obligation-producer.md`）の編集は、この 14 paths には**含まれない**別権限（§0.R2.6）であり、承認後の descendant 実装 commit では本 Packet ファイルを変更しない。

## 8. FORBIDDEN_PATHS

- `.env*`
- `.github/**`
- `config/padn/**`
- `pnpm-lock.yaml`
- `package.json`
- `packages/db/prisma/seed.ts`
- §7 記載以外の `packages/db/prisma/migrations/**`
- `packages/shared/src/cashflow-obligation.ts`
- `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- `packages/shared/src/index.ts`
- `apps/web/lib/domains/finance/cashflow.ts`
- `apps/web/lib/domains/finance/queries.ts`
- `tasks/**`
- `369-vault/**`
- `AGENTS.md`
- Production / deployment scripts

## 9. Semantic Resource Lock

```yaml
resources:
  - id: finance.cashflow_obligation
    level: EXCLUSIVE
  - id: finance.finance_event_producers
    level: WRITE
  - id: finance.cashflow_readers
    level: SNAPSHOT_READ
  - id: finance.fin01_identity
    level: SNAPSHOT_READ
```

同じ resource へ WRITE / EXCLUSIVE を持つ別 WIP が存在する場合は `RESOURCE_COLLISION` として停止する。

## 10. Authorization（Human Approval Event 後の実装権限）

```yaml
authorization:
  repository: DREEXY-git/369
  branch: claude/p5-fin-002-canonical-producer-v1
  existing_branch_only: true
  read_only: false
  edit_local: true
  run_local_checks: true
  commit: true
  push: true
  open_draft_pr: false
```

- Draft PR は Packet 登録時に作成済みの同一 PR を使用する。
- Human Approval Event の `authorization_scope` は上記 object と完全一致させる。
- 承認前は上記権限を有効と解釈しない。
- force push / amend / rebase / reset / 新規 branch / 新規 PR / PR 本文更新は含まない。

## 11. Human Gates

```yaml
human_gates:
  final_packet_approval: REQUIRED
  main_merge: REQUIRED
  production: REQUIRED
  schema_migration: REQUIRED
  migration_execution: REQUIRED
  backfill_execution: REQUIRED
  package_lock: NOT_IN_SCOPE
  secrets_env_oauth: NOT_IN_SCOPE
  real_llm_business: NOT_IN_SCOPE
  external_send: NOT_IN_SCOPE
  billing_payment: NOT_IN_SCOPE
  rbac_abac_labels: NOT_IN_SCOPE
  padn_config_workflow: FORBIDDEN
  destructive_data: FORBIDDEN
  scope_expansion: REQUIRED
  business_phase_close: REQUIRED
```

- Packet 承認は main merge、Production migration、Production backfill、Phase Close の承認を兼ねない。
- schema artifact の実装・レビューと、Production への適用は別 Gate とする。
- Codex / Claude Code は承認者を名乗らず、Human Approval Event を自己投稿しない。

## 12. Required Design

### 12.1 Selected Architecture

既存 `FinanceEvent` へ canonical key だけを追加する方式ではなく、独立した `CashflowObligation` 正本と `CashflowObligationAlias` を追加する。

canonical persistence service は `packages/db/src/canonical-obligation.ts` に一つだけ置き、`packages/db/src/index.ts` から公開する。web producer と DB backfill は同じ service を使用し、apps 側と packages 側へ upsert / conflict 判定を二重実装しない。

概念モデル:

```text
CashflowObligation
  ├── stable internal id
  ├── tenantId
  ├── identityVersion
  ├── preferredCanonicalKey
  ├── direction / currency
  ├── scheduledAmount / remainingAmount / dueAt
  └── lifecycleStatus

CashflowObligationAlias
  ├── tenantId
  ├── obligationId
  ├── identityVersion
  ├── namespace
  ├── sourceId
  └── canonicalKey

FinanceEvent
  └── cashflowObligationId?（nullable・tenant を含む composite relation）
```

### 12.2 Tenant Boundary

- `CashflowObligation` は `[tenantId, id]` を relation target として一意にする。
- Alias と FinanceEvent relation は `[tenantId, obligationId]` / `[tenantId, cashflowObligationId]` の composite relation で同一 tenant を DB 制約に含める。
- Alias は `[tenantId, identityVersion, namespace, sourceId]` で一意にする。
- `preferredCanonicalKey` は tenant-scoped に一意にする。
- tenantId 欠落・不一致は write 前に fail-closed とし、DB 制約でも cross-tenant link を拒否する。

### 12.3 Stable Identity and Alias Convergence

- `CashflowObligation.id` は lifecycle・金額・期日・Candidate 正式化で変えない。
- 未正式 Candidate は `cand` alias を持つ。
- Candidate が正式 Invoice になったら同じ obligation に `inv` alias を追加し、preferred identity を `inv` に更新できる。
- 旧 `cand` alias は履歴・再照合のため削除しない。
- 同額・同期限でも正本 ID が違えば別 obligation とする。
- 金額・期日・表示名の類似だけで alias を統合しない。

### 12.4 Lifecycle

最低限の lifecycle:

- `open`
- `partially_settled`
- `settled`
- `void`
- `coverage_incomplete`

規則:

- partial payment は `remainingAmount` を減らすが identity は維持する。
- full payment は `settled`。
- Invoice VOID は `void`。
- full payment reversal は同じ obligation を `open` または `partially_settled` へ戻す。
- lifecycle 変更は、対応する legacy FinanceEvent 更新・追加と同じ transaction 内で行う。
- direction / currency / source lineage conflict は推測更新せず rollback または `coverage_incomplete` と conflict Evidence を残す。

### 12.5 Producer Dual-write

対象 producer:

1. `emitFinanceEvent`
2. `bridgeEventProjectToFinance`
3. `bridgePurchaseOrderToFinance`
4. `bridgeDamageChargeToInvoiceCandidate`
5. `finalizeInvoiceCandidate`
6. `executeInvoiceExternalSend`
7. `issueInvoiceCore`
8. `recordInvoicePayment`
9. `decideInvoiceVoidCore`
10. `payment_reversal` approval transaction

要件:

- legacy FinanceEvent の作成・更新を維持する。
- canonical obligation upsert/link を同一 transaction に含める。
- 同一 producer retry は増分ゼロへ収束する。
- PurchaseOrder の `payment_expected` と `cashflow_expected` は同一 obligation に link する。
- generic event の未知 `payment_expected` は推測で正本化しない。
- 未知 `cashflow_expected` は FIN-01 と同じ `evt` identity を使用できる。

### 12.6 Migration Strategy

1. Expand
   - additive table / nullable relation / index のみ。
   - 既存列・既存 event を削除しない。
2. Dual-write
   - migration 適用後の新規 write を先に正本化する。
3. Dry-run backfill
   - 分類・件数・conflict を出し、DB を変更しない。
4. Execute backfill
   - checkpoint 付き、再実行可能、batch transaction。
5. Verify
   - tenant / alias / link / conflict / rerun 件数を検証。
6. FIN-03
   - 別 Packet で reader を切り替える。
7. Contract
   - FIN-02 では destructive cleanup を行わない。

### 12.7 Backfill Classification

次を別々に数えて Evidence 化する。

- PurchaseOrder
- direct Invoice
- InvoiceCandidate without invoiceId
- InvoiceCandidate with invoiceId
- unknown `cashflow_expected`
- unknown `payment_expected`
- orphan InvoiceCandidate
- missing tenantId
- missing sourceId
- direction conflict
- currency conflict
- lifecycle conflict
- duplicate alias candidate
- already migrated
- version mismatch

不明行は推測修復せず、dry-run / execute とも conflict として残す。

### 12.8 Concurrency and Idempotency

- alias unique constraint を最終 barrier とする。
- producer 単位の既存 advisory lock / row lock を維持する。
- upsert 前後の tenant / direction / currency / source lineage を検証する。
- backfill は deterministic cursor と checkpoint を持つ。
- backfill 中の新規 write は dual-write で保護する。
- backfill 2 回目は新規 obligation / alias / link が 0 件になる。

## 13. Acceptance Criteria

1. FIN-01 identity encoding が変更されていない。
2. additive schema と migration SQL が一致する。
3. `CashflowObligation` が stable internal ID を持つ。
4. Alias が tenant/version/namespace/sourceId で一意。
5. FinanceEvent link が DB composite relation で tenant 境界を守る。
6. PurchaseOrder の dual expected event が一つの obligation に収束する。
7. Candidate と正式 Invoice が同じ obligation に収束する。
8. direct Invoice は `inv` alias を持つ。
9. 同額同期限の別 Invoice / 別 PO は別 obligation。
10. partial / full / VOID / reversal / reopen が同じ obligation 上で正しく遷移する。
11. payment reversal 後の予定が再 OPEN される。
12. unknown `cashflow_expected` は `evt` として安全に扱える。
13. unknown `payment_expected` は推測で統合されない。
14. concurrent retry で duplicate obligation / alias が発生しない。
15. dry-run backfill は DB 変更 0。
16. execute backfill は中断後に再開可能。
17. backfill 2 回目の追加件数が 0。
18. legacy FinanceEvent の既存挙動を維持する。
19. FIN-03 reader files の変更が 0。
20. ALLOWED_PATHS 外変更が 0。
21. `git diff --check` が成功する。
22. exact-head CI の stage1 / stage2_integration / stage3_e2e / release_gate がすべて success。
23. Draft 維持、auto-merge 未設定、main 未 merge。
24. Production migration / backfill / deploy が未実施。

## 14. Negative Acceptance Criteria

1. tenant を跨ぐ obligation / alias / FinanceEvent relation を作らない。
2. tenantId / sourceId 空で canonical write を成功扱いしない。
3. 金額・期日・表示名だけで二つの source を統合しない。
4. delimiter injection / Unicode lookalike で alias collision を起こさない。
5. direction / currency conflict を上書きで隠さない。
6. unknown `payment_expected` を推測で既存 obligation に結び付けない。
7. Candidate→Invoice で別 obligation を増やさない。
8. full payment reversal 後も `settled` のまま残さない。
9. retry / concurrent insert で重複しない。
10. partial migration / interrupted backfill を成功表示しない。
11. backfill 中の新規 producer write を取りこぼさない。
12. legacy FinanceEvent を削除しない。
13. destructive migration / down migration を作らない。
14. test skip / only / fixme を追加しない。
15. 0 件実行を PASS 扱いしない。
16. Draft 解除 / merge / Production / Human Approval Event 自己宣言を行わない。

## 15. Test Plan

| Level | Case | Command / Evidence | Required |
|---|---|---|---|
| Generate | Prisma client | `pnpm db:generate` | YES |
| Unit | FIN-01 non-regression | `pnpm vitest run packages/shared/src/__tests__/cashflow_obligation.test.ts` | YES |
| Unit | Full unit | `pnpm test` | YES |
| Typecheck | Workspace | `pnpm typecheck` | YES |
| Integration | schema / producer / backfill | `pnpm --filter @hokko/db test:integration` | HUMAN_GATE / CI |
| Backfill dry-run | fixture DB、write 0 | `pnpm --filter @hokko/db exec tsx src/fin02-canonical-obligation-backfill.ts --dry-run` | HUMAN_GATE / CI |
| E2E | producer convergence | `pnpm --filter @hokko/web exec playwright test tests/e2e/fin02_canonical_obligation_producer_evidence.spec.ts --retries=0` | YES |
| CI | exact fixed head | stage1 / stage2_integration / stage3_e2e / release_gate | YES |

禁止:

- `pnpm db:reset`
- `pnpm db:seed`
- `pnpm db:migrate`
- `pnpm db:migrate:deploy`
- `prisma migrate deploy`
- Production DB 接続
- test skip / only / fixme
- 期待値を根拠なく実装に合わせる

ローカル DB・migration・backfill実行は、この Packet の一般的な `run_local_checks` だけでは許可されない。人間が対象環境・コマンド・データ影響を別途明示承認した場合だけ行う。

## 16. Evidence Required

- complete base SHA / fixed head SHA。
- Packet SHA-256（外部・本文非埋込）。
- changed files と ALLOWED_PATHS 照合。
- schema diff / migration SQL。
- producer inventory と各 producer の obligation link。
- dry-run backfill の分類別件数。
- conflict 件数と推測修復 0 の証拠。
- execute 1 回目の作成・link件数。
- execute 2 回目の増分 0。
- tenant isolation。
- concurrent retry。
- partial / full / VOID / reversal / reopen。
- migration rollback / forward-fix 手順。
- Test Plan の command / exit status。
- exact-head CI run ID / 全 job。
- Draft / auto-merge / main / Production 状態。
- C / D / E の same-head verdict。
- 元の user-owned dirty checkout 不変。

Evidence へ raw personal data、Secrets、完全な Production row、元 dirty diff の内容を保存しない。

## 17. Rollback

- Code rollback: merge 前は Draft PR close。merge 後は人間承認した revert。
- Data rollback: additive schema と backfilled row は削除せず、dual-writeを停止して forward-fix。
- Feature flag: none。FIN-03 reader switch 前なので legacy reader を維持。
- Unsafe partial state prevention: same-transaction dual-write、unique constraint、advisory/row lock、idempotent checkpoint。
- destructive down migration は作らない。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES`
- Vault files allowed: `NONE`（実装中）
- `CURRENT_STATE` update: `POST_MERGE_ONLY`
- `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`
- Function Evidence update: `POST_MERGE_ONLY`
- Temporary branch / PR state must not be written to vault。
- post-merge sync は別 Governance Task / Draft PR とし、製品実装 commit に混ぜない。

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

- Codex B/C/D/E/H は独立監査者であり、Human Approval Event を代行しない。
- Claude Code 復帰前に Codex は read-only preflight、schema review、test matrix review を進めてよい。
- 製品コードの write は、fixed head に対する有効な Human Approval Event 後の Claude Code lane に限定する。

## 20. Stop Conditions

- `origin/main` / Packet base / PR base mismatch。
- Packet / prompt / manifest hash mismatch。
- **Stage 1 — 承認前 / session 開始時の head binding**: live PR head が Human Approval Event の `fixed_head_sha` と exact に一致しない場合は停止する。一致した場合、その値が `approved_starting_head_sha` になる。
- **Stage 2 — 承認後の authorized descendant / final audit**: candidate head が `approved_starting_head` の strict linear（first-parent）descendant でない場合、または branch / PR / owner session / commit-budget / path-scope / forbidden-operation の検証に失敗した場合は停止する。この stage では final candidate head が Event の `fixed_head_sha` と一致することを**要求しない**（一致を要求すると承認済み descendant commit がすべて無効化されるため、この post-write 一致条件は課さない）。
- ALLOWED_PATHS 外の変更が必要。
- semantic resource collision。
- user-owned dirty checkout と衝突。
- tenant composite relation が成立しない。
- alias uniqueness が安全に定義できない。
- Candidate→Invoice 収束に推測が必要。
- backfill が idempotent / resumable にできない。
- unknown `payment_expected` を推測しないと進められない。
- destructive migration / data deletion が必要。
- Production / Secret / 外部作用が必要。
- rollback / forward-fix が成立しない。
- evidence または exact-head CI を取得できない。
- 同一原因の rework が 2 回失敗。

## Revision History

- **Revision 1（PROPOSED）** — FIN-02 単一実装契約の初回登録。schema・producer dual-write・lifecycle 同期・再実行可能 backfill を定義。Revision 1 起点の実装が remote head `9673cbfead2f9ba20b2df49c34f459ed47406732` に存在するが、独立監査で下記 findings が確定した: `D-FIN002-001`（tenant 不一致で update 0 件でも obligation/alias 生成・`linked=true`）、`D-FIN002-002` / `H-FIN002-002`（alias collision 無視・link・必須 conflict/version 分類欠落）、`D-FIN002-003` / `H-FIN002-003`（真の並列 retry test 不在）、`D-FIN002-004` / `H-FIN002-002`（backfill の direction/currency/lifecycle/duplicate alias candidate/version mismatch の件数と fail-closed 欠落）、`D-FIN002-005`（migration SQL の EOF 空行・Evidence が `git diff --check` 成功と誤記）、`H-FIN002-001`（承認起点 head と authorized descendant 実装 commit の binding 未定義）、`H-FIN002-004`（停止済み未 push の local-only 並列 Claude commit `2322d3ab7242063589990d9e19dc87332ca6331e`。remote 完全性への影響なし）。
- **Revision 2（PROPOSED・本 revision）** — Revision 1 を **supersede** する。理由: (1) Revision 1 起点実装は上記 High 5 件・Medium 2 件を未解決に含み merge-ready ではない、(2) Revision 1 は承認起点 head と authorized descendant 実装 commit の binding（`H-FIN002-001`）を定義していなかった。Revision 2 は §0.R2 で、当該 head を歴史的入力に格下げし、remediation matrix・Human Approval Event と descendant 実行契約・writer lease・required product fixes を固定した一回限りの最終 remediation 実行契約を追加する。§7 の 14 実装 ALLOWED_PATHS・§10 の canonical 9-key Authorization は Revision 1 と同一に維持する。scope 変更に伴い新しい外部 SHA-256 と新しい Human Approval Event を要求する。Revision 1 の承認・PASS・exact-head CI 結果は本 revision には引き継がれない。
  - **Revision 2 pre-approval correction（本文外 Human Approval Event 投稿前の訂正・revision 据え置き）** — Revision 2 の Human Approval Event 投稿前に、承認 binding の曖昧さを除去する目的で本 Packet 本文のみを訂正した。訂正内容: (a) §0 Registration State と §5 UNKNOWN の stale な `本 revision 1` / `本 Packet rev1` 文言を Revision 2 語彙へ更新、(b) §0.R2.0 に Revision 間の precedence 規則を明示（§0.R2 が矛盾する Revision 1 継承文言を override し、二重解釈を残さない）、(c) §20 Stop Conditions を stage 1（承認前 head exact 一致 → `approved_starting_head_sha`）と stage 2（承認後の strict linear descendant + branch/PR/session/commit-budget/path-scope/forbidden-operation 監査、final head と Event fixed head の一致は非要求）の二段構成へ訂正し、authorized descendant commit を無効化していた無条件 head mismatch 規則を除去、(d) §0.R2.4 writer lease のプレースホルダ値（`RUNTIME_*` / `EQUALS_approved_starting_head_sha`）を型 / source / validation の field contract に置換し、lease が persistent lock ではなく evidence である旨と re-fetch / fail-closed / 他 writer 確認を強化。Revision 番号は **2 のまま据え置き**、status は `PROPOSED` を維持、`packet_sha256: EXTERNAL` を維持し、新 Revision 3 は作らない。base / branch / target PR / §7 の 14 ALLOWED_PATHS / §10 canonical 9-key Authorization / finding matrix / commit budget / safety prohibitions は不変。本訂正後に新しい外部 SHA-256 を再計算し、その head に対して新しい Human Approval Event を取り直す。

## 承認状態（本文外イベントで確定）

本 Packet は `PROPOSED`。Packet 自身の SHA-256 は本文へ書き込まない。`target_pr` と fixed head を確定後、Codex B/C/D/E/H が同一 head を read-only 監査し、人間（`DREEXY-git`）が Phase 5 rev6 Human Approval Event 方式で承認コメントを一度だけ投稿するまで、schema・migration・製品コードの実装へ進まない。

承認者は人間のみ。Codex / Claude Code は `PHASE5_TASK_PACKET_APPROVED` を自己宣言しない。
