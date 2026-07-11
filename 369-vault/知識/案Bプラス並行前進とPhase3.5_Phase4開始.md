# 案B+ 並行前進 — Phase 3.5 Growth Channels と Phase 4 AI社員OS の開始（v5.5・2026-07-11）

人間 Phase Gate が**案B+**を採択した記録。正本は GitHub docs（roadmap69-71・audit168-170）。

## 決定の骨子

- Phase 3 は「**AI Growth Engine v0**」としてクローズ準備する（「全機能完成」とは呼ばない）。
- C19（広告）/C21（SEO・コンテンツ・PR）/C22（紹介・アフィリエイト）は捨てずに「**Phase 3.5 Growth Channels**」として正本化（責任者・DoR/DoD・read-only→AI下書き→人間承認 Gate→外部接続再開条件を各チャネルに設定）。
- Phase 4（AI社員OS・3Dオフィス）と Phase 3.5 を**独立ストリームで並行前進**。
- **Phase 4 完了条件に「主要 Growth Channel 最低1つの接続」を必須化**（Growth を置き去りにしない）。
- 外部操作（広告出稿・SNS投稿・PR公開・実LLM・課金）は封印のまま。
- 完全機能台帳は `ATOMIC_LEDGER_SYNC=PENDING` 継続（原典不在・期待ハッシュと統合手順を roadmap69 §0 に固定。解除まで Phase 3 正式完了と main 統合は HOLD）。

## Stream A: C19 Ads read model（PR #4）

/marketing/ads — チャネル状態盤（記録あり/データ不足/未接続を区別・外部連携は常時「封印中」表示・実データがないチャネルを動作中に見せない）・広告指標集計（CTR/CPA は分母0なら「未計測」）・AI 改善案の**下書き**（根拠・信頼度・データ不足・次の人間確認を必須構造化・FakeLLM 直呼びで実 LLM 経路が構造的に不在）。CI `96 passed / 0 failed`。

## Stream B: AI社員 3D バーチャルオフィス v0（PR #5）

/ai-office — AI 社員の状態（待機中/準備中/作業中/承認待ち/ブロック/エラー/停止中/計測なし）を**証拠**（実行記録・承認ゲート）から導出し、証拠がなければ「計測なし」と表示（働いているように捏造しない）。Three.js の業務ゾーンと**人間の承認デスク**（承認待ちから破線接続）・色＋アイコン＋ラベルの冗長表現・クリック詳細・フィルタ・2D 一覧フォールバック・モバイル簡略表示。プロンプト全文・承認 payload・PII は取得しない。read-only（実行・承認・削除の導線なし）。

関連: [[index]] / [[Phase3クローズ準備_境界クローズ4連WIP]] / [[AIの役割と境界]]
