# Integration Train and Merge Queue Candidate

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Ephemeral train

両QA PASS済みfixed SHAだけを最新main上の一時branch/local merge simulationへ入れます。merge commit方式で組み合わせ、rebase、squash、cherry-pickを禁止します。成功してもmainへmergeしません。

## Batch size

- RT3 / singleton: 1 PR
- RT0〜RT1でresource共有なし: 最大2 PR候補
- RT2: 原則1〜2 PR
- 3 PR以上: 別Human Gate

## Main drift

base..latest mainのfiles、semantic resources、model/event/state machine、fixture、generated artifactを確認します。irrelevant driftはintegration再検証、relevant driftはfeature PASS再評価です。

## Post-merge

Human merge後もexact main CI、post-merge check、artifact、blocking thread 0、Governance同期候補が揃うまでCLOSEDにしません。
