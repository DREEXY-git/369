# Adoption and Migration Plan

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Sequence

1. GOV-V4-ADOPT-01 — Candidate採用判断
2. GOV-V4-CONTROL-01 — GitHub Control Issue / WIP Issue候補導入
3. GOV-V4-STATE-01 — CURRENT_STATE / CLAUDE入口pointer移行
4. GOV-V4-VAULT-01 — standalone vault生成鏡像
5. GOV-V4-LINK-01..N — legacy mapping batch
6. GOV-V4-AUTO-01 — checker warning-only導入
7. DELIVERY-V4-PILOT-01 — 2 write lane pilot
8. DELIVERY-V4-SCALE-01 — 10 WIP gate後の3rd lane判断

## Rollback

Candidate不採用時は本専用pathを統合しないだけで、runtimeや既存正本に影響しません。採用後も各段を別WIP/PRとし、pointer、mirror、legacy mapping、pilotを一括変更しません。
