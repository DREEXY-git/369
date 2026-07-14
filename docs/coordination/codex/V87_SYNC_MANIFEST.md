# 369 OS v8.7 GitHub / Obsidian Sync Manifest

更新日: 2026-07-15 JST

## 1. Source Evidence

| Source | Ref / ID | 状態 |
|---|---|---|
| app main | `7e50a04df6dcc8043689958cbfd9be42e15e1af7` | fixed |
| Gate-0 R4 | `beaec2d4b9ffbfa39ec33010c0eab2373dcf681f` | main ancestor |
| main CI | run `29326762350` | success |
| main artifact | `8308421143` / 38 PNG / `a9a267eef6ccceeeda5e6ce252a7d65a41025812c74e6f1e4e50f4e62268cc7a` | verified |
| Codex verdict | issue comment `4968477754` | post-merge PASS |
| governance drift | issue comment `4974007406` | open Evidence Gap |
| observed vault main | `8eab43618c19e6b675f11ef7f43cf33c8cf87177` | stale / V74 generation |
| app Codex Evidence source | PR #59 / `c2755e8ae867c9cb856a562bccffb22e6d82d511` | vault鏡像の入力commit |
| vault Codex Evidence | PR #10 / `85ee8c629a3f4af0cedd4304bc088d1f3fbe919c` | Draft、main未統合 |

## 2. App-side Codex files

| File | Sync state |
|---|---|
| `docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` | Gate-0 snapshot added in this branch |
| `docs/coordination/codex/V87_PHASE_DIRECTOR_STATE.md` | created in this branch |
| `docs/coordination/codex/V87_PHASE3_DEFECT_AND_GATE_MATRIX.md` | created in this branch |
| `docs/coordination/codex/V87_SYNC_MANIFEST.md` | created in this branch |

## 3. Vault-side mirror

Vaultには次の固定情報だけを同期します。

- app main `7e50a04...`
- Gate-0 post-merge PASSとCI/artifact
- branch protection Human Gate
- Phase 3 defect/Gate MatrixのPASS/HOLD
- PR #54/#57/#58とGovernance Drift
- Evidence Stageの非誇張

一時的なローカルWIP、未push head、推測は同期しません。

| 項目 | 固定値 |
|---|---|
| repository | `DREEXY-git/369-vault` |
| base | `main` / `8eab43618c19e6b675f11ef7f43cf33c8cf87177` |
| branch | `codex/v87-governance-evidence` |
| head | `85ee8c629a3f4af0cedd4304bc088d1f3fbe919c` |
| Draft PR | [#10](https://github.com/DREEXY-git/369-vault/pull/10) |

## 4. Content SHA-256

| Artifact | SHA-256 |
|---|---|
| app `V87_PHASE_DIRECTOR_STATE.md` | `67f6d8e8dfb51da2f83fd618c4c9b1b80b747bd74a341ac88c9da43d2bff9730` |
| vault `CodexV87PhaseDirectorState.md` | `f1e5d0ef51e9b44cb6921df333262e31911da1e71d3d838411ef21d124c37ecf` |
| app `V87_PHASE3_DEFECT_AND_GATE_MATRIX.md` | `c6e5e5937b71823231b7920d5f5586ef450985b04447b189fec0315ab6bd6bc5` |
| vault `V87Phase3DefectAndGateMatrix.md` | `ff17770b4ad0da1cf5611cbdc685a39d81b461b30bcfcacfa0332a7dd6eccd9f` |

## 5. Validation

- vault wikilink: 0 missing
- new vault note orphan: 0
- secret pattern: 0
- app/vault diff check: PASS
- vault head is a child of fixed vault base
- both PRs remain Draft and both mains remain unmodified

## 6. Current sync verdict

`APP_CODEX_DRAFT_OPEN / VAULT_DRAFT_OPEN / MAIN_SYNC_PENDING`

app mainとvault mainへのmergeは人間Gateです。
