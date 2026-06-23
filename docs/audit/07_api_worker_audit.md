# 07 — API / Worker 監査

## Server Actions / API

- `actions.ts` 9ファイル / 公開 action 約24 / API route.ts 1本。
- パターン（良）: 認証 → `hasPermission` → 入力検証 → DB → `writeAudit` → `revalidatePath`。
- 不足:
  - **CRUD の網羅不足**（多くのドメインで作成のみ／編集・削除・アーカイブ欠如）。
  - **入力検証の一貫性**（Zod スキーマの共通化が未整備）。
  - **冪等性 / 楽観ロック**（version 列の活用）未整備。
  - REST/Webhook 受信エンドポイント（route.ts）がほぼ無い → 外部連携・モバイルで必要。

## Worker（apps/worker, 254行）

### 登録済みスケジュール（index.ts, 4本のみ）
MORNING_REPORT_JOB / ANOMALY_DETECTION_JOB / PROFIT_LEAK_DETECTION_JOB / DYNAMIC_PRICING_JOB

### 定義のみ（jobs.ts, 約18ハンドラ・計179行=薄い）
MEETING_SUMMARY / ACTION_ITEM_EXTRACTION / KNOWLEDGE_INGESTION / EMBEDDING / COMMUNICATION_CLASSIFICATION / LEAD_DISCOVERY / LEAD_WEBSITE_SCAN / LEAD_REVIEW_ANALYSIS / LEAD_OUTREACH_GENERATION / OUTREACH_REPLY_CLASSIFICATION / CUSTOMER_INSIGHT / BACKUP / EXPORT / KNOWLEDGE_ROLLBACK ほか

### 要件 §16 との差分（未実装ジョブ）
CASHFLOW_FORECAST / ACCOUNTING_SYNC / OCR_PROCESSING / JOURNAL_SUGGESTION / CONTRACT_RISK_CHECK / INVOICE_OVERDUE_CHECK / MEETING_TRANSCRIPTION / KNOWLEDGE_QUALITY_CHECK / INVENTORY_ALERT / EC_ORDER_SYNC / MARKETING_AUTOMATION / CALL_SUMMARY / AI_AGENT_SCHEDULED_RUN / SECURITY_AUDIT

### ジョブ共通要件（§16）未装備
各ジョブに **status / retry / failureReason / startedAt / finishedAt / tenantId / actorId / audit / idempotencyKey** が未整備。→ `JobRun` 基盤を新設し全ジョブを包む。

## 結論

「動く最小ジョブ」はあるが、**本番運用に必要なジョブ基盤（再試行/冪等/監査/失敗追跡）と、要件ジョブの過半が欠落**。Action 側は CRUD/検証/冪等の網羅が課題。
