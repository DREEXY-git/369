# F-R7-02 独立設計レビュー — 予定キャッシュフローの canonical identity

- 監査対象: `DREEXY-git/369`
- 固定 SHA: `989ab677e827915961353aaca5e7ca1606a95e87`
- 監査日: 2026-07-23 (Asia/Tokyo)
- 対象: `apps/web/lib/domains/finance/cashflow.ts` / `packages/shared/src/finance.ts` と、その producer・schema・tests
- 作業境界: source/schema/tests の静的確認のみ。実装、DB、migration、本番、外部送信は未実行

## 結論

**推奨は A の修正版（A'）**である。

`FinanceEvent` に同じ dedup key を持つ複数表現を残して reader で毎回重複排除するのではなく、**1つの予定債権・債務（cashflow obligation）につき、予測へ載せる `cashflow_expected` を1行だけ正本として維持する**。

- `cashflow_expected`: 予定キャッシュフローの projection 正本
- `payment_expected`: 請求送信の write-ahead claim や業務処理の証跡。予測正本ではない
- `payment_received` / `payment_reversal`: 実績。予定行とは別の append-only event
- `FinanceEvent.id`: 正本予定行の不変な row identity
- `payload.cashflowIdentity`: versioned な論理 identity / lineage / role の補助メタデータ

この A' は、最初の増分では既存 `FinanceEvent` の列と `payload` を使えるため **schema migration は不要**である。ただし JSON metadata には DB unique 制約を張れない。DB が保証する恒久的な一意性や分割払いを必要とする段階では、専用列または C の `CashflowObligation` モデルが必要になり、これは migration の Human Gate である。

既存行を即座に正しく読むため、移行期間だけ B の厳密な reader normalizer を併用する。ただし B を正本設計にはしない。

## 現コードから確認した事実

### 1. 資金ショート予測から請求入金が欠落する

`getCashflowShortageProjection` は tenant をスコープした上で、`type='cashflow_expected'` のみを取得する（`apps/web/lib/domains/finance/cashflow.ts:51-65`）。`forecastCashflow` 自体は DB 非依存の純関数であり、入力行を日付順に加減するだけである（`packages/shared/src/finance.ts:66-103`）。したがって問題は純関数ではなく、その手前の canonical set の作り方にある。

請求書送信は `payment_expected` を `pending_send` で claim し、送信 finalize と同じ transaction で `approved` にする（`apps/web/lib/domains/finance/invoice-send.ts:124-145,181-198`）。ここでは `cashflow_expected` を作らない。よって直接作成・見積変換由来の Invoice の入金予定は、現在の資金ショート予測へ入らない。

### 2. PO では2種類が同一支払を表す

PurchaseOrder bridge は、同じ tenant / `sourceType='PurchaseOrder'` / `sourceId=poId` / amount / dueAt で `payment_expected` と `cashflow_expected` を同一 transaction 内に作る（`apps/web/lib/domains/finance/finance-bridge.ts:339-359`）。既存 E2E も両方が各1件できることを契約として固定している（`apps/web/tests/e2e/m1b_finance_bridge_idempotency_evidence.spec.ts:139-152`）。

したがって、単純に `type IN ('cashflow_expected','payment_expected')` とすると PO 支払は二重になる。現行 B-CF-01 の cashflow-only はこの二重計上を止めるが、Invoice 入金を失う。

### 3. InvoiceCandidate と Invoice は同じ債権でも source identity が変わる

Operations bridge は `sourceType='InvoiceCandidate'` / `sourceId=candidate.id` の `cashflow_expected` を作る（`apps/web/lib/domains/finance/finance-bridge.ts:303-326,375-395`）。正式化は同じ tenant の InvoiceCandidate から Invoice / Receivable を作り、`InvoiceCandidate.invoiceId` を設定するが、既存 cashflow row の source や status は更新しない（`apps/web/lib/domains/finance/formalize.ts:118-169`、schema は `packages/db/prisma/schema.prisma:1015-1035`）。

その後の請求送信は `sourceType='Invoice'` / `sourceId=invoice.id` で `payment_expected` を作る。したがって、同じ債権の2表現は `(tenantId, sourceType, sourceId)` が一致しない。

amount / dueAt / description を結合キーにすると、同額・同期限の別請求を誤結合し、金額や期限の変更で同一債権を別物扱いする。これらは identity に含めてはならない。

### 4. 別の reader は既に両 type を重複集計し得る

`getCashflowUnifiedData` は両 type を取得し（`apps/web/lib/domains/finance/cashflow.ts:157-166`）、`summarizeCashflowActualVsExpected` は status が expected ならどちらも加算する（`packages/shared/src/finance.ts:401-429`）。このため PO は「予定 vs 実績」カードでは二重計上され得る。

F-R7-02 の修正を資金ショート予測だけに入れると、同一ページ内で予定額の意味が食い違う。canonical selector は `getCashflowShortageProjection`、`getCashflowBridgeData`、`getCashflowUnifiedData` の予定側で共通利用すべきである。

### 5. 入金・取消に対する予定行の対称性がない

入金記録は全額入金のときだけ `sourceId=invoiceId` の予定 event を `posted` にする。部分入金では予定額を残額へ減らさない（`apps/web/lib/domains/finance/payments.ts:142-166`）。CashAccount が現在残高を起点にする以上、既に入った一部入金を含む現在残高へ請求総額を再度加えると、予測入金を過大計上する。予定行の amount は「原請求総額」ではなく `max(invoice.total - SUM(payment.amount), 0)` でなければならない。

また、全額入金後に payment を取り消す処理は Invoice / Receivable を未回収へ戻すが、予定 event を再有効化しない（`apps/web/app/(app)/approvals/actions.ts:270-297`）。VOID は `sourceId=invoiceId` の予定だけを ignored にする（`apps/web/lib/invoice-void-bridge.ts:66-82`）。InvoiceCandidate source の古い予定行は、正式化後の full payment / reversal / VOID と連動しない。

さらに `summarizeCashflowActualVsExpected` は、type ではなく `status='posted'` だけで actual と判定する。現在の full payment は `payment_received` に加え `payment_expected` も posted にするため、実績側まで重複し得る。予定行の消込状態を `posted` という実績状態で表すべきではなく、actual は `payment_received` / `payment_reversal` のような実績 type に限定すべきである。

### 6. `finance-event-identity.ts` はそのまま流用できない

`packages/shared/src/finance-event-identity.ts:1-28` の正本契約は `DomainEvent` の `PAYMENT_RECEIVED` / `RECEIVABLE_COLLECTED` 用であり、aggregate は Invoice に固定されている。ここで扱う予定債権・債務、representation、installment、candidate→invoice lineage は表現できない。

流用できるのは次の設計パターンである。

- tenant-bound な単射 encoding
- identity と保存 encoding の分離
- versioned payload metadata
- legacy / canonical の移行期間を決定的に照合する考え方

`makeCanonicalIdempotencyKey` や `DomainEventIdentity` を型を無視して直接使うのではなく、別の `CashflowObligationIdentity` 契約を作るべきである。

## 候補案の独立評価

### A. producer が canonical identity を付け、reader が dedup

評価: **方向は最良。ただし「重複表現を恒久保存し、reader dedup を正本にする」部分を修正する必要がある。**

良い点:

- identity を producer が決めるので、amount / dueAt の類似推定に依存しない
- InvoiceCandidate→Invoice、partial payment、VOID、reversal を transaction 内で明示的に遷移できる
- selector を純関数化できる
- 将来の分割払いでは schedule line 単位へ拡張できる

穴:

- 同じ key を JSON に入れるだけでは重複 insert を DB が止めない
- `finance-event-identity.ts` は DomainEvent identity であり、予定 cashflow identity ではない
- key があっても、どの representation を優先するか、残額・期日・status の正本が未定義なら重複排除は決定できない
- candidate と invoice に別 key を発行すると、同じ債権を2本に分裂させる
- full payment / reversal / VOID の逆遷移を producer 契約へ含めないと stale row が残る

修正版 A' では、reader dedup を常態化せず、producer が1つの `cashflow_expected` row を更新する。`payment_expected` からは `canonicalCashflowEventId` を参照できるようにするが、予測へは載せない。

### B. reader union: cashflow_expected ∪ 対を持たない payment_expected

評価: **移行アダプターとしては採用可能。恒久的な正本には不採用。**

安全な対応キーは、金額・期日ではなく次の exact lineage に限る。

1. 同一 tenant の `(sourceType, sourceId)`。これは PO の二表現に使える。
2. 同一 tenant の `InvoiceCandidate.invoiceId -> Invoice.id`。これは candidate→invoice に使える。
3. Invoice の `status`, `total`, `paidAmount`, `dueDate`。残額と active / inactive を決める。

移行 selector の優先規則は次のように固定する。

- PurchaseOrder: `cashflow_expected` のみ。`payment_expected` は除外
- 未正式化 InvoiceCandidate: candidate の `cashflow_expected`
- 正式化済み candidate: Invoice lifecycle を正本とし、candidate row は alias として扱う
- direct / Quote 由来 Invoice: `payment_expected` を legacy fallback として採用
- Invoice が PARTIALLY_PAID: amount は event の原額でなく Invoice の残額
- Invoice が PAID / VOID: expected set から除外
- `pending_send`: 現行契約どおり expected set へ入れない
- 未知の sourceType / identity conflict: 推測せず除外し、coverage incomplete を返す

落とし穴:

- lineage join と lifecycle 判定をすべての reader が同じように実装しなければ drift する
- raw row に `take:501` を掛けてから dedup すると、重複表現が枠を消費して canonical 501件目を失う。canonicalization 後に limit / truncated を決める必要がある
- 新 producer が増えるたび、sourceType whitelist と negative test を更新する必要がある
- identity conflict を黙って片方に寄せると、欠落または二重計上を隠す

### C. materialized / derived view

評価: **将来の本命候補だが、現時点の最小解ではない。**

専用 `CashflowObligation` / `CashflowScheduleLine` を持てば、tenant、direction、currency、original amount、remaining amount、dueAt、state、source aliases、installment を明示できる。immutable な会計 event と mutable な予測 read model も分離できる。

一方、DB view や新モデルは migration、backfill、dual write、整合監視、rollback を必要とする。Prisma からの扱いと refresh transaction も決める必要がある。これは Human Gate であり、F-R7-02 の thin slice としては大きすぎる。

アプリケーション内だけで derived view を作るなら、それは実質的に B の pure selector である。

## 推奨設計 A' の契約

### 1. logical identity

新しい純関数モジュールの概念形は次とする。

```ts
interface CashflowObligationIdentity {
  tenantId: string;
  kind: 'receivable' | 'payable';
  originType: 'InvoiceCandidate' | 'Invoice' | 'PurchaseOrder';
  originId: string;
  scheduleKey: string; // 現在は 'full'; 将来は installment ID
  v: 1;
}
```

key は `cf:v1:<encoded tenantId>:<kind>:<encoded originType>:<encoded originId>:<encoded scheduleKey>` のような単射形式にする。amount、dueAt、description、status は可変属性なので key に含めない。currency は1債権1通貨を不変条件にするか、将来複数通貨 leg を許すなら schedule identity に含める。

InvoiceCandidate から作った正本 row は formalize 後も同じ `FinanceEvent.id` と identity key を保持し、active alias だけ Invoice へ移す。direct / Quote 由来 Invoice は Invoice を origin にする。

`payload` の概念形:

```json
{
  "cashflowIdentity": {
    "v": 1,
    "role": "canonical_projection",
    "key": "cf:v1:...",
    "kind": "receivable",
    "scheduleKey": "full",
    "aliases": [
      { "sourceType": "InvoiceCandidate", "sourceId": "..." },
      { "sourceType": "Invoice", "sourceId": "..." }
    ]
  }
}
```

`payment_expected` 側には `role: 'operation_claim'` と `canonicalCashflowEventId` を保存できる。ただし JSON pointer は FK ではないため、reader はこれだけを盲信せず tenant と row role を再検証する。

### 2. 1 obligation = 1 projection row

現在の `FinanceEvent` は status や source を既に更新しており、完全な immutable event store ではない。したがって thin slice では次を許容する。

| 業務遷移 | canonical `cashflow_expected` |
|---|---|
| PO bridge | payable row を1件作成。PO の `payment_expected` は projection 対象外 |
| InvoiceCandidate bridge | receivable row を draft で1件作成 |
| Candidate formalize | 同じ row ID の source alias を Invoice へ移し、identity / lineage は維持 |
| Invoice send claim | `payment_expected(pending_send)` のみ。canonical row はまだ送信確定扱いにしない |
| Invoice send finalize | SENT CAS の勝者が同じ tx 内で canonical row を create / update。dueAt と remaining amount を同期し active にする |
| Partial payment | 同じ payment tx 内で amount を `max(total-paidSum,0)` へ更新 |
| Full payment | canonical row を expected set から外す。`posted` actual にはせず `ignored` 相当へ |
| Payment reversal | 同じ reversal tx 内で remaining amount を再導出し canonical row を再有効化 |
| Invoice VOID | 同じ VOID tx 内で canonical row を ignored にする |

全 writer は `tenantId` と `sourceType` まで指定する。現行 payment / VOID の `sourceId=invoiceId` だけの update は、型の異なる source ID が偶然一致したときの誤更新を避けるため `sourceType='Invoice'` も必要である。

### 3. transaction と lock

- PO: 既存 `(tenantId, sourceType, sourceId)` advisory xact lock を維持（`finance-bridge.ts:51-64`）
- Candidate formalize: Invoice / Receivable / candidate CAS / canonical row alias 更新を同じ transaction に含める
- Invoice send: SENT CAS + claim approved + canonical row update + Audit を finalize transaction に含める
- Payment / reversal / VOID: Invoice row lock / CAS と canonical remaining update を同じ transaction に含める
- 既存 row が0件なら create、1件なら update、2件以上なら任意の1件を選ばず conflict として rollback / coverage incomplete にする

schema unique がない期間の exactly-once は、これらの source lock と CAS による application invariant である。すべての producer が共通 tx helper を通ることが前提になる。

### 4. reader と純関数境界

DB query と計算を分ける。

1. tenant-scoped query で event、InvoiceCandidate→Invoice lineage、Invoice lifecycle を取得
2. DB 非依存の `selectCanonicalCashflowObligations(input)` が canonical rows と diagnostics を返す
3. `financeEventToCashflowLine` と `forecastCashflow` は現状のまま再利用

pure selector の戻り値には最低限、次を含める。

```ts
{
  rows: CanonicalCashflowRow[];
  conflicts: CashflowIdentityConflict[];
  unsupportedCount: number;
  coverageIncomplete: boolean;
}
```

`coverageIncomplete=true` のときは、現在の `truncated` と同様に「ショートなし」を断定しない。conflict を金額推定で自動解消しない。

actual 集計は別の純関数に分け、`payment_received` / `payment_reversal` のような actual type だけを数える。`cashflow_expected` / `payment_expected` が `posted` だから actual とみなす現在の規則は廃止する。

## 最小の安全な一歩（thin slice）

**最初の1本は schema / producer を変えず、pure canonical selector と全 expected reader の切替だけにする。**

理由:

- 既存の sent Invoice と candidate lineage を DB backfill なしで扱える
- DB 書込や migration を伴わず、rollback がコード差戻しだけで済む
- A' の producer を入れる前に canonical selection 契約を negative test で固定できる
- shortage card だけ直して unified card が二重のままになる drift を止められる

対象候補:

- `packages/shared/src/cashflow-obligation.ts`（純関数・新規）
- `packages/shared/src/__tests__/cashflow-obligation.test.ts`（純関数の否定テスト）
- `apps/web/lib/domains/finance/cashflow.ts`（3つの expected reader を共通 selector へ）
- production query を通す DB test / E2E evidence

移行 reader は direct Invoice の `payment_expected` を fallback として採用し、同 tenant の exact lineage で candidate representation と調停する。raw query の上限に達した時点で `coverageIncomplete` / `truncated` を true にし、false-safe を禁止する。

次の1本で producer を A' に寄せる。Invoice finalize / send / partial payment / full payment / reversal / VOID を一組として直し、新規データは単一 `cashflow_expected` へ収束させる。過去行 backfill は行わず、shadow comparison で件数・差額を確認してから別 Human Gate とする。

## 必須の否定テスト

### pure selector

1. 同一 tenant / PO / amount / dueAt の `payment_expected` + `cashflow_expected` は1行、outflow は1回だけ
2. 別 tenant が同じ sourceId / key を持っても混ざらない
3. 同額・同期限の別 Invoice は2行のまま（amount / dueAt dedup 禁止）
4. InvoiceCandidate→Invoice lineage の2表現は1行
5. direct / Quote 由来 Invoice の approved `payment_expected` は1行の inflow として残る
6. `pending_send` は入金予定に入らない
7. PARTIALLY_PAID は請求総額でなく残額だけ
8. PAID / VOID は予定0件
9. full payment 後の reversal は残額予定を再び1件にする
10. unknown sourceType、identity 2重、tenant mismatch は推測せず `coverageIncomplete`
11. canonicalization 前に raw duplicate が500件を埋めても、501件目の初ショートを「なし」と断定しない
12. 同日順序は canonicalization 後も outflow-first + id tie-break で決定的

### production writer / DB evidence

1. concurrent Invoice send 2本で provider 1回、claim 1行、canonical row 1行
2. finalize transaction fault で SENT / claim approved / canonical row / Audit が全 rollbackし、retryで1組
3. candidate formalize で新規 row を増やさず、同じ canonical row ID が Invoice alias へ移る
4. partial payment→full payment→reversal で remaining / active state が transaction と一致
5. VOID vs payment race で、勝者の Invoice stateとcanonical row stateが矛盾しない
6. PO の既存2イベントを残しても projection は1行
7. `getCashflowShortageProjection` と `getCashflowUnifiedData` の expected totals が同一 canonical set と一致

既存 `m1b_invoice_lifecycle_evidence.spec.ts:113-203` は provider / `payment_expected` / Audit の exactly-once は強く検証しているが、canonical cashflow row と forecast reader の結果を検証していない。`m1b_finance_bridge_idempotency_evidence.spec.ts:139-181` は PO の2表現を正しく固定しているが、予測で1行になる oracle がない。ここを追加しない限り F-R7-02 の再発を検出できない。

## rollback

1. selector-only thin slice は writer / schema を変えない。問題時は reader を旧 cashflow-only へ戻せる。
2. producer A' は reader 切替後に入れる。先に producer を入れると、旧 unified reader が Invoice の `cashflow_expected` と `payment_expected` を二重計上するため deploy 順を逆にしない。
3. producer rollout 中は legacy fallback と canonical row の shadow totals、identity conflict、unsupported source、coverage incomplete を tenant ごとに観測する（PII をログへ出さない）。
4. 過去データの破壊的 dedup / backfill は thin slice に含めない。必要なら dry-run 差分、tenant 件数、金額差分、復元手順を作り Human Gate とする。
5. schema unique / 新モデルへ進む場合は migration と rollback migration を別承認にする。

## リスクと Human Gate

### migration なしで残るリスク

- JSON identity は DB unique ではない
- producer が共通 helper を迂回すると重複可能
- 既存 legacy conflict は自動修復せず coverage incomplete になる
- `FinanceEvent` を mutable projection として使うため、将来 immutable ledger を求める場合は責務分離が必要

### Human Gate が必要なもの

- `FinanceEvent` への canonical key 列追加と unique index
- `CashflowObligation` / schedule line モデルの新設
- 過去行 backfill / dedup / destructive correction
- 本番DB migration、production rollout、実データ修復

## 採用条件

A' を採用する条件は次の6点である。

1. `payment_expected` を projection 正本として扱わないことを全 reader で統一する
2. candidate→invoice の同一 row / lineage を transaction 内で維持する
3. expected amount を Invoice の残額として更新する
4. full payment / reversal / VOID の対称遷移を同じ tx に含める
5. tenant scope と sourceType を全 query / update に含める
6. conflict / truncation / legacy coverage 不足時に「ショートなし」を断定しない

この条件を満たさず、単に `payment_expected` を union する修正、または amount / dueAt で dedup する修正は採用すべきでない。
