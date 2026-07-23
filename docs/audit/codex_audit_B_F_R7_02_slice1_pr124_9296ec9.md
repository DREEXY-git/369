# F-R7-02 slice1 独立監査 — canonical cashflow selector

- 対象 PR: #124
- 対象 branch: `claude/f-r7-02-cashflow-canonical-v1`
- 固定 head: `9296ec9435c0d280f67586c1fb5c9b9bbe1c7e0d`
- merge-base: `989ab677e827915961353aaca5e7ca1606a95e87`
- 監査時の main: `42d8c123efd9b4edda8e61d19113ba08aab6cbdd`（PR #124 merge commit）
- 監査日: 2026-07-23 (Asia/Tokyo)
- 総合判定: **CHANGES_REQUIRED**

PR #124 は監査中に main へ merge された。固定 head と main の対象6ファイルの blob SHA はすべて一致しているため、以下の finding は merge 済み実装にもそのまま適用される。main、DB、本番、Secrets、外部送信、課金には触れていない。

## 要約

正常データに対する slice1 の中核は機能している。

- FinanceEvent / InvoiceCandidate / Invoice / CashAccount の production query はすべて `tenantId` スコープ
- PO の `cashflow_expected + payment_expected` は1行へ収束
- direct / Quote 由来 Invoice の `payment_expected` は予測へ入る
- candidate→invoice は lineage で1行へ収束
- PARTIALLY_PAID は残額、PAID / VOID は予定から除外
- `truncated` は `coverageIncomplete` に包含
- morning は shortage が無い場合、coverage不足を「判定範囲不足」として表示

ただし、不確実な入金を金額に残すため実際のショートを隠せること、cashflow画面が coverage不足中も緑色で「予測日なし」と断定すること、同一ページの他2 reader が非canonicalのままで金額が矛盾することから PASS にはできない。

## Findings

### B-S1-01 — HIGH — lifecycle / lineage 不明の inflow を加算し、実際のショートを隠せる

- 根拠: `packages/shared/src/cashflow-obligation.ts:161-175`
- 関連 query: `apps/web/lib/domains/finance/cashflow.ts:84-99`
- 現在のテスト契約: `packages/shared/src/__tests__/cashflow_obligation.test.ts:139-148`

Invoice event に対応する tenant 内 Invoice が取れない場合、selector は `coverageIncomplete=true` にするだけで、event の原額を canonical row に残す。未解決行が inflow なら、PAID / VOID / 部分入金済みか確認できない金額を将来残高へ足すため、危険方向の過大計上になる。

実行した再現 fixture:

- opening: 1,000円
- lifecycle が取れない Invoice inflow: 9,000円
- 翌日の確定 outflow: 5,000円

selector は9,000円を残し、`coverageIncomplete=true` ではあるが `forecastCashflow` は `shortageDate=null` / `minBalance=1,000` を返した。未確定 inflow を除けば残高は -4,000円となり、ショートする。つまり coverage flag だけでは予測値そのものの偽の余裕を止められない。

さらに caller は `invoiceId != null` の InvoiceCandidate だけを取得し、selector には link の配列しか渡さない。そのため次を区別できない。

1. tenant 内に存在し、まだ正式化されていない candidate
2. tenant 内に存在しない orphan / tenant不整合の candidate source

後者も `cand:<id>` の通常 inflow として採用され、こちらは `coverageIncomplete=false` になった。値の越境漏洩はないが、親不在の予定を確定入金のように数える。

修正案:

1. Invoice lifecycle 不明時は direction-aware に処理する。未確定 inflow は row から除外、未確定 outflow は保守的に残し、どちらも `coverageIncomplete=true`。
2. caller は candidate IDs に対する全行を `tenantId` 付きで取得し、`invoiceId: null` の実在 candidate と「tenant 内に candidate がない」を区別して selector へ渡す。
3. orphan candidate の inflow は除外＋coverage不足。金額を推定しない。
4. 現在の「lifecycle欠落でも原額を載せる」unit testを危険方向の否定テストへ反転する。

必要な否定テスト:

- lifecycle 不明 inflow + 後続 outflow で、inflowを加算せず `coverageIncomplete=true`、false-safe の `shortageDate=null` にならない
- lifecycle 不明 outflow は除外せず保守的に残す
- candidate row 不在と、実在する未正式化 candidate を区別する
- tenant A event が tenant B candidate / Invoice ID を指しても金額を採用しない

### B-S1-02 — HIGH — coverageIncomplete 中も主要Statが緑色で「予測日なし」と断定する

- 根拠: `apps/web/app/(app)/finance/cashflow/page.tsx:54-58`
- 矛盾する補助表示: `apps/web/app/(app)/finance/cashflow/page.tsx:70-80`

カードのBadgeと警告文は `coverageIncomplete` を見るようになったが、「資金ショート予測日」Statは shortageDate が null なら無条件で `なし`、toneも `emerald` のままである。ユーザーが最初に読むKPIが、直下の「ショートなしと断定できない」と矛盾する。

また、unsupported / conflict のため全行が除外された場合は `lineCount===0` となり、「今日以降の予定入出金がまだありません」と表示する。実際には予定は存在するが判定不能なので事実と異なる。

修正案:

- `coverageIncomplete && shortageDate == null` は Stat を `判定不能` / amber にする
- `lineCount===0 && coverageIncomplete` は空状態を「予定なし」ではなく「一部予定を判定できない」へ分岐
- `coverageIncomplete` を含む view-model の純関数またはcomponent testを追加し、`なし` / green が出ないことを固定

morning側の `currentlyNegative → shortageDate → coverageIncomplete → low balance` の順序と、shortage無し・coverage不足時の文言は PASS。

### B-S1-03 — HIGH — unified / bridge reader が非canonicalのままで、同一ページに矛盾する予定額を表示する

- `getCashflowBridgeData`: `apps/web/lib/domains/finance/cashflow.ts:124-160`
- `getCashflowUnifiedData`: `apps/web/lib/domains/finance/cashflow.ts:195-209`
- raw集計: `packages/shared/src/finance.ts:401-429`
- 同一ページの表示: `apps/web/app/(app)/finance/cashflow/page.tsx:130-175`

live shortage cardだけが selector を通り、下段2カードは旧集計のままである。

- PO: live projection は outflow 1回だが、unified は `cashflow_expected` と `payment_expected` の両方を予定として加算し2倍
- candidate由来 Invoice: live projection は lineage で1行だが、unified は candidate cashflow と Invoice payment を二重加算
- PARTIALLY_PAID: live projection は残額だが、bridgeは candidate原額、unifiedは原額の複数表現
- PAID / VOID: live projection は除外する一方、bridgeは source が candidateのdraft rowを引き続き表示し得る
- full payment: `payment_expected` を `posted` にする既存writerとstatusだけでactual判定する既存summaryの組合せにより、`payment_received` と実績を二重加算し得る

これは単なる内部driftではなく、同じ資金繰りページに異なる「入金予定・支払予定・差引予定」を並べる実害がある。slice2へ回すなら、少なくとも非canonicalカードを意思決定KPIとして表示し続けない境界が必要である。

修正案:

1. expected側は3 readerとも同じ canonical selection resultを使う。
2. actual側は statusだけでなく actual type (`payment_received` / `payment_reversal`) に限定する。
3. 一度に切り替えない場合は、旧cardを明確に「raw bridge events（重複・残額未調停）」と表示し、合計KPI・警告には使わない。
4. 同一 fixture に対し、shortage / bridge / unified の canonical expected totalsが一致するproduction-path testを追加する。

## Tenant boundary

現行 slice1 の query は PASS。

- CashAccount: `where: { tenantId }`
- FinanceEvent: `tenantId` + expected types/status/dueAt
- InvoiceCandidate: `tenantId` + candidate IDs
- Invoice: `tenantId` + invoice IDs

selector key自体に tenantId は含まれないが、selectorへ渡す集合がtenant単位に閉じているため、現呼出し経路で別tenant同士がgroup化されることはない。InvoiceCandidateが別tenant Invoice IDを参照していても Invoice queryは取得せず、値の越境はしない。ただし B-S1-01 のとおり、その場合に自tenant eventの未確定inflowを採用する安全性問題は残る。

## 正常経路の確認

| 観点 | 判定 | 根拠 |
|---|---|---|
| PO二重排除 | PASS | `po:<sourceId>` group、cashflow優先 |
| direct / Quote Invoice入金 | PASS | `inv:<sourceId>` payment fallback + Invoice残額 |
| candidate→invoice | PASS | tenant-scoped `InvoiceCandidate.invoiceId` を `inv:` aliasへ |
| 部分入金 | PASS（lifecycle取得時） | `max(total-paidAmount, 0)` |
| PAID / VOID | PASS（lifecycle取得時） | terminal status除外 |
| direction競合 | PASS | row除外 + conflict + coverage不足 |
| raw 501件目 | PASS（断定防止） | raw take 501、truncatedをcoverageへ包含 |
| cashflow画面 fail-safe | FAIL | B-S1-02 |
| morning fail-safe | PASS | coverage不足をalert条件・文言へ反映 |

## A' 採用条件6点の到達状況

| 条件 | slice1判定 | slice2 / 残作業 |
|---|---|---|
| 1. `payment_expected` をprojection正本にしない | 部分達成 | shortage readerではcashflow優先・Invoice lifecycleで補正。ただしdirect Invoiceのlegacy fallbackとunified raw集計が残る |
| 2. candidate→invoice の同一row / lineage維持 | reader aliasのみ達成 | producerで同じ canonical rowをformalize tx内に引き継ぐ作業は未実施 |
| 3. expected amountをInvoice残額へ | shortage readerで達成 | bridge/unifiedとproducer canonical rowは未対応 |
| 4. full payment / reversal / VOID の対称遷移 | 未達 | direct Invoiceはfull paymentでpayment eventがpostedになり、reversal後もexpected queryへ戻らない。producer slice2で再有効化が必要 |
| 5. tenant scope + sourceType | readerは達成 | payment / VOID writerのupdateに `sourceType='Invoice'` を加える作業はslice2 |
| 6. conflict / truncation / coverage不足時に「なし」を断定しない | 未達 | selector flagとmorningは達成。cashflow Stat / empty stateはB-S1-02で未達 |

## 検証結果

- `packages/shared/src/__tests__/cashflow_obligation.test.ts`: **13 / 13 PASS**
- `packages/shared` TypeScript `--noEmit`: **PASS**
- target diff `git diff --check`: **PASS**
- DB / migration / seed / E2E / external provider: **未実行**

unit 13件は正常経路の純関数契約として有効。ただしproduction query、tenant不整合candidate、UIのcoverage表示、3 readerの合計一致を通すテストはない。特に lifecycle欠落テストは現在の危険な「原額inflowを残す」挙動を期待値として固定しているため、B-S1-01の修正と同時に更新が必要。

## fixed-head verdict

`9296ec9435c0d280f67586c1fb5c9b9bbe1c7e0d` 限定で **CHANGES_REQUIRED**。

最小修正順:

1. lifecycle / candidate存在不明のinflowを予測額から除外し、outflowは保守的に維持
2. cashflow画面のStatとempty stateをcoverage-awareにする
3. unified / bridgeを同じcanonical selectorへ寄せる、または旧合計KPIを一時的に意思決定表示から外す
4. producer slice2でcanonical row、残額、full payment / reversal / VOID、sourceType条件をtransaction内で対称化

headが動いた場合、この判定は失効する。
