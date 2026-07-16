# Execution Environment Lease

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Scope

Git worktreeが別でも、同じDB、Redis、port、queue prefix、fixture、artifactを共有するとEvidenceが汚染されます。SHARED_HOST、ISOLATED_SANDBOX、CIを明示し、GitHub resource lockとは別に管理します。

## Fields

- `environment_lease_id`
- `wip_id`
- `execution_scope`
- `execution_host_id`
- `worktree_id`
- `local_worktree_path`
- `branch`
- `temp_dir_id`
- `artifact_dir_id`
- `web_port`
- `worker_namespace`
- `database_strategy`
- `database_name_or_schema`
- `redis_strategy`
- `redis_port_or_db`
- `queue_prefix`
- `playwright_output_dir_id`
- `test_tenant_prefix`
- `log_namespace`
- `external_send_enabled`
- `llm_provider`
- `mail_provider`
- `production_endpoints_allowed`
- `lease_state`

## Isolation rules

- Production endpointとcredential値を禁止する。
- public GitHubへ個人名、local username、hostname、個人absolute pathを永続化しない。
- 同一host scope内のDB、Redis、queue prefix、port、fixture、artifact重複を0にする。
- shared seed tenantの広域cleanupを禁止し、WIPが作成したIDだけをcleanupする。
- Playwright outputを共有しない。
- docs-onlyはNOT_REQUIRED_WITH_REASONを許可する。
- 別sandboxでもsemantic lock conflictは別途判定する。
