# 115. Obsidian 関係設計 — docs/10_obsidian Candidate の記録（docs-only・369-vault非編集）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（設計記録。コード差分ゼロ・369-vault非編集・実同期なし）
- Audit Doc: 115
- Product Phase: Governance / Documentation / Obsidian Knowledge
- Lineage: GitHub / Obsidian Knowledge Governance
- Stage: Obsidian Relationship Design (Candidate)
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `2f1ba6b8c6c3b313ad0ffa3ca26b3088cdf6a480`
- Scope: GitHub正本・Obsidian閲覧・369-vault の関係を、運用に近い粒度で `docs/10_obsidian/` の Candidate docs として記録
- Not Included: 369-vault編集・実同期・自動同期スクリプト・関係の確定・実装・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・外部送信・実LLM・AIコスト・本番確認・push
- Next Action: doc115 push-only（別承認）
- Do Not Start: 369-vault編集 / 実同期 / 自動同期実装 / 関係の確定 / 実装 / schema変更 / migration / 本番確認

## 1. 非エンジニア向け要約

- 今回は、「GitHub が正本、Obsidian は閲覧・思考整理・経営ダッシュボード、369-vault は正本ではない」という役割を、より運用に近い形で **GitHub docs 側に文書化しただけ**の回です。
- **369-vault は一切触っていません**。**実際の同期もしていません**。関係の確定・自動同期は今後の別承認です。
- これは**設計（Candidate）の記録**であり、実装ではありません。**実装なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。

## 2. 今回作成した docs（GitHub正本側・Candidate）

- `docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md` — GitHub/Obsidian/369-vault の役割（GitHubが正本・369-vaultを正本として扱わない・直接編集しない・Obsidianだけで正式判断しない）。
- `docs/10_obsidian/OBSIDIAN_SYNC_RULES_CANDIDATE.md` — 同期対象候補（要約のみ）・**同期禁止対象**（secrets/個人情報/本番ログ生データ/実顧客データ）・Candidate→GitHub→official の承認フロー。
- `docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md` — 非エンジニア向け Obsidian 入口（CURRENT_STATE/NEXT_ACTION/OPEN_RISKS/ROADMAP/AUDIT/PROMPT/STRATEGY/AI Safety/Growth/Candidate一覧）と各項目の GitHub 出典。

## 3. 既存docsとの関係

- 上位候補: `docs/roadmap/16_github_obsidian_369vault_relationship_and_next_actions_candidate.md`（前回 main 反映済み・役割分担 Candidate）。本書はその運用版 Candidate を `docs/10_obsidian/` に具体化。
- `docs/10_obsidian/` は**新設 Candidate ディレクトリ**。正式運用への昇格・関係確定は別承認。

## 4. 明記したルール（恒久）

- **GitHubが正本**。**Obsidianは閲覧・思考整理・経営ダッシュボード**。**369-vaultを正本として扱わない**・**369-vaultを直接編集しない**・**Obsidianだけで正式判断しない**。
- **secretsを同期しない**・**個人情報を同期しない**・**本番ログ生データを同期しない**・**実顧客データを同期しない**（APIキー/OAuth token/cookie/private key 含む）。
- **同期実行は別承認**・自動同期スクリプト実装は別承認・Candidate note は GitHub 反映後に official 扱い。

## 5. 今回やらなかったこと

- 369-vault編集・ファイル移動・実同期・自動同期スクリプト実装・関係の確定。
- docs/roadmap/09-16 の大幅改変・既存 audit docs の一括編集・frontmatter 一括適用。
- 実装・DB変更・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・外部送信・実LLM・AIコスト・本番確認・push。

## 6. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/feature = `2f1ba6b8c6c3b313ad0ffa3ca26b3088cdf6a480`・working tree clean・`origin/main..HEAD` 空）。
- 上位候補の存在: `docs/roadmap/16_github_obsidian_369vault_relationship_and_next_actions_candidate.md`（実測）。
- 作成物: `docs/10_obsidian/` に Candidate 3件を新設。
- 369-vault 非編集: `git status --short -- 369-vault` = 空（実測）。
- 封印維持: company-brain-reference への AI注入 0・`anonymized: true` 2・apps の Customer Pain runtime 0・`node scripts/check-company-brain-safety.mjs` exit 0（実測）。

## 7. Assumption Log

- `docs/10_obsidian` は今回新設する Candidate であり、**関係の確定ではない**。
- 369-vault は未編集（GitHub正本を維持）。Obsidian は閲覧・思考整理・経営ダッシュボードとして扱う。
- 実同期・自動同期は別承認。既存 `docs/roadmap/16` を上位候補として参照した。

## 8. Unknowns Log

- `docs/10_obsidian` を正式運用へ昇格する時期。369-vault との同期方式。Obsidian タグ設計。ダッシュボードの実構成。どの docs を Obsidian へ反映するか。Obsidian Owner は誰か。

## 9. Risk Register

- GitHub正本とObsidianメモを混同するリスク → 「GitHubが正本」を全 docs に明記。
- 369-vault を Claude Code が勝手に編集するリスク → 禁止明記・今回未編集（差分0）。
- secrets/個人情報/本番ログ同期リスク → 同期禁止対象を明記。
- Candidate note を正式判断と誤読するリスク → Candidate・別承認を明記。
- docs/10_obsidian と 369-vault の二重管理リスク → 要約のみ・関係確定は別承認。
- 未push commit の揮発リスク → doc115 push-only（別承認）で解消。

## 10. Definition of Done

- [x] `docs/10_obsidian/` に関係・同期ルール・ダッシュボード入口の Candidate 3件を作成。
- [x] 「GitHubが正本・Obsidianは閲覧・369-vaultは正本ではない・直接編集しない・同期禁止対象・同期実行は別承認」を明記。
- [x] 369-vault 差分0（非編集）・禁止領域差分0・safety script exit 0。
- [x] CURRENT_STATE / PROGRESS にポインタ追記。
- [x] 許可6ファイルのみで Gate 全 green。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 11. 次回推奨プロンプト案

1. **doc115 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. Customer Pain schema実装可否判断（`docs/audit/114 §18` 停止条件から・別の重い承認）。
3. CI / Test / Release Governance docs 整理（別承認・docs-only）。

## 12. 判定

**判定: READY / GO**（GitHub正本・Obsidian閲覧・369-vault の関係を `docs/10_obsidian/` の Candidate として記録した）。

ただし、これは関係の確定でも実同期でもない。**docs-only**・**369-vault非編集**・**実同期なし**・**実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
