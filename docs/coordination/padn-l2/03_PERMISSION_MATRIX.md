# PADN L2 — Permission Matrix

## GitHub App（PADN 専用に新規作成・最小権限）

| Permission | Level | 用途 |
|---|---|---|
| metadata | read | 必須既定 |
| contents | read & write | lease branch への push（claude role job）・ref 参照 |
| issues | read & write | Control Root / WIP への append-only イベント |
| pull_requests | read & write | Draft PR の作成・更新（merge は行わない） |
| actions | read | workflow_run / CI 相関の参照 |

**付与しない**: administration / secrets / environments / deployments(write) / pages /
webhooks / members / branch protection。App のインストール先は DREEXY-git/369 のみ。

> App token は「repository_dispatch による内部 chaining」と「claude role job の git 操作」に
> のみ使用。GITHUB_TOKEN のイベントは workflow を再起動しない（再帰防止仕様）ため、
> verdict/report 投稿は意図的に GITHUB_TOKEN で行う（ループ遮断）。

## Workflow ごとの GITHUB_TOKEN permissions

| Workflow / job | permissions | secrets |
|---|---|---|
| dispatch / ingest_pr（pull_request） | contents: read | **なし**（untrusted 定義対策） |
| dispatch / dispatch | contents: read, issues: write | PADN_GITHUB_APP_PRIVATE_KEY |
| claude / role | contents: write, pull-requests: write, issues: write, id-token: write | ANTHROPIC_API_KEY, PADN_GITHUB_APP_PRIVATE_KEY |
| codex / audit | contents: read | OPENAI_API_KEY |
| codex / report | issues: write, pull-requests: write | なし |
| watchdog / watchdog | contents: read, issues: write | なし |
| oversight / oversight | contents: read | OPENAI_API_KEY |
| oversight / report | issues: write | なし |
| governance / governance | contents: read | なし |

トップレベルは全 workflow `permissions: {}`（job 単位で最小付与）。

## 役割（A〜H）と可能な操作

| 役割 | engine | write | L2 自動起動 | 禁止（構造的に不可能） |
|---|---|---|---|---|
| A Director | 人間+チャット | - | しない | — |
| B Implementer | claude | branch push / Draft PR | ○ | merge・force push・schema/package/secrets 変更（tool deny + 事後パス検査） |
| C Arch/Sec Auditor | codex | なし（read-only sandbox） | ○ | あらゆる write |
| D Test/Evidence | claude(test) / codex(audit) | テスト追加のみ | ○ | 実装コード変更（ALLOWED_PATHS） |
| E Integration | codex | なし | ○ | merge（判断材料のみ） |
| F Post-merge verify | script | なし | ○ | — |
| G Scout/Discovery | script | なし | ○ | WIP/Issue/branch/PR の作成 |
| H Oversight | codex | なし | ○ | Task/Lease 発行・コード変更・Gate 解除 |

## Human Gate（AI/L2 で解除不能 — config/padn/human-gates.json が正本）

main / vault main merge・Production・schema/migration・package/lock・Secrets/env/OAuth・
外部送信・実業務 LLM・課金/決済・RBAC/ABAC/labels・destructive data・Business Phase Close・
scope expansion・write lane 2→3・**workflow の main 反映**。
