# 369 OS v8.8 Phase 3 Defect and Gate Matrix

基準main: `7e50a04df6dcc8043689958cbfd9be42e15e1af7`

判定: **Phase 3 Exit HOLD**

## 1. 固定判定Matrix

| WIP | 固定対象 | 判定 | Release blocker / Evidence Gap | GitHub Evidence |
|---|---|---|---|---|
| Gate-0 | main `7e50a04...` | `PASS / MAIN_MERGED` | branch protection required設定は人間未確認 | [post-merge PASS](https://github.com/DREEXY-git/369/pull/55#issuecomment-4968477754) |
| P3-FIN-1 | PR #57 `71d41870...` | `CI_FAILED / CHANGES_REQUIRED` | 異なる6並列入金が1件へ誤収束。run `29369863839`でE2E/`release_gate` failure | [v8.8 CR](https://github.com/DREEXY-git/369/pull/57#issuecomment-4978049489) |
| P3-FIN-2 | main `7e50a04...` | `CHANGES_REQUIRED` | cross-tenant Customer伝播、Account transaction/並行一意性、formalize lineage | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4969884229) |
| P3-FIN-3 | main `7e50a04...` | `CHANGES_REQUIRED` | overdue+Audit原子性、partial payment、due boundary | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4970359209) |
| P3-FIN-4 | main `7e50a04...` | `CHANGES_REQUIRED` | duplicate PENDING VOID Approval、状態/Audit原子性 | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4970379861) |
| Payment Reversal | PR #54 `367025fc...` | `SCHEMA HOLD` | Payment物理削除不可。append-only設計と人間承認 | PR #54 |
| P3-INV confirm | PR #58 `d1688cc...` | `CHANGES_REQUIRED` | high-value Approval一意性、孤児0、stale approval CAS | [CR](https://github.com/DREEXY-git/369/pull/58#issuecomment-4969837501) |
| P3-INV receive | main `7e50a04...` | `CHANGES_REQUIRED` | multi-line transaction、deterministic lock、retry | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4970434505) |
| P3-INV lease | main `7e50a04...` | `CHANGES_REQUIRED` | lock後再読込、Movement原子性、dispatch/return CAS | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4970495097) |
| P3-INV movement/event | main `7e50a04...` | `READ_ONLY QUEUED` | Movement/Audit/EventまたはOutbox 1:1、post-commit retry、誤dedupe | source/test oracle監査待ち |
| P3-CRM Outreach | main `7e50a04...` | `CHANGES_REQUIRED` | permission/human-only、Approval snapshot/CAS、send一意性 | [CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4970551729) |
| P3-CRM Lead Convert | main `7e50a04...` | `READ_ONLY AUDITED` | mainでtransaction/tenant/parallel idempotencyを静的確認。新release blocker投稿なし | Codex read-only監査 |
| P3-Meeting | main `7e50a04...` | `CHANGES_REQUIRED` | raw transcript provider前guard、post-commit retry重複 | [CR](https://github.com/DREEXY-git/369/pull/52#issuecomment-4964764958) |
| Governance | PR #59 / vault PR #10 | `EVIDENCE_DRAFT / HOLD` | v8.8 fixed HOLD追随、Claude tasks drift、両main未統合 | [Governance CR](https://github.com/DREEXY-git/369/pull/55#issuecomment-4974007406) |

## 2. PR #57の置換必須Evidence

- same-request逐次/5本以上並行retry: Payment/Audit/FinanceEvent各1
- distinct request IDまたはrequest ID未指定の異なる6並列入金: Payment 6、SUM一致
- payload mismatch/cross-tenant/AI+OWNER mixed role: fail-closed
- post-commit fault後retry: core重複0、副次処理を再開/reconcile
- 実PostgreSQL、retries=0、複数回安定
- `payment_idempotency_evidence`、`payment_reconcile_evidence`、`payment_void_race_evidence`を同一exact-head runでgreen
- stage1/stage2/stage3/`release_gate` success、failed/flaky/skip/only/fixme 0

## 3. 共通受入条件

- transactionと必須Audit/DataAccessのall-or-nothing
- lock取得後のtenant-scoped再読込
- CAS count確認、DB一意barrier
- request/job idempotency keyとpayload mismatch拒否
- post-commit副次処理のoutbox/reconcile
- fault injection、rollback孤児0
- tenant/RBACを対象fetch前にfail-closed
- AI approve/delete/external_send 0、mixed role遮断
- PII classification/masking/provider allowlist
- 外部作用0
- ephemeral実PostgreSQL/Redis/BullMQ
- exact-head stage1/2/3/`release_gate`
- artifact/Vercel/review thread lineage

## 4. Phase 3 Exit条件

- Critical 0、P1/High 0、release-blocking P2 0
- 全WIPのfixed-head Codex PASS
- 人間merge後main CIとCodex post-merge PASS
- blocking thread 0
- main required `release_gate`人間確認
- Claude tasks/roadmap/audit、Codex function-master/coordination、vault同期
- stale PR #56のsupersede

条件未達のためPhase 3.5 write/PASSとRC監査は禁止です。
