# Freeze and Incident Protocol

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Levels

- WIP_FREEZE:<wip-id>
- DOMAIN_FREEZE:<domain>
- PROGRAM_FREEZE:<rp-id>
- GLOBAL_WRITE_FREEZE

## Triggers

- cross-tenant exposure
- secret / credential exposure
- destructive DB risk
- review bypass
- stale token push
- 無承認main / Production操作
- conflicting singleton write
- evidence falsification
- Critical / High incident

## Behavior

対象scopeの新規write leaseを停止し、active writerを安全地点でfreezeします。read-only investigationは継続し、無関係なdomainは止めません。解除はHuman Gateで行い、履歴を削除しません。
