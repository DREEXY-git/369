# Resource Lock Model

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Modes

| Mode | Meaning |
| --- | --- |
| SNAPSHOT_READ | full SHA固定read-only。writeを阻害しない |
| INTENT_WRITE | write準備。別write系と競合 |
| WRITE | resourceのsingle writer |
| EXCLUSIVE | 親子resourceを含む完全排他 |

## Compatibility

| Held / Requested | SNAPSHOT_READ | INTENT_WRITE | WRITE | EXCLUSIVE |
| --- | --- | --- | --- | --- |
| SNAPSHOT_READ | 可 | 可 | 可 | 可 |
| INTENT_WRITE | 可 | 不可 | 不可 | 不可 |
| WRITE | 可 | 不可 | 不可 | 不可 |
| EXCLUSIVE | 可 | 不可 | 不可 | 不可 |

## Resource types

- FILE:<normalized-id>
- DIR:<normalized-id>
- MODEL:<normalized-id>
- MODEL_FIELD:<normalized-id>
- STATE_MACHINE:<normalized-id>
- STATE_TRANSITION:<normalized-id>
- APPROVAL_TYPE:<normalized-id>
- EVENT:<normalized-id>
- IDEMPOTENCY_NAMESPACE:<normalized-id>
- QUEUE:<normalized-id>
- WORKER_JOB:<normalized-id>
- RBAC:<normalized-id>
- LABEL:<normalized-id>
- AUDIT_ACTION:<normalized-id>
- OUTBOX:<normalized-id>
- API_ROUTE:<normalized-id>
- GENERATED_ARTIFACT:<normalized-id>
- DOC_CANONICAL:<normalized-id>
- VAULT_INDEX:<normalized-id>
- TEST_FIXTURE:<normalized-id>
- SEED_TENANT:<normalized-id>
- TEST_DATABASE:<normalized-id>
- REDIS_QUEUE:<normalized-id>
- LOCAL_PORT:<normalized-id>
- ARTIFACT_PATH:<normalized-id>
- ENV_CONTRACT:<normalized-id>

## Hierarchy

| Parent | Child | Rule |
| --- | --- | --- |
| DIR | FILE | normalized path containment |
| MODEL | MODEL_FIELD | model name prefix |
| STATE_MACHINE | STATE_TRANSITION | state machine name prefix |
| QUEUE | WORKER_JOB | declared queue ownership |
| DOC_CANONICAL | GENERATED_ARTIFACT | declared generation lineage |

## Deadlock prevention

全lockを正規化文字列のcode-point昇順で一括取得します。部分取得後の追加取得とlock upgradeを禁止し、追加が必要ならHOLD→lease revision更新→全lock再発行とします。

## Singleton

- Prisma schema / migration
- package / lock
- .github/workflows/**
- central RBAC / labels
- central approval dispatcher
- Domain Event / Outbox core
- tasks/CURRENT_STATE.md
- Business Phase canonical JSON
- Function Master generated files
- standalone vault index.md
- main integration train
