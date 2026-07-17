# PADN L2 — Threat Model（V11）

対象: `.github/workflows/369-padn-*.yml` + `scripts/padn/**` + `config/padn/**`。
前提: single-owner private repo（DREEXY-git/369）だが、fork・bot・prompt injection を含む
一般的な GitHub Actions 脅威モデルで設計する。

## T1. Untrusted workflow definition（pull_request イベント）

- **脅威**: `pull_request` トリガの run は PR の merge ref にある workflow 定義で実行される。
  悪意ある（または誤った）PR が `369-padn-dispatch.yml` 自体を書き換えれば、その run では
  改変版が動く。
- **対策**:
  - PR イベントは `ingest_pr` job のみで処理。**secrets を一切参照しない**（App key も
    ANTHROPIC/OPENAI key も渡らない）。GITHUB_TOKEN は `contents: read` のみ。
  - スクリプトは `actions/checkout with ref: main` で **main 版を明示 checkout** し、PR 改変版
    コードを実行しない（workflow YAML 自体の改変は防げないため secrets ゼロが本命の防御）。
  - 判断・emit は行わず、30 分以内の schedule / 他イベント（main 定義で実行）が回収する。
  - `pull_request_target` は全面禁止（validate.mjs が lint で強制）。

## T2. Fork PR への secrets 露出

- **脅威**: fork からの PR で secrets が漏れる。
- **対策**: fork PR はそもそも base repo の secrets を受け取らない（GitHub 仕様）+
  `ingest_pr` の if ガード（head.repo == base repo）+ dispatcher 内 `isForkEvent` で
  fork イベントは IGNORED。役割ジョブは repository_dispatch（default branch 文脈）のみで起動。

## T3. Bot ループ / 自己再帰

- **脅威**: L2 が投稿したコメント・verdict が再び L2 を起動し無限ループする。
- **対策（多層）**:
  1. GITHUB_TOKEN で作成したイベントは workflow を起動しない（GitHub の再帰防止仕様）。
     verdict / report 投稿はすべて GITHUB_TOKEN で行う。
  2. App token を使う repository_dispatch には `chain_depth` を付与し、上限（2）超過は破棄。
  3. actor ガード: `[bot]` suffix / ignored_bots のイベントは判断入力にしない。
  4. dispatcher の concurrency group は同時 1 でキュー化。
- **テスト**: events.test / dispatcher.test（bot actor・chain depth・App token 無しの emit 拒否）。

## T4. Prompt injection（Issue/PR 本文・コメント経由）

- **脅威**: WIP Issue コメント等に細工したテキストを書き、role job の LLM に Human Gate 越境や
  scope 拡大を指示する。
- **対策**:
  - 役割ジョブの起動条件は本文テキストではなく**構造化された状態**（lease table / marker /
    hash / SHA）。任意テキストは prompt に入るが、実行権限側で制御:
    claude job は `--allowedTools` 制限 + settings deny（force push / merge / migrate 不可）+
    実行後の ALLOWED_PATHS 機械検査（逸脱で fail）。codex job は read-only sandbox。
  - Human Gate（merge / schema / secrets / 外部送信）は workflow の permissions と tool 制限で
    技術的に不可能にしてある（プロンプト遵守に依存しない）。
  - RT2 事前許可 marker（PADN_RT2_APPROVED）は **許可者 login（owner）のコメントのみ有効**。

## T5. Secrets 漏えい

- **脅威**: token / key がログ・コメント・成果物に混入。
- **対策**: GitHubClient は token をログ出力しない。reports/watchdog は投稿前に
  `redactSecrets`（GitHub/OpenAI/AWS/秘密鍵/Slack パターン）を通す。watchdog は
  secret-like 値の検出を INCIDENT_FREEZE 事由とする。App token は
  `actions/create-github-app-token` が自動 mask。役割ジョブの secrets は該当 job のみに供給。

## T6. Stale / 重複 / 順序逆転イベント

- **脅威**: 古い head の CI 完了・重複 webhook・遅延配送により、失効した PASS で write する。
- **対策**: 判断は常に「イベント」ではなく「ライブ snapshot」に対して行う（イベントは起床
  トリガに過ぎない）。stale 判定（head 不一致）で破棄。fencing token（epoch / lease revision /
  base SHA）不一致は write 拒否。PASS は frozen head と現 head の一致時のみ有効
  （watchdog `stale_pass_head_moved` = FREEZE）。

## T7. 二重 Director / 二重 Control Root / 重複 WIP

- **対策**: discovery が一意性を強制（0 件・複数件は全停止）。duplicate WIP は watchdog FREEZE。
  L2 自身は作成系を持たないため二重作成の加害者になれない。

## T8. 権限過大な GitHub App

- **対策**: 必要権限を PERMISSION_MATRIX に固定（contents: RW / issues: RW / pull_requests: RW /
  actions: read / metadata: read。administration・secrets・environments は**不可**）。
  App が無い場合 dispatcher は read-only 観測に自動縮退（emit 不可）。

## T9. 予算超過 / 暴走

- **対策**: 日次 dispatch 上限（budget）・連続失敗 2 回で BACKPRESSURE_ON・rework 上限 2・
  観測モード既定・write lane hard cap 2（3 本目は Human Gate）。1000 分を超える長時間 job は
  timeout-minutes で強制終了。

## T10. L2 自己書き換え

- **脅威**: L2 が自分の workflow / policy を緩める変更を自動生成する。
- **対策**: `scripts/padn/**` / `config/padn/**` / `.github/**` は risk-policy で RT4 =
  自動開始恒久禁止 + human-gates（workflow_main_reflect）。dispatcher はこれらのパスを含む
  WIP を write 候補にできない。

## 残余リスク（明示）

- pull_request run での workflow YAML 改変そのものは検出のみ（secrets ゼロで実害を遮断）。
- regex lint は YAML 構文の完全検証ではない（GitHub parse が最終防衛）。
- packet が json block を含まない形式の場合、hash は宣言値一致 + head/base 検証に縮退する
  （render-role-prompt.mjs がその旨をログに残す。なお write 系 event では
  packet_comment_id と完全長 hash の両方が必須＝fail-closed で、検証の省略はできない）。
- budget / 連続失敗の実測（collectRuntimeSignals）は API 取得失敗時に 0 へ縮退する
  （transient 障害で全停止しないためのソフトレール設計。取得失敗は step summary で観測可能）。
- GitHub App installation token は create-github-app-token の既定で App の全権限を持つ
  （App 自体を 03_PERMISSION_MATRIX の最小権限で作ることが前提。step 単位の downscope は
  今後の改善項目）。
