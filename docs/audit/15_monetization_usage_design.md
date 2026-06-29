# 15. UsageEvent / Monetization 設計書（docs-only 記録）

> Phase 1-21A（監査・設計のみ）の結論を記録する設計ドキュメント。**実装・schema 変更・migration・課金実行は一切含まない。**
> 本書は「将来の非課金・利用台帳（utilization ledger）」としての UsageEvent を設計するものであり、
> **本フェーズ（1-21B）では文書化のみ**を行う。コミット対象は本ファイルと `tasks/PROGRESS.md` のみ。

- フェーズ: Phase 1-21B（記録）／ 設計の中身は Phase 1-21A（監査・設計）
- 日付: 2026-06-28
- 種別: docs-only（コード/schema/migration/RBAC/ABAC/package/lock いずれも変更なし）
- 安全前提: **絶対に課金を実行しない。** 本書は「記録に徹する利用ログ」の設計であり、請求・決済・与信は範囲外。

---

## 1. 目的

中小企業向け統合AI経営OSにおいて、将来の従量・プラン設計の土台となる
**「誰が・いつ・どの機能を・どれだけ使ったか」を記録する利用台帳（UsageEvent）**を設計する。

- 第一目的は **可視化・内部分析・キャパシティ把握**（＝非課金の utilization ledger）。
- 課金（billing）は**やらない**。将来課金する場合でも、本台帳は「課金の入力候補」を**記録するだけ**で、
  金額計算・請求・決済・与信には一切関与しない（責務分離）。
- 本フェーズ（1-21B）は **設計の文書化のみ**。schema 追加・migration・アプリ実装は行わない。

### 非目標（このフェーズで明確にやらないこと）
- 課金実行・請求書発行・決済・サブスク管理・与信・返金。
- 金額の自動算出やプラン上限による機能ブロック（hard limit enforcement）。
- 外部課金SaaS（Stripe 等）との接続。

---

## 2. 現在の実装状況（棚卸し）

- `Tenant` は `plan String @default("mvp")` を持つのみ。**課金・利用量モデルは存在しない**
  （`UsageEvent` / `Subscription` / `Invoice(課金用)` / `Entitlement` / `Quota` いずれも未定義）。
- 既存の「出来事ログ」系モデルは複数あるが、いずれも**利用量の計量（metering）を主目的にしていない**。
  - `AuditLog`: 操作監査（誰が何をしたか）。証跡用。集計・計量用ではない。
  - `DataAccessLog`: 機密参照の証跡（label/policyDecision/purpose）。コンプライアンス用。
  - `DomainEvent`: ドメインイベント＋Outbox（idempotencyKey 付き・配信状態管理）。
  - `GrowthEvent`: 経営インパクト（revenueImpact/costSaving/timeSavingMinutes）。KPI 可視化用。
  - `FinanceEvent`: 財務イベント（amount/direction/status）。会計・財務用。
  - `JobRun`/`JobRunLog`: ワーカー実行記録。
  - `AISafetyLog`: AI 安全チェック（injection/pii_mask/tool_permission）の記録。
  - `OutreachSendLog`: 営業メール送信ログ。
- 結論: **利用量を一次情報として正規化し、課金候補として後で再利用できる専用台帳は無い**。
  既存ログは目的が別（監査/KPI/財務/安全）であり、UsageEvent をそれらに相乗りさせると責務が混ざる。

---

## 3. 既存モデル棚卸し表（UsageEvent との関係）

| モデル | 主目的 | 計量(metering)向きか | tenantId | idempotency | amount/quantity | UsageEvent との関係 |
|---|---|---|---|---|---|---|
| `AuditLog` | 操作監査の証跡 | ✕（証跡で集計前提でない） | あり | なし | なし | 形のお手本（actorType/entityType/metadata）。流用不可 |
| `DataAccessLog` | 機密参照の証跡 | ✕ | あり | なし | なし | policyDecision=deny は **never_billable** 判定の参考 |
| `DomainEvent` | ドメインイベント+Outbox | △（イベントだが計量用でない） | あり | **あり**(`@@unique([tenantId, idempotencyKey])`) | なし | idempotency の設計お手本。流用不可 |
| `GrowthEvent` | 経営KPI 可視化 | ✕（成果指標で利用量でない） | あり | なし | amount/revenueImpact 等 | category/actorType の分類お手本 |
| `FinanceEvent` | 財務イベント | ✕（会計で利用量でない） | あり | なし | amount Decimal(16,2) | 金額は財務専用。UsageEvent は金額を持たない |
| `JobRun`/`JobRunLog` | ワーカー実行記録 | △（実行回数の素材ではある） | あり(nullable) | あり(nullable) | なし | バッチ系 usage の sourceType 候補 |
| `AISafetyLog` | AI 安全チェック記録 | ✕ | あり | なし | なし | flagged/deny は never_billable の根拠 |
| `OutreachSendLog` | 営業送信ログ | △（送信回数の素材） | あり | なし | なし | external_send usage の sourceType 候補 |

**結論**: 既存モデルはどれも「証跡・KPI・財務・安全」が主目的で、計量台帳として再利用すると責務が混在する。
UsageEvent は**独立の専用モデル**として将来追加すべき（本フェーズでは追加しない）。

---

## 4. UsageEvent と既存ログの違い（なぜ別モデルが要るか）

| 観点 | AuditLog / DataAccessLog | GrowthEvent | UsageEvent（将来） |
|---|---|---|---|
| 第一目的 | 証跡・コンプライアンス | 経営KPI（成果） | **利用量の計量**（入力/出力/回数/量） |
| 主キー指標 | action（何をしたか） | revenueImpact 等（成果） | quantity（どれだけ使ったか） |
| 課金候補 | 想定しない | 想定しない | **billing 分類で明示的に保持** |
| 重複排除 | なし | なし | **idempotencyKey 必須**（二重計上防止） |
| PII | 限定的に保持しうる | 保持しうる | **保持しない**（§8） |
| 集計前提 | 二次的 | KPI集計 | **一次目的が集計** |

→ 「証跡」と「計量」は混ぜない。混ぜると、課金候補の抽出時に証跡ノイズが入り、
監査ログ側に課金都合の変更圧力がかかる。**責務分離のため UsageEvent は独立させる。**

---

## 5. 最小 MVP 疑似スキーマ（**実装しない／参考形のみ**）

> 下記は設計上の参考表現であり、**schema.prisma には追加しない**。migration も作らない。

```prisma
// ※ 疑似コード。本フェーズでは schema.prisma に書かない。
model UsageEvent {
  id             String   @id @default(cuid())
  tenantId       String                          // 全クエリは tenantId スコープ（リレーションは張らない）
  actorId        String?                         // 実行主体（user/ai/system）。null=system
  actorType      String   @default("user")       // user | ai_agent | system
  eventType      String                          // 例: ai.output.generated（§6 の分類に従う）
  category       String                          // ai | export | external_send | storage | seat | job（§6）
  billing        String   @default("usage_only") // usage_only | billable_candidate | never_billable（§7）
  unit           String   @default("count")      // count | token | mb | minute | seat
  quantity       Decimal  @default(0) @db.Decimal(18, 4) // 量。金額ではない
  sourceType     String   @default("")           // 由来モデル種別（例: ai_output / outreach_send / job_run）
  sourceId       String?                          // 由来レコードID（任意）
  idempotencyKey String                          // 二重計上防止キー
  occurredAt     DateTime @default(now())
  metadata       Json?                            // PII 不可（§8）。集計補助のみ
  createdAt      DateTime @default(now())

  @@unique([tenantId, idempotencyKey])           // 同一イベントの二重計上を防止
  @@index([tenantId, occurredAt])
  @@index([tenantId, eventType])
  @@index([tenantId, billing])
}
```

設計上のポイント:
- **金額（amount/price/currency）を持たない。** 量（quantity/unit）のみ。金額は将来 billing 層が別途算出。
- `idempotencyKey` ＋ `@@unique([tenantId, idempotencyKey])` で **二重計上を構造的に防止**（DomainEvent に倣う）。
- `billing` は**分類ラベルであって課金実行ではない**（§7）。
- `metadata` は集計補助のみ。**PII・機密実値は入れない**（§8）。

---

## 6. eventType 分類表（案）

| category | eventType（例） | unit | sourceType 候補 | 想定 billing 既定 |
|---|---|---|---|---|
| ai | `ai.output.generated` | count / token | ai_output | billable_candidate |
| ai | `ai.embedding.generated` | token | embedding | billable_candidate |
| ai | `ai.transcription.done` | minute | transcription | billable_candidate |
| export | `export.generated` | count | export_job | billable_candidate |
| external_send | `external_send.sent` | count | outreach_send | billable_candidate |
| external_send | `external_send.logged` | count | outreach_send | usage_only（実送信なし＝記録のみ） |
| storage | `storage.object.stored` | mb | minio_object | billable_candidate |
| seat | `seat.active` | seat | user | billable_candidate |
| job | `job.run.completed` | count | job_run | usage_only |

- `external_send.logged` は `EXTERNAL_SEND_ENABLED=false` で実送信されず**記録のみ**のため、課金候補にしない。
- 上表の billing 既定は**設計上の初期案**。実際の課金可否は人間が別途決定（本フェーズでは確定しない）。

---

## 7. billing 分類（usage_only / billable_candidate / never_billable）

3 値で「課金してよいか」を**ラベル付けするだけ**。**ラベル＝課金実行ではない。**

- **usage_only**: 可視化・内部分析のみ。課金対象にしない（例: ジョブ実行、logged のみの送信）。
- **billable_candidate**: 将来課金しうる候補（例: AI 生成、エクスポート、実送信、ストレージ、seat）。
  → ただし**候補であって自動課金しない**。課金有効化は §11 の安全条件をすべて満たし、人間が承認したときのみ。
- **never_billable**: **絶対に課金してはいけない**イベント（§8 と重複する安全側の分類）。
  例: PII マスク処理、injection 検知、policy deny、承認却下、セキュリティ/安全ログ、AccessDenied、各種失敗・リトライ。
  → 「安全のために動いた処理」や「失敗」でユーザーに課金しない、を構造で担保。

---

## 8. 保存禁止項目（PII / 機密の非保持）

UsageEvent（特に `metadata`）に**入れてはいけない**もの:
- 顧客名・担当者名・メールアドレス・電話番号・住所などの個人情報。
- 請求金額・売掛・入金額・社名などの finance 機密実値。
- AI のプロンプト本文 / 生成本文 / 添付内容など、機密が混入しうる原文。
- secret / APIキー / `.env` 値 / DB 接続文字列 / トークン。

許可されるのは: 件数・トークン数・サイズ・分数などの**計量値**と、集計に必要な**非PIIの分類キー**のみ。
原文が必要な場合は UsageEvent に書かず、既存の機密管理（DataAccessLog/ABAC）側に委ねて **sourceId 参照に留める**。

---

## 9. tenant 分離

- 全モデルに `tenantId`（スカラ）を持たせ、**Tenant へのリレーションは張らない**（CLAUDE.md ルール）。
- すべての書き込み・集計クエリは**必ず `tenantId` でスコープ**。クロステナント集計は行わない。
- `@@unique([tenantId, idempotencyKey])` でテナント内の二重計上を防止（テナント跨ぎの衝突も避ける）。
- 集計 API / ダッシュボードもテナント境界を越えない（他テナントの利用量を見せない）。

---

## 10. RBAC 案（閲覧・集計の権限境界）

- 利用量の集計・台帳閲覧は **finance/管理系の権限**に寄せる（請求に直結しうる情報のため）。
  - 閲覧（集計ダッシュボード）: 案として `finance:read` 相当（OWNER/EXECUTIVE/ADMIN/DEPARTMENT_MANAGER 等）。
  - STAFF/READ_ONLY/EXTERNAL には**既定で非表示**（finance 境界統一ラインと整合）。
- **記録（UsageEvent の書き込み）は system/サーバ内部処理**が行う。エンドユーザーが直接作成・改ざんできない。
- **AI（AI_AGENT/AI_ASSISTANT）は課金・外部送信・削除を持たない**（ROLE_PERMISSIONS 不変）。
  AI は UsageEvent を**集計の参照**はしても、**課金有効化・billing 分類の変更・台帳改ざんはできない**。
- 将来「課金有効化」操作を作る場合は **承認ゲート（requiresApproval）必須**（§11）。

---

## 11. 課金前の安全条件（課金を有効化してよい条件）

将来 billable_candidate を実際の課金に進める場合、**以下を全て満たし、人間が承認したときのみ**。
1つでも欠ければ課金しない（＝デフォルト非課金）。

1. **明示フラグ**: 課金機能のフィーチャーフラグ（例 `BILLING_ENABLED=true`）が有効。既定は false。
2. **人間承認**: 課金有効化は `requiresApproval` の承認ゲートを通す（AI 単独では不可）。
3. **顧客同意**: 対象テナントが料金プラン・従量条件に**同意済み**（記録あり）。
4. **never_billable 除外**: §7/§8 の never_billable・失敗・安全処理・PII 起因を**課金母数から除外**済み。
5. **二重計上防止**: idempotencyKey による重複排除が機能していることを検証済み。
6. **金額責務分離**: 金額算出・請求・決済は UsageEvent ではなく**別の billing 層**が担当（台帳は量のみ）。
7. **監査**: 課金有効化・billing 分類変更は `writeAudit`／承認記録に残す。

> 本フェーズ（1-21B）では上記いずれも**有効化しない**。設計として明記するに留める。

---

## 12. 実装ステップ案（将来・段階導入）

> いずれも将来タスク。**本フェーズでは実施しない**。薄い縦切りで段階導入する。

1. **S0（記録のみ・本書）**: 設計の文書化（← 今ここ）。コード変更なし。
2. **S1（モデル追加）**: `UsageEvent` モデル追加＋migration（usage_only のみ・billing 既定 usage_only）。
3. **S2（記録配線）**: 既存の安全な発火点（ai.output.generated / export.generated / external_send.logged）から
   idempotencyKey 付きで記録。**金額・課金なし**。
4. **S3（可視化）**: テナント内集計ダッシュボード（finance:read 境界・PII 非表示）。**非課金の utilization 可視化**。
5. **S4（分類運用）**: billable_candidate / never_billable のラベル運用とレビュー。まだ課金しない。
6. **S5（課金有効化・別判断）**: §11 を全て満たし人間承認のときのみ、別の billing 層で金額算出・請求。
   UsageEvent は引き続き「量の記録」だけを担当。

---

## 13. MVP 初回記録候補（S2 で最初に計測する安全なイベント）

最初は「安全側・非PII・既に発火点がある」ものから:
- `ai.output.generated`（AI 生成回数／トークン）— sourceType=ai_output。
- `export.generated`（エクスポート回数）— sourceType=export_job。
- `external_send.logged` / `external_send.sent`（送信記録）— sourceType=outreach_send。
  - `EXTERNAL_SEND_ENABLED=false` の間は `.logged`（usage_only）のみ発生。

いずれも quantity（件数/トークン）と非PII metadata のみ。**金額・課金は付けない。**

---

## 14. やらないこと（このフェーズ／このモデルで明確に禁止）

- 課金の実行・請求書（課金用）発行・決済・サブスク・与信・返金。**絶対にしない。**
- schema.prisma の編集・migration の作成（本フェーズは docs-only）。
- アプリコード / Server Action / package.json / pnpm-lock.yaml の変更。
- 本番DBへの接続・操作。
- UsageEvent への PII・機密実値・金額の保存。
- AI に課金・billing 分類変更・台帳改ざん・外部送信権限を与えること。
- プラン上限による機能の強制ブロック（hard enforcement）— 本設計の範囲外。

---

## 15. リスクと対策

| リスク | 内容 | 対策 |
|---|---|---|
| 二重計上 | 同一イベントを複数回記録し課金母数が膨らむ | `@@unique([tenantId, idempotencyKey])`（§5） |
| PII 流入 | metadata に顧客情報・機密が混入 | §8 保存禁止＋ sourceId 参照に留める |
| 責務混在 | 監査/KPI ログに課金都合の変更圧力 | UsageEvent を独立モデルに（§4） |
| 誤課金 | 失敗・安全処理・logged のみを課金 | never_billable 分類（§7）＋ §11 母数除外 |
| 越境集計 | 他テナント利用量の漏えい | tenantId スコープ徹底（§9） |
| AI 暴走 | AI が課金/分類変更/改ざん | RBAC 不変・承認ゲート（§10/§11） |
| 静かな課金開始 | 気付かぬうちに課金が走る | デフォルト非課金＋フラグ＋人間承認（§11） |

---

## 16. 判定（GO）

- 本書は **docs-only の設計記録**であり、コード/schema/migration/課金実行を含まない。
- 既存の安全運用（finance 境界・承認ゲート・AI 権限制限・PII 非保持・tenant 分離）と整合する設計である。
- 実装（S1 以降）は**別タスク・別承認**で段階導入する前提を明記した。
- レビュー担当（人間）が内容を確認のうえ GO / HOLD / NG を判定する。

> 注: 本ファイルの作成は「設計の記録」であって「実装の完了」ではない。S1 以降の実装は未着手。

---

## 17. Phase 1-22 実装状況（UsageEvent モデル追加・非課金）

- 実装範囲: **DB の入れ物（model + migration）と統合テストのみ**。emit・課金・決済・請求は含まない。
- 追加: `UsageEvent` モデルを `packages/db/prisma/schema.prisma` に追加（設計 §5 の疑似スキーマを実体化）。
  - フィールド: id / tenantId / actorId / actorType / eventType / category / billing / unit /
    quantity Decimal(18,4) / sourceType / sourceId / idempotencyKey / occurredAt / metadata Json / createdAt。
  - 制約: `@@unique([tenantId, idempotencyKey])`（二重計上防止）＋ index 5本（occurredAt/eventType/category/billing/sourceType+sourceId）。
  - Tenant/User への relation は張らない（tenantId/actorId はスカラ）。
- migration: `20260628183116_p1_22_usage_event`（**CREATE TABLE と index のみ／既存テーブルの DROP・ALTER なし**＝非破壊）。
- テスト: `packages/db/src/__tests__/p1_22_usage_event.itest.ts`（作成/既定値/二重計上不可/別tenant同key可/tenant分離/billing 3分類）。
- **まだ emit していない**（利用量を記録するアプリコードは未実装）。
- **まだ課金していない**。billing は分類ラベルのみ。**amount / price / currency は持たない**。
- metadata に PII / secret / 本文 / 金額を入れない方針を維持（テストデータも非PIIの例のみ）。
- 課金・決済・請求・サブスク・プラン制御・上限 enforcement は**一切行っていない**。
- 次は別承認で Phase 1-23「非課金 usage 記録 emit」の候補（安全な発火点から idempotencyKey 付きで記録。金額なし）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 17.1 本番確認（GO・2026-06-28・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-28・利用者ブラウザ確認）。`d14ce1d` を Vercel Production（`main`）で確認。
- Prisma `migrate deploy` 成功／migration pending なし／**UsageEvent / Prisma migration error なし**／engine・runtime error なし。
- 既存画面（`/login`・`/invoices`・`/approvals`・`/reports/morning`・`/finance`・`/planning-hokko`）と既存 finance フロー（請求一覧/作成/詳細/発行/外部送信申請/入金/dunning）に**影響なし**。
- 課金画面・決済画面・サブスク画面・UsageEvent 管理画面は**新規表示なし**。
- **課金処理・決済処理・UsageEvent emit はなし**（UsageEvent はまだ入れ物のみ）。
- 詳細は `docs/audit/14_release_stabilization.md` §27。

---

## 18. Phase 1-23 実装状況（非課金 usage emit 最小実装）

- 実装範囲: **最初の1箇所（LeadMap CSV export）だけ**を UsageEvent に記録する最小配線。**課金・決済・請求・サブスクは含まない。**
- 追加: `apps/web/lib/usage-events.ts` の `recordUsageEvent` helper。
  - UsageEvent を1件安全に記録するだけ。**金額(amount/price/currency)を扱わない。**
  - tenantId+idempotencyKey の unique 制約に当たれば duplicate 扱い（既存を壊さない）。
  - **記録に失敗しても例外を外へ投げない**（呼び出し元の主処理を壊さないため ok:false を返すのみ）。
  - billing は許可値以外なら `usage_only` に丸める。quantity 既定 1。必須項目欠落時は ok:false。
- 配線: `apps/web/app/api/leadmap/export/route.ts` で ExportJob 作成後に1回だけ emit。
  - eventType=`export.generated` / category=`export` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`ExportJob` / sourceId=`exportJob.id` / idempotencyKey=`usage:export.generated:<exportJob.id>`。
  - metadata=`{ scope:"leadmap_leads", format:"csv", hasCampaignFilter: Boolean(campaignId) }`（**非PIIのみ**）。
- billing は **`usage_only` のみ**。`billable_candidate` / `never_billable` はまだ使わない。
- **課金なし／決済なし。UsageEvent は金額を持たない。**
- metadata に **PII / secret / 本文 / 金額 / campaignId 実値 / CSV本文 / 件数（規模推測値）を入れない**。
- **UsageEvent 記録失敗は主処理（CSV export）を壊さない**設計。
- emit 対象は **LeadMap export のみ**。AI出力・外部送信・dunning・invoice送信・JobRun・storage・seat には広げていない。
- テスト: `packages/db/src/__tests__/p1_23_usage_event_emit.itest.ts`（payload 仕様/非PII metadata/usage_only/二重計上不可/別tenant同key可）。
- 次候補: 他の安全な発火点への段階展開（別途承認）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 18.1 本番確認（GO・2026-06-29・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-29・利用者ブラウザ確認）。`399de6f` を Vercel Production（`main`）で確認。
- LeadMap CSV export が**従来どおり動作**（ダウンロード/内容/操作後エラーなし）。**UsageEvent / recordUsageEvent 関連エラーなし**。
- runtime route の billing は **usage_only**。**billable_candidate は使っていない**。UsageEvent emit 対象は **LeadMap export のみ**。
- **課金処理・決済処理・サブスクリプション処理はなし**。課金/決済/サブスク/UsageEvent 管理画面は新規表示なし。
- 既存 finance / invoice / dunning / approvals / morning に**影響なし**。意図しない実メール送信なし。
- 詳細は `docs/audit/14_release_stabilization.md` §28。

---

## 19. Phase 1-25 実装状況（AIOutput の非課金 usage emit）

- 実装範囲: **AIOutput 生成の共通経路 `saveAIOutputStandard`（apps/web/lib/ai-safety-server.ts）に emit を1箇所追加**。emit 対象は **AIOutput のみ**。
- 配線: `prisma.aIOutput.create` 成功後に `recordUsageEvent` を1回だけ呼ぶ（return 前・`logDataAccess` 処理は不変）。
  - eventType=`ai.output.generated` / category=`ai` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`AIOutput` / sourceId=`out.id` / idempotencyKey=`usage:ai.output.generated:<AIOutput.id>`。
  - metadata=`{ task: args.task, model: args.model ?? 'fake' }`（**task / model のみ・非PII**）。
- **billable_candidate は使わない**（runtime は usage_only のみ）。**課金なし／決済なし／金額なし**。
- metadata に **input / inputHash / output / outputText / citations / prompt / 生成本文 / 顧客情報 / email / 金額 / secret を入れない**。
- **recordUsageEvent 失敗で AIOutput 保存や既存処理（logDataAccess・戻り値）を壊さない**（helper は例外を投げない設計）。
- **recordUsageEvent helper は変更していない**。**LeadMap export の emit は維持**（Phase 1-23 のまま）。
- 他の発火点（外部送信・dunning・invoice送信・JobRun・Webhook・storage・seat）には**広げていない**。
- ※ 補足: `actorType` は helper の許可型（user|ai_agent|system）にキャストして渡す（`saveAIOutputStandard` の `ai_assistant` も DB は String 列のため値は保持。helper は不変）。worker の `aIOutput.create` 直叩き経路（apps/worker）は対象外。
- テスト: `packages/db/src/__tests__/p1_25_usage_event_ai_output.itest.ts`（payload 仕様／metadata=task,model のみ／usage_only／二重計上不可／別tenant同key可）。
- 次候補: 他の安全な発火点への段階展開（別途承認）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 19.1 本番確認（GO・2026-06-29・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-29・利用者ブラウザ確認）。`11c224d` を Vercel Production（`main`）で確認。
- `saveAIOutputStandard` 経由のAI生成が**従来どおり動作**。AIOutput 保存後に画面エラー / runtime error なし。**UsageEvent / recordUsageEvent 関連エラーなし**。
- runtime billing は **usage_only**。**billable_candidate は使っていない**。metadata は **task/model のみ**。
- **課金処理・決済処理・サブスクリプション処理はなし**。課金/決済/サブスク/UsageEvent 管理画面は新規表示なし。
- UsageEvent emit対象は **LeadMap export + AIOutput の2種類**。
- 詳細は `docs/audit/14_release_stabilization.md` §29。
- ※ 本記録は揮発環境で未push記録コミットが失われたため同一実測値で再作成（コード `11c224d` 不変）。

---

## 20. Phase 1-26 実装状況（emit 拡張候補の監査・状態固定／docs-only）

- 種別: **docs-only の記録・監査**。コード実装・schema/migration・課金・決済・billable_candidate runtime 使用・UsageEvent emit 追加は**なし**。
- Phase 1-25 は **`11c224d`（実装）＋ `9944f0e`（本番確認記録）でクローズ済み**。本番確認 GO 済み。
- 旧ローカルコミット **`a9643a4` は未push のまま揮発環境で失われたもので、正式基準ではない**。**現在の正式基準は origin/main = `9944f0e`**。今後 `a9643a4` を前提にしない。
- 現在の emit 対象は **LeadMap export + AIOutput の2種類**（runtime billing は usage_only・billable_candidate 不使用・課金/決済なし）。
- 次の emit 拡張候補を横断監査し、**次の P0 = danger-actions export（admin の承認付きエクスポート・`export.generated`/usage_only）** に確定。
- 候補比較・分類（P0/P1/P2/NEVER_BILLABLE/DO_NOT_TOUCH_NOW）・metadata/idempotency 方針・Phase 1-27 プロンプト案は **`docs/audit/16_usage_event_emit_expansion_strategy.md`** に記録。
- 実装は別タスク・別承認（Phase 1-27）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

---

## 21. Phase 1-27 実装状況（admin danger-actions export の非課金 usage emit）

- 実装範囲: **admin danger-actions export の1箇所のみ**。emit 対象に「admin danger-actions export」を追加。
- 配線: `apps/web/app/(app)/admin/danger-actions/actions.ts` の `executeApprovedExportAction` 内、ExportJob 作成後・既存 `writeAudit` 後・`return job.id` の前に `recordUsageEvent` を1回だけ呼ぶ。
  - eventType=`export.generated` / category=`export` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`ExportJob` / sourceId=`job.id` / idempotencyKey=`usage:export.generated:<job.id>`。
  - metadata=`{ scope:'admin_danger_actions_export', format:'csv', source:'admin_danger_actions' }`（**固定値のみ・非PII**）。
- **`req.payloadAfter` の実値は UsageEvent metadata に入れない**（固定文字列のみ）。
- **課金なし／決済なし**。**billable_candidate runtime 使用なし**。**amount / price / currency なし**。
- **recordUsageEvent helper は変更なし**。**LeadMap export emit は維持**。**AIOutput emit は維持**。
- **recordUsageEvent 失敗で承認済み export 本処理を壊さない**（helper は例外を投げない設計）。
- schema / migration / RBAC / ABAC / package / lock 変更なし。
- テスト: `packages/db/src/__tests__/p1_27_usage_event_admin_export.itest.ts`（payload 仕様／metadata=scope,format,source のみ／usage_only／二重計上不可／別tenant同key可）。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export の3種類**。
- 次候補は別途監査・承認。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 21.1 本番確認（GO・2026-06-29・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-29・利用者ブラウザ確認）。`35cd384` を Vercel Production（`main`）で確認。
- admin danger-actions の承認済み export が**従来どおり動作**。ExportJob 作成 OK。
- 同一承認リクエストの再実行は **already-executed で拒否**され、二重実行防止として正常。
- **UsageEvent / recordUsageEvent 関連エラーなし**。
- runtime billing は **usage_only**。**billable_candidate は使っていない**。
- metadata は **固定3値（scope/format/source）のみ**。`req.payloadAfter` 実値・顧客情報・CSV本文・金額・secret は入れていない。
- **課金処理・決済処理・サブスクリプション処理はなし**。
- UsageEvent emit対象は **LeadMap export + AIOutput + admin danger-actions export の3種類**。
- 既存機能・既存権限境界に影響なし。
- 詳細は `docs/audit/14_release_stabilization.md` §30。

---

## 22. Phase 1-29 実装状況（approvals outreach 送信の非課金 usage emit）

- 実装範囲: **approvals outreach 送信の1箇所のみ**。emit 対象に「approvals outreach 送信」を追加。
- 配線: `apps/web/app/(app)/approvals/actions.ts` の `decideApprovalAction`（outreach_send 承認）で、`OutreachSendLog.create` を `const outreachLog = ...` で受け、その直後・`outreachDraft.update` の前に `recordUsageEvent` を呼ぶ。
  - eventType=`external_send.outreach` / category=`external_send` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`OutreachSendLog` / sourceId=`outreachLog.id` / idempotencyKey=`usage:external_send.outreach:<OutreachSendLog.id>`。
  - metadata=`{ channel: 'email', status: sendStatus }`（**非PII・channel/status のみ**）。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のときのみ**。**`suppressed` / `failed` / `rejected` は emit しない**（抑止・失敗はユーザーに課金しない＝never_billable 相当）。
- metadata に **toAddress / fromAddress / subject / body / draftId / leadId / placeId / 顧客情報 / 金額 / secret を入れない**。
- **recordUsageEvent helper は変更なし**。**LeadMap export emit / AIOutput emit / admin danger-actions export emit は維持**。
- **recordUsageEvent 失敗で承認・送信の主処理を壊さない**（helper は例外を投げない設計）。**実メール送信は起こさない**（既存挙動不変・`EXTERNAL_SEND_ENABLED=false` で logged）。
- schema / migration / RBAC / ABAC / package / lock 変更なし。**課金なし／決済なし／billable_candidate runtime 使用なし／金額なし**。
- テスト: `packages/db/src/__tests__/p1_29_usage_event_outreach.itest.ts`（payload 仕様／metadata=channel,status のみ／usage_only／emit 条件 logged|sent のみ・suppressed/failed/rejected は emit しない／二重計上不可／別tenant同key可）。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach の4種類**。
- 次候補は別途監査・承認（A' invoice-send/dunning ／ B Webhook delivery）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 22.1 本番確認（GO・2026-06-29・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-29・利用者ブラウザ確認）。`986e738` を Vercel Production（`main`）で確認。
- approvals outreach 送信が**従来どおり動作**。**logged / sent のみ emit**・**suppressed / failed / rejected は emit しない**。
- **UsageEvent / recordUsageEvent 関連エラーなし**。
- runtime billing は **usage_only**。**billable_candidate は使っていない**。metadata は **channel/status のみ**。
- toAddress / subject / body / draftId / leadId / 顧客情報 / 金額 / secret は入れていない。
- **課金処理・決済処理・サブスクリプション処理はなし**。
- UsageEvent emit対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach の4種類**。
- 既存機能・既存権限境界に影響なし。
- 詳細は `docs/audit/14_release_stabilization.md` §31。

---

## 23. Phase 1-31 実装状況（invoice-send の非課金 usage emit）

- 実装範囲: **invoice-send の1箇所のみ**。emit 対象に「invoice-send」を追加。
- 配線: `apps/web/lib/domains/finance/invoice-send.ts` の `executeInvoiceExternalSend` で、既存の `invoice.update(SENT)` / `financeEvent.create` / `writeAudit` / `emitGrowthEvent` の**後**・`return { ok: true }` の**前**に `recordUsageEvent` を呼ぶ。
  - eventType=`external_send.invoice` / category=`external_send` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`Invoice` / sourceId=`invoiceId` / idempotencyKey=`usage:external_send.invoice:<invoiceId>`。
  - metadata=`{ channel:'email', status: sendStatus, kind:'invoice' }`（**非PII・channel/status/kind のみ**）。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のときのみ**。**`failed` / `rejected` / `blocked` / `suppressed` / その他 status は emit しない**（送れていない＝never_billable 相当）。
- metadata に **recipient / customer / email / inv.number / inv.total / maskedBody / amount / price / currency / receivable / invoiceId / secret を入れない**（sourceId に invoiceId は使うが metadata には入れない）。
- **既存 finance ロジック（invoice.update / financeEvent.create / writeAudit / emitGrowthEvent）は不変**。**recordUsageEvent helper は変更なし**。
- **LeadMap export emit / AIOutput emit / admin danger-actions export emit / approvals outreach emit は維持**。
- **recordUsageEvent 失敗で送信主処理・financeEvent・戻り値を壊さない**（helper は例外を投げない設計）。**実メール送信は起こさない**（既存挙動不変・`EXTERNAL_SEND_ENABLED=false` で logged）。
- schema / migration / RBAC / ABAC / package / lock 変更なし。**課金なし／決済なし／billable_candidate runtime 使用なし／金額なし**。
- テスト: `packages/db/src/__tests__/p1_31_usage_event_invoice_send.itest.ts`（payload 仕様／metadata=channel,status,kind のみ／usage_only／emit 条件 logged|sent のみ・failed/rejected/blocked/suppressed は emit しない／二重計上不可／別tenant同key可）。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send の5種類**。
- 次候補は別途監査・承認（dunning ／ Webhook delivery〔worker/packages 経路の共通 helper 設計が前提〕）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。

### 23.1 本番確認（GO・2026-06-29・利用者ブラウザ/Vercel）
- **本番確認 GO**（2026-06-29・利用者ブラウザ確認）。`b062f68` を Vercel Production（`main`）で確認。
- invoice-send が**従来どおり動作**。請求書が SENT になる既存挙動に回帰なし。**financeEvent / writeAudit / GrowthEvent の既存挙動に回帰なし**。
- **UsageEvent / recordUsageEvent 関連エラーなし**。
- runtime billing は **usage_only**。**billable_candidate は使っていない**。metadata は **channel/status/kind のみ**。
- recipient/customer/email/inv.number/inv.total/maskedBody/amount/price/currency/receivable/invoiceId/secret は入れていない。
- **failed / rejected / blocked / suppressed / その他 status は emit しない**。
- **課金処理・決済処理・サブスクリプション処理はなし**。
- UsageEvent emit対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send の5種類**。
- 既存機能・既存権限境界に影響なし。
- 詳細は `docs/audit/14_release_stabilization.md` §32。

---

## 24. Phase 1-33 実装状況（dunning の非課金 usage emit）

- 実装範囲: **dunning / executeDunningSend の1箇所のみ**。emit 対象に「dunning（督促送信）」を追加。
- 配線: `apps/web/lib/domains/finance/dunning.ts` の `executeDunningSend` で、既存の `collectionReminder.update` / `writeAudit` / `emitGrowthEvent` の**後**・`return { ok: true }` の**前**に `recordUsageEvent` を呼ぶ。
  - eventType=`external_send.dunning` / category=`external_send` / **billing=`usage_only`（固定）** / unit=`count` / quantity=`1` /
    sourceType=`CollectionReminder` / sourceId=`reminderId` / idempotencyKey=`usage:external_send.dunning:<CollectionReminder.id>`。
  - metadata=`{ channel:'email', status: sendStatus, kind:'dunning' }`（**非PII・channel/status/kind のみ**）。
- **emit 条件は `sendStatus === 'logged' || sendStatus === 'sent'` のときのみ**。**no-recipient / already-sent / not-found / failed / rejected / blocked / suppressed / その他 status は emit しない**（送れていない＝never_billable 相当）。
- metadata に **recipient / subject / draftMessage / maskedBody / inv.number / inv.total / reminderId / receivableId / invoiceId / 顧客情報 / 金額 / secret を入れない**（sourceId に reminderId は使うが metadata には入れない）。
- **既存 dunning ロジック（collectionReminder.update / writeAudit / emitGrowthEvent）は不変。Receivable は触らない・collected にしない**。**recordUsageEvent helper は変更なし**。
- **LeadMap export / AIOutput / admin danger-actions export / approvals outreach / invoice-send emit は維持**。
- **recordUsageEvent 失敗で dunning 主処理・戻り値を壊さない**（helper は例外を投げない設計）。**実メール送信は起こさない**（既存挙動不変・`EXTERNAL_SEND_ENABLED=false` で logged）。
- schema / migration / RBAC / ABAC / package / lock 変更なし。**課金なし／決済なし／billable_candidate・never_billable runtime 使用なし／金額なし**。
- テスト: `packages/db/src/__tests__/p1_33_usage_event_dunning.itest.ts`（payload 仕様／metadata=channel,status,kind のみ／usage_only／emit 条件 logged|sent のみ・それ以外 emit しない／二重計上不可／別tenant同key可）。
- 現在の emit 対象は **LeadMap export + AIOutput + admin danger-actions export + approvals outreach + invoice-send + dunning の6種類**。
- 次候補は別途監査・承認（Webhook delivery〔worker/packages 経路の共通 helper 設計が前提〕／JobRun）。実課金はさらに先（§11 の安全条件＋人間承認が前提）。
