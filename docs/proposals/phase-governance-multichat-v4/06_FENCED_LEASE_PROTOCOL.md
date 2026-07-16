# Fenced Lease Protocol

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Director epoch / control revision

同時にactiveなDirectorは1つだけです。交代時はdirector_epochを増やし、旧epochのleaseをADOPTEDまたはREVOKEDへ明示分類します。Program Control Recordの権威ある更新ごとにcontrol_revisionを増やします。

## Fencing token

形式候補は FT-<director_epoch>-<lease_revision>-<uuid> です。実装packet、commit trailer、PR body、freeze、両review、integration packetへ同じtokenを入れます。取消・再発行後の旧tokenではcommit、push、PR更新、PASS marker、Human Gate宣言を禁止します。

## Lease revision

allowed paths、locks、acceptance、risk、dependencyが変わるたびにlease_revisionを増やし、旧PASSを失効させます。heartbeatだけでは増やしません。

## Takeover

1. Directorがbranch、head SHA、PR、uncommitted有無を確認する。
2. 旧leaseをREVOKEDまたはLEASE_EXPIREDへ遷移する。
3. lease revisionを増やし、新tokenを発行する。
4. 同一branch継続か新branchかを明示する。
5. 旧chatが再開してもwrite不可であることをmarkerへ残す。
6. uncommitted local-only変更は正本にしない。
7. 新ownerがbase、files、locks、testsを再確認する。

## Review invalidation

- head_sha
- relevant_base_sha
- fencing_token
- lease_revision
- resource_manifest_hash
- acceptance_criteria_revision
- risk_tier
- required_test_set

自動強制導入前はプロセス統制とHuman Gateに依存し、完全な排他保証を主張しません。
