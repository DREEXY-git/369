# Codex レーンF — round-7 横断回帰監査

- 監査日: 2026-07-23 (JST)
- 監査対象: `origin/main` fetch 後の現 HEAD
- exact SHA: `a705db5c7752c0eca45f55aef4823a3f3256549c`
- HEAD subject: `feat(finance): 利益漏れ検知に「請求漏れ(unbilled)」の実データ検知を追加 (#119)`
- 対象差分: round-6 修正 #116/#117/#118 と #119（基点 `c558eaa` から上記 SHA まで）
- 結論: **CHANGES_REQUIRED**
- 監査方針: 指摘のみ。アプリケーションコード、DB、設定値は変更していない。

## 結論サマリー

直下の Prisma クエリは、指定された全ページ・helper で `tenantId` スコープを確認した。各ページの入口権限も、LeadMap は `leadmap:read`、財務2画面は `finance:read`、M2 readiness は `admin:read`、紹介画面は `marketing:read`、朝礼は `dashboard:read` がデータ取得より前にあり、入口の fail-open は確認されなかった。

一方、横断した実データ経路には次の残存回帰がある。

1. 保存済み利益漏れを無加工表示するため、顧客名・案件名・見積名の redaction を迂回できる（HIGH）。
2. 朝礼の nested `CampaignMetric` に child tenant scope がなく、他 tenant の存在・件数をマーケティング集計へ混入できる（MEDIUM）。
3. 資金ショート予測を `cashflow_expected` だけに限定した結果、正規の請求書送信が作る `payment_expected` を予測から消している。また InvoiceCandidate 起点の予定は正式 Invoice の入金で消し込まれない（MEDIUM）。
4. 501件打切りを検出しても、朝礼カードの表示条件に `truncated` がなく、不完全な予測を安全に見せ得る（MEDIUM）。
5. #119 は `VOID` Invoice も請求済み扱いにし、請求漏れを見逃す（MEDIUM）。
6. 資金ショート予測の期間境界 B-CF-04 は未解消、同一日時の順序 B-CF-05 は決定論化だけで経済的意味は未確定（MEDIUM/LOW）。
7. LeadMap の count/list race は外側の `totalStale` 分岐に残り、C-LM-02 は閉じていない。C-LM-03 も最終活動日時の並び順は未解消（LOW）。

## 指摘

### F-R7-01 [HIGH] 保存済み利益漏れが権限別 redaction を迂回する

**該当箇所**

- `apps/web/app/(app)/finance/profit-leaks/page.tsx:34-37,57-59,80-84,97-103,117-125`
- `packages/db/prisma/seed.ts:685-693`
- `packages/shared/src/finance.ts:126-180`

**事実**

- ライブの回収遅延は `customer:read` と機密ラベル可視性を確認し、#119 のライブ請求漏れは `deal:read` がなければ案件名を固定文言へ置換している。
- しかし保存済み `ProfitLeakFinding` は `title` / `detail` / `recommendation` を `storedViews` へそのままコピーし、`finance:read` だけで表示する。
- `detectProfitLeaks` は見積名、案件名、顧客名を `title` に埋め込む。seed も実際にそれらを埋め込んだ finding を永続化する。

**影響**

`finance:read` はあるが `customer:read` / `deal:read` がない利用者に、ライブ経路では伏せた顧客名・案件名・見積名が保存済み経路から再露出する。さらに重複排除 key が `type + title` のため、同じ entity でも保存済み実名 title とライブの伏字 title が一致せず、件数・影響額を二重加算し得る。G-AI-03 と #119 の redaction は経路横断では fail-closed になっていない。

**推奨**

永続 finding を自由文だけで表示せず、種別・参照 entity・表示用構造化値から閲覧時に権限別 projection を作る。移行までの安全策として、必要な domain read 権限がない場合は保存済みタイトルを種別ごとの固定文言へ置換する。顧客名・案件名を sentinel にした負の権限テストを、ライブと保存済みの両方へ追加する。

### F-R7-02 [MEDIUM] 朝礼の nested CampaignMetric が child tenant scope を持たない

**該当箇所**

- `apps/web/app/(app)/reports/morning/page.tsx:107-128`
- `packages/db/prisma/schema.prisma:1646-1683`

**事実**

`MarketingCampaign.findMany` の親 `where` は `{ tenantId: t }` だが、nested `metrics` は `select: { id: true }` のみで `where: { tenantId: t }` がない。`CampaignMetric` は独立した `tenantId` を持ち、relation は `campaignId` だけで結ばれているため、DB 制約上は別 tenant の metric が自 tenant campaign を参照できる。

取得した `metrics.length` は channel ごとの metric 件数に加算され、`channelDataState`、`channelsConnected`、マーケティングカードの表示条件へ入る。

**影響**

破損・不正な外部 tenant metric があると、自 tenant にデータが存在しない場合でも「接続済み」と判定され得る。他 tenant の metric 存在が画面出力を変えるため、「存在しない世界と同じ出力」にならない。

**推奨**

`metrics: { where: { tenantId: t }, select: { id: true } }` とし、親 tenant と子 tenant の両方を明示する。外部 tenant child を同一 campaignId に差した破損 fixture で `channelsConnected` が変わらない統合テストを追加する。

### F-R7-03 [MEDIUM] B-CF-01 の type 限定で正規 Invoice 入金予定が予測から消える

**該当箇所**

- `apps/web/lib/domains/finance/cashflow.ts:51-75`
- `apps/web/lib/domains/finance/invoice-send.ts:125-145,181-190`
- `apps/web/lib/domains/finance/finance-bridge.ts:303-326,364-392`
- `apps/web/lib/domains/finance/payments.ts:150-166`

**事実**

- B-CF-01 対応は予測対象を `type: 'cashflow_expected'` だけへ限定した。PurchaseOrder bridge が同一支払を `payment_expected` と `cashflow_expected` の両方で作る二重計上は回避できる。
- しかし正規の Invoice 送信は write-ahead claim として `sourceType: 'Invoice'` / `type: 'payment_expected'` を作り、finalize で `approved` にする。この正規予定は現在の予測 query から常に除外される。
- Event/Damage bridge の `cashflow_expected` は `sourceType: 'InvoiceCandidate'` / `sourceId: candidateId` で作る。一方、全額入金時の消し込みは `sourceId: invoiceId` だけを更新するため、候補起点の予定が正式 Invoice の入金後も `expected` のまま残り得る。

**影響**

重複 type を query 側で一律除外しただけなので、Invoice 単独フローでは入金予定を過少計上し、InvoiceCandidate フローでは入金済み予定を残して過大計上し得る。正常フローが資金ショート予測から消える／残留するため、B-CF-01 は lifecycle 全体として閉じていない。

**推奨**

論理予定に canonical identity を定義し、候補→Invoice 正式化時に同じ予定を引き継ぐか置換する。入金・取消はその canonical identity を必ず terminal status へ遷移させる。PurchaseOrder、Invoice 直接作成、InvoiceCandidate→Invoice→全額入金を同じ projection contract で検証する。

### F-R7-04 [MEDIUM] B-CF-04 の opening/期間境界が未解消

**該当箇所**

- `apps/web/lib/domains/finance/cashflow.ts:45-75`

**事実**

予測は現在の `CashAccount.balance` を opening にしながら、予定 event をローカル時刻の当日 00:00 以降 (`dueAt >= todayStart`) で再適用する。opening が当日中の予定を反映済みかどうかを区別する基準時刻・as-of contract がなく、未処理の過去期日 event は全て除外される。

**影響**

同日の既反映予定を二重適用したり、期限超過した未処理予定を無視したりできる。サーバー timezone によって当日境界も変わる。B-CF-04 は #117 で変更されておらず、結果の過大・過少計上が残る。

**推奨**

opening の as-of を定義し、`dueAt > asOf` の未来予定だけを加えるか、未処理 overdue を含める明示 contract にする。tenant timezone を入力にし、当日済／未済と前日期日の fixture を追加する。

### F-R7-05 [LOW] B-CF-05 は行順を固定したが、同一日時の経済的順序は未定義

**該当箇所**

- `apps/web/lib/domains/finance/cashflow.ts:62-75`

**事実**

`orderBy: [{ dueAt: 'asc' }, { id: 'asc' }]` で同値行の選択は決定論的になった。しかし同じ `dueAt` の入金・出金は、業務上の優先順位ではなく cuid の辞書順で逐次計算される。

**影響**

同じ経済データでも ID の生成順だけで、一時的にマイナスを通るかが変わり、`shortageDate` が変化し得る。再実行時の揺れは抑えたが、B-CF-05 の意味的な揺れは残る。

**推奨**

日次予測なら同日を net 集約してから判定する。時点内の保守的判定が要件なら、同日時は outflow 優先など明示した業務順序を設け、その contract をテストする。

### F-R7-06 [LOW] C-LM-02 の count/list race が外側分岐に残る

**該当箇所**

- `apps/web/app/(app)/leadmap/attention/page.tsx:66-84,98-123`

**事実**

各 bucket のカード filter は `count > 0` から `leads.length > 0` へ変わったが、ページ全体の EmptyState / 一覧分岐は別 statement の count 合計 `totalStale` のままである。count と findMany の間に更新が入ると、`count=0/list=1` でも EmptyState が表示され、逆に `count>0/list=0` では一覧側に入ったままカードが1件も出ない。

**影響**

正常な要対応リードが瞬間的に消えるか、件数があるのに内容がない自己矛盾表示になる。C-LM-02 の元の race は外側に残っている。

**推奨**

count/list を同一スナップショットで読むか、表示用集合を単一 query から構成する。少なくとも EmptyState は `buckets.some((b) => b.leads.length > 0)` と同じ表示事実から導出する。

### F-R7-07 [LOW] C-LM-03 は id tie-break のみで「最終活動順」になっていない

**該当箇所**

- `apps/web/app/(app)/leadmap/attention/page.tsx:64-78`
- `packages/shared/src/leads.ts` の `lastContactAt ?? updatedAt` による判定 contract

**事実**

分類は最終活動を `lastContactAt ?? updatedAt` と扱うが、DB order は `lastContactAt ASC, updatedAt ASC, id ASC` である。PostgreSQL の ASC では null が後ろになるため、`lastContactAt=null` の古い未着手 lead は、より新しい非 null lead より後ろへ送られ得る。追加された `id` は完全同値の決定論化には有効だが、最終活動の比較式自体は揃っていない。

**影響**

上限12件の選抜で「より古く止まっている」正常な対象が画面から押し出され得る。

**推奨**

`COALESCE(lastContactAt, updatedAt)` 相当で order する read model、または同義の安全な query 設計に統一し、その後に `id` tie-break を置く。

### F-R7-08 [MEDIUM] B-CF-03 の打切りを朝礼が表示しない

**該当箇所**

- `apps/web/lib/domains/finance/cashflow.ts:62-75`
- `apps/web/app/(app)/reports/morning/page.tsx:133-135,197-218`

**事実**

helper は501件目で `truncated=true` を返すが、朝礼の `showShortageAlert` は `shortageDate` または `minBalance < 1,500,000` だけを条件にし、`truncated` を見ない。「先頭500件で試算」の注記はカード内部にあるため、この表示条件が false なら注記ごと消える。

**影響**

先頭500件が安全でも、501件目以降に大型支払がある不完全な予測を朝礼は無警告にできる。打切り検出を追加した目的に対して fail-open であり、B-CF-03 は cashflow 本画面では閉じても朝礼統合では閉じていない。

**推奨**

`showShortageAlert` に `shortageProj.truncated` を含め、打切り時は shortage の結論とは別に coverage 不足を必ず表示する。`truncated=true` の場合は「ショートなし」という安全結論を出さない negative test を追加する。

### F-R7-09 [MEDIUM] #119 は VOID Invoice で請求漏れを抑止する

**該当箇所**

- `apps/web/app/(app)/finance/profit-leaks/page.tsx:61-79`
- `packages/db/prisma/schema.prisma:74-82,824-849`

**事実**

direct `Invoice.dealId` と Quote 経由 `Invoice.quoteId` の両 query は tenant scope を持つが、Invoice status を限定しない。従って無効化済みの `VOID` Invoice だけが存在する Deal も `billedDealIds` に入る。

**影響**

納品済み Deal に有効な請求書がなく再請求が必要でも、請求漏れ候補が消える。越境は起こさないが、#119 の中心判定が存在するだけの無効行に対して fail-open になる。

**推奨**

請求済みとみなす有効 Invoice status を明示し、少なくとも `VOID` を除外する。DRAFT を「請求済み」または「請求準備中」のどちらに扱うかも contract 化し、direct/Quote の active、VOID-only、mixed fixture を追加する。

## 修正項目別の検証結果

| 項目 | 判定 | 監査結果 |
|---|---|---|
| C-LM-01 | PASS | `lte` となり、境界を含む shared classifier と一致。OR の両枝は共通 `tenantId` 配下。 |
| C-LM-02 | FAIL | bucket card は list 基準になったが、ページ外側は count 合計基準のまま。F-R7-06。 |
| C-LM-03 | PARTIAL | `id` tie-break は追加。`lastContactAt ?? updatedAt` の最終活動順は未実装。F-R7-07。 |
| D-REF-01 | PASS | stale count/list は同じ tenant・status・cutoff predicate。stale 一覧追加による越境・KPI 二重加算なし。 |
| D-REF-02 | PASS | locale 同値時に code-point fallback があり決定論的。 |
| E-01 | PASS | pending invoice claim は tenant + type + sourceType + status で限定。入口 `admin:read` も fetch 前。 |
| B-CF-01 | PARTIAL/FAIL | PO 二重 type は除外したが、Invoice 正規予定消失と candidate lifecycle 残留。F-R7-03。 |
| B-CF-02 | PASS | opening が既に負の場合を cashflow 画面・朝礼で明示。 |
| B-CF-03 | PARTIAL/FAIL | 501件目で truncation を検出し cashflow 本画面は警告するが、朝礼はカード自体を隠せる。F-R7-08。 |
| B-CF-04 | FAIL | opening の as-of と当日／overdue 境界が未定義。F-R7-04。 |
| B-CF-05 | PARTIAL | 行順は決定論化。業務上の同日時順序は未定義。F-R7-05。 |
| G-AI-03 | PARTIAL/FAIL | live customer/deal は権限別 redaction。stored finding が迂回。F-R7-01。 |
| G-AI-04 | PASS | 指定一覧外だが修正確認のため対象ページを read-only 確認。raw output/error は `audit:read` がなければ描画されない。run/agent/action query も tenant scope。 |
| #119 | PARTIAL/FAIL | 追加 findMany は全て tenant scope、direct/quote 両経路確認と live 案件名 redaction は妥当。保存済み経路は F-R7-01、VOID-only の誤判定は F-R7-09。 |

## tenant / RBAC / fail-closed 横断確認

| 対象 | 入口権限 | 直下 query tenant scope | nested scope / fail-closed |
|---|---|---|---|
| LeadMap attention | `leadmap:read` | count/findMany とも共通 `tenantId` | nested なし。外部 tenant は count/list に入らない。 |
| Referral records | `marketing:read` | groupBy/count/stale list/main list 全て `tenantId` | nested なし。追加 stale list も fail-closed。 |
| M2 readiness | `admin:read` | 全 count/groupBy が `tenantId` | 件数のみ。fail-open なし。 |
| Cashflow page/helper | `finance:read` | CashAccount/FinanceEvent/Forecast/ForecastLine 全て `tenantId` | ForecastLine は親 `forecastId` と child `tenantId` の両方を確認。 |
| Profit leaks | `finance:read` | Receivable/Invoice/Customer/Deal/Quote/Invoice 全て `tenantId` | to-one chain は分割取得で各段 tenant scope。stored redaction は F-R7-01。 |
| Morning report | `dashboard:read` + domain flags | 全 root query が `tenantId` | Customer→Deal は child tenant filter あり。MarketingCampaign→Metric は F-R7-02。 |

## redaction 確認

- 顧客名（live overdue）: `customer:read` かつ label 可視時だけ表示。それ以外は顧客名を出さない。
- 案件名（#119 live unbilled）: `deal:read` がなければ固定文言 `（納品済みの案件）`。PASS。
- 保存済み profit leak: 権限別 projection がなく raw title/detail/recommendation。FAIL（F-R7-01）。
- AI run raw output/error（G-AI-04）: `audit:read` 保有時のみ描画。PASS。
- 朝礼の財務値: `finance:read` がなければ UI 非表示かつ AI 入力も redact 値。今回対象の値に新たな fail-open は確認されなかった。

## 検証方法と制約

- `git fetch origin main` 後、`HEAD == origin/main == a705db5c7752c0eca45f55aef4823a3f3256549c` を確認して SHA を固定した。
- `c558eaa..a705db5` の対象差分と、対象ページから到達する Prisma schema / producer / lifecycle code を静的に横断した。
- DB・本番・Secrets・外部 API・外部送信・課金には触れていない。
- DB 接続を伴う integration/e2e は禁止範囲を守り未実行。依存導入も行っていない。
- 既知未完の D-04/D-05、送信コア防御（M2宿題）は重複起票していない。

## 監査境界

この文書は上記 exact SHA の監査結果である。以後 `main` が進んだ場合は、この SHA との差分を再確認しない限り結果を流用しないこと。
