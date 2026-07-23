---
title: Phase 5 Program Charter
prompt_id: 369-PHASE5-PROGRAM-CHARTER
version: 1.1
status: proposed
date: 2026-07-23
tags:
  - phase5
  - governance
  - roadmap
  - human-gate
---

# Phase 5 Program Charter

## 0. この憲章の位置づけ

本書は、369 / IKEZAKI OSのPhase 5をCodex、Claude Code、人間が共通理解で進めるための運用憲章である。

本書だけでは、ファイル編集、commit、push、PR、merge、DB、本番、外部送信などを許可しない。個別作業の権限は、必ず人間が承認したTask Packetで与える。

矛盾時の優先順位:

1. ユーザーの最新の明示指示
2. 適用範囲の `AGENTS.md` / `CLAUDE.md`
3. live git refs、現在のコード、exact-head CI、GitHub一次証跡
4. 人間承認済みTask Packet
5. 本憲章
6. Role別マスタープロンプト
7. `tasks/CURRENT_STATE.md` / `tasks/DELIVERY_CONTRACT.md`
8. roadmap / audit / function evidence
9. `369-vault`
10. 過去のチャット回答

## 1. Phase 5の名称とNorth Star

名称:

> **Phase 5 — Trusted Management Loop / 信頼できる経営実行ループ**

North Star:

> 会議や業務事実から、AIが根拠付きの下書きを作り、人間が承認し、安全な内部実行が行われ、その実行結果・お金・知識・AI社員の成果が1本の監査可能なループとして経営画面へ戻る。

Phase 5は大幅な機能削除ではない。Phase 3.5とPhase 4で作った機能を、安全・正確・再実行可能・説明可能な1本の実務ループへ結ぶ。

世界市場を狙うための評価軸:

- Verified Human Hours Returned per Active Company
- 人間1時間あたりの売上・粗利・回収額
- 会議から承認済みActionまでの時間
- AI下書きの承認通過率・手戻り率
- 無承認外部実行0件
- テナント越境0件
- 二重計上・危険方向の資金誤判定0件
- 重要操作の監査証跡率100%
- GitHubとObsidianの安定知識drift 0件

これらは目標・検証項目であり、証拠が揃う前に「世界一」「完全」「誤判定ゼロ」と外部表現してはならない。

## 2. 完成時のGolden Path

```text
会議・業務イベント
  → AIが根拠付きDraftを作る
  → 人間が確認・承認する
  → 人間またはAI社員へActionを割り当てる
  → durable requestIdで安全に内部実行する
  → 実行Receipt・Outcome・Failureを記録する
  → Finance / Company Brain / Outcome Ledgerへ正本反映する
  → Control Plane / 経営Cockpitで根拠と次の判断を確認する
```

外部送信、支払、契約、公開、実LLM業務利用などは、Golden Pathへ組み込む場合でも人間ゲートを越えて自動実行しない。

## 3. Workstreams

Phase 5.1や5.5は作らない。以下は同一Phase 5内のWorkstreamであり、新しいPhase番号ではない。

| ID | Workstream | 目的 | 主な成果 |
|---|---|---|---|
| WS-GOV | Governance & Evidence | Codex/Claude/Git/Obsidianを1つの証拠系にする | Prompt System、Task Packet、no-auto-merge、同期検査 |
| WS-FIN | Financial Truth | 資金ショート予兆の二重計上・取りこぼし・不確実性を正本化する | F-R7-02 slice2、全reader統一、移行証拠 |
| WS-RUN | Reliable Execution | 再試行・重複・障害時にも1回の意図が1回だけ安全に反映される | durable requestId、原子監査、worker回復、Receipt |
| WS-MEET | Meeting Intelligence | AI会議出力を人間承認前のDraftとして分離する | Citation、Review、AI社員割当、Action化 |
| WS-SYNC | Golden Path & Knowledge Sync | 各Workstreamを1本の経営ループとして検証する | 統合E2E、Cockpit、GitHub/Obsidian close |

## 4. Phase 5に含むもの

### WS-FIN

- F-R7-02 slice2
- PO、Invoice、Payment、FinanceEventを結ぶcanonical obligation identity
- producer側の正本ID生成
- 既存データへの安全なbackfill計画と冪等性
- `getCashflowShortageProjection`、unified、bridge、CEO/read modelの共通selector化
- 部分入金、全額入金、VOID、reversal、未知source、truncationのfail-safe
- tenant境界・並行producer・再送時のテスト

### WS-RUN

- M2 post-commit処理のdurable requestId
- 重複dispatch、retry、concurrencyで副作用が増えない設計
- M1-a `recordEventCost` / `recordEventRevenue` 等の業務更新と監査の原子性
- worker registry、heartbeat、stalled検知、recovery、kill/hold
- Execution Receipt、Outcome、Failure、根拠の可視化
- D-04 / D-05の実害再検証。根拠があるものだけ修正する

### WS-MEET

- transcript / minutes / decision / action / knowledgeの既存パイプライン活用
- AI生成Decision、ActionItem、KnowledgeをDraft状態へ限定
- transcript segmentへのcitation
- 人間の確認、修正、承認、却下、再生成
- 承認済みActionだけを人間またはAI社員へ割当
- AI社員は権限・入力・停止条件が明確な内部処理だけを候補化

### WS-GOV / WS-SYNC

- Codex A〜HとClaude実装レーンの責務固定
- 1 write lane、C/D read-only並列
- no auto-merge / no merge-on-green / no autonomous sweep
- Task Packet、prompt hash、fixed SHA、same-SHA audit
- `tasks/PHASE5.md`をPhase 5の実行状態正本として新設する候補
- `tasks/CURRENT_STATE.md` / `DELIVERY_CONTRACT.md`の安定事実だけ更新
- Obsidianは思想・設計判断・経営者向け要約を同期し、一時状態やログを複製しない

## 5. Phase 5に含まないもの

- 実メール、SNS、広告、Webhook等の自動外部送信
- 支払、送金、返金、課金、請求確定、会計確定
- 契約締結、採用合否、給与評価、法務・税務・労務の確定判断
- 実顧客データを使う実LLMの無承認有効化
- RBAC / ABAC / 機密ラベルの安易な拡張
- Marketplace、公開MCP、Developer Cloudの本格展開
- Physical AI
- unrelated feature sprawl
- 3Dオフィスの見た目だけの大規模刷新
- 自律merge、自律Production deploy、自律schema migration

これらは恒久的に否定する将来構想ではない。実行する場合はPhase 5の完了条件と分離し、個別の人間承認・安全設計・証拠を要求する。

## 6. 実行ロードマップ

### Checkpoint 0 — Entry Truth & Clean Governance

目的: Phase 3.5 / 4のクローズと、Phase 5開始時点の正本を整える。

作業:

- Phase 3.5 / 4のBusiness Close文書を人間承認済み事実へ更新
- staleなPR、WIP、Codex queueを「削除せず」superseded / DONEとして整理
- Control Rootの古いbase SHA、release hold、役割説明を更新
- `codex-queue/README.md`のauto-merge / hourly sweep記述を廃止
- `tasks/PHASE5.md`候補を作成
- 本Prompt SystemをGitで固定

出口条件:

- live `origin/main`と状態文書が矛盾しない
- active WIPが0または明示された1件
- 自動merge予約・自律スイープが0
- Phase 4.1 / 4.5が存在しない
- Phase 5候補がWorkstreamへ分類済み

想定: docs/governance PR 1〜2本。

### Checkpoint 1 — Codex / Claude / Git Control Plane

目的: AI同士が自己承認せず、GitHub経由で再現可能に連携する。

作業:

- 既存PADN role mapをA〜H定義へ整合
- Claude実装レーンを英字Roleから分離
- Task Packet schema、prompt hash、base SHA、allowed pathsを固定
- branch protectionとrequired `release_gate`を人間が確認
- auto-mergeを構造的に禁止
- stale SHA、hash mismatch、scope逸脱、重複commentのnegative test

出口条件:

- 同じTask Packetを別環境で再現できる
- Claudeは実装できるが自分をPASSできない
- Codexは監査できるがコードを変更できない
- merge、Production、schema等のHuman Gateを迂回できない

想定: docs PR 1本、PADN config/workflow PR 1本。後者はRT4・人間ゲート。

### Checkpoint 2 — Financial Truth

目的: F-R7-02の警告し過ぎと、将来の見逃しを正本IDで解消する。

推奨PR:

1. FIN-01: canonical identityの純粋ロジック、競合・未知・reversalのテスト
2. FIN-02: schema / migration / backfill / producer dual-write。人間ゲート
3. FIN-03:全reader統一、旧経路のdeprecation、E2E

必須ケース:

- POの二重イベント
- 直接Invoiceの予定入金
- InvoiceCandidate→Invoice lineage
- 部分入金・全額入金
- VOID・reversal・訂正
- 未知source
- query truncation
- tenant越境
- concurrent producers
- backfill再実行

出口条件:

- 1 obligation = 1 canonical予定行
- 不明時は `coverageIncomplete` で安全断定を止める
- 全画面・レポートが同じselectorと正本IDを利用
- migration / rollback / backfill証拠が揃う

想定: 実装PR 3本。

### Checkpoint 3 — Reliable Execution

目的: retryやworker障害でも同じ意図を二重実行しない。

推奨PR:

1. RUN-01: durable requestId、idempotency record、業務更新と監査の原子性
2. RUN-02: worker registry、heartbeat、stalled recovery、Execution Receipt

必須ケース:

- 同じrequestIdの同時実行
- queue再配信
- transaction commit直後のprocess crash
- audit失敗
- worker heartbeat喪失
- stale jobの再所有
- terminal state後の再実行
- tenant越境

出口条件:

- 重複副作用0をテストで証明
- 業務更新成功・監査失敗の片成功がない
- stalled jobを人間が識別・回復・停止できる
- Receiptから入力分類、承認、実行、結果、根拠を追える

想定: 実装PR 2本。

### Checkpoint 4 — Meeting Intelligence

目的: AI会議出力を、根拠付き・人間確認済みのActionへ変換する。

推奨PR:

1. MEET-01: AI生成物のDraft / Review / Approved境界とcitation
2. MEET-02: 承認済みActionの人間・AI社員割当とOutcome接続

必須ケース:

- AI出力が承認前にactive taskにならない
- citationがtenantを越えない
- transcript修正時のstale citation
- 人間修正履歴
- 却下・再生成
- AI社員の権限不足
- approval取消後の実行阻止

出口条件:

- AI生成Decision / Action / Knowledgeは初期Draft
- 人間の承認者・日時・差分が残る
- 承認済みActionだけが実行候補
- Actionからtranscript根拠とOutcomeへ辿れる

想定: 実装PR 2本。

### Checkpoint 5 — Integrated Golden Path

目的: 会議、承認、実行、財務、ナレッジ、成果を1本で通す。

作業:

- FakeLLM / DemoデータでGolden Pathを構築
- UI上で `DRAFT / APPROVED / RUNNING / COMPLETED / FAILED / DEMO` を明示
- Control Planeと経営CockpitへReceipt、Outcome、Finance、Citationを表示
- cross-domain E2Eと否定系E2E

出口条件:

- デモ1社で開始から成果確認まで再現可能
- 外部作用なし
- 危険操作は承認画面で停止
- 失敗・再試行・不確実性を成功のように表示しない

想定: 統合PR 1本。

### Checkpoint 6 — Release Candidate & Independent Audit

目的: Phase 5全体を同一証拠で監査する。

作業:

- A全体監査
- Bアーキテクチャ整合
- Cセキュリティ・正確性
- Dテスト・CI・Evidence
- E統合・rollback
- F Governance / GitHub / Obsidian
- G未完了候補の分離
- H独立Oversight

出口条件:

- exact-head CI green
- C/Dが同一SHAで独立PASS
- Eが別runのC/D証拠を確認
- unresolved Critical / High / release-blocking Mediumが0
- Production以外の未実施を明示

想定: audit/docs PR 1〜2本。

### Checkpoint 7 — Obsidian Sync & Business Phase Close

目的: 一時的な開発状態ではなく、安定知識と完成範囲を人間が確定する。

作業:

- `CURRENT_STATE` / `DELIVERY_CONTRACT` / `tasks/PHASE5.md`
- Function Evidence / audit / changelog
- Obsidian Phase 5 hubとWorkstream要約
- broken wikilink、orphan、PII、Secrets、stale SHAの検査
- Vercel Productionを人間が代表画面込みで確認
- Business Close Packet

出口条件:

- GitHubとObsidianの安定知識drift 0
- Draft / main / Preview / Productionを混同していない
- 完了範囲と未完了範囲を分離
- 人間が `PHASE5_HUMAN_CLOSE_APPROVED` を明示

想定: docs/sync PR 1〜2本。

## 7. 規模と期間

現時点の目安:

- 実装PR: 約8〜9本
- Governance / docs / sync PR: 約4〜6本
- 合計: 約12〜15本
- 期間: 24〜37作業日、または約5〜8週間

これは期限の保証ではない。schema、人間承認、CI、Production確認、監査指摘の量で変動する。

## 8. Task PacketとWIP制御

- active write WIPは1件。
- C/Dのread-only監査は同じfixed SHAへ並列実行可。
- Task Packetのない実装は禁止。
- Task Packetは、目的、base SHA、allowed paths、forbidden paths、risk tier、Human Gate、成功条件、テスト、rollback、Obsidian影響、権限を必須とする。
- scope拡張は新しいTask Packet revisionと人間承認を要求する。
- headが動いたらC/D/Eの過去PASSは失効する。
- 2回のreworkで同じ根本原因が解消しない場合は `REPLAN_REQUIRED`。

## 9. Human Gates

以下はAIが解除しない。

- commit / push / Draft PR作成。ただしTask Packetで各権限が明示された場合のみClaudeが実行可
- main merge
- Production deploy / rollback / Production DB / queue / worker操作
- schema / migration / backfillの実行
- package / lockfile
- Secrets / env / OAuth / GitHub App権限
- 実業務データでの実LLM
- 外部送信
- 課金・決済・支払
- RBAC / ABAC / 機密ラベル
- 破壊的データ操作
- scope拡張
- Business Phase Close

## 10. GitHubとObsidianの同期

GitHub:

- コード、テスト、Task Packet、PR、CI、監査、完全SHAの正本
- 実装状態は証拠があるものだけ更新

Obsidian:

- 経営者向け要約、設計判断、安定した知識、Prompt System
- secrets、PII、生ログ、未push状態、承認待ちの一時状態は保存しない
- 新規ノートは `369-vault/index.md` から辿れるようにする

同期原則:

- Prompt SystemはGit管理下の `369-vault/プロンプト/Phase5/` を単一実体とする
- Workstreamノートは最大1件ずつ。PRごとのノートを量産しない
- source main SHA、evidence link、更新日を持つ
- F-Codexは差分を報告するだけで編集しない
- F-ClaudeはTask Packetで許可されたdocsのみ変更する
- vault main反映は人間ゲート

## 11. Phase 5 Definition of Done

次をすべて満たした場合だけ、Codexは人間へClose候補を提示できる。

- Checkpoint 0〜7の出口条件が証拠付きで満たされる
- F-R7-02のcanonical identityと全reader統一が完了
- modeledケースで危険方向の資金誤判定がない
- durable requestIdと監査原子性が検証済み
- worker stalled回復とReceiptが検証済み
- AI会議出力がDraft-first、人間承認、citation付き
- 統合Golden PathがFake/DemoでE2E green
- 無承認外部作用0
- tenant越境0
- exact-head CIとrelease gate green
- C/D same-SHA PASS、E integration ready
- A〜Hの最終監査が揃う
- GitHub / Obsidian drift 0
- Productionを人間が確認
- 未完成・未検証・将来候補が明示される
- 人間がBusiness Phase Closeを明示承認する

いずれかがUNKNOWNなら「完成」としない。Phase 5.1 / 5.5を作らず、未完了はPhase 5内のOPEN Workstreamまたは次Phase候補として明示する。
