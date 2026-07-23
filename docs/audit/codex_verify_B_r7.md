# Codex B 独立監査 — Round 7（PR #117 / #119）

## 判定

**CHANGES_REQUIRED**

PR #117 は、指定された `getCashflowShortageProjection` の二重計上除去、負の opening の明示、500件超過検出、同一 `dueAt` の決定論化をサーバ側へ正しく実装している。資金繰りページも `currentlyNegative` と `truncated` を強く表示する。一方、朝礼は `truncated=true` を表示条件・文言の優先順位に組み込めておらず、取得できた500件の範囲だけで「資金ショートはありません」と断定する経路が残る。

PR #119 は通常データについて `Invoice.dealId` 直接経路と `Quote.dealId -> Invoice.quoteId` 経路をともに tenant scope 付きで確認している。しかし、VOID請求書を「請求書あり」に数えること、`INVOICE` stage の欠落と `DELIVERY` を完了扱いすること、200件上限のsilent truncation、保存済みfindingの案件名redaction迂回により、請求漏れの見逃し・誤検知・権限外表示が成立する。

## 固定条件

- Repository: `DREEXY-git/369`
- `git fetch origin main` 後の監査対象: `origin/main`
- Fixed main SHA: `a705db5c7752c0eca45f55aef4823a3f3256549c`
- PR #117 head SHA: `03df030ef3617cb53b10c1782a175a6050604906`
- PR #117 main integration commit: `7e9b5027fcbc1dab998757f548cbd5953f7bc127`
- PR #119 head SHA: `3634437d68f66f922c134188bdb2503928eb2c16`
- PR #119 main integration commit: `a705db5c7752c0eca45f55aef4823a3f3256549c`
- PR head と main integration commit の対象ファイル内容は一致（squash commitとの差分なし）
- Branch: `codex/verify-B-r7`
- 方法: source / schema / RBAC / production writer / tests の静的監査、既存pure unit testのread-only実行
- 実行結果: `packages/shared/src/__tests__/rules.test.ts` — **28 tests PASS**
- 安全境界: 実装修正なし。DB、本番、Secrets、外部送信、課金、main push/mergeには未接触

## PR #117 指定項目の検証

| 指摘 | 判定 | 根拠 |
|---|---|---|
| B-CF-01 | **PASS（指定されたprojection）** | `cashflow.ts:53-61` は `tenantId + type='cashflow_expected' + expected status + dueAt` のみ。`payment_expected` は projection に入らない |
| B-CF-02 | **PASS** | `cashflow.ts:69-75` が `currentlyNegative: opening < 0` を返す。資金繰りページは `page.tsx:50-67`、朝礼は `morning/page.tsx:198-210` で将来予測より先に現在マイナスを表示 |
| B-CF-03 | **PARTIAL / findingあり** | queryは501件取得して `truncated` を正しく検出し、資金繰りページも断定を避ける。しかし朝礼にfalse-safe分岐が残る（B-R7-01） |
| B-CF-05 | **PASS** | `cashflow.ts:62-64` は `dueAt asc, id asc`。DB取得順は決定的で、`forecastCashflow` のstable sortでも同一時刻の入力順が維持される |

## PR #119 指定観点の検証

| 観点 | 判定 | 根拠 |
|---|---|---|
| Invoice.dealId直接経路 | **通常系PASS** | `profit-leaks/page.tsx:70-74`。invoice queryにも `tenantId:t` がある |
| Quote経由 | **通常系PASS** | `profit-leaks/page.tsx:72-79`。QuoteとInvoiceをそれぞれ `tenantId:t` で絞り、quoteId集合からdealIdへ戻す |
| tenant境界 | **PASS** | Deal / Invoice / Quoteの全queryがactor tenantのscalar条件を持つ。nested relationの暗黙越境に依存しない |
| Invoice status | **findingあり** | VOIDを含む全statusを「請求書あり」に数える（B-R7-02） |
| stage選定 | **findingあり** | `INVOICE`を落とし、完了証拠のない`DELIVERY`を納品済み扱いする（B-R7-03） |
| take:200 | **findingあり** | 上限超過を検出・表示せず、未請求0件を断定できる（B-R7-04） |
| 案件名redaction | **ライブ経路のみPASS / 保存済み経路はfinding** | live findingは`deal:read`なしで汎用文言になるが、stored findingはraw titleのまま（B-R7-05） |

## Findings

### B-R7-01 — 朝礼は`truncated=true`でも「資金ショートはありません」と断定できる

- file:line:
  - `apps/web/app/(app)/reports/morning/page.tsx:133-135`
  - `apps/web/app/(app)/reports/morning/page.tsx:196-215`
  - `apps/web/lib/domains/finance/cashflow.ts:64-75`
- 重大度: **HIGH**
- なぜ実害か:
  - `showShortageAlert` は shortage日または先頭500件内の最低残高だけを見ており、`truncated` 自体を表示条件にしない。
  - 先頭500件が150万円以上で、501件目以降の大型支払で初めてショートする場合、朝礼カード自体が出ず、経営者へcoverage不足が伝わらない。
  - 先頭500件内の最低残高が150万円未満だが非負の場合はカードが出るものの、本文が「予測期間内に資金ショートはありません」と断定する。末尾の小さい「先頭500件で試算」は、この結論と矛盾する。
  - 資金繰りページではamber警告に修正済みのため、同一projectionを使う2画面で結論が不一致になる。
- 修正案:
  - `showShortageAlert` に `shortageProj.truncated` を含める。
  - 表示優先順位を `currentlyNegative -> shortageDate -> truncated -> low balance` とし、truncated時は「判定範囲不足」「ショートなしとは断定できない」とする。
  - 501件目で初ショートするfixtureについて、資金繰りページと朝礼の両方でfalse-safe文言が出ないUI/production wiring testを追加する。

### B-R7-02 — VOID請求書が存在すると実質未請求のDealを検知しない

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:70-79`
  - `packages/db/prisma/schema.prisma:74-82`
- 重大度: **HIGH**
- なぜ実害か:
  - direct経路・Quote経路のInvoice queryはいずれもstatus条件がないため、`VOID`だけが残るDealも`billedDealIds`へ入る。
  - VOIDは請求として無効で、回収可能な請求書がない。にもかかわらず請求漏れ候補から消えるため、売上回収の実漏れを見逃す。
  - 同じ問題は直接InvoiceとQuote由来Invoiceの双方で成立する。
- 修正案:
  - 両Invoice queryで少なくとも`status != VOID`を共通条件にする。
  - DRAFTを「請求書作成済み」とするか「未送付漏れ」として別警告にするか、ISSUED/SENT以降だけを請求済みとするかを業務契約として明示する。
  - direct/Quoteそれぞれについて、VOIDのみ・DRAFTのみ・ISSUED・SENT・PAIDのfixtureで検知契約を固定する。

### B-R7-03 — stage選定が`INVOICE`を見逃し、`DELIVERY`を納品完了と誤認する

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:61-68`
  - `packages/db/prisma/schema.prisma:60-72`
  - `apps/web/components/badges.tsx:44-55`
  - `apps/web/lib/domains/deals/deal-stage.ts:33-57`
- 重大度: **MED**
- なぜ実害か:
  - DealStageの順序は`CONTRACT -> DELIVERY -> INVOICE -> FOLLOW_UP`で、UIでも`INVOICE`は「請求」と明示される。それなのに検知対象は`DELIVERY/FOLLOW_UP`だけで、請求段階に進んだがInvoiceがない最も直接的な候補を除外する。
  - `DELIVERY`は現在stageでしかなく、納品完了日時・完了flagではない。stage更新coreは任意の有効enumへの変更を許し、完了証拠を要求しないため、納品作業中のDealを「納品済み」と誤検知できる。
  - 結果として、請求漏れのfalse-negativeと、まだ請求時期でない案件のfalse-positiveが同時に発生する。
- 修正案:
  - 最低限`INVOICE`を検知対象へ含める。
  - `DELIVERY`を納品済みと扱うなら、配送/イベント完了・納品完了日時・stage historyなど、完了を示す権威データを条件にする。証拠がない間は表示を「納品段階の未請求候補」と弱める。
  - CONTRACT/DELIVERY/INVOICE/FOLLOW_UPの各stageと完了証拠有無の表形式テストを追加する。

### B-R7-04 — `take:200`が201件目以降の請求漏れを無言で除外する

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:63-68`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:103-117`
- 重大度: **HIGH**
- なぜ実害か:
  - amount降順の先頭200 Dealしか調査せず、総対象数・打切り・最終coverageを返さない。
  - 上位200件がすべて請求済みで201件目が未請求なら、画面は「利益漏れは検知されていません」と表示できる。
  - 一部だけ検知された場合も件数と推定影響額が全件値に見え、未調査分を利用者が把握できない。
  - 同額Dealのtie-breakerもないため、200件境界の選択集合が決定的でない。
- 修正案:
  - DB側で`NOT EXISTS`相当の未請求判定とcount/aggregateを行うか、ページングして全対象を処理する。
  - 上限を残す場合は201件取得で`truncated`を検出し、対象総数・調査済み件数を表示して「検知なし」を断定しない。`id` tie-breakerも追加する。
  - 200件まで請求済み、201件目だけ未請求のfixtureを固定する。

### B-R7-05 — 保存済みunbilled findingが`deal:read`なしでも案件名を表示し、live findingとの重複も起こす

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:33-37`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:80-84`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:97-103`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:117-126`
  - `packages/shared/src/rbac.ts:97`
  - `packages/db/prisma/seed.ts:685-693`
- 重大度: **HIGH**
- なぜ実害か:
  - live unbilled findingだけは`canSeeDeals`で案件名を汎用文言へ置換するが、`storedViews`はDBの`title/detail`をそのまま表示する。
  - `EXTERNAL_EXPERT`は`finance:read`を持つ一方で`deal:read`を持たないため、このページへ入り保存済みfindingの実案件名を閲覧できる。seedにも実案件名を含むunbilled findingの保存経路が存在する。
  - dedupe keyが`type|title`なので、権限外ユーザーではstoredの実名titleとliveのredacted titleが一致せず、同一Dealが二重表示・二重加算される可能性がある。
- 修正案:
  - `storedViews`もtypeがunbilledかつ`!canSeeDeals`ならtitle/detail内の案件識別子をredactする。
  - 保存時の自由文titleではなく、`type + entityType + entityId`をcanonical dedupe keyにする。表示名は閲覧時の権限から導出する。
  - finance:readのみ / deal:readありの2roleで、stored+live同一Dealの非露出・単一表示・金額単一加算を検証する。

### B-R7-06 — production query・status・上限・redactionを通る否定テストがない

- file:line:
  - `packages/shared/src/__tests__/rules.test.ts:51-99`
  - `apps/web/lib/domains/finance/cashflow.ts:45-75`
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:61-102`
- 重大度: **MED**
- なぜ実害か:
  - PR #117/#119のmain統合差分にはテスト追加がない。
  - 既存28 unit testsはpureな`forecastCashflow`と、呼出し側が作った`unbilledDeals`配列を`detectProfitLeaks`へ渡すだけで、production queryを通らない。
  - そのためnegative opening、501件、朝礼truncated表示、direct/Quoteのstatus、201件目、tenant A/B、stored redactionを検出できず、今回のB-R7-01〜05がgreenのまま残る。
- 修正案:
  - read modelをDB queryとpure classificationへ分離し、productionと同じwhere/order/take契約をテストする。
  - #117はnegative opening・500/501件・同一dueAt・2画面表示、#119はdirect/Quote×status・stage・200/201件・tenant・role別redactionを固定fixture化する。

## Findingなしとした項目

- `getCashflowShortageProjection`は`payment_expected`を読まないため、指定されたprojection内の2type二重計上は解消している。
- CashAccount / FinanceEvent queryはいずれも`tenantId`で固定され、対象query内にtenant越境readはない。
- `opening < 0`は`currentlyNegative`として返り、資金繰りページと朝礼の両方で将来shortageより先に「現在マイナス」を表示する。
- 501件取得による`truncated`検出自体は正しい。資金繰りページはgreen badgeを避け、明示的に「ショートなしと断定できない」と表示する。
- `orderBy: [{dueAt:'asc'}, {id:'asc'}]`により同一timestampのDB取得順は決定的である。
- #119の通常のInvoice.dealId直接経路とQuote経路は両方実装され、各queryに`tenantId:t`がある。
- live unbilled findingの案件名は`deal:read`非保有時に汎用文言へ置換され、entityIdはReact keyにだけ使用され画面本文には出ない。

## 修正優先順

1. B-R7-01: 朝礼のtruncated false-safeを止める。
2. B-R7-02 / B-R7-04: VOIDと200件上限による請求漏れの見逃しを止める。
3. B-R7-05: 保存済みfindingのdeal名越境と二重加算を止める。
4. B-R7-03: stageを納品完了の権威データへ整合させる。
5. B-R7-06: production配線の否定テストを固定する。

## 固定SHA境界

この判定は `a705db5c7752c0eca45f55aef4823a3f3256549c` 限定である。`origin/main`、PR head、または対象ファイルが動いた場合は再監査が必要。
