# 17. worker/packages UsageEvent recorder 設計 — Phase 1-35

> docs-only の設計・記録。**コード実装・schema/migration・課金・決済・billable_candidate runtime 使用・never_billable runtime 使用・UsageEvent emit 追加は一切含まない。**
> フェーズ: Phase 1-35 / 日付: 2026-06-29 / 種別: docs-only / 基準: **origin/main = `2c4e29f`**

---

## 1. 非エンジニア向け要約

- **Phase 1-35 は「設計図を書くだけ」**です。プログラムは1行も足していません。
- **利用量(UsageEvent)の記録対象は増えていません**。今までどおり **6種類のまま**です。
- 今後やりたいのは「Webhook（外部システムへの自動通知）」と「JobRun（裏側の自動処理）」の利用量も安全に数えることですが、**今回はやりません**。設計だけ先に決めます。
- なぜすぐ実装しないか: 今ある利用量の記録部品（`recordUsageEvent`）は **画面側アプリ（apps/web）専用**で作られており、**裏側の常駐処理（worker）からは呼び出せない**構造になっているからです。無理に呼び出すと、アプリ全体の構造（どの部品がどの部品に依存してよいか、という土台のルール）が壊れます。
- だから次に必要なのは、**裏側からも安全に使える「共通の記録部品」を packages/db 側に置く設計**です。今回はその置き場所・呼び出し方・安全ルールを文章で決めます。
- **課金・決済・サブスクには進みません**。今は「お金」ではなく「使った量」を安全に貯める準備段階です。失敗・エラー・リトライ失敗などは**そもそも記録しない**方針です（誤って課金根拠に見せないため）。

> ひとことで言うと「Webhook と JobRun の利用量を将来安全に数えるための"土台の設計図"を、実装せずに文章で残した」のが Phase 1-35 です。

---

## 2. 目的

- worker / packages 経路でも UsageEvent を**安全に記録できるようにするための architecture design**を残す。
- Webhook / JobRun を将来安全に計測するための**前段階の設計**を確定する。
- **今回は実装しない**（recorder を作らない）。
- **今回は emit を追加しない**（記録対象を増やさない）。
- **今回は docs-only**（docs/tasks のみ更新）。

---

## 3. 非目的（今回やらないことの明示）

- 課金しない。
- 決済しない。
- サブスクしない。
- billable_candidate を runtime で使わない。
- never_billable を runtime で使わない。
- Webhook emit を追加しない。
- JobRun emit を追加しない。
- 共通 recorder を実装しない（`packages/db/src/usage.ts` を作らない）。
- apps/web helper の委譲実装をしない。
- schema / migration を変更しない。
- package.json / pnpm-lock.yaml を変更しない。
- 本番DBを触らない・Prisma migrate を実行しない・worker を動かさない・outbox dispatch を実行しない。

---

## 4. 現在の正式状態

| 項目 | 値 |
|---|---|
| origin/main | **`2c4e29f`** |
| Phase 1-33 実装コミット | **`6cefe8f`** |
| Phase 1-33 本番確認記録コミット | **`2c4e29f`** |
| Phase 1-33 | 本番確認 GO 済み・完全クローズ |
| 現在の UsageEvent emit 対象 | **6種類**（すべて apps/web 内で完結・billing=usage_only・metadata 非PII） |

### 4.1 現在の emit 対象6種類

| # | emit対象 | eventType | sourceType | metadata（非PII） | billing | フェーズ | 本番確認 |
|---|---|---|---|---|---|---|---|
| 1 | LeadMap CSV export | `export.generated` | ExportJob | scope/format/真偽 | usage_only | 1-23 | GO |
| 2 | AIOutput | `ai.output.generated` | （AI出力） | task/model | usage_only | 1-25 | GO |
| 3 | admin danger-actions export | `export.generated` | ExportJob | scope/format/source | usage_only | 1-27 | GO |
| 4 | approvals outreach | `external_send.outreach` | OutreachSendLog | channel/status | usage_only | 1-29 | GO |
| 5 | invoice-send | `external_send.invoice` | Invoice | channel/status/kind | usage_only | 1-31 | GO |
| 6 | dunning | `external_send.dunning` | CollectionReminder | channel/status/kind | usage_only | 1-33 | GO |

---

## 5. 現在の recordUsageEvent helper の制約

- helper の所在: **`apps/web/lib/usage-events.ts`**。
- helper は **`import { prisma } from '@/lib/db';`** を行っている。
- `@/*` は `apps/web/tsconfig.json` の `paths` で **`./*`（apps/web ルート）**を指す Next.js 専用 alias。
- したがって **この helper は apps/web 専用**であり、以下から直接 import できない:
  - packages/db / apps/worker / packages/shared / packages/ai / packages/integrations
- 無理に import した場合に壊れるもの:
  - **dependency boundary**（依存方向のルール）
  - **module resolution**（`@/` は worker/packages では解決できない）
  - **逆方向依存**（packages/db / apps/worker が apps/web に依存してしまう）
  - 将来の保守性・テスト容易性・デプロイ安全性
- 結論: **worker/packages 経路には別設計（packages/db 層の recorder）が必要**。

---

## 6. 依存境界図

```
   apps/web ───┐
               ├──> packages/db ───> packages/shared
   apps/worker ┘            ▲
                            │
                  （recorder はここに置く）

  apps/web      : @hokko/ai, @hokko/db, @hokko/integrations, @hokko/shared に依存
  apps/worker   : @hokko/ai, @hokko/db, @hokko/integrations, @hokko/shared に依存
  packages/db   : @hokko/shared に依存（apps/web には依存しない）

  禁止される依存（逆方向・境界破壊）:
    packages/db   ──X──> apps/web
    apps/worker   ──X──> apps/web
    packages/db   ──X──> apps/web/lib/usage-events.ts （= recordUsageEvent helper）
```

- 事実: `apps/web → @hokko/db`、`apps/worker → @hokko/db`、`packages/db → @hokko/shared`。
- **apps/web に依存する package はゼロ**（クリーンな層構造）。
- ゆえに「全員が依存してよい packages/db」に共通 recorder を置けば、apps/web・apps/worker の双方から安全に使える。

---

## 7. Webhook delivery の本番経路（実コード根拠）

- **本番配送関数**: `packages/db/src/outbox.ts::processOutboxBatch`（内部 `deliverOne` が HMAC 署名して POST し、`WebhookDelivery` を create）。
- **呼び出し元**:
  - `apps/worker/src/jobs.ts` の `OUTBOX_DISPATCH_JOB`（BullMQ で約15秒ごと・`tenantId: 'system'`）。
  - `apps/web/app/(app)/admin/jobs/actions.ts::runOutboxNowAction`（admin 手動・admin update 権限必須・`actorId=user.userId` を渡す）。
- **legacy / runtime 未使用**（参照ゼロを確認）:
  - `apps/web/lib/events.ts::deliverWebhook`
  - `apps/web/lib/events.ts::processOutboxMessage`
- `WebhookDelivery` は **packages/db 経路で create** される。status は `success | failed`、retry は `attempts` 加算。
- **URL / secret / signature / payload が近接する**ため、UsageEvent の metadata には**絶対に入れない**。
- 結論: Webhook の usage 記録は **apps/web helper では不可能**。packages/db 層の recorder が前提。

---

## 8. JobRun / worker の本番経路（実コード根拠）

- `createJobRun` は **`packages/db/src/jobrun.ts`**（`finishJobRun`=succeeded / `failJobRun`=failed|dead）。
- `processOutboxBatch` は内部で JobRun を使う。
- worker は **per-request user を持たない**（JobData は `tenantId` のみ。OUTBOX は `tenantId:'system'`）。**actorId は基本 null**。
- JobRun model は `tenantId` nullable・`actorId` nullable・status = pending|running|succeeded|failed|dead。
- JobRun は **internal ops 色が強い**（embedding/anomaly/backup 等、計19 jobType の多くが内部処理）。**全件を UsageEvent にするべきではない**。
- 方針: **succeeded のうち、ユーザー価値に紐づく jobType だけ**を将来対象にする。`actorType=system` / `actorId=null` を想定。

---

## 9. 提案する共通 recorder の配置（設計のみ・未実装）

- 将来 **`packages/db/src/usage.ts`** に **worker-safe な純関数 recorder** を作る。
- prisma は **packages/db の `./client`** から使う（apps/web に依存しない）。
- apps/worker からも **packages/db 経由（`@hokko/db`）**で使える。
- apps/web helper（`apps/web/lib/usage-events.ts`）は将来この recorder へ**委譲**できる（二重実装の解消）。ただし**それは別フェーズ**。
- **Phase 1-35 では実装しない**（ファイルを作らない）。以下はあくまで設計上の擬似 interface（実コードとしてファイル化しない）:

```
// （擬似・設計用。実装は Phase 1-36 以降・別承認）
type RecordUsageEventInput = {
  tenantId: string
  actorId?: string | null
  actorType?: 'user' | 'ai_agent' | 'system'
  eventType: string
  category: string
  billing?: 'usage_only' | 'billable_candidate' | 'never_billable'
  unit?: string
  quantity?: number | string
  sourceType?: string
  sourceId?: string | null
  idempotencyKey: string
  metadata?: Record<string, unknown>
}
```

設計上の注意:
- **billing は当面 usage_only 固定**（許可外は usage_only に丸める既存方針を踏襲）。
- **failed / dead は emit しない方針を優先**（そもそも記録しない）。
- **never_billable の runtime 使用はまだしない**（分類だけで課金母数を確定させる運用圧力を避ける）。
- **amount / price / currency は扱わない**。
- **helper 失敗時に主処理（webhook 配送 / job 実行）を壊さない**（例外を投げず ok:false、P2002 は duplicate）。

---

## 10. Webhook emit 将来設計（未実装）

| 項目 | 設計値 |
|---|---|
| eventType | `webhook.delivered` |
| category | `webhook` |
| billing | `usage_only` |
| emit 条件 | **delivery success のみ** |
| emit しない | failed / dead / retry失敗 |
| sourceType | `WebhookDelivery` |
| sourceId | `WebhookDelivery.id` |
| idempotencyKey 案 | `usage:webhook.delivered:<eventId>:<subscriptionId>` |
| actorType | `system` |
| actorId | `null` |
| tenantId | `subscription.tenantId` |
| metadata | `{ eventType: event.eventType }` 程度の**固定非PIIのみ** |

- metadata に **url / secret / signature / payload / statusCode / error / body を入れない**。
- **retry ごとに課金しない**。**最終成功1回だけ**を usage とする（idempotencyKey が eventId+subscriptionId 基準なので二重計上を構造防止）。

---

## 11. JobRun emit 将来設計（未実装）

| 項目 | 設計値 |
|---|---|
| eventType | `job.run.completed`（または `job.run.succeeded`） |
| category | `job` |
| billing | `usage_only` |
| emit 条件 | **succeeded のみ** |
| emit しない | failed / dead |
| sourceType | `JobRun` |
| sourceId | `jobRun.id` |
| idempotencyKey | `usage:job.run:<jobRun.id>` |
| actorType | `system` |
| actorId | `null` |
| metadata | `{ jobType }` のみ |

- metadata に **payload / error / logs / stack trace を入れない**。
- **対象 jobType はホワイトリスト化**する。**internal-only job は emit しない**。

---

## 12. never_billable / emit しないもの

- Webhook failed / Webhook dead / retry失敗
- JobRun failed / JobRun dead
- AccessDenied / policy deny
- PIIマスク / injection検知
- 承認却下
- 監査ログ / セキュリティログ
- blocked / suppressed / rejected
- no-recipient / already-sent / not-found
- 本文や secret の安全処理

> 方針: **現段階では never_billable を runtime で使わず、基本は「そもそも emit しない」**。将来 never_billable 分類を runtime で使うかは別途人間承認のうえ判断する。

---

## 13. metadata 可 / 不可リスト

**可（非PIIの集計補助のみ）**:
- 固定 enum / eventType の固定ラベル / jobType の固定ラベル
- channel / status の成功系固定値 / kind
- retry ではない「成功1回」の識別補助 / 非PIIの真偽フラグ

**不可（絶対に入れない）**:
- URL / secret / webhook secret / signature / payload / body / request body / response body / error body / stack trace
- prompt / outputText / transcript / fullText
- 顧客名 / メール / subject / draftMessage / maskedBody / CSV本文
- amount / price / currency / total / invoice number / receivable
- customerId / leadId / reminderId / invoiceId / event payload
- token / API key / DB接続文字列

> **sourceId 列に ID を持つことは許可**するが、**metadata には実IDを入れない**（例: webhook は sourceId=delivery.id を使うが metadata には ID を入れない）。

---

## 14. tenantId / actorId / sourceId / idempotencyKey 規約

**Webhook**:
- tenantId = `subscription.tenantId`
- actorType = `system` / actorId = `null`
- sourceType = `WebhookDelivery` / sourceId = `delivery.id`
- idempotencyKey = `usage:webhook.delivered:<eventId>:<subscriptionId>`

**JobRun**:
- tenantId = `jobRun.tenantId` がある場合はそれ
- tenantId が無い internal job は **emit 対象外**、または system tenant の扱いを**別途設計**（Phase 1-36 で確定）
- actorType = `system` / actorId = `null`
- sourceType = `JobRun` / sourceId = `jobRun.id`
- idempotencyKey = `usage:job.run:<jobRun.id>`

---

## 15. テスト方針（将来実装時）

**共通 recorder**:
- usage_only payload を作成できる
- metadata 許可キーだけ / forbidden metadata キーが無い
- 同一 tenantId + idempotencyKey は二重作成不可 / 別 tenant なら同 key 可
- P2002 は duplicate 扱い / 失敗しても主処理を壊さない

**Webhook**:
- success のみ emit / failed・dead は emit しない
- url / secret / signature / payload が metadata に無い / idempotencyKey が安定

**JobRun**:
- succeeded のみ emit / failed・dead は emit しない
- jobType ホワイトリスト / payload・error・logs が metadata に無い

---

## 16. 本番確認方針（将来実装時）

**Webhook**:
- Production commit / Status Ready / Build 成功 / migrate 不要 / Runtime error なし
- WebhookDelivery success が従来どおり作成される / failed・retry失敗で emit されない
- UsageEvent metadata に URL / secret / payload が無い
- 実課金なし / 決済なし / サブスクなし

**JobRun**:
- worker が従来どおり動作 / JobRun succeeded が従来どおり記録される
- failed・dead で emit されない / internal-only job は emit されない / system actor 方針が守られる

---

## 17. 段階導入計画

| フェーズ | 内容 | 備考 |
|---|---|---|
| **Phase 1-35** | docs-only architecture design | **今回**。実装なし・emit 追加なし |
| Phase 1-36 | `packages/db/src/usage.ts` 共通 recorder 実装のみ | emit 追加なし。apps/web helper はまだ変更しない（または別承認で委譲方針を決める） |
| Phase 1-37 | Webhook success emit を1箇所だけ追加 | failed/dead は emit しない・usage_only・metadata 非PII |
| Phase 1-38 | JobRun succeeded emit を対象 jobType 限定で追加 | failed/dead は emit しない |

> Phase 番号は実際の進行に合わせて調整可能。各フェーズは**別途人間承認が必要**。

---

## 18. 不採用案

- packages/db から `apps/web/lib/usage-events.ts` を import する案。
- worker から apps/web を import する案。
- Webhook failed / retry失敗を usage として記録する案。
- retry ごとに UsageEvent を記録する案。
- metadata に URL / secret / signature / payload を入れる案。
- JobRun 全件を無差別に UsageEvent 化する案。
- seat / active user を今すぐ UsageEvent 化する案。
- finance internal の金額イベントを UsageEvent に入れる案。

---

## 19. リスクと対策

| リスク | 対策 |
|---|---|
| 二重計上 | idempotencyKey を eventId+subscriptionId / jobRun.id 基準で安定化。`@@unique([tenantId, idempotencyKey])` で構造防止。retry ごとに記録しない（最終成功1回）。 |
| failed / retry を課金対象のように見せる | **failed / dead / retry失敗は emit しない**。記録するなら never_billable（当面は emit しない）。 |
| URL / secret / payload 混入 | metadata 許可キーをホワイトリスト化。url/secret/signature/payload を不可リストに明記。sourceId に ID は持つが metadata には入れない。 |
| worker/packages と apps/web の依存破壊 | recorder を **packages/db** に置く。apps/web helper を worker/packages から import しない。 |
| actorId 不在 | worker は `actorType=system` / `actorId=null` を許容する設計。 |
| tenantId 不在 job | tenantId が無い internal job は **emit 対象外**、または system tenant 扱いを Phase 1-36 で別途設計。 |
| 本番確認の難しさ（worker 経路） | admin 手動 `runOutboxNowAction` で「1配送→1 UsageEvent」を確認できる導線を用意。 |
| 非エンジニア混乱 | 本書 §1 の平易な要約＋段階導入計画＋「今やっていないこと」の明示で、何を決めて何を未実施かを残す。 |

---

## 20. GO / HOLD / NG 判定

**判定: GO。**

- docs-only で設計として整理できた（recorder 配置・Webhook/JobRun emit 設計・metadata 可否・idempotency 規約・段階導入計画）。
- **実装していない / emit 追加していない / 課金・決済に進んでいない**。
- **worker/packages 依存境界を壊していない**（recorder は packages/db に置く方針を文章で確定）。
- 次フェーズ（Phase 1-36 = 共通 recorder 実装のみ）の安全な順序が明確。

> 注: 本書は設計・記録であり実装ではない。Phase 1-36 以降の実装は別途人間承認が必要。
