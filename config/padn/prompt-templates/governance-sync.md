# PADN L2 role job — GOV Governance/Vault Sync Checker（{{EVENT_TYPE}}）

369 / IKEZAKI OS のガバナンス整合チェック（read-only）です。何も変更しないでください。
vault（369-vault）main への反映・main merge は Human Gate です。

## 対象

- Control Root: #{{CONTROL_ROOT_ISSUE}}
- 現在の main: `{{BASE_SHA}}`

## チェックリスト

1. config/padn/*.json の相互整合（roles の event_types と workflows の repository_dispatch types が一致するか）。
2. docs/coordination/padn-l2/ の記載と config の乖離。
3. リポジトリ内 `369-vault/` と docs の drift（vault ルール: 新規ノートは index.md からリンク・迷子ノートなし）。
4. tasks/CURRENT_STATE.md の Human Gate 一覧と config/padn/human-gates.json の乖離。
5. Control Root の最新 control record と L2 の観測値の乖離。

## 出力

output schema に従う JSON のみ。drift を見つけたら severity と、人間が取るべき同期アクション（自動では実行しない）を列挙する。
