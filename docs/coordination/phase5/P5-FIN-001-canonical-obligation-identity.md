---
schema: 369-phase5-task-packet-v1
packet_id: P5-FIN-001
revision: 2
status: PROPOSED
phase: 5
workstream: WS-FIN
risk_tier: RT3
repository: DREEXY-git/369
base_sha: 3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd
branch: claude/p5-fin-001-canonical-identity-v1
target_pr: 131
created_at: 2026-07-24
created_by: DREEXY-git
human_approver_github_login: DREEXY-git
task_id: F-R7-02
checkpoint: 2 / Financial Truth
packet_sha256: EXTERNAL
---

# P5-FIN-001 — Canonical Obligation Identity（予定入出金の正本 identity 契約 + FIN-01 実装）

## 0. Revision History

- revision 1: Task Packet bootstrap（Packet 1 ファイルの登録のみ）。Draft PR #131 作成。
- revision 2: bootstrap 契約を、人間承認後に FIN-01 を実装できる**完全な実装 Task Packet へ一本化**する修正。`target_pr` を #131 に確定し、Authorization を FIN-01 実装用（`read_only: false`）に、Semantic Resource Lock を `EXCLUSIVE` に、Source of Truth へ Program Charter / Claude / Codex Prompt を完全記載し、encoding・tenantId 必須・reversal/reopen identity 不変・実行可能 Test Plan・機械判定可能 Acceptance/Negative を明記。**本 revision も Packet 修正のみで製品コードは変更しない**（実装着手は人間の `PHASE5_TASK_PACKET_APPROVED` 後）。

## 1. Objective

FinanceEvent の予定入出金（`cashflow_expected` / `payment_expected`）について、**tenant 境界を含む versioned canonical obligation identity 契約**を定義し、それを満たす純ロジック（FIN-01）を実装する。金額・期日・表示名の一致による推測ではなく、PO・Invoice・Candidate・Event の**正本 ID**によって、同一の債務・債権を一意に識別する。identity は集計・調停の基礎になり、cross-tenant の取り違えを構造的にゼロにし、二重計上・取りこぼしを推測なしで是正する土台（FIN-01 → FIN-02 → FIN-03）を安全に固定する。本 revision（rev2）は Packet を FIN-01 実装 Task Packet へ一本化する修正であり、製品コードはまだ変更しない（実装着手は人間承認後）。

## 2. User Value

資金ショート予兆・入出金予定の集計が、「金額と期日が近いから同じ」という危うい推測ではなく、**正本 ID に基づく確定的な同一性**で動くようになる。非エンジニアの承認者が、契約（Packet）と機械判定可能なテスト条件で「別会社の債務を混同しない」「同じ債務を二重に数えない」「不確実なら安全側に倒す」ことを確認できる。人間の安全な統制（お金の真実＝Financial Truth）に効く。

## 3. IDs

- Phase: `5`
- Workstream: `WS-FIN`
- Task ID: `F-R7-02`
- Packet ID: `P5-FIN-001`
- Checkpoint: `2 / Financial Truth`
- Related design audit: Codex `reaudit-B-cashflow-f-r7-02-design`（A' 案 thin slice）／ slice1 実害監査 `be37a55`（B-S1-01/02/03・main `93d4e5f`＝PR #126 で反映済み）。

## 4. Source of Truth

現行の canonical selector（slice1 + B-S1 修正が main へ統合済み）を FIN-01 の出発点＝正本とする。FIN-01 はこの reader-side 実装の中の **identity 導出**を、versioned・tenant 込みの決定論的 encoding として実装・強化する（producer/schema は触らない）。

- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`（= origin/main。PR #129 Entry Gate merge → PR #130 post-merge activation を含む）
- 現行実装ファイル: `packages/shared/src/cashflow-obligation.ts`（`selectCanonicalCashflowObligations` / obligation key `po:` `inv:` `cand:` `evt:`）
- 現行単体テスト: `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- 現行 reader 配線: `apps/web/lib/domains/finance/cashflow.ts`（`selectCanonicalCashflowObligations` の呼び出し側）
- 公開 export: `packages/shared/src/index.ts`（`export * from './cashflow-obligation'` 既存・原則変更しない）
- 現状の gap（本 Packet が埋める対象）: 現行 obligation key は **tenant を key に含めず**「呼び出し側が tenant スコープ済み」を前提とし、**version 付与も無い**。FIN-01 は identity に `tenantId` を必須構成要素として組み込み、versioned identity として決定論的 encoding で明文化する。

### Prompt System 正本（commit `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd` 時点の各ファイル内容）

- Program Charter
  - path: `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md`
  - commit: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`
  - SHA-256: `0d96adf98ebe737b1dfd50907191baebdca084d7db9fbfaa96d54c7cdce6b9fe`
- Claude Prompt
  - path: `369-vault/プロンプト/Phase5/02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1.md`
  - commit: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`
  - SHA-256: `67cc351ddbdb832b5649b651427e7aa423224310288a9b9a956a49c71962cd01`
- Codex Prompt
  - path: `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md`
  - commit: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`
  - SHA-256: `bb70be8b52d11a5ebaced83e1bcab7dfda94cdcbbc74de1dbdb4321513707bfb`

（上記3件の SHA-256 は本 rev2 作業時に commit `3b01f15` の実ファイルで再計算し一致を確認した。）

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- 現行 `cashflow-obligation.ts` は obligation key を `po:<id>` / `inv:<id>` / `cand:<id>` / `evt:<id>` で導出し、direction 競合・lifecycle 欠落・未知 source を `coverageIncomplete=true` で fail-safe に扱う（金額を推測で埋めない）。
- candidate→invoice lineage は `cand.invoiceId` があれば `inv:<invoiceId>` へ解決し、同一債権として 1 行に束ねる。
- 現行 `SelectCanonicalCashflowInput` は `tenantId` を持たず、呼び出し側（`apps/web/lib/domains/finance/cashflow.ts`）が tenant スコープ済みの入力を渡す前提。FIN-01 は `tenantId` を必須入力に昇格させ、identity の必須構成要素にする。
- 本 rev2 の作業は既存 branch `claude/p5-fin-001-canonical-identity-v1` 上で通常 commit・push で実施する（新規 branch・force push・amend・rebase・reset をしない）。作業開始/完了時の作業ツリー dirty 状態は before/after で不変（uncommitted 差分・stash 空）。

### UNKNOWN

- 本 Packet 本文（rev2）の最終 SHA-256（外部証拠として計算・報告し、人間と Codex が確認するまで自己承認しない）。
- FIN-01 実装で identity encoding の最終的な escape/正規化の細部（§12 の決定論的方式・raw delimiter 連結禁止・非構成要素の除外を満たす範囲）は実装時に確定する。

## 6. Scope

### IN_SCOPE（FIN-01 実装）

- **FIN-01 = 純ロジック＋単体テストのみ**。`packages/shared/src/cashflow-obligation.ts` の canonical obligation identity を、versioned・tenant 込みの**決定論的 encoding**として実装・強化し、単体テスト（`cashflow_obligation.test.ts`）で契約（§12/§13/§14）を固定する。
- `SelectCanonicalCashflowInput` へ `tenantId` を必須追加し、`apps/web/lib/domains/finance/cashflow.ts` の既存呼び出しから `tenantId` を明示的に渡す配線を行う。
- 本 revision（rev2）の実施内容: Packet を FIN-01 実装 Task Packet へ一本化する修正（本 Task Packet 1 ファイル）の通常 commit・push のみ。**実装着手は人間の `PHASE5_TASK_PACKET_APPROVED` 後**。

### NON_SCOPE

- **DB・schema・migration・backfill・producer dual-write・reader 統一は NON_SCOPE**（FIN-02 で schema・producer 正本化、FIN-03 で reader 統一。別 Packet・別人間承認）。
- reversal/reopen による**再予定 Event の生成（producer 側）**は FIN-02 として NON_SCOPE。FIN-01 は identity が lifecycle 変化で不変であることの検証まで。
- `apps/web/**` の変更（**`apps/web/lib/domains/finance/cashflow.ts` を除く**。それ以外の `apps/**` は引き続き禁止）。
- `packages/**` のうち §7 ALLOWED_PATHS 以外・`infra/**`。
- `packages/shared/src/index.ts` の変更（既に cashflow-obligation を export 済みのため原則変更しない）。
- `.github/**` / `config/padn/**` / `pnpm-lock.yaml` / `package.json` の変更。
- Production / Secrets / 外部送信 / 実 LLM / 課金。
- Draft 解除 / main merge / auto-merge。
- `PHASE5_TASK_PACKET_APPROVED` の自己宣言。

## 7. ALLOWED_PATHS

### 本 revision（rev2 Packet 修正）の ALLOWED_PATH

- `docs/coordination/phase5/P5-FIN-001-canonical-obligation-identity.md`

### FIN-01 実装時の ALLOWED_PATHS（人間承認後・正式な許可範囲）

- `packages/shared/src/cashflow-obligation.ts`
- `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- `apps/web/lib/domains/finance/cashflow.ts`
- （`packages/shared/src/index.ts` は既に cashflow-obligation を export 済みのため**原則変更しない**。公開 export の追加が必要な場合のみ、この 1 ファイルに限り許容。）

## 8. FORBIDDEN_PATHS

- `.env*`
- `.github/**`
- `config/padn/**`
- `apps/**`（**`apps/web/lib/domains/finance/cashflow.ts` を除く**すべて）
- `infra/**`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `packages/**`（§7 の FIN-01 ALLOWED_PATHS を除く）
- `pnpm-lock.yaml`
- `package.json`
- `tasks/**`
- `369-vault/index.md`
- `AGENTS.md`

## 9. Semantic Resource Lock

```yaml
resources:
  - id: finance.cashflow_obligation_identity
    level: EXCLUSIVE
```

## 10. Authorization

```yaml
authorization:
  repository: DREEXY-git/369
  branch: claude/p5-fin-001-canonical-identity-v1
  existing_branch_only: true
  read_only: false
  edit_local: true
  run_local_checks: true
  commit: true
  push: true
  open_draft_pr: false
```

FIN-01 実装用の canonical Authorization。`existing_branch_only: true` により push は本ブランチのみ。`open_draft_pr: false`（Draft PR #131 は作成済みで、実装は既存ブランチへ push するのみ・Draft 解除/merge/auto-merge は含まない）。canonical key set（`repository` / `branch` / `existing_branch_only` / `read_only` / `edit_local` / `run_local_checks` / `commit` / `push` / `open_draft_pr`）を使用し、旧キー `normal_commit` / `normal_push_to_existing_branch` は使用しない。**FIN-01 実装（製品コード変更）の着手は、本 Packet を Codex B/C/D/E/H が独立監査した後、人間の `PHASE5_TASK_PACKET_APPROVED`（rev6 Human Approval Event 方式）を待つ。** Human Approval Event の `authorization_scope` は本 `authorization` object の厳密複写とする。

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

FIN-01 は純ロジック＋既存 reader への tenantId 配線のみ（DB・schema・外部作用なし）。DB・schema・migration・backfill・producer・reader 統一・Production・Secrets・外部送信・実 LLM・課金はいずれも本 Packet 非対象で、必要になった場合はすべて人間 Gate（Claude Code は実行しない）。最終 Packet 承認も人間 Gate で、Codex 再監査後に人間だけが行う。

## 12. Required Design（canonical obligation identity 契約・FIN-01 が満たすべき不変条件）

FIN-01 の純ロジックは、次の contract をすべて満たす **versioned canonical obligation identity** を導出する。

1. **純ロジック＋単体テストのみ**。DB・schema・migration・backfill・producer dual-write・reader 統一は含めない（FIN-02 / FIN-03 へ接続）。
2. **正本 ID ベース**。identity は PO・Invoice・Candidate・Event の正本 ID（`po:` / `inv:` / `cand:` / `evt:` 系）から導出し、金額・期日・表示名では導出しない。
3. **決定論的 encoding（曖昧にしない）**。identity は `tenantId`・namespace（source 種別）・`sourceId` を**衝突なく**表現する決定論的方式で encode する（例: version prefix 付きの `JSON.stringify` された versioned tuple `["v1", tenantId, namespace, sourceId]`）。**raw delimiter の単純連結は禁止**（区切り文字混入で別債務が同一化しないよう、構造化 encoding または escape で衝突を防ぐ）。`amount` / `dueAt` / `description` / lifecycle は identity へ含めない。version prefix により将来の identity 形式変更を後方互換で扱う。
4. **candidate→invoice lineage は同一 identity へ解決**。正式化済み candidate（`invoiceId` あり）は対応する Invoice 債務と同じ identity になる（`cand:` から `inv:<invoiceId>` へ収束）。未正式化 candidate は candidate 正本 ID を identity にする。
5. **同額・同期限でも別 Invoice / 別 PO は別 identity**。金額・dueAt が一致していても、正本 ID が異なれば identity は異なる。
6. **tenant 越境の禁止（必須構成要素・必須入力）**。identity は `tenantId` を必須構成要素として含み、**tenant が異なるデータは絶対に同じ identity にならない**。`SelectCanonicalCashflowInput` に `tenantId` を**必須追加**し、`apps/web/lib/domains/finance/cashflow.ts` の既存呼び出しから `tenantId` を明示的に渡す。tenant 欠落（空文字・null・未指定）は fail-closed（identity を発行しない・推測しない）。
7. **fail-closed 対象**: delimiter injection（ID 内の区切り文字混入で別債務を同一に見せる攻撃）、unknown source（未知 sourceType）、direction conflict（同一 identity に inflow/outflow 混在）、lifecycle conflict（Invoice の終端/欠落と予定の矛盾）は、いずれも推測で解決せず fail-closed（該当を identity 化しない・`coverageIncomplete` を立てる）。
8. **推測補完の禁止**。unknown・解決不能を金額推定・名寄せ等で補完せず、`coverageIncomplete=true` を維持して、呼び出し側が「資金ショートなし」を断定できないようにする（過大計上＝偽の余裕＝危険方向を作らない）。
9. **lifecycle 期待状態をテスト条件として明記**: `PAID` / `VOID`（予定から除外）、`partial payment`（残額のみ予定）、`reversal / reopen`。**identity 自体は lifecycle 変化で変わらないこと（reversal / reopen でも同一 identity のまま）を FIN-01 で検証する**。producer による**再予定 Event の生成は FIN-02 として NON_SCOPE**を維持する。
10. **identity の非構成要素**: `amount`・`dueAt`・表示名（`description` / 顧客名等）・lifecycle は identity の構成要素にしない（変わっても identity は不変、一致しても identity は同一化しない）。
11. **前方接続**: 本契約は、FIN-02（schema・producer canonical id 正本化）と FIN-03（reader 統一）へ、identity 定義を壊さず安全に接続できる versioned 契約とする（version prefix により後方互換）。

### 守る安全境界（弱めない）

- AI は承認・外部送信・削除・課金を持たない。FIN-01 は純ロジック＋既存 reader への tenantId 配線のみで、DB・外部作用を持たない。
- 承認者は人間のみ。Codex A〜H（B・H を含む）は独立確認者であり `PHASE5_TASK_PACKET_APPROVED` を付与しない。
- fail-safe 既定（不確実なら `coverageIncomplete`）・fail-closed 既定（越境・injection・conflict は identity 化しない）。

## 13. Acceptance Criteria（FIN-01 実装の受入条件・機械判定可能）

1. **encoding**: identity は正本 ID ＋決定論的 encoding（version prefix 付き versioned tuple・raw delimiter 連結なし）から導出され、`amount` / `dueAt` / `description` / lifecycle を構成要素にしない（§12-3 / §12-10）。
2. **candidate→invoice**: 正式化済み candidate と対応 Invoice が同一 identity（`cand:` → `inv:<invoiceId>` 収束）。未正式化 candidate は candidate 正本 ID で識別される。
3. **同額同期限別 ID**: 同額・同期限でも別 Invoice / 別 PO は別 identity になる。
4. **tenant 分離**: 別 tenant の同一 `sourceId` は別 identity になる。
5. **空 tenant**: `tenantId` が空文字 / null / 未指定なら identity を発行せず fail-closed。
6. **delimiter injection**: `sourceId` / `tenantId` へ区切り文字を混入しても、別債務が同一 identity に化けない（構造化 encoding / escape で無効化）。
7. **unknown source**: 未知 sourceType は identity 化されず `coverageIncomplete=true` を立てる。
8. **direction conflict**: 同一 identity に inflow / outflow 混在は fail-closed（conflict 記録・`coverageIncomplete`）。
9. **lifecycle**: `PAID` / `VOID` は予定から除外、`partial payment` は残額のみ、lifecycle conflict は fail-closed・`coverageIncomplete`。
10. **reversal / reopen identity 不変**: lifecycle 変化（取消・再開）で identity は不変（同一 identity のまま）。
11. **tenantId 必須入力**: `SelectCanonicalCashflowInput.tenantId` が必須で、`apps/web/lib/domains/finance/cashflow.ts` から明示的に渡される。
12. 変更は §7 FIN-01 ALLOWED_PATHS 内のみ・DB / schema / migration / producer dual-write / reader 統一 = 0。
13. 単体テストは純ロジック（DB 非依存）で、否定系（tenant 越境 / 空 tenant / delimiter injection / unknown source / direction conflict / lifecycle conflict）を含む。
14. **Test Plan（§15）の全コマンドが成功**し、**exact-head GitHub CI の stage1 / stage2_integration / stage3_e2e / release_gate がすべて success**。
15. 本 Packet の status が `PROPOSED` で、`PHASE5_TASK_PACKET_APPROVED` を自己宣言していない。
16. 本 Packet 本文（rev2）の SHA-256 が外部証拠として算出・報告される（本文には書き込まない）。

## 14. Negative Acceptance Criteria（機械判定可能・fail-closed を弱めない）

1. `amount` / `dueAt` / `description` / lifecycle を identity 構成要素にしてはならない。
2. 金額・期日・表示名の一致だけで別債務を同一 identity にしてはならない。
3. tenant を跨いで同一 identity を発行してはならない。
4. `tenantId` が空 / null / 未指定で identity を発行してはならない（fail-closed）。
5. raw delimiter の単純連結で identity を作ってはならない（delimiter injection で同一化してはならない）。
6. unknown source / direction conflict / lifecycle conflict を推測で解決して identity 化してはならない（`coverageIncomplete` を立てる）。
7. reversal / reopen で identity が変わってはならない（不変）。
8. 本 revision で製品コードを変更してはならない（rev2 は Packet 1 ファイルのみ）。FIN-01 実装は §7 ALLOWED_PATHS 外へ広げてはならない。
9. Draft 解除・main merge・auto-merge・`PHASE5_TASK_PACKET_APPROVED` の自己宣言をしてはならない。
10. test skip / only / fixme・0 件実行の PASS 扱い・期待値を根拠なく実装へ合わせることをしてはならない。

## 15. Test Plan（FIN-01 実装時・実行可能コマンド）

| Level | Command / Gate | Required |
|---|---|---|
| Unit | `pnpm vitest run packages/shared/src/__tests__/cashflow_obligation.test.ts` | YES |
| Typecheck | `pnpm --filter @hokko/shared typecheck` | YES |
| Full unit | `pnpm test` | YES |
| CI (exact head) | GitHub CI の `stage1` / `stage2_integration` / `stage3_e2e` / `release_gate` がすべて success | YES |

単体テストが最低限カバーするケース（§13 と対応）: 正本 ID encoding／candidate→invoice 同一 identity／同額同期限別 ID／tenant 分離／空 tenant fail-closed／delimiter injection／unknown source／direction conflict／PAID / VOID / partial payment／reversal / reopen identity 不変。

禁止: test skip / only / fixme、安全条件を弱める、期待値を根拠なく実装へ合わせる、0 件実行を PASS 扱いする。

## 16. Evidence Required（rev2）

- changed files（`git diff --name-only origin/main...HEAD`）= 本 rev2 では Task Packet 1 ファイルのみ。
- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- head SHA（rev2 commit・PR #131 head）: 完了報告で固定。
- PR: #131（Draft 維持）。
- Packet 本文 SHA-256（rev2・外部証拠。本文には `packet_sha256: EXTERNAL`）: 完了報告で固定。
- `git diff --check` = exit 0、placeholder（未置換 `<...>`）= 0。
- exact-head CI run ID と全 job 結果（stage1 / stage2_integration / stage3_e2e / release_gate）。
- 製品コード / DB / schema / migration / producer / reader 統一 / workflow / PADN 変更 = 0（rev2）。
- Draft 維持・auto-merge 未設定・main 未 merge・PR 本文更新なし。

## 17. Rollback

- 本 branch は未 merge。rev2 は Task Packet 1 ファイルのみで製品コード・DB・main へ影響ゼロ。Draft PR #131 を close、または不要なら branch 削除（人間判断）で完全に取り消せる。
- FIN-01 実装（承認後）は純ロジック＋既存 reader への tenantId 配線のみで、Draft PR を close すれば取り消せる（DB・main 非影響）。
- Data rollback: none。Feature flag: none。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES`（Financial Truth の canonical obligation identity 契約を Git 正本として登録）。
- Vault 反映 / `CURRENT_STATE` / `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`（本 revision では vault・tasks を変更しない）。
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

C（security/correctness）・D（test/evidence）・E（integration）は FIN-01 実装で REQUIRED。B/H は独立確認者として本 Packet（識別契約）を read-only 監査し、承認者は人間のみ。

## 20. Stop Conditions

- base SHA mismatch（`origin/main` ≠ `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`）。
- ALLOWED_PATHS 外（rev2 は Task Packet 1 ファイル以外）への write が必要。
- DB / schema / migration / Production / Secret 等の未承認 Gate。
- Draft 解除 / main merge / auto-merge / 新規 branch / 新規 PR / force push / amend / rebase / reset が必要になった場合。
- 最終 Packet 承認前に FIN-01 実装（製品コード変更）へ進む要求。

## 承認状態（本文外イベントで確定）

本 Packet 本文には自身の SHA-256 を書き込まない（循環参照回避・`packet_sha256: EXTERNAL`）。Packet 本文（rev2）確定後にファイル全体の SHA-256 を計算し、外部証拠として報告する。`PHASE5_TASK_PACKET_APPROVED` マーカーは、Codex B/C/D/E/H が独立に read-only 監査し、人間（DREEXY-git）が rev6 Human Approval Event 方式（7 top-level payload ＋ 本文外 API envelope・`fixed_head_sha` は対象 PR #131 の live `head.sha` へ照合・`authorization_scope` は §10 の厳密複写）で付与するまで、付与しない。承認者は人間のみ。現時点の status は `PROPOSED`。
