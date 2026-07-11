# 369 OS v6.4 Codex independent re-audit

- Date: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- Pull request: #14
- Baseline head: `ba4a696f0f405546c9e963be87c364d493d6b539`
- Baseline CI: run `29162189316` (`411` unit / `119` E2E / `0` failed)
- Baseline artifact: `8251172821` (`12` PNG)
- Final reviewed head: `9e72958df31c8ee7f9a2636d1c817013c78ab882`
- Final CI: run `29163593089` (`423` unit / `121` E2E / `0` failed)
- Final artifact: `8251557866` (`12` PNG)
- Status: `FINAL / CHANGES_REQUIRED / HOLD`
- Release gate: `CHANGES_REQUIRED / main and Production HOLD`

## 1. Ownership and safety boundary

Codex performed read-only review of Claude-owned code and may edit only this coordination record, complete-function-ledger evidence, a Codex-only Obsidian mirror, and Codex branches or GitHub comments. Codex did not edit `apps/**`, `packages/**`, workflow files, roadmap 80, audit 176, task state, the vault root index, `AGENTS.md`, or `.codex/**`.

No main merge, Production action, database operation, migration, seed, reset, Secret access, external send, real LLM call, billing, or payment was performed.

## 2. Scout result

- PR #14 is Draft, open, and mergeable; base is `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`.
- Seven older review threads are outdated and unresolved.
- The current internal-escaped-quote P1 thread `PRRT_kwDOTBo7Kc6QIXC7` is active and unresolved.
- Total unresolved review threads observed: `8`.
- `CODEX_ACK_V64 + WORK_CLAIM` was posted as PR comment `4948224025`.
- `CLAUDE_ACK_V64` and `CLAUDE_FIXED_V64` were not present at the time of this snapshot.

## 3. Baseline P1 reproduction

The real exported `maskRunError` implementation was invoked directly with synthetic sentinels. An escaped outer quote at backslash depth 1 and an internal escaped quote at depth 3 leaked for every tested character after the internal quote.

| Case | Sentinel | Baseline result |
|---|---|---|
| comma | `DEPTHCOMMA64` | leaked |
| space | `DEPTHSPACE64` | leaked |
| semicolon | `DEPTHSEMI64` | leaked |
| LF | `DEPTHLF64` | leaked |
| brace | `DEPTHBRACE64` | leaked |
| bracket | `DEPTHBRACKET64` | leaked |

Summary: depth-matrix `6/6` leaked. The previous escaped-comma, raw LF, CRLF, nested multiple-key, and unclosed-value cases were masked, so the defect is isolated to the depth-3 internal quote boundary. A 100 KB synthetic input completed within the bounded scan and produced a one-line capped output.

## 4. Baseline visual evidence

- `nav-owner-mobile-full.png` is `288 x 63` pixels and contains only the brand row; it does not prove a usable mobile navigation drawer.
- `ai-agents-list-desktop.png` and `ai-agents-list-mobile.png` show the long `permissionLevel` badge extending outside its card or viewport.
- `ai-office-selected-desktop.png` contains a nonblank rendered 3D scene and a selected CFO profile.
- The artifact does not prove full eight-agent value parity for canonical key, full name, portrait, profile, and state across list, detail, and office.

## 5. Independent non-P1 oracles

- Stale rules agree for `RUNNING` and `QUEUED`: fresh blocks creation; stale and null allow creation.
- Build information is allowed for `OWNER` and `ADMIN`, and denied for `EXECUTIVE` and `READ_ONLY`.
- The canonical character registry contains eight distinct profiles with five skills each.
- No `test.only`, `test.skip`, `it.only`, or `it.skip` was found in the reviewed test trees.
- Roadmap 80 still contains undefined Evidence terms: `CI_GREEN` 12, `REQUIREMENT_ONLY` 24, and `IMPLEMENTED_ON_DRAFT` 1.
- BullMQ real-queue retry and failed telemetry remains `EVIDENCE_GAP`; unit evidence must not promote it.

## 6. Fixed-head handoff

Claude posted `CLAUDE_FIXED_V64` as comment `4948325379` and froze `9e72958df31c8ee7f9a2636d1c817013c78ab882`. The `ba4a696..9e72958` delta changes 12 Claude-owned files under `apps/**`, `packages/**`, roadmap 80, and tasks. It does not modify Codex-owned files, workflows, `AGENTS.md`, or `.codex/**`.

GitHub Actions run `29163593089` checked out the exact full SHA. The job logs show:

- stage1: Company Brain safety check passed, `36` test files and `423/423` tests passed, typecheck and lint completed successfully.
- stage3: build completed and Playwright reported `121 passed (2.2m)`.
- No `test.only`, `test.skip`, `it.only`, `it.skip`, or `test.fixme` was found at the fixed head.
- Artifact `8251557866` is bound to the exact head and contains 12 PNG files.

## 7. Final P1 result: still failing

The required opening-depth-1/internal-depth-3 matrix now masks all six delimiters (`0/6` leaks). The previous raw LF, CRLF, nested, multiple-key, unclosed, benign-context, max-length, and 100 KB cases also remain bounded and masked.

However, the new rule treats exactly one same-depth quote as a unique closer and ignores later quotes at other depths. An attacker can use that same-depth quote as a false closer and put the malformed terminal quote at another depth. A generated matrix covering opening depth `0..4`, terminal depth `open-2`, `open+1`, or `open+2`, and comma/space/semicolon/LF/brace/bracket leaked in `84/84` cases at the real exported function.

Example:

```text
{"password":"abc",O0F144S64\"}
=> {"password":[masked],O0F144S64\"}
```

This contradicts the stated fail-closed behavior for ambiguous or malformed input. The candidate tests exercise only the original direction (opening depth 1, internal depth 3); they do not exercise the inverse/mismatched depth sequence in direct output, FAILED storage, rethrow, or Action summary.

## 8. Final tenant, PII, and audit result

Two release-relevant data-boundary findings remain:

1. `apps/web/app/(app)/ai-agents/[id]/page.tsx` scopes the parent `AIAgent`, but nested `runs`, `actions`, and `memory` are not filtered by their own `tenantId`. The list page scopes `AIAgentRun` but does not require the related agent tenant to match and does not tenant-filter nested actions. The schema relations use only `agentId` or `runId`; there is no composite tenant foreign-key invariant. A deliberately inconsistent child row can therefore expose another tenant's memory value or action summary.
2. Both pages use broad Prisma `include`, which also reads unused `AIAgentRun.input`, `output`, and `error` fields that can contain payload, PII, or Secrets. The detail page renders memory and action content while claiming that data access is logged, but the path does not call `writeDataAccess` or `writeConfidentialViewLog`.

Required proof is an ephemeral-CI cross-tenant child fixture for memory/run/action, explicit nested tenant filters, minimal `select` projections, and a metadata-only DataAccessLog assertion. Production data and seed/reset are not required and must remain untouched.

## 9. Final visual and parity result

Confirmed improvements:

- `nav-owner-mobile-full.png` is now `288 x 844` and shows a usable full-height drawer.
- AI employee cards no longer overflow on desktop or mobile.
- The desktop 3D scene is visibly nonblank and the selected CFO identity matches the adjacent profile.
- Build information remains limited to OWNER/ADMIN.

Remaining Evidence gaps:

- The mobile drawer E2E checks height, deep scrolling/click, and Escape, but does not assert 67 rendered owner links or overlay-click closure.
- Eight-agent parity compares `key`, full name, and state. Portrait is only checked for SVG presence, and profile is checked only for card visibility/name. Appearance, personality, skills, traits, common mistakes, and evaluation note are not value-compared across list/detail/office.
- The profile-element screenshots are not clean full-profile proof: the desktop image contains a large blank band/topbar intrusion, and the mobile image starts mid-portrait and does not provide a clean complete profile view. The normal desktop/mobile page images remain useful supporting evidence, not eight-person parity proof.
- The mobile 2D office table is readable but over-wraps narrow headers and status text vertically; this is nonblocking visual debt.

## 10. Review-thread disposition

At the final review there are `13` threads: `3` resolved and `10` unresolved.

Resolved with exact-head evidence:

- stale RUNNING/QUEUED pre/post alignment
- OWNER/ADMIN build-information boundary
- roadmap 80 Evidence vocabulary and competitor-row demotion

Unresolved:

- all scanner-security threads, because the generalized P1 remains
- AI employee portrait/profile parity
- new exact-line threads for the generalized scanner input, nested tenant isolation, data minimization, parity evidence, and mobile NAV evidence

The formal Codex review is `4678563117`. Top-level handoff comments are `4948296590`, `4948307559`, `4948320178`, and `4948323738`.

## 11. Final gate

Severity within the reviewed scope:

- Critical: `0` observed
- High/P1: `2` release blockers (scanner fail-closed bypass; nested tenant child isolation)
- P2: data minimization/access logging, portrait/profile parity evidence, mobile NAV acceptance evidence
- Residual gaps: BullMQ real queue and Human Preview

`PHASE_READINESS_MATRIX_V3.md` was not created because the PASS conditions were not met. Phase evidence is not promoted, PR #14 remains Draft/HOLD, and `HUMAN_PREVIEW_PENDING` is not equivalent to Production verification.

Next non-overlapping WIPs for Claude are:

1. replace the quote-depth closer heuristic with a genuinely fail-closed strategy and run the generated depth matrix through all four error paths;
2. close nested tenant isolation, minimal-select, and DataAccessLog boundaries with an ephemeral child-fixture test;
3. complete portrait/profile fingerprints, mobile 67-link/overlay assertions, and clean full-profile artifacts.

`PHASE_READINESS_MATRIX_V3.md` must not be created unless Critical, High/P1, and release-blocking P2 are zero; all required threads are independently closed; exact-head CI and visual evidence pass; and Evidence is not promoted beyond proof.
