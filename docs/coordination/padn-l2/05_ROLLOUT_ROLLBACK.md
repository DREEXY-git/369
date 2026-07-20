# PADN L2 — Rollout / Rollback

## Rollout（各 Gate は人間の明示判断。飛び級しない）

| Phase | 状態 | 入る条件（Gate） | 出る条件 |
|---|---|---|---|
| P0 | Draft PR（本 PR）レビュー | — | 人間が merge（workflow_main_reflect Gate） |
| P1 | merge 済み・全変数未設定（完全停止） | merge | 人間が §1 手順（RUNBOOK）で observe 化 |
| P2 | **observe**: write 0・emit 0・Step Summary のみ | App/keys/変数設定 | 1 週間、誤検出・誤決定（would dispatch の妥当性）ゼロを人間が確認 |
| P3 | **rt0_pilot**: docs 系 RT0 を 1 レーンのみ | P2 確認 + 人間が `PADN_MODE=rt0_pilot`, `PADN_WRITE_LANES=1` | RT0 WIP を 2 件以上、監査 PASS + 人間 merge まで完走 |
| P4 | **rt1_pilot**: RT0+RT1 各 1 レーン | P3 完走 + 人間判断 | 安定運用 + Codex 独立監査で重大 finding 0 |
| P5 | RT2（WIP 単位の人間事前許可制） | 対象 WIP に owner の `PADN_RT2_APPROVED` | — |
| — | RT3 / RT4 | **経路なし**（自動開始禁止。解禁には本 config の改訂 = RT4 変更 = Human Gate） | — |

write lane の 2→3 本目・`PADN_REPORTS_ENABLED=true` 化も独立の人間判断。

## Rollback（速い順）

1. **変数 kill switch**: `PADN_AUTONOMY_ENABLED` を削除/false → 全停止（数秒。既存 run は
   timeout 内で終わり、以後の起動はすべて no-op）。
2. **workflow disable**: Actions UI で `369 PADN L2 *` を Disable（schedule ごと停止）。
3. **INCIDENT_FREEZE**: Control Root へ宣言コメント → dispatcher/watchdog が新規 dispatch を
   停止（既存 branch / PR / Evidence は削除しない。§16）。
4. **完全撤去**: 本 PR の revert 1 コミット（追加ファイルのみで構成されているため、revert で
   既存機能への影響ゼロ。ci.yml・アプリコード・schema・package は一切触っていない）。

## ロールバック後の再開

原因 findings を Control Root に記録 → 対処 → P2（observe）からやり直す。
Phase を飛ばした再開はしない。

## 監視指標（P2〜P4 で人間が見る）

- dispatch Step Summary の ❌ 項目分布（§9 のどれで止まっているか）
- watchdog findings 発生率（特に stale_pass_head_moved / prompt_hash_mismatch = 設計違反系）
- 日次 role dispatch 数 vs budget（dispatch-policy.json）
- role job の成功率・連続失敗（2 で自動 BACKPRESSURE_ON）
