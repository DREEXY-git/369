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
| app v8.8 Evidence source | PR #59 / `24dbd6f7fbb55e807adce064f9782913e1d96d71` | vault鏡像の入力commit |
| vault v8.8 Evidence | PR #10 / `745a29e6f2c7b5fbe940154e66017369f133494b` | Draft / main未統合 |

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
| v8.8 head | `745a29e6f2c7b5fbe940154e66017369f133494b` |

## 4. Content SHA-256

| Artifact | SHA-256 |
|---|---|
| app `V88_PHASE_DIRECTOR_STATE.md` | `850a5af0ccaf498005de455159870d90fa696ff4c71b611a7020ebd0593eebff` |
| vault `CodexV88PhaseDirectorState.md` | `d1631815ffb09ad47f338f0e2106e51f7676cb980fc71c95a86214416ef79a15` |
| app `V88_PHASE3_DEFECT_AND_GATE_MATRIX.md` | `8008c1356f1c9db2adc3673e96c792a85ea88823a02bbe7a45b2c2b5d7e9d06a` |
| vault `V88Phase3DefectAndGateMatrix.md` | `1596d7cc7e7c73011b86a31acf75b79d415590a4543a4ff1c355bbf7a0ed7b5d` |

## 5. Validation

- app/vault diff check: PASS
- vault wikilink missing: 0
- new vault note orphan: 0（`index.md`から3件すべて到達）
- secret pattern: 0
- vault head is a child of fixed vault base
- both PRs remain Draft and both mains remain unmodified

## 6. Current sync verdict

`APP_V88_DRAFT_OPEN / VAULT_V88_DRAFT_OPEN / MAIN_SYNC_PENDING`

app mainとvault mainへのmergeは人間Gateです。
