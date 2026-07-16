# Business Phase Governance + Multi-Chat Control Plane v4 Candidate

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## 目的

このパッケージは、Business PhaseをBP00〜BP20へ整理し、複数chatのwrite・review・integrationを安全に調整するDelivery Control Planeの候補です。アプリ機能、DB、Productionを変更するものではありません。

## 採用前の境界

- Candidateはmain統合と人間の採用判断まで正本ではありません。
- 今回の変更は本ディレクトリと scripts/governance/phase-multichat-v4 だけです。
- CURRENT_STATE、CLAUDE.md、既存roadmap/audit、Function Master、standalone vaultは非変更です。
- GitHub Control Issue、WIP Issue、label、branch protection、merge queueはまだ作りません。
- epoch・fencing tokenはchecker等を導入するまでプロセス統制であり、技術的完全排他ではありません。

## 読む順序

1. [入口 / Candidate境界](00_README.md)
2. [Charter](01_GOVERNANCE_AND_CONTROL_PLANE_CHARTER.md)
3. [Business Phase Map](02_BUSINESS_PHASE_MAP_CANDIDATE.md)
4. [Phase Alias Model](03_PHASE_ALIAS_MODEL_CANDIDATE.md)
5. [Role Catalog](04_ROLE_CATALOG.md)
6. [Control Plane State Machine](05_CONTROL_PLANE_STATE_MACHINE.md)
7. [Fenced Lease Protocol](06_FENCED_LEASE_PROTOCOL.md)
8. [Change Surface Manifest](07_CHANGE_SURFACE_MANIFEST.md)
9. [Resource Lock Model](08_RESOURCE_LOCK_MODEL.md)
10. [Execution Environment Lease](09_EXECUTION_ENVIRONMENT_LEASE.md)
11. [Risk Tier / Gates](10_RISK_TIER_AND_REQUIRED_GATES.md)
12. [WIP DoR / DoD](11_WIP_DEFINITION_OF_READY_AND_DONE.md)
13. [Adaptive Parallelism](12_ADAPTIVE_PARALLELISM_AND_BACKPRESSURE.md)
14. [Branch / Commit / PR](13_BRANCH_COMMIT_PR_PROTOCOL.md)
15. [Handoff / Review Packet](14_HANDOFF_AND_REVIEW_PACKET_PROTOCOL.md)
16. [Integration Train](15_INTEGRATION_TRAIN_AND_MERGE_QUEUE.md)
17. [Freeze / Incident](16_FREEZE_AND_INCIDENT_PROTOCOL.md)
18. [Live State Snapshot](17_LIVE_STATE_SNAPSHOT.md)
19. [Open PR Disposition](18_OPEN_PR_DISPOSITION_MATRIX.md)
20. [Adoption / Migration](19_ADOPTION_AND_MIGRATION_PLAN.md)
21. [Human Decisions](20_HUMAN_DECISIONS_REQUIRED.md)
22. [V4 Changelog](21_V4_CHANGELOG_AND_V2_SUPERSESSION.md)

## Machine-readable candidate

- [Canonical data](data/manifest.json)
- [JSON Schemas](schemas/program-control-record.schema.json)
- [Synthetic examples](examples/EXAMPLE_RT0_DOCS_WIP.json)
- [Chat prompts](prompts/DIR-01_PROGRAM_DIRECTOR.md)
- [Follow-up prompts](followups/PROMPT_GOVERNANCE_ADOPTION_V4.md)

## 検証

```bash
node scripts/governance/phase-multichat-v4/generate.mjs --check
node scripts/governance/phase-multichat-v4/check.mjs
node scripts/governance/phase-multichat-v4/selftest.mjs
node scripts/governance/phase-multichat-v4/simulate-scheduler.mjs
```
