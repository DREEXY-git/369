# Risk Tier and Required Gates

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## RT0 — docs / read-only / generated candidate

Parallelism: normal

- path boundary
- link / JSON / deterministic check
- secret scan
- QA-EVID

## RT1 — isolated UI / pure logic / no write-side effect

Parallelism: normal

- unit
- typecheck / lint
- QA-EVID
- security spot check

## RT2 — domain write / internal state change

Parallelism: up to current writer capacity

- unit + integration
- tenant / RBAC / audit
- idempotency / error path
- QA-SEC + QA-EVID
- integration train

## RT3 — finance / security / PII / worker / queue / external boundary

Parallelism: one integration at a time

- independent QA-SEC + QA-EVID
- realistic integration
- concurrency / retry / fault injection
- exact-head CI
- artifact / logs
- Human Gate

## RT4 — schema / migration / CI workflow / Production / billing / external send

Parallelism: single WIP

- explicit Human Gate
- rollback / backfill / migration plan
- pre-production evidence
- post-merge verification
- secrets / environment review

Bootstrap Candidateでは実行禁止。

## Escalation

作業中にTierが上がったらDEVはfreezeし、DIR/ARCHがlease revision、reviewer、tests、Human Gateを更新します。旧PASSは失効します。Tierを下げるには人間または独立Reviewerの根拠が必要です。
