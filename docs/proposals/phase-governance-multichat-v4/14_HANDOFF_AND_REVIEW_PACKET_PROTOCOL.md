# Handoff and Review Packet Protocol

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Implementation packet

packetVersion、wipId、leaseId、fencingToken、directorEpoch、baseSha、headSha、changedFiles、resourceManifestHash、acceptanceRevision、riskTier、testsRun、testCounts、redGreenEvidence、knownUnknowns、unresolvedRisks、humanGates、rollbackPlan、nextReviewerを必須候補とします。

## Structured finding

- findingId
- reviewerRole
- reviewedSha
- severity
- blocking
- invariant
- evidencePath / line / test
- reproduction
- expectedSafeBehavior
- recommendedFixBoundary
- regressionTestRequired
- status

## Independent packets

- QA-SEC: tenant、RBAC/actor、transaction、idempotency、concurrency、retry、audit、PII/secret、findings、verdict
- QA-EVID: acceptance coverage、collected tests、pass/fail/skip、exact-head CI、artifacts、red→green、Function Evidence、findings、verdict
- INT: constituent SHA、merge order、DAG、combined tree hash、checks、base drift、conflict、rollback order、Human Gate checklist

## Ownership

finding作成Reviewerか明示された独立Reviewerだけがtechnical resolutionを確認します。DEVは自己resolveしません。Human overrideはDEC recordを必要とします。
