# WIP Definition of Ready and Done

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Definition of Ready

- [ ] purposeが1文で明確
- [ ] BP / RP / WS / Function ID候補
- [ ] base SHA
- [ ] allowed / forbidden paths
- [ ] Resource Lock manifest
- [ ] dependency DAG
- [ ] Risk Tier
- [ ] acceptance criteria
- [ ] required tests
- [ ] rollback / disable方法
- [ ] Human Gate
- [ ] reviewer assignment
- [ ] active conflicting lease 0
- [ ] open PR overlap確認
- [ ] schema / package / CI / singleton変更の有無

未確定が1件でもあればREQUIRED_INPUTまたはHOLDです。

## Definition of Done

- [ ] allowed scopeのみ変更
- [ ] tests / static checks / required evidence
- [ ] implementation packet
- [ ] fixed SHA freeze
- [ ] QA-SEC PASS
- [ ] QA-EVID PASS
- [ ] integration verification
- [ ] blocking thread 0
- [ ] Human Gate packet
- [ ] main merge後CI / Evidence
- [ ] 必要なGovernance同期
- [ ] 人間Close承認

## Scope expansion

DEVは新pathやsemantic resourceを勝手に追加しません。SCOPE_EXPANSION_REQUEST→ARCH再評価→DIRによるlease revision更新→旧review失効の順です。
