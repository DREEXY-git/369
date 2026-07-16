# Change Surface Manifest

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Why

ファイル差分だけでは、同じmodel、state transition、event、approval、idempotency、queue、audit、fixtureの競合を検出できません。各WIPはsemantic change surfaceを先に宣言します。

## Required fields

- `manifest_id`
- `wip_id`
- `primary_bp`
- `affected_bps`
- `function_ids`
- `unmapped_candidates`
- `allowed_paths`
- `forbidden_paths`
- `resource_locks`
- `prisma_models`
- `state_machines`
- `approval_types`
- `events`
- `idempotency_namespaces`
- `queues`
- `worker_jobs`
- `rbac_permissions`
- `labels`
- `data_classifications`
- `test_data_class`
- `audit_actions`
- `outbox_messages`
- `api_routes`
- `generated_artifacts`
- `canonical_docs`
- `test_targets`
- `external_side_effects`
- `schema_impact`
- `migration_impact`
- `rollback_plan`
- `remediation_plan`

## Rules

- primary_bpは1件。affected_bpsは複数可。
- Function IDが無い候補はUNMAPPED_CANDIDATEへ列挙する。
- test dataはSYNTHETIC / DEMOを原則とし、実顧客PIIを禁止する。
- external_side_effectsが無い場合もNONEを明示する。
- manifest hashをLease、freeze、両review、integrationへ含める。
- scope expansion時はHOLDし、ARCH再評価とlease revision更新を行う。
