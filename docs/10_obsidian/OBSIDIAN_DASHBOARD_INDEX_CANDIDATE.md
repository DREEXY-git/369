---
doc: 10_obsidian/dashboard-index
title: Obsidian 経営ダッシュボード入口（Candidate）
status: Candidate
area: governance/obsidian
risk: low（docs-only・369-vault非編集・実同期なし）
date: 2026-07-06
related:
  - docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md
  - docs/10_obsidian/OBSIDIAN_SYNC_RULES_CANDIDATE.md
---

# 10_obsidian. Obsidian 経営ダッシュボード入口（Candidate）

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧・思考整理・経営ダッシュボード**。369-vault は今回未編集。実同期・自動化は別承認。
> 状態: **Candidate**（Official ではない）。

## 1. 目的

非エンジニアが Obsidian 側で「今どこにいるか」を1目で追える入口（ダッシュボード）の構成候補を定義する（**実同期はしない**・GitHub docs の要約を見る面）。

## 2. 背景 / 既存docsとの関係

- 役割: `OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md`。同期: `OBSIDIAN_SYNC_RULES_CANDIDATE.md`。
- 各項目の**正本は GitHub docs**。Obsidian は閲覧導線であって正本ではない。

## 3. 非エンジニア向け入口の構成候補

| Obsidian 入口 | 見る内容 | GitHub 正本（出典） |
|---|---|---|
| CURRENT_STATE | 現在地の1枚サマリー | `tasks/CURRENT_STATE.md`＋git refs |
| NEXT_ACTION | 次にやること（人間が選択） | `tasks/CURRENT_STATE.md` §次にやること／`docs/roadmap/16` |
| OPEN_RISKS | 未解決リスク一覧 | `docs/roadmap/16` §OPEN_RISKS／各doc Risk Register |
| ROADMAP | Phase 0-26 三系統 | `docs/roadmap/00-01`・`09-10` |
| AUDIT | 監査記録（要約） | `docs/audit/*`（要約のみ・本文全体は同期しない） |
| PROMPT | 次回 Claude Code 指示 | `docs/roadmap/16` §CLAUDE_CODE_NEXT_PROMPT |
| STRATEGY | AI社員経済圏・Developer Cloud 等 | `docs/roadmap/09・11・12・13` |
| AI Safety | 禁止機能・安全代替・Human Certification Gate | `docs/roadmap/15`・`docs/roadmap/03-04` |
| Growth | 広告費ゼロ成長ループ | `docs/roadmap/15` |
| Candidate一覧 | Function Master 231-252 等 | `docs/roadmap/14` |
| SaaSカタログ | 組み込み予定SaaS（内包/代替/連携/Marketplace/PLUG/Employee App） | `docs/roadmap/17` |
| CRM / SFA Lineage | CRM/SFA/Salesforce Mini 深掘り（Lead〜商談〜引き継ぎ・AI営業提案・承認境界） | `docs/roadmap/18` |

## 4. Candidate / Official

- 本入口構成は **Candidate**。実際の Obsidian ダッシュボード生成・369-vault への反映・自動同期は **別承認**。
- Candidate note は GitHub 反映後に official 扱い。

## 5. やらないこと

- 369-vault の直接編集・同期実行・自動同期スクリプト実装（別承認）。
- secrets / 個人情報 / 本番ログ生データ / 実顧客データ の同期。
- 実装・DB変更・外部送信・実LLM・AIコスト・本番影響。

## 6. 承認ゲート / リスク

- 承認: ダッシュボード生成・369-vault 反映・実同期は個別人間承認。
- リスク: Obsidian を正本と混同 → 「出典＝GitHub docs」を各項目に明記。二重管理 → 要約のみ・GitHub正本を維持。

## 7. 次アクション / 人間判断

- Obsidian ダッシュボードの実構成（フォルダ/タグ/リンク）の確定（人間判断・別承認）。
- どの docs を Obsidian へ反映するか・Obsidian Owner の任命（人間判断）。
- 現時点では **GitHub docs 側の Candidate 記録に留め、369-vault は触らない**。
