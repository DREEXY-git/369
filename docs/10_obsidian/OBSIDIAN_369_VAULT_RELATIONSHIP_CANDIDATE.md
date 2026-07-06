---
doc: 10_obsidian/relationship
title: GitHub正本 と Obsidian / 369-vault の関係（Candidate）
status: Candidate
area: governance/obsidian
risk: low（docs-only・369-vault非編集・実同期なし）
date: 2026-07-06
related:
  - docs/roadmap/16_github_obsidian_369vault_relationship_and_next_actions_candidate.md
  - docs/audit/115_obsidian_relationship_design.md
---

# 10_obsidian. GitHub正本 と Obsidian / 369-vault の関係（Candidate）

> 種別: **docs-only / Candidate**。関係の確定・実同期・自動化は**別承認**。実装・DB変更・外部送信・実LLM・AIコスト・本番影響なし。
> 状態: **Candidate**（Official ではない）。上位候補: `docs/roadmap/16_github_obsidian_369vault_relationship_and_next_actions_candidate.md`。

## 1. 目的

GitHub正本・Obsidian閲覧・369-vault の役割を、運用に近い粒度で GitHub docs 側に明文化する（関係の**確定はしない**・Candidate）。

## 2. 背景

- 戦略 Candidate docs `docs/roadmap/09-16` は main 正本へ反映済み。うち `docs/roadmap/16` で役割分担を Candidate として整理済み。
- 本書はその運用版 Candidate。`docs/10_obsidian/` は今回新設する Candidate ディレクトリであり、正式運用への昇格は別承認。

## 3. 既存docsとの関係

- 上位候補: `docs/roadmap/16`（GitHub/Obsidian/369-vault 役割＋NEXT_ACTIONS/OPEN_RISKS/次回プロンプト）。
- 同時作成: `OBSIDIAN_SYNC_RULES_CANDIDATE.md`（同期対象/禁止）・`OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（非エンジニア入口）。
- 監査記録: `docs/audit/115_obsidian_relationship_design.md`。

## 4. Candidate / Official の区別

- 本書と `docs/10_obsidian/*` は **Candidate**。関係の確定・実同期・自動同期スクリプト・369-vault との実接続は **Official 昇格＝別承認**。
- Candidate note は **GitHubへ反映してから official 扱い**にする。

## 5. GitHub / Obsidian / 369-vault の役割（正本ルール）

- **GitHubが正本**（source of truth）。ソースコード・schema・テスト・CI・docs・監査ログ・HOLD記録・設計判断・ロードマップ・次回プロンプトを置く。
- **Obsidianは閲覧・思考整理・経営ダッシュボード**。現在地・Phase進捗・リスク・戦略・非エンジニア向け説明を「見る」ための面。
- **369-vault を正本として扱わない**。**369-vault を Claude Code が勝手に編集しない**（本ミッションでも未編集）。**Obsidianだけで正式判断を完結しない**。
- **Obsidianリンクは閲覧導線であって正本ではない**。

## 6. やらないこと

- 369-vault の直接編集・ファイル移動・同期実行。
- 自動同期スクリプトの実装（別承認）。
- docs/roadmap/09-16 の大幅改変・既存 audit docs の一括編集・frontmatter 一括適用。
- 実装・DB変更・schema変更・migration・外部送信・実LLM・AIコスト・本番影響。

## 7. 承認ゲート

- 関係の確定・実同期・自動同期・369-vault との実接続・Obsidian Owner の任命は、いずれも**個別人間承認**。
- Candidate → Official 昇格は、GitHub 反映後にレビューを経てから。

## 8. 同期禁止対象（恒久）

- **secretsを同期しない** / **個人情報を同期しない** / **本番ログ生データを同期しない** / **実顧客データを同期しない**。
- APIキー / OAuth token / cookie / private key を同期しない。

## 9. リスク

- GitHub正本とObsidianメモを混同するリスク → 本書で「GitHubが正本」を明記。
- 369-vault を Claude Code が勝手に編集するリスク → §5・§6 で禁止・今回未編集。
- secrets/個人情報/本番ログ同期リスク → §8 の禁止対象。
- docs/10_obsidian と 369-vault の二重管理リスク → 関係確定は別承認・Candidate に留める。

## 10. 次アクション / 人間判断が必要な点

- `docs/10_obsidian` を正式運用へ昇格する時期（人間判断）。
- 369-vault との同期方式・Obsidian Owner・どの docs を Obsidian へ反映するか（人間判断・別承認）。
- 現時点では **GitHub docs 側の Candidate 記録に留め、369-vault は触らない**。
