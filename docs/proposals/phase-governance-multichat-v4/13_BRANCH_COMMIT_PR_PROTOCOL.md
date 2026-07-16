# Branch, Commit and PR Protocol

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Worktree / branch

1 write WIP = 1専用worktree = 1branchです。既定baseは最新origin/main。dirtyな元checkoutをstash/reset/cleanせず、stacked PRはHuman Gateなしで使いません。

## Commit trailer candidate

```text
WIP-ID: WIP-...
Lease-ID: LEASE-...
Fencing-Token: FT-...
Director-Epoch: 12
BP: BPxx
RP: RP-...
WS: WS-...
Base-SHA: <full sha>
Risk-Tier: RTx
```

## Freeze

review前にIMPLEMENTATION_FREEZEへWIP、lease、token、head/base SHA、manifest hash、acceptance revision、risk、checks、known unknownsを記録します。freeze後はCHANGES_REQUIREDまで無断pushしません。

## PR body minimum

- WIP / Lease / token
- BP / RP / WS / Function IDs
- base / head SHA
- scope / non-scope
- allowed paths / locks
- Risk Tier
- acceptance
- tests / evidence
- known unknowns
- Human Gates
- rollback
- dependency / integration order
- no Production / DB / external等の境界

force push、rebase、reset、amend、silent cherry-pickは禁止です。
