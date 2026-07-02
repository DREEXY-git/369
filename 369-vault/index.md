# index — 369 知識ベースの目次

> 369（IKEZAKI OS / LeadMap AI）の思想・プロンプト・知識の入口。まずここから辿る。詳しい趣旨は [[README]]。

## 🧭 このヴォルトについて

- コード本体は別リポジトリ `369`。ここ `369-vault` は **why（思想・判断・言葉）** を保存する場所。
- すべて日本語 Markdown・Obsidian 前提・`[[リンク]]` で相互参照。

## 🪷 思想

- [[369の思想と世界観]] — 何を作り、どんな世界を目指すのか。
- [[安全第一の哲学]] — 「速さ」より「壊さないこと」。証拠主義。
- [[AIの役割と境界]] — AI に何をさせ、何を絶対にさせないか。

## ⌨️ プロンプト

実際に使って効果のあった型を1プロンプト1ファイルで蓄積。

- [[フェーズ実装プロンプトの型]] — 薄い縦切りを安全に実装させる型。
- [[本番確認記録プロンプトの型]] — 実測値だけで GO/HOLD を記録させる型。
- [[push専用プロンプトの型]] — fast-forward push だけを安全に行う型。
- [[状態管理修復プロンプトの型]] — docs の陳腐化・一時状態を安定化させる型。

## 📚 知識

- [[用語集]] — このプロダクト特有の言葉の意味。
- [[アーキテクチャ概要]] — 技術スタックとディレクトリの地図。
- [[UsageEvent非課金台帳]] — 利用量記録8種類と非課金の原則。
- [[セキュリティと権限]] — RBAC・機密ラベル・監査・SSRF・承認。
- [[既知の落とし穴とローカル検証]] — 踏み抜きやすい罠と検証手順。
- [[意思決定ログ]] — 重要な判断とその理由の時系列。
- [[状態管理とドキュメント役割]] — PROGRESS/CURRENT_STATE/matrix/vault の役割分担（Phase 1-47 で固定）。
- [[Phase1最終セキュリティ監査]] — Phase 1 を閉じる前の6領域最終点検（Phase 1-48・GO）。
- [[Phase1完了判定]] — Phase 1 を閉じられるかの判定と送り先整理（Phase 1-49・GO）。
- [[Phase1完了記録]] — Phase 1 の正式完了と次Phase=Phase X の選定記録（Phase 1-50）。
- [[PhaseX01検証基盤整理]] — 検証の道具箱の棚卸しと E2E 実行可能性の発見（Phase X-01）。
- [[PhaseX02E2E実行実証]] — 初の E2E 実実行：環境GREEN・smoke 11本RED の教訓（Phase X-02）。
- [[長期構想とPhase2ロードマップ]] — 追加構想17領域の非破壊統合と Phase 2 設計図（Phase X-RM-01）。
- [[PhaseXRM02ロードマップレビュー]] — 追加構想リストとの突合・表記統一・分類23項目の固定（Phase X-RM-02）。
- [[PhaseX03E2EGreen化]] — E2E smoke 初の 11/11 green：red の剥がし方と修正先の見極め（Phase X-03）。
- [[PhaseXRM03Phase2入口条件]] — Phase 2 入口レビュー READY／実装は人間承認待ち（Phase X-RM-03）。
- [[PhaseX完了記録]] — Phase X（短期品質フェーズ）の正式完了と恒久資産の整理（Phase X-CLOSE-01）。

## 🔗 コード側の正（source of truth）

- 現在地: `369` リポジトリの `tasks/CURRENT_STATE.md`＋git refs。
- 履歴: `369/tasks/PROGRESS.md`。
- 監査記録: `369/docs/audit/*`。
- ロードマップ: `369/docs/roadmap/*`（長期構想・Phase 2・Feature Registry・各種Matrix）。
- 利用量一覧: `369/docs/audit/usage_event_emit_matrix.md`。
