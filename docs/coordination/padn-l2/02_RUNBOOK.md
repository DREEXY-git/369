# PADN L2 — Runbook（運用手順）

## 0. 現在の状態を知る

1. Control Root（`[CONTROL]` Issue）の最新コメント = L1/L2 の正本。
2. Actions タブ → `369 PADN L2 Dispatch` の最新 run の **Step Summary** に、§9 チェックリスト・
   決定（would dispatch / dispatched）・理由が毎回出る。observe mode の間はここが唯一の出力。
3. `369 PADN L2 Watchdog` が fail していれば findings を Step Summary で確認。

## 1. 初回有効化（人間のみが実行できる）

前提: 本 PR が人間により main へ merge 済み（workflow_main_reflect Gate）。

1. GitHub App を作成・インストール（権限は 03_PERMISSION_MATRIX.md のとおり最小）。
2. Secrets/Variables を設定（04_SECRETS_VARIABLES.md。**値はこの docs に書かない**）。
3. Actions Variables:
   - `PADN_AUTONOMY_ENABLED=true`（kill switch 解除）
   - `PADN_MODE=observe`（必ず observe から）
   - `PADN_WRITE_LANES=0`
   - `PADN_REPORTS_ENABLED=false`（コメント投稿はまだしない）
4. `369 PADN L2 Governance` を手動実行 → 全 green を確認。
5. `369 PADN L2 Dispatch` を手動実行 → Step Summary で snapshot / チェックリストが正しいか確認。

## 2. 段階昇格（05_ROLLOUT_ROLLBACK.md の Gate ごとに人間が判断）

observe（1 週間） → `PADN_MODE=rt0_pilot` + `PADN_WRITE_LANES=1`（docs レーン 1 本）
→ `rt1_pilot`（純ロジック追加）→ RT2 は **WIP 単位**で対象 WIP Issue に owner が
`PADN_RT2_APPROVED` を含むコメントを書いた場合のみ。RT3/RT4 の自動開始は存在しない。

## 3. 緊急停止（kill switch）

いずれか（上から順に速い）:

1. Actions Variables で `PADN_AUTONOMY_ENABLED` を削除 or `false`（全 workflow が即 no-op 化）。
2. Actions タブ → 各 `369 PADN L2 *` workflow → Disable workflow。
3. Control Root へ `INCIDENT_FREEZE` を含むコメントを投稿（dispatcher/watchdog が読み取り、
   新規 dispatch を停止する。既存 branch/PR/Evidence はそのまま）。

解除も人間のみ: freeze の原因 findings を確認 → 対処 → Control Root に解除方針を記録 →
変数を戻す。L2 に自動解除の経路はない。

## 4. よくある状況と対処

| 状況 | 読み方 | 対処 |
|---|---|---|
| dispatch run が `DISABLED` | kill switch が効いている（正常な default） | 有効化は §1 |
| `NO_ACTION` + checks に ❌ | §9 のどれかが欠けている（詳細は detail 列） | 欠けを解消するのは Director/人間（例: lease 再発行） |
| `would dispatch (not emitted)` | observe mode で決定のみ | 妥当なら mode 昇格を検討 |
| `app_token_missing` | App 未設定。GITHUB_TOKEN では chaining 不可（再帰防止仕様） | App 設定（§1-1,2） |
| watchdog `stale_pass_head_moved` | PASS 後に head が動いた（規約違反） | 該当レーンを freeze し Director が再監査を発行 |
| watchdog `stale_lease` | claim 後 24h checkpoint なし | Director が lease 回収/再発行 |
| codex job `CODEX_AUDIT_FAILED` コメント | 監査が完走しなかった＝PASS ではない | run ログ確認 → 再 dispatch は次回 tick が自動判断 |
| base drift（main が進んだ） | 全 write 前提が崩れた | Director が新 base で packet/lease を再発行 |

## 5. Human Gate 到達時

L2 は approval packet（`369-l2-approval-packet-v1`: fixed head / evidence / rollback 手順 /
要約）を WIP Issue に append-only で残して**停止**する（dispatcher が READY_FOR_HUMAN_GATE を
観測した時。同一 fixed head への再投稿はしない＝冪等）。
**投稿は `PADN_REPORTS_ENABLED=true` の場合のみ**。false の間は Step Summary にのみ出る。
merge・schema・secrets・外部送信・課金は GitHub UI 上で人間だけが実行する。

## 6. 定例確認（推奨: 週1）

- Oversight（H）の直近レポート（ALERT が無いか）。
- Actions 使用量（budget: 日次 dispatch 上限は dispatch-policy.json）。
- Governance run の vault drift 警告。
- `node scripts/padn/validate.mjs --configs && node --test scripts/padn/__tests__/*.test.mjs`
  が green のまま維持されていること（CI でも governance workflow が実行）。
