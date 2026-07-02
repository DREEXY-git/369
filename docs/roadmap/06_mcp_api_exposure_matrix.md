# 06. MCP / API Exposure Matrix（公開可否マトリクス） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。**現時点で MCP/API の外部公開は行わない**。本書は将来の公開に備えた分類と、公開前に満たすべき条件の固定である。

---

## 1. Exposure 分類（8区分）

| 区分 | 意味 |
|---|---|
| prohibited | 公開禁止（内部にも API 面を作らない） |
| private internal | 社内システム内部のみ（コード内 API・非ネットワーク） |
| read-only internal | 内部向け read-only API（認証必須・書き込みなし） |
| sandbox only | サンドボックス環境限定（本番データなし） |
| approval required | 呼び出しごと/接続ごとに承認が必要 |
| enterprise only | エンタープライズ契約・審査済み組織限定（将来） |
| future public | 将来の公開候補（現在は非公開） |
| future MCP candidate | 将来の MCP ツール化候補（現在は非公開） |

**現時点の運用**: 全 API 系構想は「設計のみ」。ネットワーク公開される新規エンドポイントは作らない。

## 2. 対象別分類

| 対象 | 現時点 | 将来目標 | 条件・備考 |
|---|---|---|---|
| 369 MCP/API Gateway（入口本体） | 設計のみ | private internal → 段階公開 | 全外部アクセスの単一入口。scope・rate limit・audit を最初から |
| Zero-Trust Agent Gateway | 設計のみ | approval required | エージェント単位の認証・最小権限 |
| Company Brain API / MCP | 設計のみ | read-only internal → future MCP candidate | PII・高機密は API 面に出さない（Data Classification 連動） |
| Business Graph API | 設計のみ | read-only internal → future MCP candidate | 同上 |
| Talent Graph API / MCP | 設計のみ | **enterprise only（将来も慎重）** | 人事PII を含むため最厳格。評価転用禁止 |
| Product Recommendation API | 設計のみ | read-only internal → future public | 推奨根拠の透明性が公開条件 |
| Sales Action API | 設計のみ | **approval required（将来も承認必須）** | 「アクション」は外部送信に近接。write は承認ゲート必須 |
| Proposal API | 設計のみ | read-only internal → future public | 生成物は下書き扱いを API 契約に明記 |
| Webhook Subscriptions | **実装済み（内部・承認付き）** | 現状維持 → future public | 既存実装。実送信は承認＋EXTERNAL_SEND_ENABLED |
| Developer Platform（API Keys / OAuth Apps / MCP Server Config） | 設計のみ | future public（審査制） | App Review / Permission Review / Security Scan が前提 |
| Sandbox Workspace | 設計のみ | sandbox only | 本番データを混ぜない |
| API Usage Dashboard / Rate Limit | 設計のみ | private internal | UsageEvent 基盤の流用候補（usage_only） |
| Developer Billing Dashboard | 設計のみ | future（Phase 8 依存） | 実課金凍結中は作らない |
| 外部送信系操作（write / delete / send / payment） | **prohibited** | approval required（将来でも承認必須） | 無承認の外部実行 API は恒久的に作らない |
| ロボット・物理操作 API | **prohibited** | prohibited（当面恒久） | doc03/doc08 の blocked と一致 |
| 課金・決済 API | **prohibited** | Phase 8 で再分類 | 実課金凍結と連動 |

## 3. Phase 2 での扱い（2-G: internal scope design）

Phase 2 では以下の**設計のみ**行う（エンドポイント実装なし・公開なし）:

1. scope 体系の設計（例: brain.read / sales.recommend.read / audit.read のような最小単位。命名は実装時に確定）。
2. rate limit・quota の方針（tenant 単位・agent 単位）。
3. audit 方針（全 API 呼び出しの writeAudit 相当＋UsageEvent usage_only 候補）。
4. sandbox 方針（本番データ遮断）。
5. 公開可否分類の本 Matrix への反映。

## 4. 公開前の必須条件（future public / MCP 化の入口ゲート）

1. Data Classification（TRUST-001）が実装され、PII・高機密が API 面から構造的に遮断されている。
2. Zero-Trust 認証・scope 最小権限・rate limit・audit が実装済み。
3. App Review / Permission Review / Security Scan の審査プロセスが定義済み。
4. Kill Switch（API 単位の即時停止）が存在する。
5. ペネトレーション観点の監査記録が docs/audit にある。
6. 人間の公開承認（HD）。**この6条件が揃うまで公開しない。**

## 5. 運用

- 新 API 構想は Feature Registry（doc02）と本 Matrix の両方に登録してから設計に入る。
- 分類の緩和方向（prohibited → 公開側）の変更は人間承認＋監査記録を必要とする。
