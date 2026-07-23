---
title: Phase 5 Prompt System
prompt_id: 369-PHASE5-PROMPT-SYSTEM
version: 1.0
status: proposed
date: 2026-07-23
tags:
  - phase5
  - prompt
  - codex
  - claude-code
  - github
  - obsidian
---

# Phase 5 Prompt System

## 目的

通常運用では、次の2ファイルだけをそれぞれのAIへ一度貼り付ける。

1. [[06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1|Claude Code統合完全プロンプト]]
2. [[07_PHASE5_CODEX_SINGLE_PROMPT_V15|Codex A〜H統合完全プロンプト]]

この2ファイルは自己完結しており、共通憲章、Task Packet、Business Closeの内容も内包する。

次の5文書は、統合版の設計根拠・個別レビュー・将来の差分管理に使うモジュール版として残す。

1. [[01_PHASE5_PROGRAM_CHARTER_V1|共通運用憲章]]
2. [[02_PHASE5_CLAUDE_CODE_MASTER_PROMPT_V1|Claude Code実装マスタープロンプト]]
3. [[03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14|Codex A〜H統合監査マスタープロンプト]]
4. [[04_PHASE5_TASK_PACKET_TEMPLATE_V1|Task Packetテンプレート]]
5. [[05_PHASE5_BUSINESS_CLOSE_PROMPT_V1|Business Close判定プロンプト]]

このディレクトリは現在の構成では `369` Gitリポジトリ内にあり、GitHubで版管理される同じMarkdownをObsidianで読む。そのため、プロンプト本文のGitHub版とObsidian版を別々に複製しない。

## 正しい使い方

### 新しい実装を始めるとき

1. 人間またはAが、Phase 5の次の作業候補を1件だけ選ぶ。
2. B-Codexが実装前の設計監査を行う。
3. 人間が [[04_PHASE5_TASK_PACKET_TEMPLATE_V1]] を使い、対象・権限・停止条件を確定する。
4. Claude Codeへ [[06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1]] を一度貼る。
5. 確定したTask Packetを渡す。
6. Claude Codeは許可された範囲だけを実装し、許可がある場合だけcommit・push・Draft PR作成まで行う。
7. C-CodexとD-Codexが同じ固定head SHAを別々に監査する。
8. 修正があればClaude Codeへ戻し、headが変わったら過去のPASSを失効させる。
9. E-Codexが統合可能性を監査する。
10. 人間だけがmainへのmergeを判断する。
11. F-CodexがGitHub・CURRENT_STATE・Obsidianの整合を監査する。

### Phase 5を閉じるとき

1. A〜Hの最終証拠を集める。
2. [[07_PHASE5_CODEX_SINGLE_PROMPT_V15]] の `ACTIVE_ROLE=PHASE5_CLOSE` を実行する。
3. Codexは `READY_FOR_HUMAN_PHASE5_CLOSE` またはHOLDを出す。
4. 人間が本番確認とBusiness Phase Closeを最終判断する。

## 役割分離

| 担当 | 主な責務 | 書き込み |
|---|---|---|
| 人間 | 優先順位、承認、merge、本番、Phase Close | 最終権限 |
| Claude Code | Task Packetどおりの実装・テスト・Draft PR候補 | 明示された範囲のみ |
| Codex B | 実装前設計監査 | read-only |
| Codex C | セキュリティ・正確性監査 | read-only |
| Codex D | テスト・CI・証拠監査 | read-only |
| Codex E | 統合・リリース監査 | read-only |
| Codex F | GitHub・Obsidian・状態文書の整合監査 | read-only |
| Codex A/G/H | 全体統制、候補探索、独立監督 | read-only |

Claude Codeは自分の実装を最終承認しない。Codexはコードを修正しない。どちらも自動mergeを設定しない。

## Git経由の原則

- 正本は、Gitの完全SHA、GitHub PR、CI run、PR Conversation、main上の状態文書。
- チャットの自己申告は証拠にしない。
- Task PacketはGitHub上に保存し、完全SHA-256で固定する。
- 実装は1 Task Packet = 1 WIP = 1 Draft PRを基本とする。
- write laneは1本。C/Dのread-only監査だけ並列可。
- main merge、Production、schema/migration、Secrets、課金、外部送信、実LLM業務利用、RBAC変更、Phase Closeは人間ゲート。
- merge-on-green、auto-merge予約、自動修正スイープを使わない。

## 既存PADNとの関係

既存の `config/padn/` と `.github/workflows/369-padn-*.yml` は、Phase 5導入前の役割名を含む。特に既存 `roles.json` のB/D/Fは本プロンプトの人間向けA〜H定義と一致しない。

このPrompt Systemを作成しただけでは既存PADN設定を変更しない。Checkpoint 1で、次の対応表を人間承認付きの別PRとして反映する。

| 既存event | Phase 5上の意味 |
|---|---|
| `padn_claude_implement` / `padn_claude_remediate` / `padn_claude_test` | Claude実装レーン。英字Roleを割り当てない |
| `padn_codex_arch` | B-Codex |
| `padn_codex_security` | C-Codex |
| `padn_codex_evidence` | D-Codex |
| `padn_integration_audit` | E-Codex |
| `padn_governance_sync` | F-Codex |
| Scout/discovery | G-Codex相当 |
| `padn_oversight` | H-Codex |

役割対応がGit上で確定するまでは、イベント名だけを根拠にRoleを推測せず `ROLE_MAP_DRIFT` として停止する。

## バージョン管理

- Prompt IDと版は各ファイルのfrontmatterを正とする。
- 実行時は対象ファイルのcommit SHAとSHA-256をTask Packetへ記録する。
- プロンプト本文を変更したら版を上げ、古いTask Packetへ新しい判定を遡及適用しない。
- `PROMPT_MANIFEST.json` は生成時点のローカル指紋であり、Git commit後はcommit SHAを追加して再固定する。
- `status: proposed` はmain未反映を意味する。人間merge後にだけ `active` へ変更する。

## 起動用の短文

Claude Code:

```text
repoの `369-vault/プロンプト/Phase5/06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1.md` を読み、指定されたPhase 5 Task Packetの権限欄を厳守して実行してください。
```

Codex:

```text
repoの `369-vault/プロンプト/Phase5/07_PHASE5_CODEX_SINGLE_PROMPT_V15.md` を読み、GitHubの最新状態を再取得して、指定Roleを固定SHAで実行してください。
```

Phase Close:

```text
repoの `369-vault/プロンプト/Phase5/07_PHASE5_CODEX_SINGLE_PROMPT_V15.md` を読み、`ACTIVE_ROLE=PHASE5_CLOSE` でBusiness Close可否をread-only判定してください。
```
