---
schema: 369-phase5-task-packet-v1
packet_id: P5-FIN-001
revision: 3
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

- revision 1: Task Packet bootstrap（Packet 1 ファイルの登録）。Draft PR #131 作成。
- revision 2: bootstrap 契約を FIN-01 実装 Task Packet へ一本化する修正（`target_pr` #131 確定、Authorization を FIN-01 実装用、Semantic Resource Lock を `EXCLUSIVE`、Source of Truth へ Prompt System 正本、encoding・tenantId 必須・実行可能 Test Plan を明記）。
- revision 3: **Final Contract Closure**。承認前の Packet 編集作業条件と承認後の FIN-01 実装条件の混在を除去し、**同一の immutable Packet を FIN-01 実装にそのまま使用できる単一契約**へ統一。canonical identity encoding を「例」ではなく確定値へ固定し、identity resolver の失敗契約と sourceType 解決規則（既存 `selectCanonicalCashflowObligations` の安全挙動と一致）を明記。**本 rev3 の変更は Packet 1 ファイルの docs 修正のみで、製品コードは変更しない**（この rev3 の作業範囲の記述はこの Revision History に限る）。

## 1. Objective

FinanceEvent の予定入出金（`cashflow_expected` / `payment_expected`）について、**tenant 境界を含む versioned canonical obligation identity** を確定し、それを満たす純ロジック（FIN-01）を実装する。金額・期日・表示名の一致による推測ではなく、PO・Invoice・Candidate・Event の**正本 ID**によって、同一の債務・債権を一意に識別する。identity は集計・調停の基礎になり、cross-tenant の取り違えを構造的にゼロにし、二重計上・取りこぼしを推測なしで是正する土台（FIN-01 → FIN-02 → FIN-03）を安全に固定する。

## 2. User Value

資金ショート予兆・入出金予定の集計が、「金額と期日が近いから同じ」という危うい推測ではなく、**正本 ID に基づく確定的な同一性**で動く。非エンジニアの承認者が、契約（Packet）と機械判定可能なテスト条件で「別会社の債務を混同しない」「同じ債務を二重に数えない」「不確実なら安全側に倒す」ことを確認できる。人間の安全な統制（お金の真実＝Financial Truth）に効く。

## 3. IDs

- Phase: `5`
- Workstream: `WS-FIN`
- Task ID: `F-R7-02`
- Packet ID: `P5-FIN-001`
- Checkpoint: `2 / Financial Truth`
- Function IDs: `NONE` — F-R7-02 を stable Task ID として使用。対応する Function Master ID は本 Packet では証拠未確認のため推測しない（発明しない）。
- Related design audit: Codex `reaudit-B-cashflow-f-r7-02-design`（A' 案 thin slice）／ slice1 実害監査 `be37a55`（B-S1-01/02/03・main `93d4e5f`＝PR #126 で反映済み）。

## 4. Source of Truth

現行の canonical selector（slice1 + B-S1 修正が main へ統合済み）を FIN-01 の出発点＝正本とする。FIN-01 はこの reader-side 実装の中の **identity 導出**を、versioned・tenant 込みの決定論的 encoding として実装・強化する（producer/schema は触らない）。

- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`（= origin/main。PR #129 Entry Gate merge → PR #130 post-merge activation を含む）
- 現行実装ファイル: `packages/shared/src/cashflow-obligation.ts`（`selectCanonicalCashflowObligations` / obligation key `po:` `inv:` `cand:` `evt:`）
- 現行単体テスト: `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- 現行 reader 配線: `apps/web/lib/domains/finance/cashflow.ts`（`selectCanonicalCashflowObligations` の呼び出し側）
- 公開 export: `packages/shared/src/index.ts`（`export * from './cashflow-obligation'` 既に存在）
- 現状の gap（本 Packet が埋める対象）: 現行 obligation key は **tenant を key に含めず**「呼び出し側が tenant スコープ済み」を前提とし、**version 付与も無い**。FIN-01 は identity に `tenantId` を必須構成要素として組み込み、versioned identity として決定論的 encoding で確定する。

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

（上記3件の SHA-256 は commit `3b01f15` の実ファイルで再計算し一致を確認済み。）

## 5. FACT / UNKNOWN

### FACT

- `git rev-parse origin/main` = `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- 現行 `cashflow-obligation.ts` は obligation key を `po:<id>` / `inv:<id>` / `cand:<id>` / `evt:<id>` で導出し、direction 競合・lifecycle 欠落・未知 source を `coverageIncomplete=true` で fail-safe に扱う（金額を推測で埋めない）。
- candidate→invoice lineage は `cand.invoiceId` があれば `inv:<invoiceId>` へ解決し、同一債権として 1 行に束ねる。
- 未知 source の `cashflow_expected` は canonical projection 型として個別に残し（過少計上を避ける）、未知 source の `payment_expected` は cashflow_expected と二重の可能性があるため配置せず `coverageIncomplete` にする、という既存の安全挙動がある（§12 の sourceType 規則で確定）。
- 現行 `SelectCanonicalCashflowInput` は `tenantId` を持たず、呼び出し側が tenant スコープ済みの入力を渡す前提。FIN-01 は `tenantId` を必須入力に昇格させ、identity の必須構成要素にする。
- **本 Packet は、人間承認（`PHASE5_TASK_PACKET_APPROVED`）後は immutable であり、FIN-01 実装中は本 Packet を変更しない。** FIN-01 実装は本 Packet の §7 ALLOWED_PATHS・§12 契約・§13/§14 の受入条件にそのまま従う。

### UNKNOWN

- 本 Packet 本文（rev3）の最終 SHA-256（外部証拠として計算・報告し、人間と Codex が確認するまで自己承認しない）。

## 6. Scope

### IN_SCOPE（FIN-01 実装）

- `packages/shared/src/cashflow-obligation.ts` の canonical obligation identity を、**§12 の確定 encoding**（version 付き・tenant 込み・決定論的）と identity resolver の失敗契約で実装・強化し、単体テスト（`cashflow_obligation.test.ts`）で契約（§12/§13/§14）を固定する純ロジック。
- `SelectCanonicalCashflowInput` へ `tenantId` を必須追加し、`apps/web/lib/domains/finance/cashflow.ts` の既存呼び出しから `tenantId` を明示的に渡す配線。

### NON_SCOPE

- **DB・schema・migration・backfill・producer dual-write・reader 統一は NON_SCOPE**（FIN-02 で schema・producer 正本化、FIN-03 で reader 統一。別 Packet・別人間承認）。
- reversal / reopen による**再予定 Event の生成（producer 側）**は FIN-02 として NON_SCOPE。FIN-01 は identity が lifecycle 変化で不変であることの検証まで。
- `apps/web/**` の変更（**`apps/web/lib/domains/finance/cashflow.ts` を除く**。それ以外の `apps/**` は禁止）。
- `packages/**` のうち §7 ALLOWED_PATHS の 2 ファイル以外。
- `packages/shared/src/index.ts` の変更（既に cashflow-obligation を export 済みのため**変更禁止**）。
- `.github/**` / `config/padn/**` / `pnpm-lock.yaml` / `package.json`。
- Production / Secrets / 外部送信 / 実 LLM / 課金。
- Draft 解除 / main merge / auto-merge。
- `PHASE5_TASK_PACKET_APPROVED` の自己宣言。

## 7. ALLOWED_PATHS（FIN-01 実装で write を許可する範囲）

- `packages/shared/src/cashflow-obligation.ts`
- `packages/shared/src/__tests__/cashflow_obligation.test.ts`
- `apps/web/lib/domains/finance/cashflow.ts`

`packages/shared/src/index.ts` は既に cashflow-obligation を export 済みのため **ALLOWED_PATHS に含めない（変更禁止）**。

## 8. FORBIDDEN_PATHS

- `.env*`
- `.github/**`
- `config/padn/**`
- `apps/**`（**`apps/web/lib/domains/finance/cashflow.ts` を除く**すべて）
- `infra/**`
- `packages/**`（§7 の 2 ファイルを除く）
- `packages/shared/src/index.ts`（既に export 済み・変更禁止）
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

## 12. Required Design（canonical obligation identity 契約・確定）

### 12.1 canonical identity encoding（確定・「例」ではない）

identity（canonical key）は次で決定論的に生成する。

```
JSON.stringify([
  "cashflow-obligation",
  "v1",
  tenantId,
  namespace,
  sourceId
])
```

- `namespace` は次のいずれか: `po` / `inv` / `cand` / `evt`。
- 規則:
  - `tenantId` と `sourceId` は**空文字を拒否**する（空なら identity を発行しない）。
  - `trim` しない。
  - Unicode 正規化しない。
  - raw delimiter の連結を使用しない（`JSON.stringify` の構造化で区切り文字混入＝delimiter injection を無効化する）。
  - `amount` / `dueAt` / `description` / `direction` / lifecycle は含めない。
  - 同じ入力 tuple（`tenantId` / `namespace` / `sourceId`）は**常に同じ key**。
  - 異なる tuple は**同じ key にならない**。
  - `"v1"` の version により将来の identity 形式変更を後方互換で扱う。

### 12.2 identity resolver の失敗契約

identity resolver は次を返す（推奨形式）:

- 成功: `{ ok: true, key }`
- 失敗: `{ ok: false, reason }`

identity 生成不能を **throw や推測で成功扱いにしない**。resolver の失敗は selector が `coverageIncomplete=true`（および必要に応じ `unsupportedCount` / `conflicts`）へ反映できること。

### 12.3 sourceType 解決規則（既存 `selectCanonicalCashflowObligations` の安全挙動と一致）

| 入力 | namespace | sourceId | 挙動 |
|---|---|---|---|
| `PurchaseOrder` + sourceId | `po` | `PurchaseOrder.id` | 1 債務 1 行 |
| `Invoice` + sourceId | `inv` | `Invoice.id` | Invoice lifecycle を正本に |
| 実在 `InvoiceCandidate`（invoiceId あり） | `inv` | `invoiceId` | 正式化済み candidate は Invoice 債務の alias（同一 identity へ収束） |
| 実在 `InvoiceCandidate`（invoiceId なし） | `cand` | `InvoiceCandidate.id` | 未正式化 candidate |
| 未知 source の `cashflow_expected` | `evt` | `FinanceEvent.id` | canonical type なので個別に残す（過少計上を避ける既存挙動を維持） |
| 未知 source の `payment_expected` | — | — | identity を発行せず `unsupportedCount++`・`coverageIncomplete=true`（cashflow_expected と二重の可能性） |
| orphan `InvoiceCandidate`（tenant 内に実在しない） | inflow: — ／ outflow: `evt` | outflow: `FinanceEvent.id` | inflow は除外（偽の余裕＝危険方向を避ける）、outflow は保守的に個別計上。両者 `coverageIncomplete=true` |

### 12.4 その他の不変条件

1. **純ロジック＋単体テストのみ**（DB・schema・migration・backfill・producer dual-write・reader 統一は含めない。FIN-02 / FIN-03 へ接続）。
2. **正本 ID ベース**。identity は正本 ID から §12.1 で導出し、金額・期日・表示名では導出しない。
3. **同額・同期限でも別 Invoice / 別 PO は別 identity**（正本 ID が異なれば tuple が異なる）。
4. **tenant 越境の禁止**。`tenantId` は §12.1 の必須構成要素。別 tenant の同一 `sourceId` は別 key。`tenantId` 欠落（空・null・未指定）は identity 非発行で fail-closed。
5. **direction conflict / lifecycle conflict** は fail-closed（identity 化せず `conflicts` 記録・`coverageIncomplete`）。
6. **推測補完の禁止**。unknown・解決不能を金額推定・名寄せで補完せず `coverageIncomplete=true` を維持（過大計上＝偽の余裕を作らない）。
7. **lifecycle 期待状態**: `PAID` / `VOID`（予定から除外）、`partial payment`（残額のみ予定）、`reversal / reopen`。**identity 自体は lifecycle 変化で変わらない（reversal / reopen でも同一 identity）ことを FIN-01 で検証する**。producer による再予定 Event 生成は FIN-02 として NON_SCOPE。
8. **identity の非構成要素**: `amount` / `dueAt` / `description` / `direction` / lifecycle は identity の構成要素にしない。
9. **前方接続**: 本契約は FIN-02（schema・producer canonical id 正本化）と FIN-03（reader 統一）へ、`"v1"` version により後方互換で接続できる。

### 守る安全境界（弱めない）

- AI は承認・外部送信・削除・課金を持たない。FIN-01 は純ロジック＋既存 reader への tenantId 配線のみで DB・外部作用を持たない。
- 承認者は人間のみ。Codex A〜H（B・H を含む）は独立確認者であり `PHASE5_TASK_PACKET_APPROVED` を付与しない。
- fail-safe 既定（不確実なら `coverageIncomplete`）・fail-closed 既定（越境・injection・conflict は identity 化しない）。

## 13. Acceptance Criteria（FIN-01 実装の受入条件・機械判定可能）

1. **encoding 確定**: identity は §12.1 の `JSON.stringify(["cashflow-obligation","v1",tenantId,namespace,sourceId])` で生成され、raw delimiter 連結を使わない。`amount` / `dueAt` / `description` / `direction` / lifecycle を含まない。
2. **決定論**: 同じ tuple は常に同じ key、異なる tuple は異なる key。
3. **PurchaseOrder**: `po` / `PurchaseOrder.id`。**Invoice**: `inv` / `Invoice.id`。
4. **candidate→invoice**: 実在 candidate（invoiceId あり）は `inv` / `invoiceId`（対応 Invoice と同一 identity）。invoiceId なしは `cand` / `InvoiceCandidate.id`。
5. **同額同期限別 ID**: 同額・同期限でも別 Invoice / 別 PO は別 identity。
6. **tenant 分離**: 別 tenant の同一 `sourceId` は別 identity。
7. **空 tenant**: `tenantId` が空 / null / 未指定なら identity を発行せず `{ ok: false, reason }`（fail-closed）。
8. **delimiter injection**: `tenantId` / `sourceId` へ区切り文字混入でも別債務が同一 identity に化けない（構造化 encoding で無効化）。
9. **未知 source cashflow_expected**: `evt` / `FinanceEvent.id` で個別に残す（過少計上を避ける）。
10. **未知 source payment_expected**: identity を発行せず `unsupportedCount++`・`coverageIncomplete=true`。
11. **orphan candidate**: inflow 除外／outflow は `evt` で個別計上／両者 `coverageIncomplete=true`。
12. **direction / lifecycle conflict**: fail-closed（`conflicts` / `coverageIncomplete`）。`PAID` / `VOID` 予定除外、`partial payment` 残額のみ。
13. **reversal / reopen identity 不変**: lifecycle 変化で identity は不変。
14. **tenantId 必須入力**: `SelectCanonicalCashflowInput.tenantId` が必須で、`apps/web/lib/domains/finance/cashflow.ts` から明示的に渡される。
15. **resolver 失敗契約**: identity 生成不能は throw せず `{ ok: false, reason }` で表し selector が `coverageIncomplete` へ反映。
16. 変更は §7 ALLOWED_PATHS 内のみ・DB / schema / migration / producer dual-write / reader 統一 = 0・`index.ts` 変更 0。
17. 単体テストは純ロジック（DB 非依存）で、上記否定系（空 tenant / injection / unknown / conflict / orphan）を含む。
18. **Test Plan（§15）の全コマンドが成功**し、**exact-head GitHub CI の stage1 / stage2_integration / stage3_e2e / release_gate がすべて success**。
19. 本 Packet の status が `PROPOSED` で、`PHASE5_TASK_PACKET_APPROVED` を自己宣言していない。
20. 本 Packet 本文（rev3）の SHA-256 が外部証拠として算出・報告される（本文には書き込まない）。

## 14. Negative Acceptance Criteria（機械判定可能・fail-closed を弱めない）

1. `amount` / `dueAt` / `description` / `direction` / lifecycle を identity 構成要素にしてはならない。
2. 金額・期日・表示名の一致だけで別債務を同一 identity にしてはならない。
3. tenant を跨いで同一 identity を発行してはならない。
4. `tenantId` / `sourceId` が空 / null で identity を発行してはならない（fail-closed）。
5. raw delimiter の単純連結で identity を作ってはならない（delimiter injection で同一化してはならない）。
6. identity 生成不能を throw で落とす、または推測で成功扱いにしてはならない（`{ ok: false, reason }` で表す）。
7. 未知 source の `payment_expected` を identity 化してはならない（`coverageIncomplete`）。未知 source の `cashflow_expected` を過少計上のために捨ててはならない（`evt` で残す）。
8. reversal / reopen で identity が変わってはならない（不変）。
9. FIN-01 実装は §7 ALLOWED_PATHS 外へ広げてはならない（`index.ts` を変更しない）。
10. Draft 解除・main merge・auto-merge・`PHASE5_TASK_PACKET_APPROVED` の自己宣言をしてはならない。
11. test skip / only / fixme・0 件実行の PASS 扱い・期待値を根拠なく実装へ合わせることをしてはならない。

## 15. Test Plan（実行可能コマンド）

| Level | Command / Gate | Required |
|---|---|---|
| Unit | `pnpm vitest run packages/shared/src/__tests__/cashflow_obligation.test.ts` | YES |
| Typecheck | `pnpm --filter @hokko/shared typecheck` | YES |
| Full unit | `pnpm test` | YES |
| CI (exact head) | GitHub CI の `stage1` / `stage2_integration` / `stage3_e2e` / `release_gate` がすべて success | YES |

単体テストが最低限カバーするケース（§13 対応）: encoding 決定論／PurchaseOrder・Invoice／candidate→invoice 同一 identity／同額同期限別 ID／tenant 分離／空 tenant fail-closed／delimiter injection／未知 source cashflow_expected（evt 個別）／未知 source payment_expected（coverageIncomplete）／orphan candidate（inflow 除外・outflow evt）／direction / lifecycle conflict／PAID / VOID / partial payment／reversal / reopen identity 不変／resolver `{ ok:false }` 失敗契約。

禁止: test skip / only / fixme、安全条件を弱める、期待値を根拠なく実装へ合わせる、0 件実行を PASS 扱いする。

## 16. Evidence Required（FIN-01 実装）

- changed files（`git diff --name-only origin/main...HEAD`）= §7 ALLOWED_PATHS の範囲内（`cashflow-obligation.ts` / `cashflow_obligation.test.ts` / `apps/web/lib/domains/finance/cashflow.ts`）。`index.ts` 変更 = 0。
- base main SHA: `3b01f15d19a333a5eb5d5d43f348b8ba39c5f3dd`。
- head SHA（実装 commit・PR #131 head）。
- Packet 本文 SHA-256（外部証拠。本文には `packet_sha256: EXTERNAL`）。
- Test Plan（§15）の各コマンド結果と exact-head CI run ID・全 job 結果（stage1 / stage2_integration / stage3_e2e / release_gate）。
- `git diff --check` = exit 0。
- DB / schema / migration / producer dual-write / reader 統一 / workflow / PADN 変更 = 0。
- Draft 維持・auto-merge 未設定・main 未 merge・PR 本文更新なし。

## 17. Rollback

- 本 branch は未 merge。Draft PR #131 を close、または不要なら branch 削除（人間判断）で完全に取り消せる。FIN-01 実装は純ロジック＋既存 reader への tenantId 配線のみで、DB・main 非影響。
- Data rollback: none。Feature flag: none。

## 18. Obsidian / Governance Impact

- Stable knowledge changed: `YES`（Financial Truth の canonical obligation identity 契約を Git 正本として確定）。
- Vault 反映 / `CURRENT_STATE` / `DELIVERY_CONTRACT` update: `POST_MERGE_ONLY`（vault・tasks は変更しない）。
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
- **§7 ALLOWED_PATHS の 3 ファイル以外への write が必要になった場合**（`index.ts` を含むそれ以外は停止）。
- DB / schema / migration / Production / Secret 等の未承認 Gate。
- Draft 解除 / main merge / auto-merge / 新規 branch / 新規 PR / force push / amend / rebase / reset が必要になった場合。
- 承認済み immutable Packet の変更が必要になった場合（変更は新 revision の人間承認事項）。
- 最終 Packet 承認前に FIN-01 実装（製品コード変更）へ進む要求。

## 承認状態（本文外イベントで確定）

本 Packet 本文には自身の SHA-256 を書き込まない（循環参照回避・`packet_sha256: EXTERNAL`）。Packet 本文（rev3）確定後にファイル全体の SHA-256 を計算し、外部証拠として報告する。`PHASE5_TASK_PACKET_APPROVED` マーカーは、Codex B/C/D/E/H が独立に read-only 監査し、人間（DREEXY-git）が rev6 Human Approval Event 方式（7 top-level payload ＋ 本文外 API envelope・`fixed_head_sha` は対象 PR #131 の live `head.sha` へ照合・`authorization_scope` は §10 の厳密複写）で付与するまで、付与しない。承認後、本 Packet は immutable であり FIN-01 実装中は変更しない。承認者は人間のみ。現時点の status は `PROPOSED`。
