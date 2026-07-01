# UsageEvent emit matrix — IKEZAKI OS

> 現在の非課金 UsageEvent emit 対象8種類を1表に固定する。**これは課金表ではなく、非課金の利用量監査表**である。金額・請求額は一切含まない。
> フェーズ: Phase 1-46 / 種別: docs-only（実コード監査に基づく一覧固定・実装/emit 追加なし）
> 基準: 最新の本番確認GO済みプロダクト基準は Phase 1-44（実装 `ce858c7` / GO記録 `3e3409f`）。現在位置は git refs（`git rev-parse` 等）を正とする。

---

## 1. 非エンジニア向け要約

- IKEZAKI OS は「何がどれだけ使われたか（利用量）」を **UsageEvent** という記録に残しています。
- 記録の種類は現在 **8種類**。すべて `billing = usage_only`（＝**非課金の記録**）です。**課金・請求ではありません**。
- この表は「どの操作が・どのファイルで・どんな中身（キー名だけ）で記録されるか」を1枚にまとめたものです。
- 記録の中身（metadata）には、**本文・顧客情報・メール・金額・secret・保存先パス・実IDは入れません**。入れてよいのは「種類ラベル」だけです。
- 同じ操作を2回数えない仕組み（idempotencyKey）と、外部送信が失敗したら数えない仕組みも確認済みです。
- 現時点で課金・決済・サブスク・従量課金の計算は**一切していません**。将来やる場合も別設計・人間承認が前提です。

## 2. 現在の前提

| 項目 | 値 |
|---|---|
| UsageEvent emit 対象 | **8種類**（本表 §3） |
| billing | 全件 **`usage_only`**（非課金記録） |
| 金額カラム | UsageEvent に存在しない（`quantity` は数量であって金額ではない） |
| 記録ヘルパー | apps/web 系: `apps/web/lib/usage-events.ts::recordUsageEvent`／worker・packages 系: `packages/db/src/usage.ts::recordUsageEventCore` |
| ヘルパーの安全性 | どちらも**例外を投げない**（失敗しても主処理を壊さず `ok:false`）。`@@unique([tenantId, idempotencyKey])` で二重計上を構造防止 |
| 可視化 | `/admin/usage`（read-only・`audit:read` ガード・tenantId スコープ・件数と quantity 合計のみ） |
| 課金 / 決済 / サブスク | なし |
| billable_candidate / never_billable runtime 使用 | なし |

## 3. UsageEvent emit 8種類 matrix

| # | 対象 | eventType | category | sourceType | 発火場所（ファイル） | idempotencyKey 方式 | metadata（非PII固定キーのみ） | 発火条件 | billing | 本番GO |
|---|------|-----------|----------|------------|----------------------|---------------------|-------------------------------|----------|---------|--------|
| 1 | LeadMap export | `export.generated` | export | ExportJob | `apps/web/app/api/leadmap/export/route.ts` | `usage:export.generated:<exportJob.id>` | `scope` / `format` / `hasCampaignFilter` | export 成功時 | usage_only | GO（Phase 1-23） |
| 2 | AIOutput（apps/web） | `ai.output.generated` | ai | AIOutput | `apps/web/lib/ai-safety-server.ts` | `usage:ai.output.generated:<AIOutput.id>` | `task` / `model` | AIOutput 保存成功時 | usage_only | GO（Phase 1-25） |
| 3 | admin danger-actions export | `export.generated` | export | ExportJob | `apps/web/app/(app)/admin/danger-actions/actions.ts` | `usage:export.generated:<ExportJob.id>` | `scope` / `format` / `source` | 承認済み export 実行時 | usage_only | GO（Phase 1-27） |
| 4 | approvals outreach | `external_send.outreach` | external_send | OutreachSendLog | `apps/web/app/(app)/approvals/actions.ts` | `usage:external_send.outreach:<OutreachSendLog.id>` | `channel` / `status` | status が `logged`/`sent` のときのみ | usage_only | GO（Phase 1-29） |
| 5 | invoice-send | `external_send.invoice` | external_send | Invoice | `apps/web/lib/domains/finance/invoice-send.ts` | `usage:external_send.invoice:<Invoice.id>` | `channel` / `status` / `kind` | status が `logged`/`sent` のときのみ | usage_only | GO（Phase 1-31） |
| 6 | dunning（督促） | `external_send.dunning` | external_send | CollectionReminder | `apps/web/lib/domains/finance/dunning.ts` | `usage:external_send.dunning:<CollectionReminder.id>` | `channel` / `status` / `kind` | status が `logged`/`sent` のときのみ | usage_only | GO（Phase 1-33） |
| 7 | Webhook success | `webhook.delivered` | webhook | WebhookDelivery | `packages/db/src/outbox.ts` | `usage:webhook.delivered:<event.id>:<subscription.id>` | `eventType`（ラベルのみ） | 配送 success のときのみ | usage_only | GO（Phase 1-37） |
| 8 | worker 朝礼AI出力 | `ai.output.generated` | ai | AIOutput | `apps/worker/src/jobs.ts` | `usage:ai.output.generated:<AIOutput.id>` | `task` / `source` | aIOutput.create 成功時 | usage_only | GO（Phase 1-40） |

- #1〜#6 は apps/web の `recordUsageEvent` 経由、#7〜#8 は worker/packages で使える `recordUsageEventCore` 経由。
- `sourceId` には各エンティティの id を渡すが、**metadata には実IDを入れない**（sourceId と metadata は別物）。
- `actorType`: #1〜#6 は `user`（#2 は AI 経路のため `ai_agent`/`system` になり得る）、#7〜#8 は `system`（actorId=null）。

## 4. metadata 安全方針

- **入れてよい**: 固定の非PIIラベルのみ（`scope` / `format` / `hasCampaignFilter` / `task` / `model` / `channel` / `status` / `kind` / `source` / `eventType`ラベル）。
- **入れない**: 本文・prompt・output・outputText・レポート本文・payload・citations・URL・secret・signature・fileKey（保存先パス）・email/recipient/toAddress・顧客名・請求番号(inv.number)・金額(inv.total 等)・draftId/leadId/reminderId などの実ID・statusCode・error・stack。
- 各発火場所のコード直上コメントに、上記「入れない」項目が明記されている（実コードで確認済み）。

## 5. 二重計上防止方針

- **`@@unique([tenantId, idempotencyKey])`** による構造防止。P2002 は `recordUsageEvent(Core)` 側で duplicate として飲み込み、主処理を壊さない。
- idempotencyKey はエンティティ id 基準（#7 のみ `event.id:subscription.id`）。retry や再実行で同一エンティティが再度成功しても**最終1回のみ**記録。
- #2（apps/web AIOutput）と #8（worker AIOutput）は同じ eventType だが**別 id の AIOutput**（worker は saveAIOutputStandard を通らない）なので二重計上しない。

## 6. 絶対に入れないもの（この表・metadata・画面すべて）

- 金額（amount / price / currency / total）。UsageEvent に金額カラム自体が無い。
- 個人情報・顧客名・email・電話・住所。
- 本文・prompt・output・transcript・payload。
- URL・secret・signature・token・apiKey・DB接続文字列・fileKey（保存先パス）。
- 実ID（顧客/lead/invoice/reminder/draft 等）を metadata に露出すること。
- 課金額・請求額・従量課金の自動計算。

## 7. DO_NOT_TOUCH_NOW / HOLD 候補

- **HOLD**: worker `EXPORT_JOB`（enqueue トリガーが未実装・未到達。実利用のエクスポートは #1/#3 で計測済み。詳細 `docs/audit/20_export_job_trigger_audit.md`）。
- **HOLD**: JobRun emit（内部インフラ・tenantId なし・#7 と二重計上。詳細 `docs/audit/18_jobrun_usage_event_emit_design.md`）。
- **DO_NOT_TOUCH_NOW**: 本文/PII/金額に近接する候補（lead 分析・outreach 下書き生成・返信分類・dynamic pricing・profit leak）。
- **NEVER（Phase 1 完了まで実装しない）**: 実課金・Stripe 等決済連携・従量課金/請求額計算・usage cap/alert・tenant 横断 usage dashboard・raw metadata viewer・billable_candidate/never_billable の runtime 使用。

## 8. 次にやること

- **Phase 1-47**: PROGRESS / CURRENT_STATE / 本 emit matrix の役割分担を固定（履歴 / 現在地 / 一覧の三分割）。別承認。
- 以降 Phase 1-48（最終セキュリティ・権限・非課金監査）→ 1-49（完了判定）→ 1-50（完了記録・次 Phase 選定）。
- 実課金はさらに先（別設計・人間承認が前提）。

> 注: 本書は実コード監査に基づく**一覧の固定（docs-only）**であり、emit の追加・変更・課金化ではない。emit 対象は8種類のまま。
