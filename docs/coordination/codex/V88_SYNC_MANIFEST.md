# 369 OS v8.8 GitHub / Obsidian Sync Manifest

更新日: 2026-07-15 JST

## 1. Source Evidence

| Source | Ref / ID | 状態 |
|---|---|---|
| app main | `7e50a04df6dcc8043689958cbfd9be42e15e1af7` | fixed |
| Gate-0 R4 | `beaec2d4b9ffbfa39ec33010c0eab2373dcf681f` | main ancestor |
| main CI | run `29326762350` | success |
| main artifact | `8308421143` / 38 PNG / `a9a267eef6ccceeeda5e6ce252a7d65a41025812c74e6f1e4e50f4e62268cc7a` | verified |
| Gate-0 Codex verdict | issue comment `4968477754` | post-merge PASS |
| PR #57 fixed head | `71d41870ed6ff0241915534e2cd43cf43e30e1c4` | CI failure / CHANGES_REQUIRED |
| PR #57 exact-head CI | run `29369863839` | stage3/`release_gate` failure |
| PR #57 failure artifact | `8325779897` / `b8bac0e37572e5e474de4ba28f7f6c74669e27e010c5e76878a2a895429567d2` | failure evidence |
| PR #57 Codex verdict | issue comment `4978049489` | v8.8 CHANGE_REQUEST |
| PR #58 fixed head | `d1688cc8b6109bbd00a534df24a756d6d49df425` | CHANGES_REQUIRED |
| governance drift | issue comment `4974007406` | open Evidence Gap |
| observed vault main | `8eab43618c19e6b675f11ef7f43cf33c8cf87177` | stale / main未追随 |

## 2. App-side Codex files

| File | Sync state |
|---|---|
| `docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` | v8.8 fixed HOLD snapshot added in PR #59 branch |
| `docs/coordination/codex/V88_PHASE_DIRECTOR_STATE.md` | v8.8 successor created in PR #59 branch |
| `docs/coordination/codex/V88_PHASE3_DEFECT_AND_GATE_MATRIX.md` | v8.8 successor created in PR #59 branch |
| `docs/coordination/codex/V88_SYNC_MANIFEST.md` | this manifest |
| `docs/coordination/codex/V87_*` | retained as historical snapshot |

## 3. Vault-side mirror

同じfixed PASS/HOLDだけを既存vault Draft PR #10へ追随します。別PRは作成しません。

| 項目 | 固定値 |
|---|---|
| repository | `DREEXY-git/369-vault` |
| base | `main` / `8eab43618c19e6b675f11ef7f43cf33c8cf87177` |
| branch | `codex/v87-governance-evidence` |
| Draft PR | [#10](https://github.com/DREEXY-git/369-vault/pull/10) |
| v8.8 head | `SYNC_PENDING` |

## 4. Content SHA-256

最終app/vault commit後に固定します。

| Artifact | SHA-256 |
|---|---|
| app `V88_PHASE_DIRECTOR_STATE.md` | `PENDING` |
| vault `CodexV88PhaseDirectorState.md` | `PENDING` |
| app `V88_PHASE3_DEFECT_AND_GATE_MATRIX.md` | `PENDING` |
| vault `V88Phase3DefectAndGateMatrix.md` | `PENDING` |

## 5. Validation

- app markdown/diff check: pending
- vault wikilink: pending
- new vault note orphan: pending
- secret pattern: pending
- commit graph/base: pending
- both PRs remain Draft and both mains remain unmodified

## 6. Current sync verdict

`APP_V88_DRAFT_IN_PROGRESS / VAULT_V88_SYNC_PENDING / MAIN_SYNC_PENDING`

app mainとvault mainへのmergeは人間Gateです。
