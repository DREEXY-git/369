# PADN L2 イベント駆動オーケストレータ設計（V11・Draft PR 提案）

## ひとことで

これまで人間がチャットで手動起動していた PADN の役割ジョブ（実装・監査・監督）を、
GitHub のイベント（PR 更新・CI 完了・コメント・定時）で**自動起動する仕組みの提案**。
merge しても初期状態では**完全に停止**しており（default-off）、人間が変数を設定するまで
何も動かない。

## 大事な区別

- ここでいう「L2」は**起動の仕組みの第2層**（L1 = チャット手動、L2 = イベント駆動）。
- [[用語集]] や roadmap/08 の自動化レベル L0-L7（L2=AI下書き・上限L4）とは**別の軸**で、
  AI の権限は一切広がらない。成果は必ず Draft PR・main merge は必ず人間のまま。

## 何を作ったか（すべて追加ファイルのみ・既存コード無変更）

- GitHub Actions workflow 6 本（dispatcher / Claude 実装ジョブ / Codex 監査ジョブ /
  watchdog / oversight / governance）
- 判断ロジック `scripts/padn/`（依存ゼロの Node、単体テスト 76 件 green）
- ポリシー正本 `config/padn/`（役割・状態機械・Risk Tier RT0-RT4・Human Gate・
  資源ロック・プロンプト雛形）
- docs 正本 `docs/coordination/padn-l2/`（アーキテクチャ・脅威モデル・運用手順・
  権限表・Secrets名一覧・段階導入/巻き戻し）

## 安全設計の柱

1. **default-off**: 変数 `PADN_AUTONOMY_ENABLED` を人間が設定するまで全停止。
   observe モードでは「何をするつもりだったか」をログに書くだけで実行しない。
2. **L1 の規律をそのまま継承**: Lease・fencing token・prompt hash・fixed SHA・
   rework 上限 2・容量 2 レーン。1 条件でも欠ければ write しない（§9 チェックリスト）。
3. **Human Gate は構造的に越えられない**: merge・schema・Secrets・外部送信・課金は
   ツール制限と権限設定のレベルで不可能（プロンプト遵守に依存しない）。
4. **暴走防止**: bot ループ遮断・日次予算・連続失敗 2 回で自動抑制・kill switch 1 個で全停止。
5. **監査可能**: すべての判断は Step Summary と Control Root への append-only イベントに残る。

## 現在地

Draft PR として提案（未採用）。workflow を main に入れるかどうか自体が人間の Gate。
正本は GitHub `docs/coordination/padn-l2/` と Draft PR 本文。

関連: [[Codex協調統合v58]]（Claude×Codex 協調の始まり）・[[状態管理とドキュメント役割]]・
[[アーキテクチャ概要]]
