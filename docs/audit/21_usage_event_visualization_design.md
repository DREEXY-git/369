# 21. UsageEvent 可視化・集計の安全設計 — Phase 1-42

> 読み取り専用監査 + docs-only の設計記録。**コード実装・UI/API/query・emit 追加・schema/migration・課金・決済・billable_candidate / never_billable runtime 使用は含まない。**
> フェーズ: Phase 1-42 / 日付: 2026-07-01 / 種別: docs-only / 基準: **origin/main = `87635bb`**

---

## 1. 非エンジニア向け要約

- **Phase 1-42 は「設計図を書くだけ」**です。プログラムは1行も足していません。画面も API も作っていません。
- 利用量(UsageEvent)の記録対象は **8種類のまま**増えていません。
- **いまは課金ではありません**。目的は「何がどれだけ使われたか」を**安全に見る**ための設計です。
- 見せてよいのは「種類ごと・日ごとの件数と数量」だけ。**中身の本文・顧客情報・金額・secret・保存先パスは絶対に見せません**。
- **会社（テナント）ごとに完全に分けて表示**します。他社のデータが混ざる画面は作りません。
- 見てよい人は限定します（管理者＝監査権限を持つ人のみ）。一般社員には出しません。
- 「請求」「料金」「課金」という言葉は使いません。`usage_only`（非課金記録）を課金額と誤解させない文言にします。
- 次に作るなら「**会社ごと・読み取り専用の利用量サマリー画面1つ**」から。ただし今回は作らず、設計だけ確定しました。

> ひとことで言うと「貯めた利用量を、課金せず・個人情報を出さず・会社ごとに安全に見える化するための"設計図"を、実装せず文章で残した」のが Phase 1-42 です。

---

## 2. 目的

- UsageEvent 8種類の**安全な集計・可視化方針**を設計する。
- 課金ではなく、**非課金の利用量可視化**であることを明確にする。
- PII・本文・secret・金額を**出さない**設計にする。
- **tenant 分離・RBAC・用語設計**を明確にする。
- 次フェーズの最小実装候補（P0）を判定する。

## 3. 非目的（今回やらないこと）

- 課金しない・決済しない・サブスクしない・請求書に使わない。
- usage cap / alert を実装しない。billable_candidate / never_billable を runtime で使わない。
- raw metadata viewer を作らない。raw payload / prompt / output / transcript を表示しない。
- 顧客情報・email・金額・URL・secret・fileKey を表示しない。
- dashboard / API / query を実装しない。schema/migration を変更しない。

## 4. 現在の正式状態

| 項目 | 値 |
|---|---|
| origin/main | **`87635bb`** |
| 現在の emit 対象 | **8種類** |
| 課金・決済・サブスク | なし |
| usage dashboard | 未実装 |
| billable_candidate / never_billable runtime 使用 | なし |

### 4.1 現在の emit 対象8種類

| # | emit対象 | eventType | category | sourceType | metadata（非PII） | billing | 実装Phase | 本番確認 |
|---|---|---|---|---|---|---|---|---|
| 1 | LeadMap export | `export.generated` | export | ExportJob | scope/format/真偽 | usage_only | 1-23 | GO |
| 2 | AIOutput（apps/web） | `ai.output.generated` | ai | （AI出力） | task/model | usage_only | 1-25 | GO |
| 3 | admin danger-actions export | `export.generated` | export | ExportJob | scope/format/source | usage_only | 1-27 | GO |
| 4 | approvals outreach | `external_send.outreach` | external_send | OutreachSendLog | channel/status | usage_only | 1-29 | GO |
| 5 | invoice-send | `external_send.invoice` | external_send | Invoice | channel/status/kind | usage_only | 1-31 | GO |
| 6 | dunning | `external_send.dunning` | external_send | CollectionReminder | channel/status/kind | usage_only | 1-33 | GO |
| 7 | Webhook success | `webhook.delivered` | webhook | WebhookDelivery | eventType | usage_only | 1-37 | GO |
| 8 | worker 朝礼AI出力 | `ai.output.generated` | ai | AIOutput | task/source | usage_only | 1-40 | GO |

## 5. UsageEvent model / index 監査

`packages/db/prisma/schema.prisma:3195` の `UsageEvent`:
- 列: `tenantId` / `actorId?` / `actorType` / `eventType` / `category` / `billing`(既定 usage_only) / `unit`(既定 count) / `quantity`(Decimal・**量であって金額ではない**) / `sourceType` / `sourceId?` / `idempotencyKey` / `occurredAt` / `metadata`(Json?) / `createdAt`。
- **金額カラム（amount/price/currency）は存在しない**。
- unique: `@@unique([tenantId, idempotencyKey])`。
- index: `[tenantId, occurredAt]` / `[tenantId, eventType]` / `[tenantId, category]` / `[tenantId, billing]` / `[tenantId, sourceType, sourceId]`。**すべて tenantId 先頭＝テナントスコープ集計が index で効く**。
- **現状 UsageEvent は書き込み専用**（find/count/groupBy 等の読み取りコードは存在しない）。

安全な集計軸（index 支援あり）: tenantId / eventType / category / occurredAt（日別・週別・月別）/ count / quantity 合計 / unit。
注意: **sourceId は詳細リンクに使わない**。**metadata は raw 表示しない**。**billing は当面内部状態**（UI に出すなら「非課金記録」と明記）。

## 6. 安全な集計軸

- **可**: 日別件数 / eventType別件数 / category別件数 / sourceType別件数（固定ラベルのみ）/ tenant内合計 / 直近7日・30日 / quantity 合計。
- **禁止**: 顧客別 / invoice別 / lead別 / email別 / 金額別 / raw sourceId 一覧 / raw metadata 一覧。

## 7. tenant 分離方針

- **すべての query は tenantId 必須**（現行 index も tenantId 先頭で強制しやすい）。
- **tenantId 未指定の横断表示は禁止**。platform admin の全社横断が必要でも**別設計**（今回スコープ外）。
- 一般ユーザー向けには出さない。最初は **tenant admin / internal admin** 向け。
- 他テナント比較はやらない。

## 8. RBAC / 権限方針

- 既存パターンに合わせる: `requireUser()` ＋ `hasPermission(user, resource, action)`（`apps/web/lib/auth/current-user.ts`）。
- 既存の内部監査系ページ（`admin/audit`・`admin/data-access-logs`）は **`hasPermission(user, 'audit', 'read')`** でガード。**同じ audit 読み取り権限**を流用するのが最も安全（新しい権限を足さない＝RBAC 定義変更なし）。
- 一般社員には出さない。**finance / billing 権限とは混同しない**（これは請求ではなく「利用量監査」）。
- 画面は「請求画面」ではなく「利用量監査」画面として扱う。

## 9. metadata 表示方針

- **表示してよい**: 固定 enum 化された eventType / category / sourceType（固定ラベル）/ unit / quantity / 日付 / 安全に選別された metadata の**固定キーだけを集計ラベル化**（例: channel, kind, task, format）。
- **表示しない（raw）**: raw metadata / prompt / output / transcript / payload / body / URL / secret / signature / fileKey / email / customer name / invoice id / lead id / reminder id / **sourceId** / amount / price / currency / total。

## 10. 課金誤認防止の文言方針

- 「請求」「課金」「料金」「決済」「サブスク」と**表示しない**。
- 画面名は「**利用量監査**」「**非課金 UsageEvent 集計**」「**AI/自動処理 利用量**」等。
- `usage_only` は「**非課金記録**」と説明する。
- 画面に「**この画面は請求額を示すものではありません**」と明記する。
- billable_candidate はまだ使わない。never_billable は runtime で使わない。

## 11. 集計ビュー候補

| 候補 | 対象ユーザー | tenantId必須 | 表示する項目 | 表示しない項目 | RBAC | PIIリスク | 課金誤認リスク | 実装難易度 | 本番確認しやすさ | 推奨分類 |
|---|---|---|---|---|---|---|---|---|---|---|
| **A: tenant admin向け read-only UsageEvent summary** | tenant admin / internal admin | ✔（必須） | eventType/category/日別 件数・quantity 合計（直近30日） | raw metadata / sourceId / 金額 / 本文 / 顧客情報 | `audit:read` 流用 | **低** | 低（「非課金記録」明記） | 低〜中（groupBy＋既存index） | ◎（件数を目視） | **P0_IMPLEMENTABLE_NEXT** |
| B: internal admin向け platform usage overview（tenant横断） | platform admin | ✗（横断） | 全社横断集計 | 同上 | 別設計必要 | 中 | 中 | 中 | △ | **DO_NOT_TOUCH_NOW**（tenant横断） |
| C: developer/audit向け raw UsageEvent table | developer | △ | raw 行（metadata/sourceId 含む） | — | 別設計 | **高（raw metadata）** | 中 | 低 | △ | **NEVER**（raw viewer） |

## 12. 推奨 P0 候補

- **P0_IMPLEMENTABLE_NEXT: 候補A＝tenant admin 向け read-only UsageEvent summary。**
  - route 案（**実装はしない**・設計のみ）: `apps/web/app/(app)/admin/usage/page.tsx` 相当の read-only ページ。
  - ガード: `requireUser()` ＋ `hasPermission(user, 'audit', 'read')`（**RBAC 定義は変更しない**・既存 audit 権限を流用）。
  - 集計: `prisma.usageEvent.groupBy({ by: ['eventType'（or 'category'）], where: { tenantId, occurredAt: { gte: 直近30日 } }, _count: true, _sum: { quantity } })` 相当。**tenantId 必須**・既存 index（`[tenantId, occurredAt]`/`[tenantId, eventType]`/`[tenantId, category]`）で効く。
  - 表示: eventType/category/日別の**件数と quantity 合計のみ**。**raw metadata なし・sourceId なし・金額なし**。
  - 文言: `usage_only` を「非課金記録」と明記＋「請求額ではありません」注記。
  - 期間: 直近30日（デフォルト）に限定して重くしない。
  - **実装は Phase 1-43・別承認**（今回は作らない）。

## 13. DO_NOT_TOUCH_NOW / NEVER

- **DO_NOT_TOUCH_NOW**: platform 横断 usage overview（tenant 横断）／billing dashboard／plan・subscription 連動／usage cap・alert／invoice 連動／customer 別 usage／raw sourceId drilldown。
- **NEVER**: raw metadata viewer／prompt・output・transcript・payload viewer／secret・url・signature・fileKey 表示／amount・price・currency を usage dashboard に混ぜる／tenantId なし全件表示／usage から請求額を自動計算。

## 14. 次フェーズ導入順

| フェーズ | 内容 | 備考 |
|---|---|---|
| **Phase 1-42** | docs-only design audit | **今回**。実装なし・emit 追加なし |
| Phase 1-43 | read-only tenant-scoped usage summary の最小実装（候補A） | raw metadata なし・金額なし・課金なし。別承認 |
| Phase 1-44 | 本番確認記録 | 利用者 Vercel 確認 → GO 記録 |
| later | alerts / caps / billing integration | さらに先・別設計・別承認 |

## 15. GO / HOLD / NG 判定

- **判定: GO（監査・設計フェーズとして）／実装は Phase 1-43・別承認**。
- 安全な集計・可視化設計を docs-only で整理し、P0 候補を **候補A（tenant-scoped read-only usage summary）1つ**に絞った。
- metadata 安全方針（raw 非表示・PII/金額/secret/sourceId を出さない）と tenant 分離・RBAC（既存 `audit:read` 流用・RBAC 定義変更なし）・課金誤認防止文言を明確化。
- 実装なし・emit 追加なし・課金/決済に進んでいない・schema/migration/DB 変更なし。ファイル変更は docs/tasks のみ。

> 注: 本書は設計・記録であり実装ではない。候補A の実装（Phase 1-43）は別途人間承認が必要。
