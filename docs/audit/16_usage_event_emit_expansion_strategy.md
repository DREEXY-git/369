# 16. UsageEvent emit 拡張方針（状態固定＋次候補監査）— Phase 1-26

> docs-only の記録・監査。**コード実装・schema/migration・課金・決済・billable_candidate runtime 使用・UsageEvent emit 追加は含まない。**
> 目的: (1) Phase 1-25 の完了状態を固定し旧コミット混乱を防止、(2) 次に emit を広げる安全な発火点を1つに絞る。

- フェーズ: Phase 1-26 / 日付: 2026-06-29 / 種別: docs-only
- 基準: **origin/main = `9944f0e`**（EXPECTED_BASE_COMMIT）

---

## 1. Phase 1-25 完了状態の固定（重要）

Phase 1-25「AIOutput 非課金 UsageEvent emit」は**完全クローズ済み**。正式な基準コミットは以下の2つ。

| 役割 | コミット | 件名 |
|---|---|---|
| 実装 | **`11c224d`** | feat(usage): AI出力を非課金UsageEventとして記録（Phase 1-25） |
| 本番確認記録 | **`9944f0e`** | docs(audit): Phase 1-25 本番デプロイ確認完了を記録 |
| origin/main（現在地） | **`9944f0e`** | （上記記録コミットが HEAD） |

- 本番確認 **GO 済み**（2026-06-29・利用者ブラウザ/Vercel）。AIOutput 非課金 UsageEvent emit は本番反映済み。
- 記録の所在: `docs/audit/14` §29 / `docs/audit/15` §19.1 / `tasks/PROGRESS.md` Phase 1-25 本番確認完了（GO）。

## 2. 旧コミット `a9643a4` の扱い（混乱防止）

- `a9643a4` は Phase 1-25 本番確認記録の**旧ローカルコミット**だが、**未push のまま揮発環境のリセットで失われた**（この環境に git オブジェクトとして存在しない）。
- その後、**同一の受領実測値**に基づき記録を再作成し、`9944f0e` として origin/main へ push 済み。
- **今後 `a9643a4` を正式基準・前提にしない。** 正式基準は **origin/main = `9944f0e`**。
- 教訓: 未push のローカルコミットは揮発環境で失われ得る。**記録コミットは作成後すみやかに push** する。

## 3. 現在の UsageEvent 実装状態（基準 9944f0e）

- model: `UsageEvent`（金額なし・`@@unique([tenantId, idempotencyKey])`・index 5本）。
- helper: `apps/web/lib/usage-events.ts` の `recordUsageEvent`（失敗時も例外を投げず `ok:false`／unique 衝突は duplicate／billing 許可外は usage_only に丸め）。
- emit 対象（**現在2種類のみ**）:
  1. **LeadMap CSV export**（`apps/web/app/api/leadmap/export/route.ts`・`export.generated`・Phase 1-23）
  2. **AIOutput**（`apps/web/lib/ai-safety-server.ts` の `saveAIOutputStandard`・`ai.output.generated`・Phase 1-25）

## 4. 絶対安全条件（現段階・不変）

- runtime billing は **usage_only** のみ。**billable_candidate / never_billable の runtime 使用なし**。
- **課金なし／決済なし／サブスクなし／usage dashboard なし／cap・alert なし**。
- UsageEvent に **金額(amount/price/currency)を入れない**。
- metadata は**非PII**のみ。PII / secret / 本文 / prompt / CSV本文 / 顧客情報を入れない。
- 安全処理・失敗・拒否・AccessDenied・PIIマスク・injection検知・承認却下・監査ログは**課金対象にしない**（never_billable）。
- idempotencyKey を安定生成できる発火点だけを選ぶ。既存機能を壊さない。1フェーズ1目的。

---

## 5. 候補A〜G の監査結果（実コード根拠・基準 9944f0e）

- **A danger-actions export**: `apps/web/app/(app)/admin/danger-actions/actions.ts` — `executeApprovedAction` 内で `prisma.exportJob.create`、**`job.id` を返す**（承認ゲート内・stable sourceId）。metadata は scope/format の固定値で非PIIにできる。LeadMap export と**同型の実証済みパターン**。低頻度・admin限定。**→ P0**。
- **B 外部送信 sent/logged**: `approvals/actions.ts`（OutreachSendLog）・`invoice-send.ts`・`dunning.ts`。`sendStatus`=logged/sent/suppressed。**承認ゲート経由**。ただし recipient/subject/body/PII を扱い、`sent` は将来 billable 候補＝**logged/sent/suppressed の分類設計が必要**（今は usage_only 固定で可だが要設計）。**→ P1**。
- **C Webhook delivery**: `apps/web/lib/events.ts` `deliverWebhook` → `webhookDelivery.create`（success/failed）。**failed は never_billable**。retry/再配送の idempotency 設計が必要。**→ P1**。
- **D JobRun（worker）**: `packages/db/src/jobrun.ts` `createJobRun`。**apps/web の `recordUsageEvent` を import 不可**（経路設計が必要）。多くが内部処理＝価値低。**→ P2**。
- **E worker 直叩き（ExportJob/aIOutput）・meeting upload**: `apps/worker/src/jobs.ts`（helper import 不可）／`meetings/upload` は**テキスト本文・HR機密近接**。**→ P2 / DO_NOT_TOUCH_NOW**。
- **F seat / active user**: User.isActive / Tenant.plan。**seat 課金に最も近い**。**→ DO_NOT_TOUCH_NOW**。
- **G finance/internal**: invoice_candidate / journal_candidate / payment / dunning / invoice_send。**金額・PII・finance機密の近接が高い**。**→ DO_NOT_TOUCH_NOW**。

## 6. 比較表

| 候補 | 発火点明確 | sourceId | idempotencyKey | metadata安全性 | PII/本文リスク | 金額リスク | billing推奨 | 実装リスク | 本番確認しやすさ | 分類 |
|---|---|---|---|---|---|---|---|---|---|---|
| **A danger-actions export** | ◎ | ◎ job.id | ◎ 安定 | ◎ scope/format | 低 | 低 | usage_only | 低 | ◎(承認要だが容易) | **P0** |
| B 外部送信 sent/logged | ○ | △ draft.id/invoice.id | ○ | ○ recipient除外要 | 中 | 中 | usage_only(今) | 中 | ○ | P1 |
| C Webhook delivery | ○ | ○ delivery.id | △ retry設計要 | ○ | 低 | 低 | usage_only/never混在 | 中 | △ | P1 |
| D JobRun(worker) | ○ | ○ jobRun.id | △ | ○ | 低 | 低 | usage_only | 中(経路設計) | △ | P2 |
| E worker直叩き/meeting | ○ | ○ | ○/△ | △ | 高(本文) | 低 | usage_only | 中 | △ | P2 |
| F seat/active | △ | △ | △ 時点設計要 | ○ | 低 | 高(課金近接) | (将来) | 高 | △ | DO_NOT_TOUCH_NOW |
| G finance internal | ○ | ○ | ○ | △ | 中 | 高(金額) | — | 高 | △ | DO_NOT_TOUCH_NOW |
| 失敗/拒否/AccessDenied/PIIマスク/injection/承認却下/監査 | — | — | — | — | — | — | **never_billable** | — | — | NEVER_BILLABLE |

## 7. 分類

- **P0**: A danger-actions export（`export.generated` / usage_only）
- **P1**: B 外部送信 sent/logged ／ C Webhook delivery
- **P2**: D JobRun(worker) ／ E worker 直叩き・meeting upload
- **NEVER_BILLABLE**: 失敗・拒否・AccessDenied・policy deny・PIIマスク・injection検知・承認却下・セキュリティ/監査ログ
- **DO_NOT_TOUCH_NOW**: F seat（課金近接）／G finance internal（金額・PII 近接）

## 8. 次に実装すべき候補（1つに絞る）

**A: danger-actions export（admin の承認付きエクスポート）を `export.generated` / `usage_only` として記録する。**

### 8.1 理由
- **実証済みパターンの再利用**: Phase 1-23 の LeadMap export emit と同型（ExportJob + `export.generated`）。設計リスクが最小。
- **発火点が明確で安全**: `executeApprovedAction` の中で `exportJob.create` が成功し `job.id` を返す → `usage:export.generated:<job.id>` で安定 idempotency。
- **metadata を完全に非PIIにできる**: `{ scope, format }`（scope は `customers` 等の固定種別、format は `csv`）。顧客情報・件数・金額は入れない。
- **承認ゲート内**＝乱発しない。失敗しても `recordUsageEvent` は例外を投げず主処理（承認実行）を壊さない。
- **本番確認が容易**: admin danger-actions の承認→実行で1件記録されるかを確認するだけ。

### 8.2 今回あえて実装しない理由
Phase 1-26 は docs-only の監査・記録（FILE_CHANGES_ALLOWED: DOCS_TASKS_ONLY）。実装は別承認（Phase 1-27）で1対象のみ行う。

### 8.3 課金・決済をまだ進めない理由
設計 §11（doc15）の課金前安全条件（フラグ・人間承認・顧客同意・never_billable 除外・二重計上防止・金額責務分離・監査）が未充足。まず「量」を安全に貯める段階。

### 8.4 billable_candidate をまだ使わない理由
分類を付けた瞬間に課金母数を確定させる運用圧力が生じる。まず usage_only で量を蓄積し、課金可否は人間がまとめて別途判断する。

## 9. metadata 方針（次候補 A）
- **可**: `scope`（エクスポート種別の固定文字列）・`format`（`csv` 等）・真偽フラグ・件数/サイズ等の集計値（規模が機密でない範囲）。
- **不可**: 顧客名・メール・CSV本文・export 件数のうち機密推測につながる値・実ID・金額(amount/price/currency)・secret/トークン・prompt/本文。

## 10. tenantId / actorId / sourceId / idempotencyKey 方針（次候補 A）
- `tenantId` = 実行ユーザーの `tenantId`（必須・スコープ徹底）。
- `actorId` = 実行ユーザーの `userId`、`actorType` = `user`。
- `sourceType` = `ExportJob`、`sourceId` = `job.id`（`executeApprovedAction` の戻り値/生成 job）。
- `idempotencyKey` = `usage:export.generated:${job.id}`（export 1件＝1イベント、二重計上を構造防止）。
- eventType = `export.generated` / category = `export` / billing = `usage_only` / unit = `count` / quantity = `1`。

## 11. Phase 1-27 用 Claude Code プロンプト案（1つにまとめ）

```
あなたは IKEZAKI OS の Release Manager / Security Architect / Monetization Architect /
Quality Gatekeeper として振る舞ってください。

目的: Phase 1-27「非課金 UsageEvent emit を danger-actions export に1箇所だけ追加」。
emit 対象を1つ増やすだけ。課金・決済・billable_candidate・金額は扱わない。

PHASE_APPROVAL: YES / PHASE: 1-27 / EXPECTED_BASE_COMMIT: 9944f0e / PUSH_ALLOWED: NO

変更してよいファイルのみ:
- apps/web/app/(app)/admin/danger-actions/actions.ts （ExportJob 作成後に emit を1回追加）
- packages/db/src/__tests__/p1_27_usage_event_admin_export.itest.ts （新規・DB統合テスト）
- docs/audit/15_monetization_usage_design.md （§21 を追記）
- tasks/PROGRESS.md （Phase 1-27 を追記）

禁止: 課金/決済/Stripe/請求/サブスク・billable_candidate/never_billable の runtime使用・
金額(amount/price/currency)・metadata への PII/本文/CSV本文/顧客情報/件数(機密)/secret・
emit 対象を danger-actions export 以外へ拡大・recordUsageEvent helper の変更・
LeadMap/AIOutput emit の変更・UsageEvent model/schema/migration 変更・package/lock 変更・
RBAC/ABAC 変更・本番DB操作・Prisma migrate・push・force push・amend/rebase/reset。

実装内容（executeApprovedAction 内の exportJob.create 成功後、return job.id の前に1回だけ）:
  await recordUsageEvent({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'user',
    eventType: 'export.generated',
    category: 'export',
    billing: 'usage_only',
    unit: 'count',
    quantity: 1,
    sourceType: 'ExportJob',
    sourceId: job.id,
    idempotencyKey: `usage:export.generated:${job.id}`,
    metadata: { scope: String(scope ?? 'customers'), format: 'csv', source: 'admin_danger_actions' },
  });
  ※ import { recordUsageEvent } from '@/lib/usage-events'。
  ※ 記録失敗で承認実行の主処理を壊さない（recordUsageEvent は例外を投げない設計）。
  ※ metadata に顧客情報・CSV本文・金額・secret・実IDを入れない。scope は固定種別文字列のみ。

テスト（p1_27_usage_event_admin_export.itest.ts・DBレベル）:
  - export.generated を作成でき payload が仕様どおり（category=export/billing=usage_only/
    sourceType=ExportJob/idempotencyKey=usage:export.generated:<id>/metadata=非PII）
  - metadata に PII/本文/金額キーが無い
  - billing=usage_only（billable_candidate でない）
  - 同一 tenantId+idempotencyKey は二重作成不可 / 別tenantは同key可
  - afterAll で deleteMany 削除

検証: pnpm db:generate / pnpm --filter @hokko/db test:integration -- p1_27 /
  既存回帰 p1_25/p1_23/p1_22/p1_10/p1_15 / ./scripts/verify.sh をすべて green。
コミット: feat(usage): admin export を非課金UsageEventとして記録（Phase 1-27）
今回は push しない。コミット後 PUSH_REQUIRED: YES を明示。
```

## 12. 判定（GO）
- Phase 1-25 完了状態を `11c224d` + `9944f0e` で固定し、旧 `a9643a4` を基準にしない旨を明記。
- 次候補を **A: danger-actions export** の1つに確定。課金/決済/billable_candidate を進めない方針を明確化。
- metadata・idempotency 方針を整理し、Phase 1-27 プロンプト案を提示。
- 本フェーズは **docs-only**（コード/schema/migration/課金/決済/emit追加なし）。

> 注: 本書は記録・設計であり実装ではない。Phase 1-27 の実装は別途人間承認が必要。
