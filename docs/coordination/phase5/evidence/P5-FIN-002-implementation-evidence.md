# P5-FIN-002 Implementation Evidence — Canonical Cashflow Obligation Producer

本ファイルは P5-FIN-002（FIN-02）実装の静的 Evidence。commit 後にのみ確定する値
（final fixed head SHA / commit SHA / exact-head CI run ID・全 job / Codex C・D・E・H の same-head verdict）は、
head を変えて監査をやり直させないため本ファイルへ後追い commit せず、実装完了時の
`P5_IMPLEMENTATION_READY_FOR_AUDIT` handoff 出力に記録する。
Governance 契約で `GITHUB_COORDINATION_COMMENT_AUTHORIZED=true` が明示されていない限り
append-only PR coordination comment は投稿せず、handoff は `HANDOFF_NOT_GIT_PERSISTED` とする。
本 Evidence の SHA-256 は自己参照しない。raw personal data・Secrets・Production row・元 dirty diff の内容は保存しない。

## 1. 固定証拠（identity / base）

- packet_id: `P5-FIN-002`
- revision: `1`
- Packet SHA-256（外部・本文非埋込）: `8e0142b0a813ff84a97528e7c2d45595f0dd5534f994f7085f6f5f9e4954f880`
- base SHA: `061d652264f97633379b5951243dd27776d0b8b7`（= origin/main = Packet base）
- approved pre-implementation head: `1db93a67d24da5ad3d50344fcb2afb3558a3d6b1`
- Human Approval Event: PR #133 comment `5066381993`（author `DREEXY-git` / User / OWNER、created_at==updated_at）
  - body_sha256: `9c28306d5cf68b334397e2a8146242bd4eb759cb3102f59e8b0692a7817541e8`（再取得 exact bytes と一致）
  - authorization_scope == Packet §10 authorization（byte 一致）
- prompt manifest SHA-256: `2dd6053ba18a8c6f862488c26149d434829fc011ab5811bfbb64ae798c59c984`（status=active、8/8 content hash 一致）
- final fixed head SHA / commit SHA: **`P5_IMPLEMENTATION_READY_FOR_AUDIT` handoff 出力に記録**（本ファイルへ後追い commit しない）

## 2. Changed files（14 = ALLOWED_PATHS のみ・外変更 0）

| # | path | 種別 |
|---|------|------|
| 1 | `packages/db/prisma/schema.prisma` | additive schema |
| 2 | `packages/db/prisma/migrations/20260724123000_p5_fin002_canonical_obligation/migration.sql` | expand migration |
| 3 | `packages/db/src/canonical-obligation.ts` | persistence service（新規） |
| 4 | `packages/db/src/fin02-canonical-obligation-backfill.ts` | backfill CLI/driver（新規） |
| 5 | `packages/db/src/index.ts` | barrel export |
| 6 | `packages/db/src/__tests__/p5_fin02_canonical_obligation_backfill.itest.ts` | 統合テスト（新規） |
| 7 | `apps/web/lib/domains/finance/finance-bridge.ts` | producer dual-write（#1-4） |
| 8 | `apps/web/lib/domains/finance/formalize.ts` | producer #5（convergence） |
| 9 | `apps/web/lib/domains/finance/invoice-send.ts` | producer #6 |
| 10 | `apps/web/lib/domains/finance/payments.ts` | producer #8（settle） |
| 11 | `apps/web/lib/invoice-void-bridge.ts` | producer #9（void） |
| 12 | `apps/web/app/(app)/approvals/actions.ts` | producer #10（reversal reopen） |
| 13 | `apps/web/tests/e2e/fin02_canonical_obligation_producer_evidence.spec.ts` | E2E（新規） |
| 14 | `docs/coordination/phase5/evidence/P5-FIN-002-implementation-evidence.md` | 本 Evidence |

- ALLOWED_PATHS 外の変更: **0**（`git status --untracked-files=all` で確認）。
- FORBIDDEN_PATHS（`packages/shared/src/cashflow-obligation.ts` / `cashflow.ts` / `queries.ts` / `seed.ts` / `.github/**` / `pnpm-lock.yaml` / `package.json` 等）変更: **0**。
- `git diff --check`: **success**。

## 3. Schema / Migration（additive・expand-only・down migration なし）

新規 2 テーブル + FinanceEvent への nullable link 1 列。tenant 境界は composite relation で DB 制約にも含める。

- `CashflowObligation`（id cuid / tenantId / identityVersion / namespace / preferredCanonicalKey /
  direction / currency / scheduledAmount(16,2) / remainingAmount(16,2) / dueAt? / lifecycleStatus / description）
  - `@@unique([tenantId, id])`（composite FK target）, `@@unique([tenantId, preferredCanonicalKey])`,
    `@@index([tenantId, lifecycleStatus])`, `@@index([tenantId, dueAt])`
- `CashflowObligationAlias`（id / tenantId / obligationId / identityVersion / namespace / sourceId / canonicalKey）
  - FK `[tenantId, obligationId] → CashflowObligation[tenantId, id]`（ON DELETE CASCADE）
  - `@@unique([tenantId, identityVersion, namespace, sourceId])`, `@@unique([tenantId, canonicalKey])`（並行 barrier）,
    `@@index([tenantId, obligationId])`
- `FinanceEvent.cashflowObligationId String?` + FK `[tenantId, cashflowObligationId] → CashflowObligation[tenantId, id]`
  （ON DELETE NO ACTION / ON UPDATE NO ACTION）。null のとき FK 非強制（Postgres MATCH SIMPLE）＝既存挙動を維持。
  `@@index([tenantId, cashflowObligationId])`

migration.sql は `prisma migrate diff --from-schema-datamodel(base) --to-schema-datamodel(edited) --script` で生成し、
schema と一致（Acceptance #2）。statement 検証: `CREATE TABLE`×2 / `CREATE (UNIQUE) INDEX`×8 / `ALTER TABLE ... ADD`×3
（ADD COLUMN×1 + ADD CONSTRAINT FK×2）。`DROP` / `TRUNCATE` / `DELETE FROM` / 非-ADD ALTER: **0**。

> 注: 本リポジトリの既存 model は `tenantId` スカラのみ（composite tenant relation は未使用）だったが、
> FIN-02 は §12.2 の要求どおり obligation 系に限り DB レベルの composite tenant relation を新規導入する
> （financial truth のための意図的な強化。他 model の慣習は変更しない）。

## 4. Identity 再利用（FIN-01 は不変）

- `packages/db/src/canonical-obligation.ts` は `@hokko/shared` の
  `resolveCanonicalObligationIdentity(tenantId, namespace, sourceId)` と
  `CASHFLOW_OBLIGATION_IDENTITY_VERSION('v1')` を **そのまま利用**し、encoding を再実装しない。
- `@hokko/db` は既に `@hokko/shared` に依存（`workspace:*`）。package.json 変更なし。
- namespace は `po`/`inv`/`cand`/`evt` の 4 種のみ。金額・期日・表示名で identity を導出しない。

## 5. Producer inventory と obligation link（§12.5 の 10 producer）

| # | producer | file | obligation 連携 |
|---|----------|------|-----------------|
| 1 | `emitFinanceEvent`(Tx) | finance-bridge.ts | chokepoint。expected type なら `upsertObligationForEvent`（#2-4 もここを通る） |
| 2 | `bridgeEventProjectToFinance` | finance-bridge.ts | candidate cashflow_expected → cand obligation（#1 経由） |
| 3 | `bridgePurchaseOrderToFinance` | finance-bridge.ts | payment_expected + cashflow_expected が **1 つの po obligation** へ収束（#1 経由） |
| 4 | `bridgeDamageChargeToInvoiceCandidate` | finance-bridge.ts | candidate cashflow_expected → cand obligation（#1 経由） |
| 5 | `finalizeInvoiceCandidate` | formalize.ts | `convergeCandidateToInvoice`：cand obligation に inv alias 追加・preferred=inv（旧 cand alias 保持） |
| 6 | `executeInvoiceExternalSend` | invoice-send.ts | payment_expected(Invoice) → inv obligation（Phase 1 claim と同一 tx で `upsertObligationForEvent`） |
| 7 | `issueInvoiceCore` | invoice-send.ts | FinanceEvent 非生成 → obligation 変更なし（send 時に生成） |
| 8 | `recordInvoicePayment` | payments.ts | `settleObligationForInvoice`：remaining 再計算（partial→partially_settled / full→settled） |
| 9 | `decideInvoiceVoidCore` | invoice-void-bridge.ts | `voidObligationForInvoice`：lifecycle=void（注入 tx を obligation delegate で拡張） |
| 10 | `payment_reversal` tx | approvals/actions.ts | `settleObligationForInvoice`：全額取消→open / 一部→partially_settled で **再 OPEN** |

- 全 link は対応する legacy FinanceEvent の write と **同一 transaction**（§12.4 atomicity）。
- 未知 source の `payment_expected` は正本化しない（推測で統合しない・§14.6）。
- 未知 source の `cashflow_expected` は `evt`/FinanceEvent.id で額面通り残す（過少計上を避ける・§12.5）。
- 同一 identity の並行 upsert は `pg_advisory_xact_lock(tenant, canonicalKey)` で直列化し、
  alias `@@unique([tenantId, canonicalKey])` を最終 barrier とする。

## 6. Backfill（dry-run 既定・execute は --execute のみ）

- `runFin02Backfill(db, {dryRun, tenantId, batchSize})`。CLI は既定 dry-run、書込みは `--execute` のみ（誤実行防止）。
- deterministic cursor（id 昇順）、1 event = 1 transaction（独立 checkpoint・resumable）。
- 分類（§12.7）: `purchase_order` / `direct_invoice` / `candidate_unformalized` / `candidate_formalized` /
  `unknown_cashflow_expected` / `unknown_payment_expected` / `orphan_candidate_inflow` / `orphan_candidate_outflow` /
  `missing_tenant` / `missing_source` / `not_expected_type` / `already_linked`。
- 不明行は推測修復せず skip（conflict/coverage は fail-safe）。
- 再実行は `already_linked` に収束し新規 0（§Acceptance 17）。dry-run は DB 変更 0（§Acceptance 15）。
- **ローカル/Production の execute はこの Packet の run_local_checks では未許可**。integration/dry-run は CI（ephemeral DB）で実行。

## 7. 検証結果（ローカルで実行可能な範囲）

| Level | Command | Result |
|---|---|---|
| Generate | `pnpm --filter @hokko/db generate` | ✅ success（新 model 反映） |
| Unit（FIN-01 非回帰） | `pnpm vitest run packages/shared/src/__tests__/cashflow_obligation.test.ts` | ✅ 29/29 passed |
| Unit（全体） | `pnpm test` | ✅ 53 files / 662 tests passed |
| Typecheck | `pnpm typecheck`（db / web / shared / ai / integrations / worker） | ✅ exit 0 |
| Lint 相当 | `git diff --check` | ✅ success |
| ALLOWED_PATHS 外変更 | `git status --untracked-files=all` | ✅ 0 |

- 統合テスト（`pnpm --filter @hokko/db test:integration`）・backfill dry-run・E2E は **要 DB / chromium** のため
  **exact-head CI**（stage2_integration / stage3_e2e）で実行する。§15 によりローカル DB 実行は本 Packet では未許可。

## 8. 統合テスト → Acceptance 対応（`p5_fin02_...backfill.itest.ts`・CI 実行）

- #6 PO dual → 1 obligation / 両 event link
- #7 candidate→invoice convergence（cand+inv alias・preferred=inv）
- #8/#9 direct Invoice inv alias / 同額同期限別 Invoice は別 obligation
- #10/#11 partial→full→reversal(reopen) の lifecycle、VOID とその後 settle no-op
- #12/#13 unknown cashflow_expected=evt / unknown payment_expected 非正本化
- tenant 分離（同一 sourceId 別 tenant は別 obligation）
- #14 producer retry 冪等（二重 upsert で obligation/alias/link 増分 0）
- #15 dry-run DB 変更 0 / #16-17 execute 正本化・再実行 0 / backfill の tenant 非跨ぎ

E2E（`fin02_..._producer_evidence.spec.ts`・CI 実行）: 実 `bridgePurchaseOrderToFinance` の PO 収束、
実 `finalizeInvoiceCandidate` + `recordInvoicePayment` の convergence & settled を実 PostgreSQL で確認。

## 9. Rollback / forward-fix（§17）

- Code: merge 前は Draft PR close。merge 後は人間承認した revert。
- Data: additive schema・backfilled row は削除せず、dual-write を停止して forward-fix。destructive down migration は作らない。
- Feature flag: なし。FIN-03 reader switch 前なので legacy reader を維持（obligation は本 Packet では reader 非接続）。
- Unsafe partial state 防止: same-transaction dual-write、alias unique 制約、advisory/row lock、idempotent checkpoint。

## 10. 安全境界・状態

- Draft: **true**（維持） / auto-merge: **未設定（null）** / merged: **false** / main merge: **未実施**。
- Production migration / backfill / deploy: **未実施**（別 Human Gate）。
- 外部送信・実 LLM・課金・RBAC/機密ラベル・削除破壊エクスポート: **なし**。
- 元の user-owned checkout（`/home/user/369` @ `claude/p5-fin-001-canonical-identity-v1`）: **不変・clean**（隔離 worktree で作業）。
- Codex C/D/E/H の same-head verdict: **handoff 出力後に GitHub live state から取得**（実装は Human Approval 後の Claude lane、承認代行なし。Claude Code は C/D/E/H PASS を自己判定しない）。

## 11. Remediation log（V1 §6 / V2 §11・同一 Packet / ALLOWED_PATHS 内・最大 2 回）

- Round 1: 初回実装 head の exact-head CI で `stage2_integration` が失敗（`stage1` / `stage3_e2e` は success）。
  原因は **本 itest のアサーション誤り**（製品ロジックではない）: `runFin02Backfill` は query 段階で
  `type in [cashflow_expected, payment_expected]` に絞るため、`payment_received`（expected 以外）は scan されない。
  よって `byClassification.not_expected_type` は driver 経由では 0 だが、テストが 1 を期待していた。
  対処: `p5_fin02_...backfill.itest.ts` のアサーションを 0 へ修正し、
  「非 expected type は link されない」ことを execute 側でも確認（`payment_received` の `cashflowObligationId` は null）。
  ALLOWED_PATHS 外変更 0 / scope 拡張なし / 製品コード不変。修正後 head で CI を再実行。
