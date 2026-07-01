# UsageEvent 非課金台帳

> 目次に戻る → [[index]] ／ 関連 → [[369の思想と世界観]] ・ [[AIの役割と境界]] ・ [[アーキテクチャ概要]]
> コード側の正: `369/docs/audit/usage_event_emit_matrix.md`

## 何のための記録か

- 「何がどれだけ使われたか（利用量）」を残す台帳。将来の AIコスト管理・利用量可視化・従量課金の**前提**。
- ただし **今は課金しない**。`billing = usage_only`（非課金記録）。UsageEvent に**金額カラムは無い**（`quantity` は数量であって金額ではない）。

## 大原則

- **課金・決済・サブスク・請求額計算・usage cap・プラン連動を一切しない。**
- `billable_candidate` / `never_billable` を **runtime で使わない**。
- metadata に **本文・顧客情報・email・金額・secret・URL・保存先パス・実IDを入れない**。入れてよいのは固定の非PIIラベルだけ。
- 二重計上は `@@unique([tenantId, idempotencyKey])` で構造防止。記録ヘルパーは例外を投げない（失敗しても主処理を壊さない）。

## 現在の emit 対象8種類

| # | 対象 | eventType | category | 発火場所 |
|---|------|-----------|----------|----------|
| 1 | LeadMap export | `export.generated` | export | `apps/web/app/api/leadmap/export/route.ts` |
| 2 | AIOutput（apps/web） | `ai.output.generated` | ai | `apps/web/lib/ai-safety-server.ts` |
| 3 | admin danger-actions export | `export.generated` | export | `apps/web/app/(app)/admin/danger-actions/actions.ts` |
| 4 | approvals outreach | `external_send.outreach` | external_send | `apps/web/app/(app)/approvals/actions.ts` |
| 5 | invoice-send | `external_send.invoice` | external_send | `apps/web/lib/domains/finance/invoice-send.ts` |
| 6 | dunning（督促） | `external_send.dunning` | external_send | `apps/web/lib/domains/finance/dunning.ts` |
| 7 | Webhook success | `webhook.delivered` | webhook | `packages/db/src/outbox.ts` |
| 8 | worker 朝礼AI出力 | `ai.output.generated` | ai | `apps/worker/src/jobs.ts` |

- #1–6 は apps/web の `recordUsageEvent`、#7–8 は worker/packages で使える `recordUsageEventCore` 経由。
- 外部送信系（#4/5/6）は `logged`/`sent` のときだけ、#7 は `delivered` のときだけ、#8 は create 成功時だけ emit。
- 詳細な1表は `369/docs/audit/usage_event_emit_matrix.md`（Phase 1-46 で固定）を正とする。

## 可視化 `/admin/usage`

- read-only。`hasPermission(user, 'audit', 'read')` ガード。`tenantId` スコープ。直近30日。
- 表示は eventType/category/日別の **件数と quantity 合計のみ**。raw metadata / sourceId / 金額 / 本文は出さない。
- 「この画面は請求額を示すものではありません」と明記。

## HOLD / やらないこと

- **HOLD**: worker `EXPORT_JOB`（enqueue 未到達）・JobRun emit（内部・二重計上）。
- **やらない**: 実課金・Stripe・従量課金/請求額計算・usage cap/alert・tenant 横断 dashboard・raw metadata viewer。

## 関連ノート

- [[369の思想と世界観]] — Monetization への態度。
- [[AIの役割と境界]] — AI出力を非課金で数える理由。
- [[意思決定ログ]] — なぜ HOLD にしたか等。
