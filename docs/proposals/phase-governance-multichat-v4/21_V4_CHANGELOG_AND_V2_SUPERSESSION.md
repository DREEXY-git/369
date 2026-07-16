# V4 Changelog and V2 Supersession

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## V2からの主な改善

- Director epochとcontrol revision
- fencing tokenとlease revision
- Change Surface Manifest
- 4-mode Resource Lockとhierarchy/order
- Execution Environment Lease
- shared host / isolated sandbox分離
- public repository privacy
- DoR / DoD
- Risk Tier
- 独立QAとpreliminary blind verdict
- structured finding
- adaptive backpressure
- 10 WIP pilot scaling gate
- tiered PR audit
- session resume handshake
- prompt-injection境界
- takeover protocol
- ephemeral integration train
- domain/global freeze分離
- capability matrix
- deterministic generator
- negative self-test
- scheduler simulation
- Candidate-only段階移行

## Supersession rule

V4はV2の履歴を削除・改名しません。人間がV4を採用しmainへ統合した後に、V2をSUPERSEDEDとしてpointerで示す後続WIPが必要です。それまではV4はCandidateです。

## 12-view self-review

| View | Verdict | Finding / mitigation |
| --- | --- | --- |
| Program Director | PASS | DoR前のwrite禁止と段階導入を明示 |
| Distributed Systems | PASS_WITH_LOW | 自動強制前はprocess trust assumption。完全排他を主張しない |
| Delivery Architect | PASS | review/integration queueでbackpressure |
| Architecture | PASS | file以外のsemantic surfaceとhierarchyを定義 |
| Security | PASS | untrusted content、privacy、Human Gateを維持 |
| Database / Concurrency | PASS | environment leaseとsingletonを分離 |
| QA | PASS | 同一SHAの独立QAとPASS invalidation |
| Release | PASS | ephemeral train、drift、rollback、main Human Gate |
| Git Historian | PASS | 既存本文を置換せずAlias/pointerで移行 |
| Information Architect | PASS | BP/RP/WS/WIPを別軸化 |
| Non-Engineer | PASS_WITH_LOW | 概念量が多いためREADME順序とpilotで緩和 |
| Operations | PASS_WITH_EVIDENCE_GAP | workflow run取得はfirst-page wrapper。PR path collision判定には影響なし |

残存Critical / High / Release-blocking Mediumは0件です。Low 2件とEvidence Gap 1件はCandidate本文とlive snapshotへ明示しました。

## Self-score

| Category | Score |
| --- | --- |
| Phase用語の一意性 | 10/10 |
| BP00〜BP20原典忠実性 | 10/10 |
| role separation | 10/10 |
| fenced lease / stale writer防止 | 9/10 |
| semantic lock / environment isolation | 10/10 |
| risk-based review | 10/10 |
| adaptive throughput | 10/10 |
| fixed SHA / evidence / integration | 10/10 |
| 既存PR / dirty環境の非破壊 | 9/10 |
| 段階採用 / rollback safety | 10/10 |
| Total | 98/100 |

減点は、自動policy導入前のfencingがprocess trust assumptionであることと、workflow run wrapperがfirst-page限定であることによります。

## Source hashes

- V4 prompt SHA-256: 9f4adc74e0ce2e4c4adbf958c390ec37100a5a1b552c839e66936db3b5713a63
- V2 predecessor SHA-256: e79b5f9191fcff85ab878a573b4d71e63e8bceda0c3c4218fe2ee6997d8f1e10
