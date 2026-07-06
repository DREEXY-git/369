---
doc: roadmap/16
title: GitHub / Obsidian / 369-vault 役割分担 + NEXT_ACTIONS + OPEN_RISKS + 次回プロンプト
status: Candidate
area: governance/knowledge + next-actions
phase: 横断 candidate
risk: low（docs-only・369-vault非編集）
date: 2026-07-06
related:
  - docs/roadmap/00_ikezaki_os_long_term_strategy.md
  - tasks/CURRENT_STATE.md
  - CLAUDE.md
---

# 16. GitHub / Obsidian / 369-vault 関係（Candidate）＋ NEXT_ACTIONS / OPEN_RISKS / 次回プロンプト

> 種別: **docs-only / governance candidate**。**369-vault は直接編集しない**（本ミッションでは触っていない）。
> 状態: **Candidate**。`docs/10_obsidian` と 369-vault の関係は**勝手に確定せず、別承認の設計候補**として扱う。

## 1. 役割分担（正本ルール）

- **GitHub = 正本・証拠・変更履歴・実装管理**。ソースコード・schema・テスト・CI・docs・監査ログ・HOLD記録・設計判断・ロードマップ・次回プロンプトを置く。
- **Obsidian = 思考整理・経営ダッシュボード・ロードマップ/監査閲覧・ナレッジグラフ**。現在地・Phase進捗・リスク・戦略・非エンジニア向け説明を「見る」。
- **Claude Code = 実装・監査・検証・docs更新の実行者**。**ChatGPT = プロンプト生成・戦略設計・非エンジニア判断補助**。

## 2. 369-vault の扱い（重要・恒久）

- **Claude Code は 369-vault を勝手に編集・移動しない**（本ミッションでも未編集）。
- **369-vault を GitHub 正本として扱わない**。**Obsidian だけで正式判断を完結しない**。
- Obsidian の Candidate メモは、**Claude Code 経由で GitHub へ反映してから official 扱い**にする。
- secrets / 個人情報 / 本番ログ生データを Obsidian へ同期しない。

## 3. docs/10_obsidian と 369-vault の関係（未確定・別承認）

- 本リポジトリには現状 `369-vault/`（フォルダ）と `docs/roadmap/`・`docs/audit/` がある。
- `docs/10_obsidian`（同期ルール/タグ/vault関係）の新設は**候補**であり、本ミッションでは**確定しない**。関係の確定・同期の実行は**別承認**。
- 既存 `369-vault/index.md`＋`369-vault/知識/` は従来どおり（今回無変更）。

## 4. NEXT_ACTIONS（人間が選択・Candidate）

1. 本戦略 docs 群（`docs/roadmap/09-16`）の push（push-only・別承認。feature＋main）。
2. 現行 Data Classification / Customer Pain ライン（`docs/audit/105-114`）の継続（schema実装可否判断 or 品質基盤強化・別承認）。
3. 231-252 Candidate のうち優先領域の昇格判断（別承認・`docs/roadmap/02` へ反映）。
4. Developer Cloud / Marketplace / PLUG / IP moat の各 Candidate を個別 doc 深掘りするか（人間判断）。
5. `docs/10_obsidian` と 369-vault の関係設計（別承認・369-vault 非編集前提）。
- いずれも **外部送信・高機密ラベル解禁・Phase 8 実課金・実LLM・AIコスト・本番影響には個別人間承認なしに進まない**。

## 5. OPEN_RISKS（抜粋）

- 戦略 docs の Candidate を実装承認と誤読するリスク → 全 doc に Candidate・非破壊を明記。
- 3系統ロードマップの番号衝突 → `docs/roadmap/10` の対応表で吸収。
- PLUG/Employee App の個人情報・購買データ・拡張機能権限リスク → データ分離・最小権限・法務確認前提。
- 知財の先行公開リスク → 専門家確認前に出願・公開しない。
- 369-vault 直接編集/正本混同リスク → 本書 §2 で禁止を明記。
- 未push commit の揮発リスク → push-only（別承認）で解消。

## 6. CLAUDE_CODE_NEXT_PROMPT（次回 Claude Code 推奨プロンプト案）

- **案1（push-only）**: `docs/roadmap/09-16` の戦略 Candidate docs を feature→main へ fast-forward push（force禁止・状態分類 A/B/C・Gate＋17項目報告）。
- **案2（現行ライン継続）**: Customer Pain schema 実装可否判断（`docs/audit/114` §18 停止条件から・別の重い承認）または CI/Test/Release Governance 強化。
- **案3（Candidate深掘り）**: Developer Cloud / Marketplace / PLUG / IP moat / 231-252 のうち1領域を docs-only で個別深掘り（実装・DB・外部送信・実LLM・AIコストなし）。
- 共通ガード: 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番影響・369-vault直接編集・Function Master 231-252 正式昇格は行わない。

## 7. やらないこと / 承認ゲート / 人間判断

- やらない: 369-vault 編集・実装・DB変更・外部送信・実LLM・AIコスト・本番影響・関係の確定。
- 承認: 関係設計・同期実行・Candidate 昇格・push は個別人間承認。
- 人間判断: どのラインを次に前進させるか（戦略 Candidate 群 vs 現行 Data Classification ライン vs 品質基盤）。
