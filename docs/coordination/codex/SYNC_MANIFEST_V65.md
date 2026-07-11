# 369 OS Sync Manifest V65

- Date: 2026-07-12 JST
- Status: `IN_PROGRESS / NOT_SYNC_COMPLETE`
- Owner: Codex QA and synchronization audit
- Production: `NOT_TOUCHED / IMPACT_NOT_YET_CONFIRMED`

## 1. Canonical refs observed

| Scope | Ref | Observed SHA | State |
|---|---|---|---|
| app GitHub | `main` | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | current production lineage candidate; V65 not integrated |
| app PR #3 | `claude/ci-stage3-e2e-f1d-selectors-hikwbg` | `24782cc933d0af4f532f3d897790cddc0b36c04b` | Draft/open |
| app PR #12 | `claude/integration-v59` | `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c` | Draft/open |
| app PR #14 | `claude/full-recovery-v61` | `9e72958df31c8ee7f9a2636d1c817013c78ab882` | Draft/HOLD; V65 fixed head not received |
| app PR #15 | `codex/phase-roadmap-audit-v2` | `553e4537a05ad0be726b5e16420da81e5b3c29b3` | stale V2 snapshot |
| app PR #16 | `codex/v64-independent-reaudit` | `8add2422e70ea03984e084db738144932ade731c` | Draft; V64 evidence canonical remote history |
| Codex local archive | `codex/archive-v64-local-7c54901` | `7c54901a7fc17479f9e9196e7eb64f5c0078e5d7` | preserved, not canonical remote |
| Codex V65 clean worktree | `codex/v65-independent-reaudit-sync` | `8add2422e70ea03984e084db738144932ade731c` | clean start from remote canonical |
| independent vault GitHub | `main` | `0812634ec443abf966819d2cf6b10e73efb3a94a` | V64/V65 notes not integrated |
| independent vault local | `main` | `0812634ec443abf966819d2cf6b10e73efb3a94a` | SHA matches GitHub; user untracked files preserved |

## 2. Pull request topology snapshot

| PR | State | Draft | Merged | Head | Base |
|---:|---|---|---|---|---|
| 3 | open | yes | no | `24782cc` | `main@ffd586b` |
| 4 | open | yes | no | `95c8936` | `main@ffd586b` |
| 5 | open | yes | no | `3386bee` | `main@ffd586b` |
| 6 | open | yes | no | `e2278ea` | `main@ffd586b` |
| 7 | closed | yes | yes | `a859d71` | feature lineage |
| 8 | closed | yes | yes | `2dbef04` | feature lineage |
| 9 | open | yes | no | `bf81713` | `main@ffd586b` |
| 10 | closed | yes | yes | `8e98cef` | feature lineage |
| 11 | closed | yes | yes | `d469644` | feature lineage |
| 12 | open | yes | no | `7ef2d9f` | feature lineage |
| 13 | open | yes | no | `34bb08d` | integration lineage |
| 14 | open | yes | no | `9e72958` | integration lineage |
| 15 | open | yes | no | `553e453` | stale recovery snapshot |
| 16 | open | yes | no | `8add242` | recovery lineage |

The final integration graph must be recomputed from live refs after `CODEX_PASS_V65`. Existing Stream PRs must not be merged again if their commits are already reachable from the final recovery lineage.

## 3. Content and history checks

| Check | Result |
|---|---|
| V64 audit local/remote full Markdown content | equal |
| V64 audit Git blob SHA | `8c247ca52d3cfb4fc34297e66b5d6d31f37a6c40` equal |
| V64 mirror Git blob SHA | `12385af8196634e6119600e441e48f2b40f21292` equal |
| V64 local/remote commit history | divergent after `ba4a696`; preserved non-destructively |
| force/rebase/hard reset | not used |
| dirty app worktree | unchanged |
| dirty vault user files | unchanged |
| vault remote credential value | not printed or reused |
| credential-free remote replacement | complete |
| credential revocation/rotation | `CREDENTIAL_ROTATION_REQUIRED` |

## 4. Evidence bindings currently available

| Item | Value |
|---|---|
| reviewed V64 head | `9e72958df31c8ee7f9a2636d1c817013c78ab882` |
| exact-head CI | `29163593089` |
| unit | `423/423` |
| E2E | `121/121` |
| artifact | `8251557866` |
| artifact files | 12 PNG |
| formal review | `4678563117` |
| top-level result | `4948356332` |
| V65 work claim | `4948421696` |
| BullMQ real queue | `EVIDENCE_GAP` |
| Human Preview | pending |

These V64 bindings cannot be reused as V65 final evidence after the Claude head changes.

## 5. Required synchronization sequence

1. Receive and freeze `CLAUDE_FIXED_V65` exact head.
2. Complete independent P1/tenant/parity/NAV/deep-link/CI/artifact audit.
3. Publish `CODEX_PASS_V65` or `CHANGES_REQUIRED / HOLD`.
4. On PASS only, create `PHASE_READINESS_MATRIX_V3.md`.
5. Update PR #16 or a non-force successor PR with final V65 evidence.
6. Synchronize V64/V65 notes, Matrix V3, manifest, and required index links to independent vault branch.
7. Merge independent vault PR to vault main only after app PASS.
8. Review Claude release candidate and publish `CODEX_MAIN_SYNC_READY_V65` only if ancestry, content, CI, and safety pass.
9. Claude merges app main only after the separate Production-impact gate.
10. Verify app main, independent vault main, and clean local tracking refs by SHA and tree/hash.

## 6. `SYNC_COMPLETE_V65` gate

Current value: `false`.

All of the following are required:

- app PR #14 exact head receives `CODEX_PASS_V65`
- required Codex evidence is reachable from final app main
- no required unique commit or content is missing
- no duplicate cherry-pick or duplicate Stream merge
- app GitHub main and clean local tracking SHA/tree match
- independent vault GitHub main and clean local tracking SHA/tree match
- in-repo and independent-vault mirror hashes match
- no force push or shared-history rebase
- credential value exposure is zero
- human `CREDENTIAL_ROTATION_ACK`
- Production impact and final state are explicitly recorded

Until every condition is met, use `IN_PROGRESS`, `HOLD`, or a named Evidence Gap rather than `SYNC_COMPLETE`.
