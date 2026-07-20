# PADN L2 Event-Driven Orchestrator — Architecture（V11）

- PROGRAM_ID: `369-PADN-L2-AUTONOMY-V11` / 対象 L1: `369-PADN-V5`（Control Root: `[CONTROL]` + `369-control-root-v1` marker で discovery。2026-07-17 時点の実体は Issue #66）
- Baseline Commit（設計時 main）: `7e50a04df6dcc8043689958cbfd9be42e15e1af7`
- 状態: **Draft PR 提案（未採用・default-off）**。本 workflow 群の main 反映自体が Human Gate。

## 0. 用語の重要な注意 — この「L2」は自動化レベル L0–L7 ではない

`docs/roadmap/08_automation_level_taxonomy.md` の L0–L7（L2 = AI Draft / 実装上限 L4）は
**AI の権限レベル**の正本であり、本書はそれを一切変更しない。

本書の「L2」は **オーケストレーション層の第2層** を指す:

| 層 | 実体 | 起動方法 |
|---|---|---|
| L1 | PADN-V5（Control Root Issue + チャットの Director/レーン運用） | 人間がチャットセッションを起動 |
| L2（本書） | GitHub Actions による役割ジョブの**イベント駆動起動** | GitHub イベント（PR/CI/コメント/schedule 等） |

L2 で自動起動されるジョブの権限は従来どおり taxonomy の範囲内（成果は必ず Draft PR・
main merge は人間）。つまり L2 は「起動の自動化」であり「権限の拡大」ではない。

## 1. 目的と非目的

**目的**: 現在チャット手動で回している L1 の役割ジョブ（B 実装 / C・D Codex 監査 / E 統合監査 /
G 探索 / H 監督）を、GitHub イベントで自動起動する。L1 の Control Root / WIP / Lease /
Prompt Packet / fencing token / fixed-SHA 規律は**そのまま正本として import** する。

**非目的**: WIP・Lease の新規発行（Director 権限に残す）、Human Gate の解除、
自動化レベルの引き上げ、Production への接触。

## 2. 構成要素

```
.github/workflows/
  369-padn-dispatch.yml    Dispatcher（全イベント入口・decide → repository_dispatch）
  369-padn-claude.yml      B/D-impl role jobs（anthropics/claude-code-action@v1・write）
  369-padn-codex.yml       C/C-SEC/D-EVID/E audit jobs（openai/codex-action@v1・read-only）
  369-padn-watchdog.yml    §16 検出器（read-only・検出時 run fail + 任意で Control Root へ報告）
  369-padn-oversight.yml   H-Codex read-only 監督（1日2回 + イベント）
  369-padn-governance.yml  config 整合・selftest・単体テスト・vault drift 検査（RT0）

scripts/padn/              純 Node 20（依存ゼロ）。全ロジックはここに置き workflow は薄く保つ
  dispatcher.mjs  discover.mjs  state.mjs  github.mjs  events.mjs  leases.mjs
  locks.mjs  prompts.mjs  risk.mjs  reports.mjs  watchdog.mjs  validate.mjs
  render-role-prompt.mjs  export-snapshot.mjs  check-diff-paths.mjs
  __tests__/               node:test（node --test scripts/padn/__tests__/*.test.mjs）

config/padn/
  roles.json state-machine.json risk-policy.json human-gates.json
  dispatch-policy.json resource-taxonomy.json
  prompt-templates/*.md schemas/*.schema.json
```

## 3. イベントフロー

```
GitHub イベント（issues / issue_comment / pull_request / workflow_run(CI) /
                 deployment_status / schedule / workflow_dispatch / repository_dispatch）
   │
   ▼
369-padn-dispatch.yml ─ ingest_pr（pull_request のみ・secrets ゼロ・観測のみ）
   │                └─ dispatch（それ以外・main 定義で実行）
   ▼
scripts/padn/dispatcher.mjs
   1. normalizeEvent → actor/bot/fork/chain/stale/production ガード
   2. discover.buildSnapshot — L1 の read-only import（Control Root 一意性・WIP・Lease・PR・head）
   3. state machine: 各 WIP の現在状態 → 起動可能な (state, event_type) 組のみ候補化
   4. §9 前提条件チェックリスト（全項目 AND。1 つでも欠ければ write なし）
   5. observe mode → 決定を step summary に記録のみ / pilot mode → App token で repository_dispatch
   ▼
role workflows（repository_dispatch types 限定）
   guard: payload 静的検証 → ライブ再検証（packet hash 再計算・head 不動・base drift）→ prompt render
   実行: claude-code-action（write・ALLOWED_PATHS 事後検査つき） / codex-action（read-only・fixed head）
   報告: 別 job が WIP Issue へ append-only verdict（GITHUB_TOKEN → 再帰起動なし = ループ構造なし）
```

## 4. L1 import（§4）

- Control Root は **Issue 番号固定ではなく marker discovery**（`[CONTROL]` + `369-control-root-v1`）。
  0 件 = NO_CONTROL_ROOT、2 件以上 = DUPLICATE_CONTROL_ROOT で全停止。
- WIP / Lease / packet hash / fencing token / frozen head / review verdict / rework 回数は
  Issue 本文とコメント列から fold して import する（`state.mjs` / `discover.mjs`）。
- L2 は WIP・Issue・branch・PR・Lease を**新規作成しない**。同じ WIP への重複 dispatch は
  state machine の `l2_dispatchable` 対（例: CLAIMED には implement を送らない）で構造的に防ぐ。
- PR #62（gov-phase-multichat-v4 candidate）は read-only 設計参照（semantic lock の
  SNAPSHOT_READ/INTENT_WRITE/WRITE/EXCLUSIVE 階層を採用）。candidate 自体は未採用のまま。

## 5. 状態機械

`config/padn/state-machine.json` 参照。要点:

- `HEAD_MOVED` は FROZEN/REVIEW_PASSED/READY_FOR_HUMAN_GATE から IMPLEMENTING へ戻す =
  **fixed SHA が動いたら PASS 失効**（Control Root 運用規約3）。
- `HUMAN_MERGE` / `RESUME` は human_only。L2 の語彙に「merge を実行する」action は存在しない。
- rework は最大 2。3 回目は `REPLAN_REQUIRED` として Director へ返す（運用規約4）。

## 6. Prompt Packet hash

Control Root 運用規約2 の「UTF-8 / sort_keys / separators=(",",":")」を `prompts.mjs` の
`canonicalJson` で実装（Python `json.dumps(obj, sort_keys=True, separators=(",",":"),
ensure_ascii=False)` と同一 bytes。テストは Python で事前計算した vector で固定）。
truncated hash（`ca57d9c1…` 形式）は **write 開始条件として認めない**（完全 64 hex のみ）。
D-201 の全角括弧転写破損インシデントは回帰テスト化済み。

## 7. CI / Vercel 相関（§13）

- CI は workflow name `CI`（jobs: stage1 / stage2_integration / stage3_e2e / release_gate）を
  `workflow_run` で購読。head_sha が現在のどの PR head / main とも一致しない完了イベントは
  stale として破棄。
- `deployment_status` は deployment.sha を open PR head に相関。**Preview Ready は
  Security/Evidence PASS ではない**（approval packet に事実として添付するのみ）。
  environment が Production を含む deployment は監視・操作の対象外。

## 8. Reporting（§15）

`369-l2-event-v1` の機械 JSON + 非エンジニア8項目要約（ひとことで/現在地/完了/作業中/監査中/
問題/人間確認/次）を併記した append-only コメント。投稿は `PADN_REPORTS_ENABLED=true` かつ
実 emit / watchdog action があった場合のみ（schedule によるコメントスパム防止）。
それ以外は GITHUB_STEP_SUMMARY に完全な判断ログ（§9 チェックリスト含む）を残す。

## 9. スケジュール間隔の判断（§6）

30 分周期を採用。15 分案との比較: 遅延は最大 15 分短縮されるが Actions 実行回数が 2 倍
（dispatcher 単体で +48 runs/日）。L2 の主経路はイベントトリガであり schedule は取りこぼし
回収用のため、30 分で十分と判断（`dispatch-policy.json` に記録）。

## 9b. H Oversight の起動事由（§14）

- schedule: 1日2回（cron `15 0,12 * * *`）
- dispatcher からの emit: role job を実 emit した時（= WIP dispatch）・main への push CI 完了時
- 手動: workflow_dispatch
- Control Root 更新・PR head 更新・review verdict・Human Gate 到達は dispatcher を起床させる
  イベントであり、上記 emit 条件（role dispatch）または次回 schedule で oversight に反映される。
  READY_FOR_HUMAN_GATE 到達時は approval packet の投稿（§12）が主経路。

## 9c. Watchdog シグナルのライブ配線状況（§16 の正直な記載）

watchdog.mjs main() が実測して渡すシグナル:

- `dispatchesToday` / `consecutiveFailures`: 当日の repository_dispatch 起点 PADN run の実数
  （API 取得失敗時は 0 に縮退＝ソフトレール。§9 budget も同じ実測値を dispatcher が使用）
- `promptHashMismatches`: 進行中レーン（CLAIMED/IMPLEMENTING/FROZEN）で完全長 packet hash を
  持たないもの。**宣言 hash と packet 本文の再計算突合**は role job guard
  （render-role-prompt.mjs）が write 直前に fail-closed で行う
- `scanTexts`: Control Root / WIP 直近コメントの secret 様値スキャン

runWatchdog の引数として存在するが main() では供給しない（他レイヤが一次防衛する）シグナル:

- `ciZeroTests`: ci.yml 自体が 0 件収集を fail にする（stage2 の件数ゲート / stage3 の
  if-no-files-found: error）
- `gateViolations`: dispatcher の `human_gate_clear` が dispatch 前に遮断
- `vaultDrift`: governance workflow が検査・警告

## 10. 既知の制約

- workflow lint（validate.mjs）は regex ベースであり完全な YAML 解析ではない。構文の正は
  GitHub 側の parse と、開発時の `python3 -c "yaml.safe_load"` 検証。
- 「active Director 重複」の決定的検出器は未実装（Control Root 一意性 + epoch fencing +
  H-oversight の checklist で間接的にカバー。専用検出は今後の改善項目）。
- `pull_request` イベントで起動する run は workflow 定義自体が PR 由来のため、判断は行わず
  observe のみ（THREAT_MODEL 参照）。判断は 30 分以内の schedule / 他イベントで回収される。
- 369-vault 独立リポジトリ（DREEXY-git/369-vault）の main 状態はセッションのリポジトリ
  スコープ外のため本実装セッションでは未検証（vault 反映はリポジトリ内 `369-vault/` のみ。
  独立リポジトリへの mirror push は merge 後の Human Gate 配下の追加作業）。
