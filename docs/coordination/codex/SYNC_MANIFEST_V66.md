# 369 OS Codex Sync Manifest V66

- 日付: 2026-07-12 JST
- 状態: `PREAUDIT_SYNCED / WAITING_FOR_CLAUDE_FIXED_V66`
- app repository: `DREEXY-git/369`
- independent vault repository: `DREEXY-git/369-vault`

## GitHub refs

| 対象 | ref / PR | SHA | 状態 |
|---|---|---|---|
| app main | `main` | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | unchanged / Production HOLD |
| Claude app | PR #14 | `52b98a5aa2e1b9f1a759085c51135a27b684c230` | V65 head / V66 fixed待ち |
| Codex Evidence | PR #16 | `8bc76d034f1c58d7f24453ee7e82b6b0bfa18d80` | Draft / this manifest追加前 |
| vault main | `main` | `0812634ec443abf966819d2cf6b10e73efb3a94a` | unchanged |
| vault sync | PR #3 | `4524c932df13fc4650acff6cb24e7387b55365ef` | Draft / PASS待ち |

## V66 files

app Codex PRへ追加する正本候補:

- `docs/coordination/codex/V66_INDEPENDENT_REAUDIT_2026-07-12.md`
- `docs/coordination/codex/SYNC_MANIFEST_V66.md`
- `369-vault/知識/CodexV66独立再監査.md`

独立vault PRへ追加する鏡像候補:

- `知識/CodexV66独立再監査.md`
- `知識/SyncManifestV66.md`
- `index.md`のV66リンク

`PHASE_READINESS_MATRIX_V3.md`はapp PASS時だけ作成・同期する。現在は存在させない。

## Worktree isolation

- app evidence clean worktree: `/private/tmp/369-codex-v65-audit`
- app fixed-SHA preaudit: `/private/tmp/369-codex-v66-preaudit-52b98a5`
- vault clean worktree: `/private/tmp/369-vault-v65-sync`
- original app/vault worktree: dirty user stateを無変更で保持

## Artifact binding

- workflow run: `29165794115`
- head SHA: `52b98a5aa2e1b9f1a759085c51135a27b684c230`
- artifact ID: `8252150017`
- files: 12 PNG
- digest: `sha256:dadcde11b4668dfb60bbef0cf4d02c4b501623dfcb3aa73a3d28f99dcb9f493c`
- visual status: profile element screenshots clipped / `EVIDENCE_GAP`

## Sync gates

1. `CLAUDE_FIXED_V66` exact headを独立再監査する。
2. PASS時だけMatrix V3を作成する。
3. app/vaultのmirror blob、link、orphan、secret scanを確認する。
4. vault PR #3を通常merge commitでvault mainへ統合する。
5. app mainはCodexがmergeせず、Release Candidate PASSと人間GOを待つ。

## Credential state

remoteはcredential-free HTTPS URLである。過去credentialの値は読まない・記録しない。人間による失効・ローテーション確認までは`CREDENTIAL_ROTATION_REQUIRED`を維持する。

## Current declaration

- app Evidence: preauditをCodex Draftへ永続化中。
- independent vault: V66鏡像は未push。
- app main: HOLD。
- vault main: HOLD until app PASS。
- Production: HOLD。
- `SYNC_COMPLETE`: false。
