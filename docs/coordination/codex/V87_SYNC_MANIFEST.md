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

## 2. App-side Codex files

| File | Sync state |
|---|---|
| `docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md` | Gate-0 snapshot added in this branch |
| `docs/coordination/codex/V87_PHASE_DIRECTOR_STATE.md` | created in this branch |
| `docs/coordination/codex/V87_PHASE3_DEFECT_AND_GATE_MATRIX.md` | created in this branch |
| `docs/coordination/codex/V87_SYNC_MANIFEST.md` | created in this branch |

## 3. Vault-side target

Vaultには次の固定情報だけを同期します。

- app main `7e50a04...`
- Gate-0 post-merge PASSとCI/artifact
- branch protection Human Gate
- Phase 3 defect/Gate MatrixのPASS/HOLD
- PR #54/#57/#58とGovernance Drift
- Evidence Stageの非誇張

一時的なローカルWIP、未push head、推測は同期しません。

## 4. Current sync verdict

`APP_CODEX_DRAFT_PREPARED / VAULT_SYNC_PENDING`

このbranchだけではapp/vault同期完了を主張しません。vault clean branch/Draft PR作成後に次を追記します。

- vault branch/full SHA
- app文書とvault noteのcontent SHA-256
- wikilink到達性
- orphan count
- secret scan結果
- commit graph/base

app mainとvault mainへのmergeは人間Gateです。
