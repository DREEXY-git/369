# Adaptive Parallelism and Backpressure

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Capacity

| Resource | Initial | Absolute |
| --- | --- | --- |
| write WIP | 2 | 3 |
| Security review | 2 | 2 |
| Evidence review | 2 | 2 |
| integration train | 1 | 1 |
| read-only scout | 4 | 4 |

## Start gate

- active_write_wips < current_write_capacity
- security_review_queue <= 2
- evidence_review_queue <= 2
- integration_queue <= 1
- conflicting_lock_count = 0
- stale_lease_count = 0
- inventory_current = true
- incident_freeze = false
- definition_of_ready = PASS

## Automatic backpressure

- security_review_queue >= 3
- evidence_review_queue >= 3
- integration_queue >= 2
- sha_revalidation_queue >= 2
- stale_lease_count >= 1
- semantic_lock_miss = true
- post_merge_blocker_unclassified = true
- evidence_unavailable = true

backpressure中はread-only dependency audit、test plan、acceptance refinement、docs candidate、fixture isolation、次WIPのDoRへ切り替えます。

## 3rd lane gate

- consecutive_closed_wips >= 10
- unplanned_path_conflicts = 0
- semantic_lock_misses = 0
- stale_writer_pushes = 0
- pass_after_sha_change = 0
- integration_combination_failures = 0
- escaped_high_p1 = 0
- governance_vault_divergence = 0
- review_queue_limit_breaches = 0
- human_approval = true

## Metrics

- wip_cycle_count
- wip_cycle_duration
- review_wait
- review_rework_count
- sha_invalidation_count
- path_conflict_count
- semantic_lock_miss_count
- stale_lease_count
- takeover_count
- ci_retry_count
- integration_failure_count
- post_merge_blocker_count
- escaped_defect_severity
- queue_depth
- writer_utilization

PR数だけで速度を評価しません。
