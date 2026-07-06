---
doc: roadmap/15
title: 広告費ゼロ成長ループ / AI Safety 境界（禁止機能・安全代替）
status: Candidate
area: strategy/growth+safety
phase: 横断 candidate
risk: medium（Growth は公開/PR/SEO/紹介を伴う。今回は docs-only・実行なし）
date: 2026-07-06
related:
  - docs/roadmap/03_safety_boundary_matrix.md
  - docs/roadmap/04_human_boundary_matrix.md
---

# 15. 広告費ゼロ成長ループ / AI Safety 境界（Candidate）

> 種別: **docs-only / strategy candidate**。外部公開・PR配信・SEO公開・アフィリエイト報酬・実LLM・AIコストなし。
> 状態: **Candidate**。既存 `docs/roadmap/03_safety_boundary_matrix.md` / `04_human_boundary_matrix.md` を正・非破壊で拡張。

## 1. 目的

「広告を打つのではなく、プロダクトを使う行為そのものが発信・紹介・事例・知識資産につながる」成長ループと、それを暴走させない AI Safety 境界を候補として固定する。

## 2. 広告費ゼロ成長ループ（要点）

AI経営診断 / 請求・見積・契約書共有 / 士業共有 / 社員招待 / 顧客ポータル / 業種テンプレSEO / ベンチマーク共有 / AI成果レポート / Trust・監査レポート / Marketplace投稿 / PR / 導入企業ページ / Business Network / Advocate・Affiliate / Creator / White-label Widget / Certification / Challenge / Public Impact / Build in Public / GitHub透明性 / Obsidian知識整理 / Industry Deep Pack / Customer Success / Enterprise Procurement Trust。

- **原則**: 使う行為が発信・紹介・招待・事例・診断・ドキュメント資産に転化する構造。

## 3. 導入必然性トリガー / 紹介動機

- トリガー: 未回収金 / 請求漏れ / 営業フォロー漏れ / 粗利低下 / 資金ショート予測 / 労務リスク / 契約期限 / AI外部送信リスク 等。**恐怖訴求だけにせず、損失の可視化＋改善方法＋すぐ始める導線をセットにする**。
- 紹介動機: 導入企業/士業/インフルエンサー/コンサル/開発者/社員それぞれに正当なメリット（取引効率・認知・プロフィール・実績化・将来収益化）。

## 4. AI Safety 境界 — 絶対に機能化しないもの（抜粋・恒久禁止）

- AIによる虚偽口コミ/なりすましレビュー/ステマ/実体験でない体験談の生成・投稿。
- AIによる採用合否/法務判断/給与評価/契約締結/広告出稿/決済返金/督促/請求発行/株式投資判断の**自動確定・自動実行**。
- AIによる高機密データ/個人情報の無承認外部送信・本番DB変更。
- 監査ログ/承認ログを削除・改ざんできる通常機能・権限を無承認変更する機能。
- 本番deploy/force push/DB migration/実LLMキー設定/AIコスト発生を AI が無承認実行する機能。
- SEOスパム大量生成 / 顧客許諾なし導入事例公開 / 根拠なしNo.1・成果数値 / 非開示アフィリエイト。
- Obsidian だけで正式判断を完結 / GitHub正本と Obsidian メモの混同 / secrets・個人情報・本番ログ生データの Obsidian 同期。

## 5. 安全な代替機能（禁止の置換）

- 正当な口コミ依頼管理 / 許諾済み導入事例管理 / 投稿前人間承認 / 採用・給与・契約・広告・決済・督促・請求の「候補作成→人間承認」/ 専門家確認フロー / AI提案のみモード / read-only / Kill Switch / 外部送信前承認 / AIコスト承認 / 実LLM未設定前提の mock・stub / Compliance・Disclosure Guard / アフィリエイト開示文生成 / SEO品質・スパムチェック / GitHub監査ログ追記主義。

## 6. Human Certification Gate（要点）

- 承認対象: 営業メール/LINE/SNS送信・広告予算変更・請求発行/送付・入金消込・会計仕訳・値引き・契約変更・顧客事例公開・外部AI送信・データエクスポート・AI社員による外部実行。
- 原則: **AI社員が動くほど、監査ログと承認履歴が積み上がる構造**。

## 7. やらないこと / 承認ゲート / リスク

- やらない: 成長機能の一括実装・外部公開・PR配信・SEO公開・アフィリエイト報酬実装・個人情報共有。
- 承認: 公開系・紹介報酬・外部送信は個別人間承認＋法務確認。
- リスク: 成長施策の暴走・ステマ誤用・個人情報。→ 禁止リスト・安全代替・Human-in-the-loop で緩和。

## 8. 次アクション / 人間判断

- 成長ループのうち「使う行為＝発信」に転化する低リスクなもの（GitHub透明性/Obsidian整理/業種テンプレ）を docs 先行で設計するか（人間判断）。
- 公開系（PR/SEO/導入事例）は既存 `docs/audit`（公開活用方針 doc99/doc100）の PROHIBIT_NOW を継続（変更しない）。
