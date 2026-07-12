# 369 OS Codex Sync Manifest V68

- 日付: 2026-07-12 JST
- 状態: `PREAUDIT_SYNCED / WAITING_FOR_CLAUDE_FIXED_V68`
- app repository: `DREEXY-git/369`
- independent vault repository: `DREEXY-git/369-vault`

## GitHub refs

| 対象 | ref / PR | SHA | 状態 |
|---|---|---|---|
| app main | `main` | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | unchanged / Production HOLD |
| Claude app | PR #14 | `3b11b42cab734e4f199d220df16a75b5ea882f07` | V67 head / V68 fixed待ち |
| Codex Evidence | PR #16 | `0f173e140214dd67c377ccc2f750a3464572028f` | Draft / V68追加前 |
| Phase 3.5 design | `claude/p35-approval-bridges-v1` | `e555ee870da6647f32de9f1b4e5872db2dec4628` | docs-only / PRなし |
| vault main | `main` | `0812634ec443abf966819d2cf6b10e73efb3a94a` | unchanged / PASS待ち |
| vault sync | PR #3 | `0629d13d62d70635401348f56b602f625c2a600a` | Draft / V68追加前 |

## V68 files

app Codex PRへ追加する正本候補:

- `docs/coordination/codex/V68_INDEPENDENT_REAUDIT_2026-07-12.md`
- `docs/coordination/codex/SYNC_MANIFEST_V68.md`
- `369-vault/知識/CodexV68独立再監査.md`
- `369-vault/知識/SyncManifestV68.md`
- `369-vault/index.md`のV68リンク

独立vault PRへ追加する鏡像候補:

- `知識/CodexV68独立再監査.md`
- `知識/SyncManifestV68.md`
- `index.md`のV68リンク

`PHASE_READINESS_MATRIX_V3.md`はapp PASS時だけ作成・同期する。現在は存在させない。

## Worktree isolation

- app evidence clean worktree: `/private/tmp/369-codex-v66-evidence`
- app fixed-SHA preaudit: `/private/tmp/369-codex-v67-3b11`
- vault clean worktree: `/private/tmp/369-vault-v65-sync`
- original app/vault worktree: dirty user stateを無変更で保持

## Artifact binding

- workflow run: `29167981816`
- head SHA: `3b11b42cab734e4f199d220df16a75b5ea882f07`
- artifact ID: `8252750312`
- files: 16 PNG
- bytes: 2,026,907
- digest: `sha256:0424da09bd97a730a63f15f92dcbe19a234e203039b8f12f7aecb675306c46dd`
- visual status: NAV/list/canvas/detailは確認、office full-profileはclipped / `EVIDENCE_GAP`

## Sync gates

1. `CLAUDE_FIXED_V68`のexact headを独立再監査する。
2. PASS時だけMatrix V3を作成する。
3. app/vaultのmirror blob hash、link、orphan、secret scan、commit graphを確認する。
4. app PASS後だけvault PR #3を通常merge commitでvault mainへ統合する。
5. app mainはCodexがmergeせず、Release Candidate PASSと人間GOを待つ。
6. Human Preview、Production、schema、Secrets、外部connector、実LLM、課金は人間Gateに残す。

## Credential state

remoteはcredential-free HTTPS URLである。過去credentialの値は読まない・記録しない。人間による失効・ローテーション確認までは`CREDENTIAL_ROTATION_REQUIRED`を維持する。

## Current declaration

- app Evidence: V68 preauditをCodex Draftへ永続化中。
- independent vault: V68鏡像をDraftへ永続化中。
- app main: HOLD。
- vault main: HOLD until app PASS。
- Release Candidate / Human Preview / Production: HOLD。
- `SYNC_COMPLETE`: false。
