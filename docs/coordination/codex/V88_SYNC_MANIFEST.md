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
| PR #57 fixed head | `652c7536f1bee4373f85f30e0efbcdfd93df2b79` | CI_VERIFIED / CHANGES_REQUIRED |
| PR #57 exact-head CI | run `29399066453` | stage1/stage2/stage3/`release_gate` success |
| PR #57 artifact | `8336486268` / 38 PNG / `969d68556ef6849a18aa8a39a70e779aada60c900a3e227eb9d0228bf6bb5b2f` | exact-head verified |
| PR #57 Vercel | deployment `DiraHvQgBS1wGivQrdfH9eMceMCu` | exact commit success |
| PR #57 Codex verdict | issue comment `4978379827` | v8.8 R2 CHANGE_REQUEST |
| PR #58 fixed head | `d1688cc8b6109bbd00a534df24a756d6d49df425` | CHANGES_REQUIRED |
| P3-INV movement/event verdict | issue comment `4978770056` | fixed-main CHANGE_REQUEST |
| P3-CRM Lead Convert verdict | issue comment `4964622641` | fixed-main CHANGE_REQUEST; action blob unchanged from PR #49 head |
| P3-Meeting classification verdict | issue comment `4978992477` | fixed-main CHANGE_REQUEST |
| governance drift | issue comment `4974007406` | open Evidence Gap |
| observed vault main | `8eab43618c19e6b675f11ef7f43cf33c8cf87177` | stale / main未追随 |
| app v8.8 Evidence source | PR #59 / `2aea6a28c7b6e0e499308072452e8cc6170fa59c` | vault鏡像の入力commit |
| vault v8.8 Evidence | PR #10 / `d9173f5cd5fa79e48cca433af170b9a4e38be2c2` | Draft / main未統合 |

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
| v8.8 head | `d9173f5cd5fa79e48cca433af170b9a4e38be2c2` |

## 4. Content SHA-256

| Artifact | SHA-256 |
|---|---|
| app `V88_PHASE_DIRECTOR_STATE.md` | `40b58e3ae4b862242018b34faeaefe22f157b97c5d0758b9307f675b339618cc` |
| vault `CodexV88PhaseDirectorState.md` | `d57ee6fa8519aaed26fd1323f2a779eb79d3874544dfbda58b75dec442515729` |
| app `V88_PHASE3_DEFECT_AND_GATE_MATRIX.md` | `ac7b0d3d58b19dad340a1ddb7c58710b9101a47b566ea1e8e7fe31d80e60b8e7` |
| vault `V88Phase3DefectAndGateMatrix.md` | `fd10e563308e9aa83d7fb83b0f0b8225e834eb1a6996beaac5ff65e446f0d44a` |

## 5. Validation

- app/vault diff check: PASS
- changed-note wikilink: 7 checked / missing 0
- new vault note orphan: 0（`index.md`から3件すべて到達）
- secret pattern: 0
- vault head is a child of fixed vault base
- both PRs remain Draft and both mains remain unmodified

## 6. Current sync verdict

`APP_V88_DRAFT_OPEN / VAULT_V88_DRAFT_OPEN / MAIN_SYNC_PENDING`

app mainとvault mainへのmergeは人間Gateです。
