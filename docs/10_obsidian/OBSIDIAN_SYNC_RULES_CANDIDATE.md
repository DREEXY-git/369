---
doc: 10_obsidian/sync-rules
title: Obsidian 同期ルール（Candidate）
status: Candidate
area: governance/obsidian
risk: low（docs-only・実同期なし・369-vault非編集）
date: 2026-07-06
related:
  - docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md
---

# 10_obsidian. Obsidian 同期ルール（Candidate）

> 種別: **docs-only / Candidate**。**実同期はしない**。自動同期スクリプト実装は別承認。実装・DB・外部送信・実LLM・AIコスト・本番影響なし。
> 状態: **Candidate**（Official ではない）。

## 1. 目的

将来 GitHub docs と Obsidian（369-vault）を連携する場合の、同期対象・禁止対象・承認フローの候補を明文化する（**今回は実同期しない**）。

## 2. 背景 / 既存docsとの関係

- 関係の上位ルール: `docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md`（GitHubが正本）。
- 本書は同期の「対象/禁止/承認」だけを Candidate として定義。実同期・自動化は別承認。

## 3. Candidate / Official

- 本書は **Candidate**。実同期の実行・自動同期スクリプトの実装は **Official 昇格＝別承認**。
- Candidate note は **GitHubへ反映してから official 扱い**。

## 4. 同期対象候補（GitHub → Obsidian 閲覧・要約）

- 現在地（`tasks/CURRENT_STATE.md` の要約）・NEXT_ACTIONS・OPEN_RISKS。
- ロードマップ（`docs/roadmap/*` の要約）・監査記録（`docs/audit/*` の要約・**本文全体ではなく要約**）。
- 戦略 Candidate（`docs/roadmap/09-16` の要約）・次回プロンプト。
- いずれも「閲覧・思考整理・経営ダッシュボード」目的の**要約**であり、Obsidian は正本ではない。

## 5. 同期禁止対象（恒久・絶対）

- **secretsを同期しない**。
- **個人情報を同期しない**。
- **本番ログ生データを同期しない**。
- **実顧客データを同期しない**。
- APIキー / OAuth token / cookie / session / private key / .env 実値を同期しない。
- 既存 audit docs の証拠本文を Obsidian 用に一括改変・再整形しない。
- HOLD記録・release check 記録を削除・改変しない。

## 6. 承認フロー（Candidate note → GitHub → Official）

1. Obsidian（369-vault）で Candidate メモを書く（思考整理）。
2. **Claude Code 経由で GitHub docs へ反映**（人間承認）。
3. GitHub 反映後にレビューを経て **official 扱い**。
4. **Obsidianだけで正式判断を完結しない**。実同期の実行は別承認。

## 7. やらないこと

- 369-vault の直接編集・同期実行・自動同期スクリプト実装（別承認）。
- 実装・DB変更・外部送信・実LLM・AIコスト・本番影響。

## 8. 承認ゲート / リスク

- 承認: 実同期・自動同期・369-vault 実接続は個別人間承認。
- リスク: secrets/個人情報/本番ログの誤同期 → §5 の禁止対象で防ぐ。二重管理 → 要約のみ・GitHub正本を明記。

## 9. 次アクション / 人間判断

- 同期方式（手動要約 / 半自動 / 自動）の選択（人間判断・別承認）。
- 同期対象 docs の確定・Obsidian Owner の任命（人間判断）。
- 現時点では **実同期せず、ルール候補の記録に留める**。
