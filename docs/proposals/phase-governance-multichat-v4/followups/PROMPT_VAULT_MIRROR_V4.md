# GOV-V4-VAULT-01 — Vault mirror Follow-up Prompt

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。

## Objective

main統合済みCandidateだけをObsidian生成鏡像へ反映する。

## Required preconditions

- V4 Candidateの人間採用判断
- 最新main SHAとopen PR inventory
- 専用WIP / Lease / token
- allowed / forbidden paths
- Risk Tier / DoR / reviewers / Human Gates

## Boundaries

今回のfollow-upは別WIPです。main merge、Production、DB、external send、real LLM、billingを自動承認しません。既存履歴を置換せず、追記とpointerで段階移行します。

## Workflow

1. session resume handshake
2. collision and DoR check
3. dedicated worktree
4. smallest approved change
5. fixed SHA independent review
6. Human Gate packet

## Stop

採用証拠、Lease、fixed SHA、resource lock、Human Gateのいずれかが不足する場合はREQUIRED_INPUTまたはHOLDで停止します。
