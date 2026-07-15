# 369 OS Codex v8.8 Phase Director State

更新日: 2026-07-15 JST

固定app main: `7e50a04df6dcc8043689958cbfd9be42e15e1af7`

現在Phase: **Phase 3**

Phase 3判定: **HOLD**

この文書は`V87_PHASE_DIRECTOR_STATE.md`を履歴として保持したまま、PR head移動後のlive GitHub Evidenceを固定する後継です。GitHub refs、exact-head CI、artifact、review thread、Vercel lineageを文書より優先します。

## 1. Gate-0固定Evidence

| 項目 | Evidence |
|---|---|
| PR | #55 merged |
| merge main | `7e50a04df6dcc8043689958cbfd9be42e15e1af7` |
| R4 head | `beaec2d4b9ffbfa39ec33010c0eab2373dcf681f` |
| exact-main CI | run `29326762350`、stage1/stage2/stage3/`release_gate` success |
| E2E artifact | ID `8308421143`、38 PNG、digest `sha256:a9a267eef6ccceeeda5e6ce252a7d65a41025812c74e6f1e4e50f4e62268cc7a` |
| Codex verdict | [CODEX_PASS_V84_GATE0_POSTMERGE](https://github.com/DREEXY-git/369/pull/55#issuecomment-4968477754) |
| branch protection | `HUMAN_CONFIGURATION_REQUIRED`。required check=`release_gate`の設定証拠は未受領 |
| Production | 未監査。`PRODUCTION_VERIFIED`ではない |

## 2. Active / Frozen / HOLD

| Lane | PR / fixed SHA | 状態 | 次の受入条件 |
|---|---|---|---|
| P3-FIN-1 Payment/VOID | PR #57 / `71d41870ed6ff0241915534e2cd43cf43e30e1c4` | `CI_FAILED / CHANGES_REQUIRED` | same-requestだけを収束し、request未指定を含む異なる6並列入金を6 Paymentとして保持。run `29369863839`を置換するexact-head green Evidence |
| P3-INV confirm | PR #58 / `d1688cc8b6109bbd00a534df24a756d6d49df425` | `CHANGES_REQUIRED` | active PENDING Approval=1、孤児0、approvalId/status CAS、stale approval拒否 |
| Payment Reversal | PR #54 / `367025fc0b843a3fd8e78bb012e09b5411d398a1` | `SCHEMA HOLD` | append-only reversal/status/ledger設計と人間承認 |
| Governance app | PR #59 | `EVIDENCE_DRAFT` | v8.8 fixed HOLD追随後のexact-head CI、Codex再固定、人間main merge |
| Governance vault | vault PR #10 | `EVIDENCE_DRAFT` | appと同じfixed HOLD、hash/link/orphan/secret/graph検査、人間main merge |
| Claude正本 | main `tasks/CURRENT_STATE.md` / `tasks/PROGRESS.md` | `ROADMAP_DRIFT` | Claude所有laneでGate-0後の現在地へ更新 |

## 3. PR #57確証済み回帰

- fixed head: `71d41870ed6ff0241915534e2cd43cf43e30e1c4`
- exact-head run: `29369863839`
- `stage1`: success
- `stage2_integration`: success
- `stage3_e2e`: failure、`239 passed / 1 failed`
- `release_gate`: failure
- failure: `payment_reconcile_evidence.spec.ts:84`、異なる6並列入金で`Expected 6 / Received 1`
- failure artifact: ID `8325779897`、digest `sha256:b8bac0e37572e5e474de4ba28f7f6c74669e27e010c5e76878a2a895429567d2`
- verdict: [CODEX_CHANGE_REQUEST_V88_P3_FIN1_CI_REGRESSION](https://github.com/DREEXY-git/369/pull/57#issuecomment-4978049489)

新規same-key idempotency specがgreenでも、異なる業務requestを1 Paymentへ誤収束する回帰が残るため、旧head `aca8b6b...`のCIや判定を流用しません。

## 4. Phase順とExit Gate

1. Phase 3 Finance/Q2C
2. Phase 3 Inventory/CRM/Meeting
3. Phase 3 Exit Gate
4. Phase 3.5 C19/C21/C22
5. Phase 3.5 Exit Gate
6. Phase 4 AI Workforce/Control Plane/worker
7. Phase 4 Exit Gate
8. RC独立監査

Phase 3 Exit前にPhase 3.5をwrite/PASS/closeしません。Phase 3.5 Exit前にPhase 4をwrite/PASS/closeしません。Phase 5以降へ進みません。

## 5. Human Gate

- GitHub SettingsでmainのPR必須、required check=`release_gate`を設定/確認
- app/vault main merge
- Production deploy/rollback
- 本番schema/DB、Production queue/worker
- Secrets/OAuth、実LLM、外部送信、広告、課金/支払

技術PASS後のmerge方式は**Create a merge commit**です。Squash/Rebaseは使用しません。

## 6. Evidence Stage

`ROADMAP_ONLY -> DRAFT_IMPLEMENTED -> CI_VERIFIED -> CODEX_VERIFIED -> HUMAN_PREVIEW_VERIFIED -> MAIN_MERGED -> PRODUCTION_VERIFIED`

PR #59/#10はDraftであり、`MAIN_MERGED`でも`PRODUCTION_VERIFIED`でもありません。
