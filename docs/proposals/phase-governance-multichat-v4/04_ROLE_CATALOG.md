# Role Catalog and RACI

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Roles

### DIR-01 — Program Director / Lease Authority

責務:

- live main・queue・Human Gate管理
- DoR確認
- Leaseとepoch/control revision管理
- capacity/backpressure管理

禁止:

- feature code変更
- QA PASS代行
- main merge

### ARCH-01 — Architecture / Dependency Scout

責務:

- read-only dependency監査
- semantic change surface検証
- lockとDAG検証

禁止:

- feature write

### OPS-01 — Environment / CI Capacity Coordinator

責務:

- execution environment分離
- CI/local capacity把握
- cleanup計画

禁止:

- Production endpoint
- secret参照
- feature write

### DEV-01..03 — Implementation Lanes

責務:

- grant済み1 WIP実装
- targeted tests
- implementation packetとfixed SHA freeze

禁止:

- 自己assign
- 複数WIP
- scope自己拡大
- 自己QA
- main merge

### QA-SEC-01 — Security / Correctness Reviewer

責務:

- tenant/RBAC/actor
- transaction/concurrency/retry/idempotency
- audit/PII/secret
- fixed SHA read-only review

禁止:

- target branch write

### QA-EVID-01 — Test / Evidence Reviewer

責務:

- acceptance coverage
- test collection/skip/exact-head CI
- artifact/Function Evidence
- fixed SHA read-only review

禁止:

- target branch write

### INT-01 — Integration / Release Queue Manager

責務:

- 両QA PASS SHAだけをqueue投入
- base driftとintegration train
- rollback順序

禁止:

- feature implementation
- Human Gateなしmerge

### GOV-01 — Governance / Evidence / Vault Sync

責務:

- main統合後Evidence同期候補
- Phase/Alias/vault mirror候補

禁止:

- Draftをmain済みと記録
- PreviewをProductionと記録
- runtime write

### SCOUT-* — Read-Only Specialist

責務:

- domain read-only調査
- finding永続化
- DIRへ返却

禁止:

- write leaseなしの変更

## RACI

| 事項 | R | A | C | I |
| --- | --- | --- | --- | --- |
| WIP提案 | DIR / SCOUT | DIR | ARCH | DEV / QA |
| Lease grant | DIR | DIR | ARCH / OPS | DEV / QA |
| 実装 | DEV | DEV | ARCH | DIR |
| Security判定 | QA-SEC | QA-SEC | ARCH | DIR / DEV |
| Evidence判定 | QA-EVID | QA-EVID | OPS | DIR / DEV |
| Integration順 | INT | Human Gate | DIR / QA | DEV / GOV |
| main merge | Human | Human | INT / DIR | all roles |
| Evidence / vault sync | GOV | Human or explicit owner | DIR / QA | all roles |

## Independence

QA-SECとQA-EVIDは別role・別chatで、同じfull SHA、token、manifest hashを確認します。DEV、DIR、INTはQA PASSを代行できません。
