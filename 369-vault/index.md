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
- [[Phase2ACompanyBrain設計]] — Company Brain の schema 設計第一版：2テーブル先行と三段承認（Phase 2-A-1）。
- [[Phase2A2Schema変更]] — 初の schema 変更を破壊ゼロ・全検証 green で実施：migrate コマンドの罠2つ（Phase 2-A-2）。
- [[Phase2A2本番確認]] — Company Brain の器が本番に入った：利用者実測 GO・画面なしが正常（Phase 2-A-2-PROD）。
- [[Phase2A3aCompanyBrain可視化]] — Company Brain が初めて見えた：架空デモデータ＋read-only 2画面＋smoke 12/12（Phase 2-A-3a）。
- [[Phase2A3a本番確認]] — 本番確認は一度 HOLD → 再実測で GO 解消：HOLD を消さず追記で閉じた記録（Phase 2-A-3a-PROD / PROD-2）。
- [[Phase2A3b1CompanyPolicy書き込み]] — 初の書き込み機能：会社方針だけ・3操作だけ・消せない・AIは書き換えられない（Phase 2-A-3b-1）。
- [[Phase2A3b1安全補正]] — push前に境界を締め直す：AI mutation全面禁止・高機密ラベルは参照ログ実装まで保留（Phase 2-A-3b-1-SAFE）。
- [[Phase2A3b1本番確認]] — 会社方針の作成・編集・アーカイブが本番で GO：書き込み第一段の完全クローズ（Phase 2-A-3b-1-PROD）。
- [[Phase2A3b2ProductCatalog書き込み]] — 商品カタログにも書き込み：安全境界を最初から組み込み修正ループ0回・価格メモと課金の分離（Phase 2-A-3b-2）。
- [[Phase2A3b2本番確認]] — 商品カタログの書き込みが本番で GO：Company Brain 2テーブルの人間書き込みが完全クローズ（Phase 2-A-3b-2-PROD）。
- [[Phase2A3cAI参照設計]] — AIに読ませる前に「読んだ記録」と「外に出さない仕組み」を設計：実装は次の承認から（Phase 2-A-3c-1）。
- [[Phase2A3c2CompanyBrainAI参照]] — AIが初めて会社の頭脳を読んだ：ナレッジ検索のみ・記録はレコードごと・外部送信ゼロ（Phase 2-A-3c-2）。
- [[Phase2A3c2本番確認]] — AI参照の本番確認は HOLD：AI回答と参照セクションが本番で未表示・GO済み基準は動かさず read-only 原因調査へ（Phase 2-A-3c-2-PROD）。
- [[Phase2A3c2HOLD解消]] — HOLD解消・再実測GO：原因はバグではなく本番データ前提差。会社方針を本番で作成したら AI参照が全表示（Phase 2-A-3c-2-PROD-2）。
- [[Phase2A完了]] — Phase 2-A 正式完了：会社の頭脳を人間が育て・AIが安全に読み・記録が残る基盤が本番GOまで完成（Phase 2-A-CLOSE・判定 GO）。
- [[PhaseX04本番スモーク定型化]] — 本番確認の型を固定：§0実測テンプレート・GO/HOLD/STOP・本番に実在するデータで確認・ENSHiN OS追加停止条件（Phase X-04）。
- [[Phase2B入口レビュー]] — 会社の頭脳の次の中身は営業プレイブックから：事例・顧客課題は許諾と高機密の部品が揃ってから（Phase 2-B-ENTRY・READY / GO）。
- [[Phase2B1SalesPlaybook設計]] — 営業プレイブックの設計図：顧客名・事例を最初から入れない「売り方の型」の棚・実装は次の承認から（Phase 2-B-1）。
- [[Phase2B2SalesPlaybookSchema変更]] — 営業プレイブックの器が完成：追加のみ・既存無傷・検証全green・本番反映はこれから（Phase 2-B-2）。
- [[Phase2B2本番確認]] — 営業プレイブックの器が本番で GO：build成功＝migration成功・既存画面無回帰・画面なしが正常（Phase 2-B-2-PROD）。
- [[Phase2B3SalesPlaybook可視化]] — 営業プレイブックが初めて見えた：架空の型6件＋閲覧専用一覧＋smoke 16/16・本番確認はこれから（Phase 2-B-3）。
- [[Phase2B3本番確認]] — 営業プレイブックの本番確認は HOLD：詳細実測で「ナビに出ない」の1点に症状を特定・画面直打ちは正常・GO記録は main 反映前に差し止め済み（Phase 2-B-3-PROD）。
- [[Phase2B3ナビ再確認]] — ナビHOLD解消・再実測GO：ハードリロード一発で表示・原因はキャッシュの可能性大・コード修正ゼロ（Phase 2-B-3-PROD-2）。
- [[Phase2B4SalesPlaybook書き込み]] — 営業プレイブックを人間が育てられるようになった：作成・編集・アーカイブ＋AIは書き換え不可＋smoke 17/17・本番確認はこれから（Phase 2-B-4）。
- [[Phase2B4本番確認]] — 営業プレイブックの書き込みが本番で GO：作成→編集→アーカイブ1周＋監査ログ3件＋安全UI確認・HOLDなしの一発GO（Phase 2-B-4-PROD）。
- [[Phase2B5SalesPlaybookAI参照設計]] — AIが営業プレイブックを読む前の安全設計：実証済みの仕組みに3テーブル目を足すだけ・外部送信は構造的にゼロ・実装は次の承認から（Phase 2-B-5-ENTRY）。
- [[Phase2B5SalesPlaybookAI参照実装]] — AIが営業プレイブックを読めるようになった：読むだけ・読んだら記録・外部AIには出ない・smoke 18/18・本番確認はこれから（Phase 2-B-5）。
- [[Phase2B5本番確認]] — AIが営業プレイブックを読むのが本番で GO：参照表示＋AI参照ログを実測確認・「見当たらない」の実体は見る場所の違い・68点はFakeLLM仕様（Phase 2-B-5-PROD）。
- [[Phase2B完了]] — Phase 2-B 正式完了：営業プレイブック全5段が本番GO・会社の頭脳3テーブル体制が完成・HOLD 2件はコード修正ゼロで解消（Phase 2-B-CLOSE）。
- [[PhaseX05CI否定系テスト設計]] — 品質を「規律」から「仕組み」へ：CI 3段階＋否定系テスト8対象の設計・最大の穴は AI書き込み禁止層のテストゼロ・実装は次の承認から（Phase X-05-ENTRY）。

## 🔗 コード側の正（source of truth）

- 現在地: `369` リポジトリの `tasks/CURRENT_STATE.md`＋git refs。
- 履歴: `369/tasks/PROGRESS.md`。
- 監査記録: `369/docs/audit/*`。
- ロードマップ: `369/docs/roadmap/*`（長期構想・Phase 2・Feature Registry・各種Matrix）。
- 利用量一覧: `369/docs/audit/usage_event_emit_matrix.md`。
