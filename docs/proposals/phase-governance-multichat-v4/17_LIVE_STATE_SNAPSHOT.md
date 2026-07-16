# Live State Snapshot

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Snapshot identity

| Field | Value |
| --- | --- |
| asOf | 2026-07-16T12:50:59Z |
| expiresAt | 2026-07-17T12:50:59Z |
| app main | 7e50a04df6dcc8043689958cbfd9be42e15e1af7 |
| vault main | 8eab43618c19e6b675f11ef7f43cf33c8cf87177 |
| read capability | READ_FULL |
| publish capability | PUBLISH_PR_AND_COMMENT |
| open PR | 32 |

## Source checkout

元checkoutはbranch codex/f1d-e2e-locators / HEAD bb3e74008ad4637b531ed1ca984e04a9e598253c、modified 1、untracked 7でした。Candidate作業では変更していません。個人absolute pathは永続化しません。

## Isolated worktree

logical ID WT-GOV-V4-7E50A04、base 7e50a04df6dcc8043689958cbfd9be42e15e1af7、開始時cleanです。local pathはpublic artifactへ保存しません。

## Capability / gaps

GitHub connectorでmetadata、changed filenames、review/comment、head statusを取得しました。ローカルghは未導入のままです。workflow run wrapper is first-page only; head status was captured for all PRs formal close / supersession decisions require human review

## Collision

V4 Candidate exact path、remote branch、既存PR、Candidate canonical singletonの衝突はすべて0です。既存PR内の別singleton overlapは観測しましたが、今回それらを編集しないため非blockingです。
