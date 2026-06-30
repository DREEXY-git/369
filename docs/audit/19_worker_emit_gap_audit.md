# 19. worker経由 UsageEvent 計測漏れ監査 — Phase 1-39

> 読み取り専用監査 + docs-only の設計記録。**コード実装・worker/usage.ts/既存7 emit 変更・emit 追加・課金・決済・billable_candidate / never_billable runtime 使用は含まない。**
> フェーズ: Phase 1-39 / 日付: 2026-06-29 / 種別: docs-only / 基準: **origin/main = `ff188a5`**

---

## 1. 非エンジニア向け要約

- **今回は実装しません**。プログラムは1行も足していません。
- 「裏側の自動処理（worker）が作った成果物」が、利用量としてちゃんと数えられているかを調べました。
- Phase 1-38 で「JobRun では数えられない」と分かったので、今回は**成果物そのもの（AI出力・エクスポート等）の単位**で見ました。
- **見つかったこと**: worker が作る成果物の多くは、画面側（apps/web）の計測ルートを通らないため**数え漏れ（計測漏れ）**になっています。ただし大半は「中身が文章・お客さま情報・金額に近い」ため、安易に数えると危険です。
- **安全に数えられる候補は1つ**: **朝礼レポート生成（MORNING_REPORT_JOB）が作る AI出力**。これは裏で毎回作られているのに数えられておらず、しかも「種類ラベル（task 名）」だけを記録すれば本文を一切触らずに数えられます。
- それ以外（リード分析・メール下書き・返信分類・埋め込み・バックアップ・異常検知・価格提案）は、**本文/お客さま情報/金額に近い**ため **今は触らない（DO_NOT_TOUCH_NOW / EXCLUDE_INTERNAL）**。
- 課金・決済はしません。

> ひとことで言うと「裏側の成果物の数え漏れを棚卸しし、安全に数えてよいのは"朝礼レポートのAI出力1つ"だけ、と仕分けた」のが Phase 1-39 です。

---

## 2. 目的

- worker 経由で生成される成果物の **emit-gap（計測漏れ）**を実コードで監査する。
- 既存7 emit で「計測済み／未計測」を整理する。
- 次に実装してよい P0 候補を**最大1つ**に絞る、無ければ HOLD とする。

## 3. 非目的（今回やらないこと）

- 実装しない。worker / `apps/worker/src/jobs.ts` / `packages/db/src/usage.ts` / `outbox.ts` / `jobrun.ts` / 既存7 emit を変更しない。
- emit を追加しない。runtime call site を足さない。
- schema / migration / package / lock を変更しない。本番DBを触らない・Prisma migrate を実行しない・worker を動かさない・Webhook/メール実送信しない。
- 課金・決済・サブスクしない。billable_candidate / never_billable を runtime で使わない。

## 4. 現在の正式状態

| 項目 | 値 |
|---|---|
| HEAD / origin/main | **`ff188a5`** |
| 現在の UsageEvent emit 対象 | **7種類**（LeadMap export / AIOutput / admin danger-actions export / approvals outreach / invoice-send / dunning / Webhook success） |
| JobRun emit | HOLD（Phase 1-38） |
| 課金・決済・サブスク / billable_candidate・never_billable runtime | なし |

### 既存 emit の発火経路（重要）
- **`ai.output.generated`**: `apps/web/lib/ai-safety-server.ts::saveAIOutputStandard` の中だけ（sourceId=`out.id`／idempotencyKey=`usage:ai.output.generated:<out.id>`）。呼び出し元は**すべて apps/web**（meetings/leadmap/operations actions, lib/leadmap, safe-ai-run）。
- **`export.generated`**: `apps/web/app/api/leadmap/export/route.ts` と `admin/danger-actions/actions.ts` の **apps/web 2経路だけ**（sourceId=`exportJob.id`/`job.id`）。
- → **worker が直接 `aIOutput.create` / `exportJob.create` した成果物は、これら apps/web 経路を通らないため未計測**。

## 5. worker jobType 一覧と成果物表

| jobType | handler 成果物 | 直接 create する model | enqueue されるか | 既存emitで計測済み | emit-gap | PII/本文/金額リスク | 二重計上リスク | 推奨分類 |
|---|---|---|---|---|---|---|---|---|
| **MORNING_REPORT_JOB** | 朝礼AIレポート | **aIOutput**（＋recordRun=AIAgentRun） | **✔（index.ts で定期）** | ✗（saveAIOutputStandard を通さず直接 create） | **あり** | 低（task ラベルのみ使用・output 本文は使わない） | 低（aIOutput.id で一意・apps/web とは別 id） | **P0_IMPLEMENTABLE_NEXT** |
| EXPORT_JOB | CSV エクスポート | exportJob | ✗（enqueue 箇所なし＝現状未到達） | ✗（apps/web 2経路のみ） | あり（潜在） | 低（scope/format のみ） | 低 | **P1**（トリガー実装後に再評価） |
| LEAD_REVIEW_ANALYSIS_JOB | リード分析 | leadInsight（strengths/opportunities/reasoning＝分析文） | △(leadId 指定で) | ✗ | あり | **高（分析本文・事業者情報）** | 低 | **DO_NOT_TOUCH_NOW** |
| LEAD_OUTREACH_GENERATION_JOB | 営業メール下書き | outreachDraft（subject/body＝本文） | △ | ✗ | あり | **高（メール本文）** | 低 | **DO_NOT_TOUCH_NOW** |
| OUTREACH_REPLY_CLASSIFICATION_JOB | 返信分類 | outreachReply（body＝返信本文）／SuppressionList | △ | ✗ | あり | **高（返信本文・email）** | 低 | **DO_NOT_TOUCH_NOW** |
| EMBEDDING_JOB | 文書埋め込み | knowledgeChunk（text/embedding＝文書本文） | △(documentId 指定で) | ✗ | あり | **高（文書本文・ベクトル）** | 低 | **EXCLUDE_INTERNAL / DO_NOT_TOUCH_NOW** |
| COMMUNICATION_CLASSIFICATION_JOB | 関連度分類 | businessRelevanceDecision | △ | ✗ | あり | 中（分類理由） | 低 | **EXCLUDE_INTERNAL** |
| ANOMALY_DETECTION_JOB | 異常検知 | aIAlert（upsert） | **✔（定期）** | ✗ | あり | 中（検知＝内部・金額近接） | 低 | **EXCLUDE_INTERNAL / NEVER_BILLABLE 寄り** |
| PROFIT_LEAK_DETECTION_JOB | 利益漏れ検知 | （返り値のみ・create なし） | **✔（定期）** | n/a | n/a | **高（金額）** | — | **DO_NOT_TOUCH_NOW** |
| DYNAMIC_PRICING_JOB | 動的価格提案 | dynamicPricingSuggestion（金額） | **✔（定期）** | ✗ | あり | **高（金額・価格）** | 低 | **DO_NOT_TOUCH_NOW** |
| BACKUP_JOB | バックアップ | backupJob（fileKey/sizeBytes） | △ | ✗ | あり | 低（だが内部インフラ） | 低 | **EXCLUDE_INTERNAL** |
| MEETING_SUMMARY / ACTION_ITEM_EXTRACTION / KNOWLEDGE_INGESTION / LEAD_DISCOVERY / LEAD_WEBSITE_SCAN / KNOWLEDGE_ROLLBACK / CUSTOMER_INSIGHT | recordRun のみ（プレースホルダ） | AIAgentRun/AIAgentAction | △ | ✗ | （実体未実装） | 低 | **P2**（実体実装後に再評価） |
| OUTBOX_DISPATCH_JOB | Webhook 配送 | （JobRun＋webhook.delivered） | **✔（定期）** | **✔（Phase 1-37 で計測済み）** | なし | 低 | **高（二重計上）** | **EXCLUDE_INTERNAL** |
| 全 jobType の failed / skipped / error | — | — | — | — | — | — | — | **NEVER_BILLABLE** |

## 6. 重要候補の詳細

- **MORNING_REPORT_JOB → `aIOutput.create`（P0）**: `prisma.aIOutput.create({ task: 'generateMorningReport', output: report, confidence })`。**`saveAIOutputStandard` を経由しない**ため `ai.output.generated` で未計測。worker 起動時に**テナント単位で定期 enqueue**されるため到達性あり・本番確認可能。`aIOutput.id` が安定。metadata は `{ task, source:'worker' }` の固定ラベルに限定でき、**`output`/`outputText`（レポート本文）は metadata に入れない**。apps/web 経由の AIOutput とは別 id なので二重計上しない。**→ 最有力 P0。**
- **EXPORT_JOB → `exportJob.create`（P1）**: 設計は最もきれい（scope/format のみ・本文ゼロ）だが、**現状どこからも enqueue されていない＝本番で動かない**ため、計測しても確認できない。トリガー実装後に P0 へ昇格。
- **LEAD_REVIEW_ANALYSIS / LEAD_OUTREACH_GENERATION / OUTREACH_REPLY_CLASSIFICATION**: 分析文・メール本文・返信本文・email が成果物に密着。**本文を metadata に入れない設計は可能だが、近接リスクが高くレビュー負荷も高い**。今は触らない。
- **EMBEDDING / COMMUNICATION_CLASSIFICATION / BACKUP / ANOMALY**: 内部処理・インフラ・分類・検知。利用量として数えると誤解を招く。**EXCLUDE_INTERNAL**。
- **DYNAMIC_PRICING / PROFIT_LEAK**: 金額・価格に直結。**DO_NOT_TOUCH_NOW**。
- **recordRun 系**: 現状は成果物の実体が無い（AIAgentRun のプレースホルダ）。実体実装後に再評価（P2）。

## 7. P0 候補（最大1つ）

- **P0_IMPLEMENTABLE_NEXT: MORNING_REPORT_JOB の `aIOutput` を非課金 UsageEvent として記録する（worker 経路）。**
  - eventType=`ai.output.generated`（既存と同じ）/ category=`ai` / billing=`usage_only`。
  - sourceType=`AIOutput` / sourceId=`aIOutput.id` / idempotencyKey=`usage:ai.output.generated:<aIOutput.id>`（既存スキーム・別 id で二重計上なし）。
  - actorType=`system` / actorId=`null` / tenantId=`JobData.tenantId`。
  - metadata=`{ task: 'generateMorningReport', source: 'worker' }`（**output/outputText 本文は入れない**）。
  - 成功（aIOutput.create 完了）後にのみ emit。skipped/failed は emit しない。`recordUsageEventCore`（packages/db・worker から利用可）を使う。

## 8. 分類まとめ

- **P0_IMPLEMENTABLE_NEXT**: MORNING_REPORT_JOB の aIOutput emit。
- **P0_DESIGN_ONLY**: なし。
- **P1**: EXPORT_JOB の exportJob emit（enqueue トリガー実装が前提）。
- **P2**: recordRun 系ジョブ（実体実装後）。
- **EXCLUDE_INTERNAL**: OUTBOX_DISPATCH（計測済み・二重計上）／BACKUP／EMBEDDING／COMMUNICATION_CLASSIFICATION／ANOMALY。
- **DO_NOT_TOUCH_NOW**: LEAD_REVIEW_ANALYSIS／LEAD_OUTREACH_GENERATION／OUTREACH_REPLY_CLASSIFICATION（本文・PII）／DYNAMIC_PRICING／PROFIT_LEAK（金額）。
- **NEVER_BILLABLE**: 全 jobType の failed / skipped / error / rejected / policy deny / AccessDenied / 監査・セキュリティログ。

## 9. metadata 方針

- **可（固定の非PII）**: `task`（固定タスク名ラベル）・`source='worker'`・`scope`（エクスポート種別の固定文字列）・`format`・`status='succeeded'` 等。
- **不可**: `output` / `outputText` / レポート本文 / prompt / inputHash / draft body / subject / 返信本文 / email / 顧客名 / 文書本文 / embedding / amount / price / total / fileKey / secret / token / URL / payload / 実ID。

## 10. tenantId / actorId / sourceId / idempotencyKey 方針

- `tenantId` = `JobData.tenantId`（worker ハンドラは必ず保持）。**tenantId が取れない処理は emit 対象外**。
- `actorType` = `system` / `actorId` = `null`（worker は user を持たない）。
- `sourceType` = 成果物モデル名（例 `AIOutput`）／`sourceId` = 成果物の `id`。
- `idempotencyKey` = 成果物 id ベース（例 `usage:ai.output.generated:<aIOutput.id>`）。1 成果物＝1イベント。
- `billing` = `usage_only` 固定。

## 11. 二重計上回避方針

- **既存 emit と同じ成果物を二度数えない**。worker が直接 create する成果物は apps/web 経路を通っていない（別 id）ので、worker 側で1回だけ emit すれば二重計上にならない。
- idempotencyKey を成果物 id ベースにし、`@@unique([tenantId, idempotencyKey])` で構造的に二重を防ぐ。
- OUTBOX_DISPATCH のように既に別 emit（webhook.delivered）で数えている処理は **JobRun/job 単位で重ねて数えない**。

## 12. 次フェーズ方針

- **P0 が1つある**（MORNING_REPORT_JOB の aIOutput emit）。次フェーズ（Phase 1-40）で**この1箇所だけ**を実装してよい。
- 実装は `apps/worker/src/jobs.ts` の MORNING_REPORT_JOB ハンドラ内、`aIOutput.create` 成功後に `recordUsageEventCore` を1回呼ぶだけ。失敗/skipped は emit しない。metadata は `{ task, source }` のみ。
- それ以外（DO_NOT_TOUCH_NOW / EXCLUDE_INTERNAL）は実装しない。EXPORT_JOB は enqueue トリガーが実装されてから。
- 実装は別途人間承認が必要。

## 13. GO / HOLD / NG 判定

- **判定: GO（監査・設計フェーズとして）／次の実装対象 P0 を1つに確定**。
- worker の全 jobType を実コードで読み、成果物と既存 emit の対応・到達性・本文/金額/PII 近接・二重計上を整理した。
- 安全に実装してよい P0 を **MORNING_REPORT_JOB の aIOutput emit の1つ**に絞った。危険領域（本文/金額/PII）は DO_NOT_TOUCH_NOW、内部処理は EXCLUDE_INTERNAL とした。
- ファイル変更は docs/tasks のみ。emit 追加なし・課金/決済なし・billable_candidate / never_billable runtime 使用なし。

> 注: 本書は監査・設計であり実装ではない。MORNING_REPORT_JOB の aIOutput emit 実装（Phase 1-40）は別途人間承認が必要。
