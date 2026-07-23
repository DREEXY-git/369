# Codex F 横断回帰監査 — round-6 修正 + PR #119

## 判定

**CHANGES_REQUIRED**

round-6 で直接追加・変更された主要 read path の root `tenantId` 条件と、ページ先頭の権限 gate は維持されている。C-LM-01、D-REF-01/02、E-01、B-CF-02、G-AI-04 と、ライブ生成する顧客名・案件名の redaction は source 上で有効である。

一方、保存済み `ProfitLeakFinding.title` が redaction を迂回し、権限外の顧客名・案件名を表示できる。さらに資金ショート予測は Invoice の canonical な `payment_expected` 入金を全除外し、朝礼では 500 件打切り自体を非表示にできる。同日入出金も ID 順で結論が変わる。朝礼の既存 nested `CampaignMetric` には child tenant scope がなく、PR #119 は `VOID` 請求書を「請求済み」と扱う。したがって現 SHA を round-7 回帰監査の PASS にはできない。

## 固定条件

- Repository: `DREEXY-git/369`
- 監査日: 2026-07-23 (JST)
- 監査対象: fetch 後の `origin/main`
- Fixed SHA: `a705db5c7752c0eca45f55aef4823a3f3256549c`
- 対象 branch: `codex/verify-F-r7`
- 対象差分: PR #116（round-6 C/D/E）、#117（B-CF）、#118（G-AI-03/04）、#119（請求漏れ検知）を含む現 main
- 方法: source / schema / production writer / pure function / tests の静的監査。DB・本番・外部 I/O は未実行
- ローカル targeted tests: `lead_stall.test.ts` 7、`referral.test.ts` 11、`referral_record.test.ts` 14、`rules.test.ts` 28、合計 **60 tests PASS**
- GitHub exact-head CI: #116〜#119 はそれぞれ stage1 / stage2_integration / stage3_e2e / release_gate が success

## Findings

### F-R7-01 — 保存済み利益漏れ finding が顧客名・案件名の redaction を迂回し、同一案件を二重加算できる

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:33-37,57-59,80-84,97-104`
  - `packages/db/prisma/seed.ts:685-693`
  - `packages/shared/src/finance.ts:161-177`
- 種別: **権限/機密ラベル迂回・PII/案件識別情報露出・過大計上**
- なぜ実害か:
  - #118/#119 のライブ経路は、顧客名を `customer:read + canSeeCustomerLabel`、案件名を `deal:read` で伏せる。しかし `stored` は `finance:read` だけで取得し、保存済み `title` を無条件に HTML へ出す。
  - seed は実際に `請求漏れ候補: <Deal.title>` と `回収遅延: <Customer.name>` を `ProfitLeakFinding.title` へ保存する。`EXTERNAL_EXPERT` は `finance:read` を持つが `customer:read` / `deal:read` を持たないため、ライブ側を伏せても保存済み行から名前を読める。
  - dedupe key が `type + title` のため、同じ案件でも保存済み実名 title と権限外向け伏字 title は一致しない。両行が残り、検知件数と推定影響額も二重加算される。
- 重大度: **HIGH**
- 修正案:
  - 表示用文字列を保存時に固定せず、`type/entityId` から viewer の権限・label を通した view model を都度生成する。既存行も backfill または表示時 redaction の対象にする。
  - 顧客/案件を解決できない保存済み行は固定の安全文言へ落とし、dedupe は表示 title ではなく tenant 内の安定した logical identity（`type + entityId` 等）で行う。
  - `EXTERNAL_EXPERT` と label-denied role の HTML に顧客名/案件名が無く、同一 entity の金額が一度だけ集計される negative test を追加する。

### F-R7-02 — B-CF-01 の type 全除外で、送付済み Invoice の入金予定が資金予測から消える

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:53-65`
  - `apps/web/lib/domains/finance/invoice-send.ts:124-145,181-190`
  - `apps/web/lib/domains/finance/finance-bridge.ts:319-321,349-354`
- 種別: **logical identity 調停不足・入金予定の過少計上・lifecycle 不整合**
- なぜ実害か:
  - #117 は PO の `payment_expected + cashflow_expected` 二重計上を避けるため、projection を `type='cashflow_expected'` だけにした。
  - しかし production の Invoice send は Invoice を source とする `payment_expected(inflow)` だけを作り、finalize で `approved` にする。対応する Invoice source の `cashflow_expected` は作らないため、正式な請求入金が projection へ一件も入らない。
  - candidate 由来の旧 `cashflow_expected` が残る場合も、Invoice の支払・VOID lifecycle と identity が異なるため、最新の正式請求状態を表す canonical row にはならない。結果は偽の資金不足、または入金済み/VOID 後も古い候補を残す stale forecast になる。
- 重大度: **HIGH**
- 修正案:
  - query で type を丸ごと捨てず、資金予定の canonical logical identity と candidate→Invoice→payment/VOID の状態遷移を producer 側で一本化する。
  - 暫定 read model でも Invoice の有効な `payment_expected` を含めつつ、PO の二重表現と candidate の旧行を source-aware に一度だけ選ぶ。
  - PO、candidate→Invoice、send、partial/full payment、VOID を通じて logical 予定が常に 0 または 1 本になる production wiring test を追加する。

### F-R7-03 — 501 件目以降を切り捨てても、朝礼は coverage 不足を完全に隠せる

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:62-75`
  - `apps/web/app/(app)/reports/morning/page.tsx:133-135,197-218`
- 種別: **bounded read・fail-open 表示・false-safe**
- なぜ実害か:
  - `take: 501` と `truncated` 自体は #117 で追加されたが、朝礼の `showShortageAlert` は shortage または最低残高 150 万円未満だけを条件にし、`truncated` を見ない。
  - 先頭 500 件が安全でも 501 件目以降に大型支払があれば、projection は不完全である。それでも朝礼カードそのものが出ず、経営者は「未確認の後続予定」があることを認識できない。
  - カード内の「先頭500件」注記はカードが表示された時にしか届かず、打切りを検知した目的を満たさない。
- 重大度: **MEDIUM**
- 修正案:
  - `showShortageAlert` に `shortageProj.truncated` を含め、打切り時は shortage 有無と別の amber coverage 警告を必ず出す。
  - truncated 時は「予測期間内にショートなし」「最低残高が安全」という安全判定を出さない negative test を追加する。

### F-R7-04 — 同日入出金を ID 順にしただけで、業務上のショート判定は ID に依存したまま

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:62-75`
  - `packages/shared/src/finance.ts:88-102`
  - `apps/web/app/(app)/finance/cashflow/page.tsx:79-96`
- 種別: **同日 ordering・決定論と業務意味の混同・誤警告**
- なぜ実害か:
  - `dueAt, id` は同じ DB 集合の並びを再現可能にするだけで、同日の入金を先に見るか支払を先に見るかという業務契約を定義しない。
  - opening=0、同日 inflow=100/outflow=100 では、ID の大小だけで一時残高と shortage の有無が反転する。画面は日付しか表示しないため、利用者はその順序を検証できない。
  - ランダム性は減ったが、資金ショートの結論が business date ではなく生成 ID に依存するため B-CF-05 は意味上未解消である。
- 重大度: **MEDIUM**
- 修正案:
  - 日次予測なら同じ業務日を `sum(inflow) - sum(outflow)` の一行へ集約する。
  - intra-day liquidity を扱うなら時刻と保守的 ordering（例: outflow-first）を明文化し、UIにも表示して逆順 fixture を固定する。

### F-R7-05 — PR #119 は `VOID` Invoice も「請求済み」と数え、請求漏れを見逃す

- file:line:
  - `apps/web/app/(app)/finance/profit-leaks/page.tsx:61-79`
  - `packages/db/prisma/schema.prisma:74-82,824-849`
- 種別: **状態 filter 欠落・請求漏れ false-negative**
- なぜ実害か:
  - direct `Invoice.dealId` と Quote 経由 `Invoice.quoteId` のどちらも status を限定せず、Invoice row が一つでもあれば `billedDealIds` に追加する。
  - `VOID` は無効化済み請求書であり、納品済み Deal にそれしか無ければ再請求が必要である。それでも #119 は「請求済み」と判定し、利益漏れ候補を表示しない。
  - tenant 条件は両経路にあり越境はしないが、漏れ検知の中心契約が fail-open になる。
- 重大度: **MEDIUM**
- 修正案:
  - 「請求あり」と見なす有効 Invoice status を明示し、少なくとも `VOID` を除外する。DRAFT を請求済み扱いにするか「請求準備中」と分けるかも契約化する。
  - direct/Quote の両経路で active、VOID-only、mixed の fixture を追加し、VOID-only は unbilled になることを固定する。

### F-R7-06 — C-LM-02 の list 基準表示が外側の count 基準 gate で打ち消される

- file:line:
  - `apps/web/app/(app)/leadmap/attention/page.tsx:66-84,110-123`
- 種別: **count/list snapshot 不整合・false-empty**
- なぜ実害か:
  - 各 bucket の count と list は別 statement を並行実行する。内側では list がある bucket だけカードを出すよう直したが、外側は全 count の合計 `totalStale===0` で EmptyState を決める。
  - count 後に stale row が追加され list に見えた場合、全 count が 0 なら「取りこぼしなし」が表示され、取得済み list は隠れる。逆に count 後に row が解消されると、空の card container だけになり得る。
  - コメントが意図する「count=0 でも表示行があれば隠さない」は外側 gate まで成立していない。
- 重大度: **MEDIUM**
- 修正案:
  - EmptyState は `buckets.some(b => b.leads.length > 0)` を基準にし、count は KPI/残件案内に限定する。必要なら snapshot transaction または単一 query/read model で count/list の時点を揃える。
  - count/list が両方向にずれる fixture で、取得済み行を隠さず false-empty を出さないことを固定する。

### F-R7-07 — 朝礼の nested `CampaignMetric` に child tenant scope がなく、別 tenant の存在を集計できる

- file:line:
  - `apps/web/app/(app)/reports/morning/page.tsx:107-128`
  - `packages/db/prisma/schema.prisma:1646-1683`
- 種別: **nested tenant 越境・存在漏えい・接続状態の過大計上**
- なぜ実害か:
  - 親 `MarketingCampaign.findMany` は actor tenant で限定するが、nested `metrics` は `select: { id: true }` だけで child の `tenantId` を限定しない。
  - `CampaignMetric` は独立した `tenantId` を持ち、relation は `campaignId` だけである。破損または不正な別 tenant child が自 tenant campaign を参照すると、その `metrics.length` が channel の接続判定へ混入する。
  - 別 tenant の metric 本文は出さないが、その存在により `channelsConnected` と朝礼カードの表示が変わるため、「存在しない世界と同じ出力」という tenant 境界を満たさない。
- 重大度: **MEDIUM**
- 修正案:
  - nested select を `metrics: { where: { tenantId: t }, select: { id: true } }` とし、親子双方を明示 scope する。
  - 外部 tenant child が同じ `campaignId` を指す破損 fixture で、接続件数・カード表示が変わらないことを固定する。

### F-R7-08 — C-LM-03 の ID fallback は最終活動順を揃えず、古い null-contact lead を上位12件から落とす

- file:line:
  - `apps/web/app/(app)/leadmap/attention/page.tsx:64-78`
  - `packages/shared/src/leads.ts:119-134`
- 種別: **selection ordering・DB/pure function 契約不一致・取りこぼし**
- なぜ実害か:
  - pure function は最終活動を `lastContactAt ?? updatedAt` と定義するが、DB は `lastContactAt ASC, updatedAt ASC, id ASC` で別々に並べる。
  - PostgreSQL の ASC では null は後方になるため、`lastContactAt=null` かつ非常に古い `updatedAt` の未着手 lead が、より新しい non-null contact lead より後ろへ送られ得る。
  - ID fallback は完全同値の再現性には効くが、`take:12` の選抜が「最終活動の古い順」という業務意味にはならず、優先対応対象を画面から落とせる。
- 重大度: **MEDIUM**
- 修正案:
  - `COALESCE(lastContactAt, updatedAt)` 相当の stable read model で最終活動を一列にしてから `id` fallback を置く。
  - null/non-null を混在させた 13 件以上の fixture で、最古の最終活動が上位12件から落ちないことを固定する。

### F-R7-09 — B-CF-04 の opening と event window の as-of が揃わず、当日二重適用と overdue 除外が残る

- file:line:
  - `apps/web/lib/domains/finance/cashflow.ts:45-61`
  - `packages/db/prisma/schema.prisma:969-989,1051-1057`
- 種別: **as-of 不整合・timezone 境界・予定の過大/過少計上**
- なぜ実害か:
  - opening は「現在」の CashAccount balance だが、予定 window は server local time の当日 00:00 から始まる。現在残高へ反映済みの当日予定を再加算するかを判断する as-of がない。
  - 前日以前の expected event は未入金・未払いでも全除外される。overdue outflow を落とせば false-safe、overdue inflow を落とせば過度に悲観的となる。
  - tenant の業務 timezone を固定しておらず、日付境界で対象集合が server 設定に依存する。#117 でこの契約は変更されていない。
- 重大度: **MEDIUM**
- 修正案:
  - CashAccount の `asOf` と event cutoff を同じ時点へ固定し、未処理 overdue の繰越規則と tenant timezone を明文化する。
  - 当日反映済み/未反映、前日 overdue、JST 23:59/00:00 の fixture を追加する。

## 修正項目別の検証結果

| 項目 | 判定 | 結果 |
|---|---|---|
| C-LM-01 | PASS | DB 境界は pure function と同じ `lte`。 |
| C-LM-02 | FAIL | list 基準の内側表示を count 基準の外側 gate が隠す。F-R7-06。 |
| C-LM-03 | PARTIAL | ID fallback は有効だが最終活動順が一致しない。F-R7-08。 |
| D-REF-01/02 | PASS | stale 専用 list と deterministic fallback は有効。tenant/KPI 回帰なし。 |
| E-01 | PASS | Invoice claim は tenant + type + sourceType + status で限定。 |
| B-CF-01 | FAIL | PO 二重 type を避ける代わりに正式 Invoice 入金を落とす。F-R7-02。 |
| B-CF-02 | PASS | opening 負値を現在ショートとして両画面に表示。 |
| B-CF-03 | PARTIAL/FAIL | cashflow page は警告するが朝礼は truncated だけならカードを隠す。F-R7-03。 |
| B-CF-04 | FAIL（既知継続） | as-of / overdue / timezone 未解消。F-R7-09。 |
| B-CF-05 | PARTIAL | 再現性は改善したが shortage の意味が ID 順に依存。F-R7-04。 |
| G-AI-03 | FAIL | live redaction は有効だが stored finding が迂回。F-R7-01。 |
| G-AI-04 | PASS | raw output/error は `audit:read` 条件内のみ。 |
| PR #119 | FAIL | live deal title redaction/tenant scope は有効だが stored 迂回と VOID false-negative が残る。F-R7-01/05。 |

## 指定観点で PASS とした項目

- **tenant / nested:** round-6 と #119 で直接追加・変更された LeadMap、紹介、M2 readiness、cashflow、profit-leaks の account/event/receivable/invoice/customer/deal/quote query は actor tenant を明示する。Profit leaks の Receivable→Invoice→Customer と Deal→Quote→Invoice は各段を個別に tenant scope する。朝礼の既存 MarketingCampaign→Metric は例外で F-R7-07。
- **権限 gate:** LeadMap は `leadmap:read`、紹介は `marketing:read`、M2 readiness は `admin:read`、cashflow/profit-leaks は `finance:read` を DB read 前に要求する。朝礼の新 cashflow projection は `finance:read` 保有時だけ実行・表示する。
- **C-LM-01 と C-LM-03 の再現性:** DB 境界は pure function と同じ `lte`、DB order は `id` fallback を持つ。ただし C-LM-02 は F-R7-06、最終活動順の意味は F-R7-08 が残る。
- **D-REF-01/02:** stale count/list は同一 tenant predicate、古い順の専用 list で到達可能。ランキングは locale compare 後に code-point fallback を持つ。aggregate/list の二重表示は KPI の二重加算には使われない。
- **E-01 / E-04 表記:** M2 readiness の Invoice claim count は `tenantId + type=payment_expected + sourceType=Invoice + pending_send`。3経路の文言は `at-most-once` と送信直前 crash の未送信可能性を明記し、厳密 exactly-once を残課題としている。
- **B-CF-02:** opening が負なら `currentlyNegative` を返し、cashflow page と朝礼で現在ショートを明示する。
- **G-AI-03 ライブ経路:** overdue 顧客名は `customer:read + canSeeCustomerLabel`、#119 の案件名は `deal:read` の時だけ実名になる。残る迂回は F-R7-01 の保存済み経路。
- **G-AI-04:** AI run/action は tenant + agent/run で scope され、raw `output/error` の JSX は `audit:read` の条件内だけにある。dashboard-only user には行動トレイル/統計と安全文だけを出す。
- **packages/shared:** `leads.ts` の境界、`referral.ts` の集計・tie-break、および指定 pure function tests 60 件は PASS。

## 今回重複起票しない既知境界

- D-04 / D-05、および送信 core 防御（G-AI-01/02 相当）は M2 宿題として方針決定済みのため、本報告では再起票していない。
- B-CF-04 の as-of / timezone / overdue 契約は #117 自身が継続検討としている。新規回帰ではないが、指定された B-CF-01〜05 の到達度を明確にするため F-R7-09 として未解消を記録した。
- PR #119 の `take: 200` は 201 件目以降を検知しない bounded coverage だが、本報告では F-R7-05 の状態誤判定を優先し、別 finding に分割していない。

## Evidence gap

既存 CI は全 gate green だが、対象ページについて次の negative display/wiring evidence は見つからなかった。

- `EXTERNAL_EXPERT` / label-denied role で保存済み顧客名・案件名が HTML に出ないこと
- 同一 `ProfitLeakFinding` と live finding が logical entity 単位で一度だけ集計されること
- Invoice-only `payment_expected`、PO dual type、candidate→Invoice→payment/VOID の資金予定 lifecycle
- 501 件目以降がある朝礼で coverage 警告が必ず出ること
- 同日入出金の挿入/ID順を反転しても business-day 結論が変わらないこと
- direct/Quote 経路の `VOID` Invoice が unbilled を抑止しないこと
- LeadMap の count/list が別 snapshot になっても false-empty を出さないこと
- null/non-null contact が混在しても LeadMap の最終活動順が一致すること
- 別 tenant の nested CampaignMetric が朝礼の接続件数を変えないこと
- current opening と当日/overdue event が同じ as-of と tenant timezone で評価されること

## 結論

**CHANGES_REQUIRED**。F-R7-01/F-R7-02 の HIGH と、F-R7-03〜09 の false-safe / redaction / tenant / aggregation 回帰を修正し、同一 fixed SHA で negative evidence と CI を取り直すまで round-7 完了扱いにしない。この監査では実装修正、main push/merge、DB、本番、Secrets、外部送信、課金を行っていない。

## 固定 SHA 境界

この判定は `a705db5c7752c0eca45f55aef4823a3f3256549c` 限定である。`origin/main` または対象ファイルが動いた場合は再監査が必要。
