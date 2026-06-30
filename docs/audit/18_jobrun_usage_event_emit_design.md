# 18. JobRun UsageEvent emit 候補監査・ホワイトリスト設計 — Phase 1-38

> 読み取り専用監査 + docs-only の設計記録。**コード実装・jobrun.ts/usage.ts/worker 変更・emit 追加・課金・決済・billable_candidate / never_billable runtime 使用は含まない。**
> フェーズ: Phase 1-38 / 日付: 2026-06-29 / 種別: docs-only / 基準: **origin/main = `2075175`**

---

## 1. 非エンジニア向け要約

- **今回は実装しません**。プログラムは1行も足していません。
- JobRun は「裏側の自動処理の実行ログ」です（例: Webhook をまとめて配送するバッチ）。
- 裏側の処理を**全部「利用量」として数えると、内部のお掃除まで課金対象のように見えてしまう**危険があります。
- そこで今回は「どの自動処理なら将来 利用量として記録してよいか／どれは数えてはいけないか」を仕分けしました。
- **調べた結論**: 今この瞬間に「JobRun として記録されている自動処理」は **Webhook 配送バッチ（OUTBOX_DISPATCH）の1種類だけ**で、これは内部インフラ処理（会社単位でもない・お客さまの利用量ではない）です。しかも**その中身は Phase 1-37 で既に「Webhook 1件成功＝1記録」として数えています**。だから JobRun としてもう一度数えると**二重に数える**ことになります。
- お客さま向けの自動処理（朝報生成・リード分析・メール下書き等）は、**そもそも JobRun として記録されていない**ため、JobRun 経由では数えられません。
- したがって **今すぐ実装してよい JobRun 候補はありません（HOLD）**。課金・決済もしません。

> ひとことで言うと「JobRun はまだ"数えるのに適した形"になっていないので、今は実装せず、仕分けだけ docs に残した」のが Phase 1-38 です。

---

## 2. 目的

- JobRun emit の候補を実コードに基づいて監査する。
- jobType ホワイトリスト（記録してよい／いけない）を設計する。
- succeeded のみ emit できるか、failed/dead を除外できるかを確認する。
- metadata 安全性（payload/error/logs/stack を入れない）を確認する。
- 次フェーズで実装してよい対象を最大1つに絞る、または無ければ HOLD とする。

## 3. 非目的（今回やらないこと）

- 実装しない。jobrun.ts / usage.ts / outbox.ts / worker を変更しない。
- emit を追加しない。runtime call site を足さない。
- 課金しない・決済しない・サブスクしない。
- billable_candidate / never_billable を runtime で使わない。
- schema / migration / package / lock を変更しない。本番DBを触らない・Prisma migrate を実行しない・worker を動かさない。

## 4. 現在の正式状態

| 項目 | 値 |
|---|---|
| HEAD / origin/main | **`2075175`** |
| Phase 1-37 実装 / 確認記録 | `cc5a433` / `2075175`（本番GO済み） |
| 現在の UsageEvent emit 対象 | **7種類**（LeadMap export / AIOutput / admin danger-actions export / approvals outreach / invoice-send / dunning / Webhook success） |
| 課金・決済・サブスク | なし |
| billable_candidate / never_billable runtime 使用 | なし |

## 5. JobRun / worker の構造（実コード根拠）

- **JobRun ヘルパ**: `packages/db/src/jobrun.ts`。
  - `createJobRun({ jobType, tenantId?, actorId?, idempotencyKey?, payload?, metadata? }) → run.id`（status=`running`）。
  - `finishJobRun(id, result?)`（status=`succeeded`）／`failJobRun(id, error, dead?)`（status=`failed|dead`）／`appendJobRunLog(...)`。
  - **tenantId も actorId も nullable**。
- **JobRun を実際に作っている箇所**（grep 確認）: **`packages/db/src/outbox.ts` の1箇所のみ**。`createJobRun({ jobType: 'OUTBOX_DISPATCH', actorId: opts.actorId ?? null, metadata: { limit } })`（**tenantId 未指定＝null・全テナント横断バッチ**）。
- **worker（`apps/worker/src/jobs.ts`）の 19 jobType**（MORNING_REPORT / ANOMALY_DETECTION / MEETING_SUMMARY / EMBEDDING / LEAD_* / EXPORT / BACKUP / OUTBOX_DISPATCH 等）は BullMQ のジョブ**名**で、`runJob → JOB_HANDLERS[name](data)` で実行される。**これらのハンドラは `createJobRun`/`finishJobRun` を呼ばない**＝**JobRun 行を生成しない**。
- worker ハンドラは `JobData.tenantId` を持つが、成果物は各々別モデルに書く（例: MORNING_REPORT→`aIOutput.create`、EXPORT→`exportJob.create`、LEAD_*→insight/draft、EMBEDDING→knowledgeChunk、BACKUP→backupJob、MEETING_SUMMARY 等→`recordRun`=AIAgentRun）。
- **重要な帰結**:
  1. 現存する JobRun は **OUTBOX_DISPATCH のみ**（内部インフラ・tenantId なし）。
  2. その実体（Webhook 配送）は **Phase 1-37 の `webhook.delivered` で既に計測済み**＝JobRun でも数えると**二重計上**。
  3. お客さま向け worker ジョブは **JobRun 行を作らない**ため、JobRun 経由では計測対象にできない。

## 6. jobType 一覧と分類表

| jobType | 呼び出し元 | JobRun 行を作るか | user-facing/internal | tenantId 確実 | actorId | succeeded のみ可 | payload/error/logs 近接 | sourceType/sourceId | 推奨分類 |
|---|---|---|---|---|---|---|---|---|---|
| **OUTBOX_DISPATCH** | outbox.ts（worker 15秒間隔＋admin 手動） | **作る（唯一）** | internal infra | ✗（null・全テナント横断） | △(admin手動時のみ) | 可 | result/error あり | JobRun/jobRun.id | **EXCLUDE_INTERNAL**（webhook.delivered と二重計上・tenantId なし） |
| MORNING_REPORT_JOB | worker | **作らない** | user-facing(間接) | ✔(JobData) | ✗ | — | aIOutput を直接生成 | — | P2（要 worker 計装＋AIOutput 重複回避） |
| EXPORT_JOB | worker | **作らない** | user-facing | ✔ | ✗ | — | exportJob を直接生成 | — | P2（export.generated と重複注意） |
| LEAD_REVIEW_ANALYSIS / LEAD_OUTREACH_GENERATION / CUSTOMER_INSIGHT / OUTREACH_REPLY_CLASSIFICATION | worker | **作らない** | user-facing | ✔ | ✗ | — | insight/draft/reply（本文近接） | — | P2 / 一部 DO_NOT_TOUCH_NOW（本文・PII 近接） |
| EMBEDDING_JOB / KNOWLEDGE_INGESTION / KNOWLEDGE_ROLLBACK | worker | **作らない** | internal/semi | ✔ | ✗ | — | 文書本文近接 | — | EXCLUDE_INTERNAL / DO_NOT_TOUCH_NOW |
| ANOMALY_DETECTION / PROFIT_LEAK_DETECTION / DYNAMIC_PRICING / COMMUNICATION_CLASSIFICATION | worker | **作らない** | internal 分析 | ✔ | ✗ | — | 金額・分析近接 | — | EXCLUDE_INTERNAL / DO_NOT_TOUCH_NOW（金額近接） |
| BACKUP_JOB | worker | **作らない** | internal infra | ✔ | ✗ | — | fileKey/sizeBytes | — | EXCLUDE_INTERNAL |
| MEETING_SUMMARY / ACTION_ITEM_EXTRACTION / LEAD_DISCOVERY / LEAD_WEBSITE_SCAN | worker | **作らない**（recordRun のみ） | user-facing(将来) | ✔ | ✗ | — | （現状プレースホルダ） | — | P2（実体実装後に再評価） |
| failed / dead（全 jobType 共通） | — | — | — | — | — | — | error/stack 近接 | — | **NEVER_BILLABLE** |

## 7. P0 候補

- **P0_IMPLEMENTABLE_NEXT: なし（HOLD）**。
- 理由: 現存 JobRun は OUTBOX_DISPATCH（internal infra・tenantId なし・webhook.delivered と二重計上）のみで、これは EXCLUDE_INTERNAL。お客さま向け worker ジョブは JobRun 行を作らないため JobRun 経由で計測できない。**「次に実装してよい安全な JobRun emit」は存在しない。**

## 8. 除外候補

- **EXCLUDE_INTERNAL**: OUTBOX_DISPATCH（内部インフラ・二重計上）／BACKUP_JOB（バックアップ）／EMBEDDING・KNOWLEDGE 系（内部処理）／ANOMALY・PROFIT_LEAK・DYNAMIC_PRICING（内部分析）。
- **DO_NOT_TOUCH_NOW**: 金額・分析判断が強いもの（DYNAMIC_PRICING / PROFIT_LEAK / ANOMALY）／本文・PII 近接（LEAD_* の本文・OUTREACH_REPLY の返信本文・MEETING/transcript 近接）。
- **NEVER_BILLABLE**: すべての failed / dead / retry失敗 / error / stack / policy deny / AccessDenied / 監査・セキュリティログ。

## 9. metadata 方針（将来 JobRun emit する場合）

- **可（固定の非PII）**: `jobType`（固定ラベル）・`status='succeeded'`・`kind` 等。
- **不可**: payload / error / logs / stack / secret / token / URL / customer / customerName / email / amount / total / transcript / fullText / prompt / outputText / 実ID。
- 既存 recorder `recordUsageEventCore` は禁止 top-level key ガードを持つが、**呼び出し側でも metadata を `{ jobType }` 程度に限定する**こと。

## 10. tenantId / actorId / sourceId / idempotencyKey 方針（将来）

- **tenantId が無い JobRun（例: OUTBOX_DISPATCH）は emit 対象外**（スコープできないものは数えない）。
- `actorType` = `system` / `actorId` = `null`（worker は user を持たない）。
- `sourceType` = `JobRun` / `sourceId` = `jobRun.id`。
- `idempotencyKey` = `usage:job.run:<jobRun.id>`（1 JobRun＝1イベント）。
- **既存 emit との二重計上を避ける**: 同じ仕事を別 emit（webhook.delivered / ai.output.generated / export.generated）で既に数えている jobType は JobRun でも数えない。

## 11. failed / dead の扱い

- **emit しない**（succeeded のみ）。
- never_billable の runtime 使用も**しない**（基本は「そもそも emit しない」）。
- error / logs / stack trace を UsageEvent に**入れない**。

## 12. 次フェーズ実装方針

- **現時点は HOLD**。安全に実装できる JobRun emit 候補が無い。
- 将来 JobRun ベースの利用量計測を進めるなら、まず以下の**設計フェーズ（docs-only / P0_DESIGN_ONLY）**が必要:
  1. お客さま向け worker ジョブを `createJobRun`/`finishJobRun` で計装する（tenantId は JobData から取得）。
  2. 既存 emit（ai.output.generated / export.generated / webhook.delivered）との**二重計上回避ルール**を確定する。
  3. 対象 jobType ホワイトリストを「ユーザー価値があり、かつ他で計測していない」ものに限定する。
- それまでは JobRun emit を**実装しない**。

## 13. Phase 1-39 用 Claude Code プロンプト案

- **P0_IMPLEMENTABLE_NEXT が無いため、実装プロンプトは作らない。**
- 次に進めるとしても「JobRun 計装＋二重計上回避の docs-only 設計（P0_DESIGN_ONLY）」であり、実装ではない。別途人間承認のうえ、設計フェーズとして起票する。

## 14. GO / HOLD / NG 判定

- **判定: GO（監査・設計フェーズとして）／ JobRun emit 実装は HOLD**。
- 監査対象を実コードで読み、JobRun が OUTBOX_DISPATCH のみであること・worker ジョブが JobRun を作らないこと・二重計上リスクを確認した。
- 安全に実装できる P0 JobRun 候補は無いと結論し、**実装せず docs-only で記録**した。
- ファイル変更は docs/tasks のみ。emit 追加なし・課金/決済なし・billable_candidate / never_billable runtime 使用なし。

> 注: 本書は監査・設計であり実装ではない。JobRun emit の実装（または計装の設計フェーズ）は別途人間承認が必要。
