---
schema: 369-phase5-task-packet-v1
packet_id: P5-FIN-001
revision: 1
status: PROPOSED
phase: 5
workstream: WS-FIN
risk_tier: RT3
repository: DREEXY-git/369
base_sha: 3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd
branch: claude/p5-fin-001-canonical-identity-v1
target_pr: PENDING
created_at: 2026-07-24
created_by: DREEXY-git
human_approver_github_login: DREEXY-git
task_id: F-R7-02
checkpoint: 2 / Financial Truth
packet_sha256: EXTERNAL
---

# P5-FIN-001 — Canonical Obligation Identity（予定入出金の正本 identity 契約）

## 0. Revision History

- revision 1: Task Packet bootstrap（本ファイルの登録のみ）。製品コード・DB・schema は変更しない。FIN-01（純ロジック＋単体テスト）の契約を定義し、Codex 独立監査（B/C/D/E/H）へ引き渡す。`target_pr` は本 branch の Draft PR 作成後に確定し、完了報告で PR 番号を固定する。

## 1. Objective

FinanceEvent の予定入出金（`cashflow_expected` / `payment_expected`）について、**tenant 境界を含む versioned canonical obligation identity 契約**を定義する。金額・期日・表示名の一致による推測ではなく、PO・Invoice・Candidate・Event の**正本 ID**によって、同一の債務・債権を一意に識別できる純ロジック設計とする。本 revision は Task Packet の登録だけを行い、製品コードは変更しない。

## 2. User Value

資金ショート予兆・入出金予定の集計が、「金額と期日が近いから同じ」という危うい推測ではなく、**正本 ID に基づく確定的な同一性**で動くようになる土台を、非エンジニアの承認者が契約（Packet）とテスト条件で確認できる。cross-tenant の取り違え（別会社の債務を混同）を identity レベルで構造的にゼロにし、二重計上・取りこぼしを推測なしで是正する道筋（FIN-01→FIN-02→FIN-03）を安全に固定する。人間の安全な統制（お金の真実＝Financial Truth）に効く。

## 3. IDs

- Phase: `5`
- Workstream: `WS-FIN`
- Task ID: `F-R7-02`
- Packet ID: `P5-FIN-001`
- Checkpoint: `2 / Financial Truth`
- Related design audit: Codex `reaudit-B-cashflow-f-r7-02-design`（A' 案 thin slice）／ slice1 実害監査 `be37a55`（B-S1-01/02/03・main `93d4e5f`＝PR #126 で反映済み）。

## 4. Source of Truth

現行の canonical selector（slice1 + B-S1 修正が main へ統合済み）を FIN-01 の出発点＝正本とする。FIN-01 はこの reader-side 実装の中の **identity 導出だけ**を、versioned・tenant 込みの純関数として明文化・強化する（producer/schema は触らない）。

- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`（= origin/main。PR #129 Entry Gate merge → PR #130 post-merge activation を含む）
- 現行実装ファイル: `packages/shared/src/cashflow-obligation.ts`（`selectCanonicalCashflowObligations` / obligation key `po:` `inv:` `cand:` `evt:`）
- 現行単体テスト: `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- 公開 export: `packages/shared/src/index.ts`（`export * from './cashflow-obligation'` 既存）
- 現状の gap（本 Packet が埋める対象）: 現行 obligation key は **tenant を key に含めず**「呼び出し側が tenant スコープ済み」を前提とし、**version 付与も無い**。FIN-01 は identity に tenant を必須構成要素として組み込み、versioned identity として明文化する。

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- 現行 `cashflow-obligation.ts` は obligation key を `po:<id>` / `inv:<id>` / `cand:<id>` / `evt:<id>` で導出し、direction 競合・lifecycle 欠落・未知 source を `coverageIncomplete=true` で fail-safe に扱う（金額を推測で埋めない）。
- candidate→invoice lineage は `cand.invoiceId` があれば `inv:<invoiceId>` へ解決し、同一債権として 1 行に束ねる。
- 本作業は隔離 worktree（branch `claude/p5-fin-001-canonical-identity-v1`）で実施し、既存の別 checkout（`claude/p5-entry-gate-v1`）と元の作業ツリーは一切変更・stash・reset・clean しない。

### UNKNOWN

- 本 Packet 本文（rev1）の最終 SHA-256（外部証拠として計算・報告し、人間と Codex が確認するまで自己承認しない）。
- FIN-01 実装で identity string の正確な encoding（version prefix・tenant・namespace・delimiter escaping の最終形）は、本 Packet の契約（§12）を満たす範囲で実装時に確定する。

## 6. Scope

### IN_SCOPE（本 Packet が定義する FIN-01 の範囲）

- **FIN-01 = 純ロジック＋単体テストのみ**。`cashflow-obligation.ts` の identity 導出を、versioned・tenant 込みの canonical obligation identity 関数として明文化・強化し、単体テストで契約を固定する。
- 本 revision 1 の実施内容: 上記 FIN-01 の契約（本 Task Packet 1 ファイル）の登録・通常 commit・push・Draft PR 作成のみ。

### NON_SCOPE

- **DB・schema・migration・backfill・producer dual-write・reader 統一は NON_SCOPE**（FIN-02 / FIN-03 で別 Packet・別人間承認）。
- 製品コード（`apps/**` / `packages/**` の実コード / `infra/**`）の変更（本 revision では 0）。
- `apps/web/**` の変更。
- `.github/**` / `config/padn/**` / `pnpm-lock.yaml` の変更。
- Production / Secrets / 外部送信 / 実 LLM / 課金。
- Draft 解除 / main merge / auto-merge。
- `PHASE5_TASK_PACKET_APPROVED` の自己宣言。

## 7. ALLOWED_PATHS

### 本 revision（Task Packet 登録）の ALLOWED_PATH

- `docs/coordination/phase5/P5-FIN-001-canonical-obligation-identity.md`

### FIN-01 実装時の ALLOWED_PATHS 候補（本 revision では書かない・人間承認後）

- `packages/shared/src/cashflow-obligation.ts`
- `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- `packages/shared/src/index.ts`（公開 export が必要な場合のみ）

## 8. FORBIDDEN_PATHS

- `.env*`
- `.github/**`
- `config/padn/**`
- `apps/**`
- `infra/**`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `pnpm-lock.yaml`
- `package.json`
- `tasks/**`
- `369-vault/index.md`
- `AGENTS.md`

## 9. Semantic Resource Lock

```yaml
resources:
  - id: governance.phase5_fin_canonical_identity_packet
    level: WRITE
  - id: finance.cashflow_obligation_identity
    level: DESIGN_ONLY
```

## 10. Authorization

```yaml
authorization:
  repository: DREEXY-git/369
  branch: claude/p5-fin-001-canonical-identity-v1
  existing_branch_only: true
  read_only: true
  edit_local: true
  run_local_checks: true
  commit: true
  push: true
  open_draft_pr: true
```

本 revision（Task Packet 登録）で人間（DREEXY-git）が承認した canonical Authorization。`existing_branch_only: true` により push は本ブランチのみ。`open_draft_pr: true` は Draft PR の作成・維持であり、Draft 解除・merge・auto-merge は含まない。canonical key set（`repository` / `branch` / `existing_branch_only` / `read_only` / `edit_local` / `run_local_checks` / `commit` / `push` / `open_draft_pr`）を使用し、旧キー `normal_commit` / `normal_push_to_existing_branch` は使用しない。**FIN-01 実装（製品コード変更）の着手は、本 Packet の canonical identity 契約を Codex B/C/D/E/H が独立監査した後、人間の `PHASE5_TASK_PACKET_APPROVED`（rev6 Human Approval Event 方式）を待つ。** Human Approval Event の `authorization_scope` は本 `authorization` object の厳密複写とする。

## 11. Human Gates

```yaml
human_gates:
  final_packet_approval: REQUIRED
  main_merge: REQUIRED
  production: REQUIRED
  schema_migration: NOT_IN_SCOPE
  migration_execution: NOT_IN_SCOPE
  backfill_execution: NOT_IN_SCOPE
  producer_dual_write: NOT_IN_SCOPE
  reader_unification: NOT_IN_SCOPE
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

本 revision は docs-only（Task Packet 1 ファイル）。DB・schema・migration・backfill・producer・reader 統一・Production・Secrets・外部送信・実 LLM・課金はいずれも本 Packet 非対象で、必要になった場合はすべて人間 Gate（Claude Code は実行しない）。最終 Packet 承認も人間 Gate で、Codex 再監査後に人間だけが行う。

## 12. Required Design（canonical obligation identity 契約・FIN-01 が満たすべき不変条件）

FIN-01 の純ロジックは、次の contract をすべて満たす **versioned canonical obligation identity** を導出する。identity は「同一の債務・債権か」を決めるキーであり、集計・調停の基礎になる。

1. **純ロジック＋単体テストのみ**。DB・schema・migration・backfill・producer dual-write・reader 統一は含めない（FIN-02 / FIN-03 へ接続）。
2. **正本 ID ベース**。identity は PO・Invoice・Candidate・Event の正本 ID（`po:` / `inv:` / `cand:` / `evt:` 系）から導出し、金額・期日・表示名では導出しない。
3. **candidate→invoice lineage は同一 identity へ解決**。正式化済み candidate（`invoiceId` あり）は対応する Invoice 債務と同じ identity になる（`cand:` から `inv:<invoiceId>` へ収束）。未正式化 candidate は candidate 正本 ID を identity にする。
4. **同額・同期限でも別 Invoice / 別 PO は別 identity**。金額・dueAt が一致していても、正本 ID が異なれば identity は異なる。
5. **tenant 越境の禁止（必須構成要素）**。identity は tenant を必須構成要素として含み、**tenant が異なるデータは絶対に同じ identity にならない**。tenant 欠落は fail-closed（identity を発行しない・推測しない）。
6. **fail-closed 対象**: delimiter injection（ID 内の区切り文字混入で別債務を同一に見せる攻撃）、unknown source（未知 sourceType）、direction conflict（同一 identity に inflow/outflow 混在）、lifecycle conflict（Invoice の終端/欠落と予定の矛盾）は、いずれも推測で解決せず fail-closed（該当を identity 化しない・`coverageIncomplete` を立てる）。
7. **推測補完の禁止**。unknown・解決不能を金額推定・名寄せ等で補完せず、`coverageIncomplete=true` を維持して、呼び出し側が「資金ショートなし」を断定できないようにする（過大計上＝偽の余裕＝危険方向を作らない）。
8. **lifecycle 期待状態をテスト条件として明記**: `PAID` / `VOID`（予定から除外）、`partial payment`（残額のみ予定）、`reversal / reopen`（取消・再開後の期待 identity・期待予定状態）を、単体テストの期待値として固定する。
9. **identity の非構成要素**: `amount`・`dueAt`・表示名（description / 顧客名等）は identity の構成要素にしない（変わっても identity は不変、一致しても identity は同一化しない）。
10. **前方接続**: 本契約は、FIN-02（schema・producer canonical id 正本化）と FIN-03（reader 統一）へ、identity 定義を壊さず安全に接続できる versioned 契約とする（version prefix により将来の identity 形式変更を後方互換で扱える）。

### 守る安全境界（弱めない）

- AI は承認・外部送信・削除・課金を持たない。FIN-01 は純ロジックのみで DB・外部作用を持たない。
- 承認者は人間のみ。Codex A〜H（B・H を含む）は独立確認者であり `PHASE5_TASK_PACKET_APPROVED` を付与しない。
- fail-safe 既定（不確実なら `coverageIncomplete`）・fail-closed 既定（越境・injection・conflict は identity 化しない）。

## 13. Acceptance Criteria（FIN-01 実装の受入条件・本 revision では契約として固定）

1. identity が正本 ID から導出され、`amount` / `dueAt` / 表示名を構成要素にしない（§12-2 / §12-9）。
2. 正式化済み candidate と対応 Invoice が同一 identity へ解決する（§12-3）。未正式化 candidate は candidate 正本 ID で識別される。
3. 同額・同期限でも別 Invoice / 別 PO は別 identity になる（§12-4）。
4. tenant が異なるデータは同一 identity に**ならない**。tenant 欠落は identity を発行せず fail-closed（§12-5）。
5. delimiter injection・unknown source・direction conflict・lifecycle conflict が fail-closed で扱われ、該当は identity 化されず `coverageIncomplete` を立てる（§12-6）。
6. unknown・解決不能を推測補完せず `coverageIncomplete=true` を維持する（§12-7）。
7. `PAID` / `VOID` / partial payment / reversal / reopen の期待状態が単体テストの期待値として明記される（§12-8）。
8. identity は versioned で、FIN-02 / FIN-03 へ後方互換で接続できる（§12-10）。
9. 変更は ALLOWED_PATHS（FIN-01 候補）内のみ・DB / schema / migration / producer / reader 統一 = 0。
10. 単体テストは純ロジックのみ（DB 非依存）で、否定系（越境・injection・conflict・unknown）を含む。
11. 本 Packet の status が `PROPOSED` で、`PHASE5_TASK_PACKET_APPROVED` を自己宣言していない。
12. 本 Packet 本文（rev1）の SHA-256 が外部証拠として算出・報告される（本文には書き込まない）。

## 14. Negative Acceptance Criteria

1. 金額・期日・表示名の一致だけで別債務を同一 identity にしてはならない。
2. tenant を跨いで同一 identity を発行してはならない。
3. unknown・conflict・injection・lifecycle 矛盾を推測で解決して identity 化してはならない（fail-closed を弱めない）。
4. 本 revision で製品コード・DB・schema・migration・producer・reader 統一を変更してはならない。
5. 元の別 checkout（`claude/p5-entry-gate-v1`）・元の作業ツリーを変更・stash・reset・clean してはならない。
6. Draft 解除・main merge・auto-merge・`PHASE5_TASK_PACKET_APPROVED` の自己宣言をしてはならない。
7. `amount` / `dueAt` / 表示名を identity 構成要素にしてはならない。

## 15. Test Plan（FIN-01 実装時・本 revision では契約）

| Level | Case | Evidence | Required |
|---|---|---|---|
| Unit | 正本 ID で identity 導出（amount/dueAt/名は不使用） | `pnpm test`（cashflow_obligation） | YES |
| Unit | candidate→invoice が同一 identity | 期待 identity 一致 assert | YES |
| Unit | 同額・同期限・別 Invoice/PO が別 identity | 期待 identity 相違 assert | YES |
| Unit (negative) | 別 tenant は同一 identity にならない／tenant 欠落 fail-closed | 期待 identity 相違・非発行 assert | YES |
| Unit (negative) | delimiter injection / unknown source / direction conflict / lifecycle conflict = fail-closed・coverageIncomplete | 期待 conflict/incomplete assert | YES |
| Unit | PAID / VOID / partial / reversal / reopen 期待状態 | 期待予定状態 assert | YES |

禁止: test skip / only / fixme、安全条件を弱める、期待値を根拠なく実装へ合わせる、0 件実行を PASS 扱いする。

## 16. Evidence Required（本 revision）

- changed files（`git diff --name-only origin/main...HEAD`）= 本 Task Packet 1 ファイルのみ。
- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- head SHA（Draft PR の head）: 完了報告で固定。
- PR 番号（新規 Draft PR）: 完了報告で固定。
- Packet 本文 SHA-256（rev1・外部証拠。本文には `packet_sha256: EXTERNAL`）: 完了報告で固定。
- `git diff --check` = exit 0、placeholder（未置換 `<...>`）= 0。
- 製品コード / DB / schema / migration / producer / reader 統一 / workflow / PADN 変更 = 0。
- Draft 維持・auto-merge 未設定・main 未 merge。

## 17. Rollback

- 本 branch は新規・未 merge。Task Packet 1 ファイルのみで製品コード・DB・main へ影響ゼロ。Draft PR を close、または不要なら branch 削除（人間判断）で完全に取り消せる。
- Data rollback: none。Feature flag: none。docs-only のため部分適用の不整合なし。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES`（Financial Truth の canonical obligation identity 契約を Git 正本として登録）。
- Vault 反映: `POST_MERGE_ONLY`（本 revision では vault を変更しない）。
- `CURRENT_STATE` / `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`。
- Temporary branch / PR state は vault に固定しない。

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

C（security/correctness）・D（test/evidence）・E（integration）は FIN-01 実装 Task Packet で REQUIRED。B/H は独立確認者として本 Packet（識別契約）を read-only 監査し、承認者は人間のみ。

## 20. Stop Conditions

- base SHA mismatch（`origin/main` ≠ `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`）。
- ALLOWED_PATHS 外（Task Packet 1 ファイル以外）への write が必要。
- 元の別 checkout / 作業ツリーの変更が必要になった場合。
- DB / schema / migration / Production / Secret 等の未承認 Gate。
- Draft 解除 / main merge / auto-merge / 製品コード変更が必要になった場合。
- 最終 Packet 承認前に FIN-01 実装（製品コード変更）へ進む要求。

## 承認状態（本文外イベントで確定）

本 Packet 本文には自身の SHA-256 を書き込まない（循環参照回避・`packet_sha256: EXTERNAL`）。Packet 本文（rev1）確定後にファイル全体の SHA-256 を計算し、外部証拠として報告する。`PHASE5_TASK_PACKET_APPROVED` マーカーは、Codex B/C/D/E/H が独立に read-only 監査し、人間（DREEXY-git）が rev6 Human Approval Event 方式（7 top-level payload ＋ 本文外 API envelope・`fixed_head_sha` は対象 PR の live `head.sha` へ照合・`authorization_scope` は §10 の厳密複写）で付与するまで、付与しない。承認者は人間のみ。現時点の status は `PROPOSED`。
