# 12 — 保守性アーキテクチャ（Maintenance Architecture）

> このドキュメントは **Claude Code が今後迷わないための設計ルール**。Phase 1-8 で新設。
> 機能追加のたびに本書を参照し、逸脱する場合は理由をここに追記すること。

## 1. 主要レイヤ（依存方向は上→下のみ）

```
UI (app/(app)/**/page.tsx)            ← 表示・フォーム。複雑な集計は lib/queries へ委譲
Server Actions (app/**/actions.ts)    ← 6行構成（後述）。業務ロジックを書かない
lib/domains/<domain>/*.ts             ← ドメインサービス（業務ロジックの本体）
lib/*.ts (db, growth, events, approval, audit, ai-safety-server, operations)  ← 横断ヘルパ
packages/shared/src/*.ts              ← 純ロジック（DB非依存・テスト必須）
packages/db (Prisma)                  ← 永続化
```

- **画面 → action → lib/domains → lib → shared → db** の一方向。逆流させない。
- 画面で `prisma` を使ってよいが、集計・権限分岐が増えたら `lib/domains/<domain>/queries.ts` の `getXxxData()` へ切り出す。

## 2. データの分類（最重要）

| 分類 | 役割 | 例 |
|---|---|---|
| **正式データ** | 確定・対外的・会計的に正となる | `JournalEntry` / `Invoice` / `Payment` |
| **候補データ** | 承認前の下書き。安全に破棄・再生成できる | `JournalCandidate` / `InvoiceCandidate` |
| **ブリッジ台帳** | ドメイン間の金額イベントの中間記録 | `FinanceEvent` |
| **分析台帳** | 経営分析（売上/利益/工数） | `GrowthEvent` |
| **連携イベント** | システム連携（Outbox/Webhook） | `DomainEvent` |
| **監査ログ** | 誰が何をしたか（改ざん前提の記録） | `AuditLog` / `DataAccessLog` |
| **AI出力** | AI生成物＋安全フラグ | `AIOutput` / `AISafetyLog` |
| **承認** | 危険操作のゲート | `ApprovalRequest` |

**鉄則**: 正式データに「候補/下書き」を混ぜない。候補は別モデルに分離し、**承認後にのみ**正式データへ変換する。

## 3. 新規モデルを追加する判断基準

新規モデルを作る前に、以下を**必ず**確認する:

1. 既存 Prisma schema に同等モデルが無いか（特に下記の重複注意ペア）。
2. 既存モデルの**フィールド追加**で足りないか（拡張優先）。
3. 役割（正式/候補/ブリッジ/分析/連携/監査）が既存と本当に異なるか。

**重複注意ペア**（混同しない）:
- `FinanceEvent`（お金の動きの台帳：direction/dueAt/status/posted）≠ `GrowthEvent`（分析：revenueImpact/category）≠ `DomainEvent`（連携：Outbox）。
- `JournalCandidate`（仕訳候補：status/confidence/aiOutputId）≠ `JournalEntry`（正式仕訳：確定・posted）。
- `InvoiceCandidate`（請求候補：承認前）≠ `Invoice`（正式請求書：number/receivable/payments）。
- `PurchaseOrder` × `Vendor`/`ReorderRule`（発注は既存活用）。
- `EventCost` × `JournalCandidate`（原価記録 ≠ 仕訳候補）。
- `DamageLossRecord` × `InvoiceCandidate`（破損記録 ≠ 請求候補）。
- `AIOutput`（AI生成物）× `AIRecommendation`（推奨表示）。

新規追加した場合は **本書のセクション末尾の「モデル追加記録」に理由を書く**。

## 4. Server Action の書き方ルール（肥大化させない）

action には次の**6種類だけ**を書く:

```ts
export async function xxxAction(formData: FormData) {
  const user = await requireUser();                       // 1. 認証
  if (!hasPermission(user, 'finance', 'create')) redirect('/...?denied=1'); // 2. 権限
  const id = String(formData.get('id') ?? '');            // 3. formData 取得
  if (!id) redirect('/...?error=input');                  // 4. 入力チェック
  await someDomainService({ tenantId: user.tenantId, userId: user.userId }, id); // 5. lib 呼び出し
  redirect('/...?ok=1');                                  // 6. redirect/revalidate
}
```

- 業務ロジック（DB複数操作・金額計算・イベント発火）は **lib/domains/<domain>** に書く。
- 1ファイルが ~300行を超えたら分割を検討（例: `operations/actions.ts` は今後 `lib/domains/operations/*` へ段階的に移す候補）。

## 5. lib/domain service へ切り出す基準

- DB を2回以上触る / 金額計算 / Audit・Event・Growth を複数発火 / 複数モデルにまたがる → **lib/domains へ**。
- 純粋な計算（金額・割合・分類・遷移可否）→ **packages/shared へ**（DB非依存・unit必須）。
- 集計・一覧データ取得（複数 prisma + 権限分岐）→ **lib/domains/<domain>/queries.ts の getXxxData()**。

```
apps/web/lib/domains/
  finance/
    finance-bridge.ts   … Operations→Finance ブリッジのサービス（書き込み）
    queries.ts          … getFinanceBridgeDashboardData 等（読み取り・集計）
  operations/           … （将来）operations/actions.ts のロジック移設先
```

## 6. 危険操作の承認ルール

以下は必ず `requireApprovalForDangerousAction` → 承認後 `executeApprovedAction`（冪等）:
仕訳確定(journal_finalize) / 請求送信(invoice_send) / 支払実行(payment_execute) / 高額発注(purchase_order_issue) / 大幅棚卸差異(stocktake_adjust) / 破損請求確定(damage_charge_finalize) / 予約強制解除(inventory_force_release) / 在庫大幅調整(inventory_adjust) / 権限変更 / 外部送信 / 削除 / 原価・粗利・会計export。

承認後実行は **executedAt の原子クレーム** で二重実行を防ぐ（`executeApprovedAction`）。

## 7. AI機能追加時の安全ルール

AI/OCR/LLM を使うときは必ず:
`safeAiInput`（注入検出）→ 実行 → `saveAIOutputStandard`（AIOutput保存）。外部送信は `prepareExternalPayload`＋承認、AI直接送信は `assertAiToolAllowed` で禁止。AI生成の候補（仕訳/請求）は `aiOutputId` を必ず紐付ける。

## 8. Finance Bridge の位置付け

`FinanceEvent` は **Operations と Finance の唯一の境界**。Operations 側は FinanceEvent を「出す」だけ、Finance 側は FinanceEvent を「受けて」候補（Journal/Invoice/CashFlow）に展開する。これにより両OSを疎結合に保つ。

- CashFlow（入金/支払予定）は **専用モデルを作らず** `FinanceEvent(type=cashflow_expected/payment_expected, direction, dueAt)` で表現（モデル数を増やさない）。
- 正式 `JournalEntry`/`Invoice` への変換は**承認後**（本Phaseでは候補止まり）。

## 9. Operations → Finance のデータフロー

```
EventProject(売上/原価)  ─┐
PurchaseOrder(発注/入庫) ─┤→ FinanceEvent ─→ JournalCandidate(仕訳候補)
DamageLossRecord(破損)   ─┘              └─→ InvoiceCandidate(請求候補)
                                          └─→ FinanceEvent(cashflow_expected: 入金/支払予定)
                                                   │
                                       /finance/bridge で可視化
                                                   │
                              承認(journal_finalize / invoice_send) → 正式化（次Phase）
```

現場実行 → 原価/売上 → 粗利 → 請求候補 → 仕訳候補 → 資金繰り予定、までを接続。

## 10. 今後のリファクタ候補

- `operations/actions.ts`(713行) を `lib/domains/operations/{inventory,stocktake,procurement,logistics,events}.ts` へ段階移設。
- 既存 `/finance/cashflow` を FinanceEvent(cashflow_expected) と統合（現状は別系統。本Phaseでは非破壊で並存）。
- JournalCandidate → JournalEntry の posted 化、InvoiceCandidate → Invoice の正式化（承認後実行）。
- e2e の実ブラウザ実行（CI に chromium 導入）。

## モデル追加記録

| Phase | モデル | 役割 | なぜ既存で足りないか |
|---|---|---|---|
| 1-8 | `FinanceEvent` | ブリッジ台帳 | GrowthEvent=分析・DomainEvent=連携で、direction/dueAt/status/posted を持つ「お金の動きの台帳」が無い |
| 1-8 | `JournalCandidate` | 仕訳候補 | JournalEntry は正式（確定）。承認前の status/confidence/aiOutputId を持つ候補は分離が安全 |
| 1-8 | `InvoiceCandidate` | 請求候補 | Invoice は正式（number/receivable/payments）。Operations由来の下書きを混ぜず分離 |
