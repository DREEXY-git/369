# Codex 独立再監査 — PR #113 資金ショート予兆

## 判定

**CHANGES_REQUIRED**

`CashAccount`と`FinanceEvent`の直接queryはいずれも`tenantId`で固定され、`direction`の符号対応、`dueAt=null`除外、負値0丸めはpure関数の契約どおりである。しかし、productionのFinance Bridgeは同一支払を`payment_expected`と`cashflow_expected`の2行で表現し、請求候補から正式請求へ進む経路でも旧`cashflow_expected`を残したまま新しい`payment_expected`を作る。PR #113のprojectionは両typeを同時に読むため、発注支払と請求入金の双方を実際に二重計上する。

また、openingが既に負でも予定行がなければ「ショート予測日なし」になり、500件上限、過去予定の全除外、現在残高と当日0時からの予定を混ぜるas-of不整合、同日行の非決定的順序によってfalse-safeな表示が成立する。画面の「ライブ」「ショートなし」は現在のcoverageとデータ鮮度を超えた表現である。

## 固定条件

- Repository: `DREEXY-git/369`
- 監査対象: fetch後の`origin/main`
- Fixed SHA: `9bff4e91da89ea7739eb72d647671e7c85350783`
- PR #113 merge SHA: `5f04c384cde96077c28307b26283e599fc941a09`
- PR #113 head SHA: `84071ab5bc9bd10ee54c263231977df3371d6b2d`
- `5f04c38..9bff4e9`の後続差分は`apps/web/app/(app)/finance/profit-leaks/page.tsx`だけで、今回の監査対象3ファイルと追加unit testは変更されていない
- 対象branch: `codex/reaudit-B-cashflow`
- 方法: source / schema / production callsite / testsの静的監査とpure関数のread-only境界再現
- 実行した検証: `packages/shared/src/__tests__/rules.test.ts`（28 tests PASS）
- 境界: 実装変更なし。DB、E2E、本番、Secrets、外部送信、課金には未接触

## 指定観点の確認結果

| 観点 | 確認結果 |
|---|---|
| opening | `CashAccount.findMany({tenantId})`の全balanceを合計。直接tenant越境なし。ただし負opening判定とデータ鮮度はB-CF-02/06 |
| expected events | `FinanceEvent`を`tenantId + type + expected status + dueAt`で限定。posted/ignored/pending_sendは除外 |
| direction / amount | `inflow`は加算、`outflow`は減算。負値は0。通常の正数では符号ミスなし |
| `dueAt=null` | DBの`dueAt >= todayStart`で除外され、pure関数もnullを返す。二重防御あり |
| Decimal変換 | `toNumber`はPrisma Decimalの`toNumber()`を使用し非finiteを0へfallback。通常のJPY範囲は動作するが安全整数上限の監視はない |
| tenant境界 | account/eventともactor tenantのscalar条件。nested relationを読まず、今回対象内に越境経路なし |
| payment_expected追加 | `cashflow_expected`とのlogical identity調停がなく、productionで二重計上が成立（B-CF-01） |
| 表示 | 末尾に非確定注記はあるが、green badgeと「ライブ」「なし」がcoverage/freshnessを過大表示（B-CF-03/06） |

## Findings

### B-CF-01 — 同一の支払・入金を`payment_expected`と`cashflow_expected`で二重計上する

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:47-65`
  - `apps/web/lib/domains/finance/finance-bridge.ts:321,333-355,387`
  - `apps/web/lib/domains/finance/formalize.ts:118-169`
  - `apps/web/lib/domains/finance/invoice-send.ts:124-145,181-190`
  - `apps/web/lib/domains/finance/payments.ts:157-166`
  - `apps/web/lib/invoice-void-bridge.ts:68-81`
- 種別 (class): **logical identity衝突 / 二重計上 / lifecycle不整合**
- なぜ実害か:
  - PurchaseOrder bridgeは同一PO・同額・同dueAtの`payment_expected(outflow)`と`cashflow_expected(outflow)`を同一transactionで作る。projectionは両typeを読むため、発注支払を必ず2倍差し引く。
  - Event/Damage bridgeはInvoiceCandidateをsourceとする`cashflow_expected(inflow)`を作る。候補を正式Invoiceへ変換してもこの行を無効化・移管しない。
  - Invoice送信finalizeはInvoiceをsourceとする`payment_expected(inflow)`をapprovedにするため、送信後は旧candidate行と新invoice行の両方が加算される。`pending_send`中は新行だけ除外され、approved化した瞬間に二重になる。
  - 全額入金とInvoice VOIDは`sourceId=invoiceId`だけをposted/ignoredにする。`sourceId=invoiceCandidateId`の旧`cashflow_expected`はdraftのまま残り、入金済み・無効化済み請求まで将来入金として加算し続ける。
  - その結果、POでは偽の資金ショートを出し、Invoiceでは偽の余裕を作る。どちらも経営判断を逆方向に誤らせる。
- 重大度: **HIGH**
- 修正案:
  - 1つの資金予定にcanonicalなlogical identityを定義し、`cashflow_expected`と`payment_expected`を併存させない。
  - candidate→Invoiceでは既存予定を同一transactionでInvoice identityへ移管するか旧行をignoredにしてから新行を有効化する。
  - PO bridgeは二つの表現のどちらか一方だけをprojection対象にする。query時のtype除外だけでなくproducer契約を統一する。
  - bridge→formalize→send→partial/full payment→VOIDの各段階で、logical予定金額が常に1本分だけになるproduction配線テストを追加する。

### B-CF-02 — openingが既に負でも「資金ショート予測日なし」になる

- file:line:
  - `packages/shared/src/finance.ts:88-102`
  - `apps/web/app/(app)/finance/cashflow/page.tsx:49-66`
- 種別 (class): **初期状態境界 / false-negative / UI判定不整合**
- なぜ実害か:
  - `forecastCashflow`は`minBalance=opening`にするが、`shortageDate`はfuture lineをmapする時だけ設定する。
  - `opening=-100`かつ予定0件では`minBalance=-100`なのに`shortageDate=null`となる。画面は「資金ショート予測日 なし」をgreen表示し、「予定がまだありません」と案内する。
  - openingが負のまま最初のfuture eventを迎える場合も、実際は現在ショート中なのにそのfuture dueAtを初ショート日として表示する。
- 重大度: **HIGH**
- 修正案:
  - forecast契約へ`asOf`または`openingShortage`を追加し、opening<0を現在時点のショートとして返す。
  - UIは`minBalance<0`と`shortageDate`の両方を判定し、現在ショートと将来予兆を分ける。
  - negative/zero opening × empty/future linesの否定テストを追加する。

### B-CF-03 — `take:500`が501件目以降を無言で捨て、greenの「ショートなし」を出せる

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:47-65`
  - `apps/web/app/(app)/finance/cashflow/page.tsx:49-58,85-86`
- 種別 (class): **bounded read / incomplete forecast / false-safe表示**
- なぜ実害か:
  - queryはdueAt昇順の先頭500件だけを予測へ渡し、総件数・打切り有無・最終対象日を返さない。
  - 501件目の大型outflowで初めて残高が負になる場合、projectionは「ショートなし」と判定する。
  - `lineCount`は取得できた件数なので最大500を「対象の予定 500件」と表示し、利用者は後続予定が除外されたことを判断できない。
  - UIの「全N件の予定を予測に反映」も、DB全件ではなく切り捨て後のN件についてだけ真である。
- 重大度: **HIGH**
- 修正案:
  - cursor paginationで全対象を読むか、DB側で日次集計して全期間を漏れなくforecastへ渡す。
  - 少なくとも`totalMatched/truncated/throughDate`を返し、truncated時は「ショートなし」を表示せずcoverage不足として警告する。
  - 500件までは黒字、501件目で赤字になるfixtureを固定する。

### B-CF-04 — current openingに当日0時以降を再加算し、前日以前の未決予定は全除外する

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:39-53`
  - `packages/db/prisma/schema.prisma:969-989,1051-1057`
- 種別 (class): **as-of不整合 / 過去予定欠落 / 時計・timezone依存**
- なぜ実害か:
  - openingは「現在の現預金」とされる一方、event windowは`now`ではなくserver process timezoneの当日0時から始まる。
  - 当日午前に実際の口座残高へ反映済みでもFinanceEventのstatus反映が遅れている予定を、午後のcurrent openingへもう一度加減算できる。
  - 前日以前のexpected eventは未入金・未払いでも一律除外される。overdue outflowを落とすと資金ショートを見逃し、overdue inflowを落とす場合と安全側/危険側が非対称になる。
  - `setHours(0,0,0,0)`と表示側`Intl.DateTimeFormat`はいずれもtenantの業務timezoneを固定せず、UTC/JST境界で対象日がずれる。
- 重大度: **MED**
- 修正案:
  - 「残高as-of」と「予定cutoff」を同じ時点に固定する。current balanceならfuture=`dueAt>=asOf`、start-of-day balanceなら当日全予定という契約にする。
  - 過去dueのexpectedは今日へ繰越すか、overdue bucketとして残高予測・警告に明示的に含める。
  - tenant/business timezoneを明示し、23:59/00:00、前日overdue、当日既反映の境界テストを追加する。

### B-CF-05 — 同日入出金の順序だけでショート判定が反転する

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:47-56`
  - `packages/shared/src/finance.ts:88-100`
  - `apps/web/app/(app)/finance/cashflow/page.tsx:68-80`
- 種別 (class): **非決定的ordering / 日次粒度不整合**
- なぜ実害か:
  - DBのorderは`dueAt asc`だけで、同一dueAtのtie-breakerがない。pure関数も同じdateなら入力順をそのまま使う。
  - opening=0、同日にinflow=100とoutflow=100がある場合、inflow先ならショートなし、outflow先なら一時-100でショートありになる。
  - UIは時刻を表示せず日付単位なので、順序差を利用者が検証できない。同じDB集合から実行計画・挿入順で結論が変わり得る。
- 重大度: **MED**
- 修正案:
  - 日次予測なら同一業務日を`sum(inflow)-sum(outflow)`へ集約して1行にする。
  - intra-day liquidityを扱うならdueAt時刻とstable tie-breakerを定義し、保守的にoutflow-first等の契約をUIにも示す。
  - 同日逆順で結果が不変になるテストを追加する。

### B-CF-06 — 「実データ・ライブ」「ショートなし」が鮮度・status・予測期間を過大表示する

- file:line:
  - `apps/web/app/(app)/finance/cashflow/page.tsx:25-31,45-66,85-86`
  - `apps/web/lib/domains/finance/cashflow.ts:45-56`
  - `packages/db/prisma/schema.prisma:1051-1057`
  - `packages/db/prisma/seed.ts:366`
- 種別 (class): **リスクコミュニケーション / data freshness / confidence欠落**
- なぜ実害か:
  - repo内で`CashAccount`を書き込むproduction経路は確認できず、seed作成とreadだけである。modelにも`updatedAt/asOf`がなく、openingを「現在」「ライブ」と検証できない。
  - projectionはdraft、pending_approval、approvedを同じ確度で合算する。未承認のdraft inflowだけでgreenの「予測期間内 ショートなし」にできる。
  - 予測終了日を表示せず、500件上限やdueAtなし・overdue除外も示さないため、「なし」が全将来・全予定を確認した結論に見える。
  - 最下部の小さい「確定ではありません」注記だけでは、カード見出し・green badge・KPIの強い断定を相殺できない。
- 重大度: **MED**
- 修正案:
  - 「CashAccount登録残高」「取得時点」「対象期間」「status別内訳」「除外件数」をカード上部に表示する。
  - draft inflowを除く保守scenarioと全予定scenarioを分け、coverage不足時はgreenの安全判定を出さない。
  - 「ショートなし」ではなく「取得できた予定の範囲では検出なし」と表現する。

### B-CF-07 — DecimalをNumberへ落とした後の合計に安全整数・精度境界がない

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:59-65`
  - `apps/web/lib/utils.ts:8-13`
  - `packages/shared/src/finance.ts:79-83,88-100`
  - `packages/db/prisma/schema.prisma:976,1055`
- 種別 (class): **numeric precision / Decimal→number境界**
- なぜ実害か:
  - 各値は`Decimal(16,2)`だが、DB集計前にJS Numberへ変換し、account全件と最大500 eventをNumber加算する。
  - `toNumber`はfiniteだけを検査し、`Number.isSafeInteger`や総和overflow/precision lossを検出しない。schema上許される大額を複数合算するとJPY単位の安全整数範囲を超え、ショート閾値付近の比較が丸め誤差で変わり得る。
  - `formatJpy`は最後に整数丸めするため、内部誤差を画面上で発見できない。
- 重大度: **LOW**
- 修正案:
  - DB Decimalまたはminor-unit bigintで集計・running balanceを行い、表示時だけ安全にformatする。
  - Numberを維持する場合は入力・累積値へsafe range assertionを置き、超過時は安全判定を返さない。

### B-CF-08 — unit testがproduction queryと主要negative境界を通らない

- file:line:
  - `packages/shared/src/__tests__/rules.test.ts:51-85`
  - `apps/web/lib/domains/finance/cashflow.ts:39-65`
- 種別 (class): **evidence gap / production wiring未検証**
- なぜ実害か:
  - 追加テストは手作りの単一type行をpure関数へ渡すだけで、`getCashflowShortageProjection`を呼ばない。
  - POの2type併存、candidate→Invoice lifecycle、paid/VOID後のstale row、tenant isolation、negative opening、501件目、overdue、timezone、同日順序を検出できない。
  - そのため28 unit testsがgreenでもB-CF-01〜07が残る。
- 重大度: **MED**
- 修正案:
  - production read modelをdependency injection可能なcoreへ分け、DB query結果を含めて検証する。
  - 少なくともcanonical identity lifecycle、tenant A/B、negative opening、501件、同日逆順、JST日境界の否定テストを追加する。

## findingなしとした項目

- `CashAccount`と`FinanceEvent`はどちらも`tenantId`条件があり、対象query内にnested relationやID単独readはない。
- `financeEventToCashflowLine`は正の`inflow`を加算側、正の`outflow`を減算側へ正しく写像する。
- 負amountはdocument/testどおり0へ丸められ、呼出し側`toNumber`も非finiteを0へする。ただし不正データを黙って除外する運用監視は別途必要。
- `dueAt=null`はDB filterとpure関数の双方で除外される。
- `pending_send`はexpected status集合に含まれないため、Invoice送信finalize前の新`payment_expected`はprojectionへ入らない。問題はapproved後に旧`cashflow_expected`と併存する点である。
- pageは既存の`finance:read`権限を通過した後だけprojectionを取得する。

## 修正優先順

1. B-CF-01: cashflow予定のcanonical logical identityとlifecycleを一本化し、二重・stale計上を止める。
2. B-CF-02/03: negative openingと500件打切りでfalse-safeを出さない。
3. B-CF-04/05: as-of、overdue、timezone、同日orderingを決定論的にする。
4. B-CF-06/08: coverage・鮮度・status確度を表示し、production配線のnegative evidenceを追加する。
5. B-CF-07: 金額演算のDecimal/minor-unit境界を固定する。

## 固定SHA境界

この判定は`9bff4e91da89ea7739eb72d647671e7c85350783`限定である。`origin/main`または対象3ファイルが動いた場合は再監査が必要。
