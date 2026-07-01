# 20. worker EXPORT_JOB trigger / UsageEvent emit可否監査 — Phase 1-41

> 読み取り専用監査 + docs-only の設計記録。**コード実装・worker/apps/packages 変更・emit 追加・課金・決済・billable_candidate / never_billable runtime 使用は含まない。**
> フェーズ: Phase 1-41 / 日付: 2026-07-01 / 種別: docs-only / 基準: **origin/main = `56416e4`**

---

## 1. 非エンジニア向け要約

- **今回は実装しません**。プログラムは1行も足していません。
- worker の「エクスポート処理（EXPORT_JOB）」が **実際に動く経路があるか**を調べました。
- **結論**: EXPORT_JOB は「部品としては存在するが、どこからも呼び出されていない（動かない）」状態でした。**動かない処理を利用量として数えても意味がない**ので、今回は **HOLD（保留）** とします。
- なお、お客さまが実際に使うエクスポート（画面の LeadMap エクスポート・admin のエクスポート）は、**すでに別のしくみで数えられています**（既存の `export.generated`）。だから数え漏れではありません。
- CSV本文・ファイルの場所（fileKey）・顧客情報・金額は、将来もし数える場合でも**利用量の記録（metadata）には入れません**。
- 課金・決済はしません。

> ひとことで言うと「worker のエクスポート処理は今は動く経路が無いので、数えず保留（HOLD）にした。実際に使われるエクスポートは既に別で数えている」のが Phase 1-41 です。

---

## 2. 目的

- worker `EXPORT_JOB` の trigger / enqueue 経路（＝実際に動かす呼び出し）を実コードで監査する。
- 既存 `export.generated` emit との重複有無を確認する。
- P0（次に実装してよい）にできるか、HOLD かを判定する。

## 3. 非目的（今回やらないこと）

- 実装しない。worker / apps / packages を変更しない。emit を追加しない。
- schema / migration / package / lock を変更しない。本番DBを触らない・Prisma migrate を実行しない・worker を動かさない。
- 課金・決済・サブスクしない。billable_candidate / never_billable を runtime で使わない。

## 4. 現在の正式状態

| 項目 | 値 |
|---|---|
| HEAD / origin/main | **`56416e4`** |
| 現在の UsageEvent emit 対象 | **8種類**（LeadMap export / AIOutput / admin danger-actions export / approvals outreach / invoice-send / dunning / Webhook success / worker 朝礼AI出力） |
| Phase 1-40 | 本番確認 GO 済み |
| 課金・決済・サブスク / billable_candidate・never_billable runtime | なし |

## 5. EXPORT_JOB の実コード構造

- **handler**: `apps/worker/src/jobs.ts:179` `EXPORT_JOB: async ({ tenantId, scope }) => { const job = await prisma.exportJob.create({ data: { tenantId, scope, format:'csv', status:'completed', fileKey: 'exports/<ts>.csv' } }); return { exportId: job.id }; }`。
- **JOB_NAMES 登録**: `apps/worker/src/jobs.ts:31` に `'EXPORT_JOB'` が定義されている。
- **ExportJob schema**（`packages/db/prisma/schema.prisma:467`）: id / tenantId / requestedById? / scope / format(既定 csv) / status(既定 queued) / fileKey? / createdAt。金額カラムは無い。
- **既存 apps/web の `export.generated` emit 経路**:
  - `apps/web/app/api/leadmap/export/route.ts`（LeadMap CSV export・sourceId=exportJob.id・idempotencyKey=`usage:export.generated:<exportJob.id>`）
  - `apps/web/app/(app)/admin/danger-actions/actions.ts`（admin 承認付き export・sourceId=job.id・同スキーム）

## 6. trigger / enqueue 監査結果（実コード根拠）

- **`EXPORT_JOB` の参照は `apps/worker/src/jobs.ts` の2箇所のみ**（JOB_NAMES 登録＋handler 定義）。grep 全リポジトリ確認。
- **`queue.add('EXPORT_JOB', ...)` は存在しない**。worker `apps/worker/src/index.ts` が enqueue するのは **MORNING_REPORT_JOB / ANOMALY_DETECTION_JOB / PROFIT_LEAK_DETECTION_JOB / DYNAMIC_PRICING_JOB**（＋定期 OUTBOX_DISPATCH）のみ。
- **apps/web に BullMQ の Queue/enqueue は無い**（`.add(` のヒットは `Set.add` と JS 文字列で無関係）。apps/web から worker ジョブを積む経路は存在しない。
- **結論: worker `EXPORT_JOB` は現状どこからも enqueue されず「未到達（dead / unreachable）」**。本番で走らないため、emit しても記録は発生せず本番確認もできない。

## 7. 既存 export.generated との関係

| 経路 | 生成 model | sourceId | idempotencyKey | 計測状況 |
|---|---|---|---|---|
| LeadMap export（apps/web route） | ExportJob | exportJob.id | `usage:export.generated:<exportJob.id>` | **計測済み**（Phase 1-23） |
| admin danger-actions export（apps/web action） | ExportJob | job.id | `usage:export.generated:<job.id>` | **計測済み**（Phase 1-27） |
| worker EXPORT_JOB | ExportJob | （job.id） | （同スキーム） | **未計測・かつ未到達** |
- worker EXPORT_JOB が create する ExportJob は apps/web の2経路とは**別の行（別 id）**なので、将来 emit しても**二重計上にはならない**（idempotencyKey=exportJob.id 基準）。ただし**現状は enqueue が無く走らない**ため、計測対象化しても意味がない。

## 8. metadata 安全性（将来 emit する場合）

- **可（固定の非PII）**: `scope`（customers/leads/audit/knowledge 等の固定種別文字列）・`format`（`csv`）・`source='worker'`・`status='completed'`。
- **不可**: CSV本文 / `fileKey`（保存先パス）/ 顧客情報 / lead・customer・contact の実ID / 金額 / URL / secret / token / payload / error / stack。

## 9. P0 / HOLD 判定

- **判定: HOLD**。
- 理由: worker `EXPORT_JOB` は **enqueue / trigger 経路が存在せず未到達**。本番で走らないため、(1) 記録が発生しない、(2) 本番確認ができない、(3) 「走らない処理」を計測対象に加えるのは監査証跡として誤解を招く。P0 の必須条件「実際に enqueue される・本番確認が可能」を満たさない。
- 補足: お客さまが実際に使うエクスポートは apps/web の2経路で**既に計測済み**なので、**計測漏れではない**。

## 10. もし将来 P0 になる場合の方針（trigger 実装後・条件付き）

worker EXPORT_JOB を実際に enqueue する経路（例: apps/web のエクスポート依頼アクションが重い処理を worker に積む）が実装された場合に限り、以下で1箇所だけ emit してよい:
- eventType=`export.generated` / category=`export` / billing=`usage_only`。
- sourceType=`ExportJob` / sourceId=`exportJob.id` / idempotencyKey=`usage:export.generated:<exportJob.id>`。
- actorType=`system` / actorId=`null` / tenantId=`JobData.tenantId`。
- metadata=`{ scope, format, source:'worker' }` のみ（**fileKey / CSV本文 / 顧客情報 / 金額 は入れない**）。
- **exportJob.create 成功後のみ** emit。skipped / create前失敗 は emit しない。`recordUsageEventCore` 失敗で worker 主処理を壊さない。
- apps/web の `export.generated`（別 id）と二重計上しない。

## 11. HOLD の場合の次候補

- **EXPORT_JOB は trigger / enqueue 経路が実装されてから再評価**（それまで実装しない）。
- recordRun 系ジョブ（MEETING_SUMMARY 等）は成果物の実体が未実装のため据え置き（P2）。
- 本文 / 金額 / PII 近接候補（lead 分析・outreach 下書き・返信分類・dynamic pricing・profit leak）は **DO_NOT_TOUCH_NOW** のまま据え置き。
- 内部処理（backup / embedding / anomaly / OUTBOX）は **EXCLUDE_INTERNAL** のまま。

## 12. GO / HOLD / NG 判定

- **判定: GO（監査フェーズとして）／ EXPORT_JOB emit 実装は HOLD**。
- worker EXPORT_JOB の trigger 有無を実コードで確認し、「未到達＝計測しても意味がない」ことを根拠に HOLD とした。
- 既存 export.generated（apps/web 2経路）で実利用のエクスポートは計測済みで、計測漏れではないことを確認した。
- ファイル変更は docs/tasks のみ。emit 追加なし・課金/決済なし・billable_candidate / never_billable runtime 使用なし。

> 注: 本書は監査・設計であり実装ではない。EXPORT_JOB の emit 実装（または enqueue 経路の実装）は別途人間承認が必要。
