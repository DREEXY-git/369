# Codex ラウンド3 再監査 — レーンB（tenant越境・データ境界）

## 判定

**CHANGES_REQUIRED**

直近修正 #95 の2変更は、次の限定された攻撃形には正しく効いている。

- foreign `draftId` を `OUTREACH_REPLY_CLASSIFICATION_JOB` に直接渡す形は、`OutreachDraft.id + tenantId` の先行取得で遮断される。
- own `OutreachDraft` から得た `leadId` に対するID単独更新は、`LocalBusinessLead.updateMany({ id, tenantId })` へ変わりforeign Leadを直接更新しなくなった。

ただし、現行schemaでは各relationの外部キーにtenantが含まれず、own parentがforeign to-one childを参照できる。#95はその形を検証していないため、承認・外部送信・worker抑止リストの越境は残る。また、#83入金取消にはtenant付きlockが0件でも処理を続け、foreign InvoiceをID単独更新できる新しい経路がある。

## 固定条件

- Repository: `DREEXY-git/369`
- 監査対象: `origin/main`
- Fixed SHA: `ae8757328f69f0c210ac387b8f7f9429d2a76951`
- 対象branch: `codex/reaudit-B`
- `tasks/CODEX_QUEUE.md`: ラウンド3を確認。queue内の旧対象`80b1fc5`より、ユーザーの最新指定`ae87573`を優先
- 方法: source / Prisma schema / evidence specの静的照合
- 境界: 実装変更なし。DB、schema、migration、Secrets、外部送信、課金、本番には未接触。DBを要するE2Eは未実行

## 直近修正の確認

| 対象 | コード確認 | レーンB判定 |
|---|---|---|
| #93 D-01 `decideAiGateAction` | `apps/web/app/(app)/approvals/actions.ts:20-26`で、DB接触前に`user.isAi`と`isHumanUser`を検査 | ガードは存在。tenant引数もcoreへ渡る。B観点の新規回帰なし |
| #97 D-02 event/logistics | event Action群と`operations/logistics/actions.ts:22-24,54-56,86-88`に`isHumanUser`追加 | AIガード自体は存在。ただしLogisticsのforeign Event参照はB-R3-08として残る |
| #96 D-03 invoice/dunning実送信 | `apps/web/app/(app)/invoices/actions.ts:221-229,333-341`でDB接触前にAI/mixed roleを遮断 | AI遮断は存在。ただし送信宛先のto-one tenant不整合はB-R3-05として残る |
| #95 B-02/B-06 | `outreach-request.ts:69`と`apps/worker/src/jobs.ts:167-168` | 直接ID越境は改善。親子tenant整合のend-to-end検証としては不十分 |
| M3-3 lostReason | `apps/web/lib/domains/deals/deal-stage.ts:33-61` | Deal取得、raw lock、CASがすべて`tenantId`付き。B観点のfindingなし |

## Findings

### B-R3-01 — #95 B-02はforeign Leadの更新を止めるが、承認作成と送信を止めない

- file:line:
  - `apps/web/lib/domains/leadmap/outreach-request.ts:38-75`
  - `apps/web/lib/domains/leadmap/outreach-send.ts:98-145,189-205`
  - `packages/db/prisma/schema.prisma:2782-2828,2957-2978`
- 種別 (class): **to-one relation tenant不整合 / 外部送信宛先越境**
- なぜ実害か:
  - tenant AのOutreachDraftがtenant BのLeadを参照するcorrupted fixtureはschema上作成可能。
  - request coreはown Draftをclaimした後、未検証の`draft.lead.name`をApprovalRequest titleとAuditへ複製する。
  - #95の`LocalBusinessLead.updateMany({ id, tenantId })`は0件になるがcountを検査せず、承認一式をcommitして`requested`を返す。
  - 承認後は`outreach-send.ts:103-145`が同じforeign LeadのemailをSendLogとprovider宛先へ渡す。後段のtenant付きLead stage更新が0件でも送信は既に行われる。
- 重大度: **HIGH**
- 修正案:
  - Draft claimと同じtransaction内でLeadを`{ id: draft.leadId, tenantId }`取得し、不一致ならthrowしてclaim・Approval・Auditを全rollbackする。
  - Lead stage更新は`count === 1`を必須とする。
  - send state machineでもSendLog作成前・provider直前にDraft→Leadのtenant一致を再検証する。

### B-R3-02 — #95 B-06 workerはforeign Draft直指定だけを塞ぎ、foreign Lead.emailをまだ読める

- file:line:
  - `apps/worker/src/jobs.ts:160-173`
  - `packages/db/prisma/schema.prisma:2782-2828,2957-2978,3015-3026`
- 種別 (class): **worker parent-child tenant不整合 / foreign PII取得 / 抑止リスト汚染**
- なぜ実害か:
  - #95はOutreachDraft parentを`id + tenantId`で固定したが、`include: { lead: true }`のLead tenantは検証しない。
  - tenant A Draft→tenant B Leadの場合、foreign emailを読み、tenant A SuppressionListへ登録する。tenant BのPII漏えいとtenant Aの正当送信抑止が同時に起きる。
  - `OutreachReply`もtenant Aとして作られ、異なるtenantの論理identityを持つrelationが永続化される。
- 重大度: **HIGH**
- 修正案:
  - Draftをtenant固定後、Leadを`{ id: draft.leadId, tenantId }`で別取得し、不一致はReply作成前にskip/fail-closedする。
  - Draft / Lead検証、Reply作成、Suppression upsertを単一transactionへまとめる。

### B-R3-03 — LeadMap分析・生成の未スコープ子がAI入力と営業下書きを越境汚染する

- file:line:
  - `apps/web/lib/leadmap.ts:131-176,238-267`
  - `apps/worker/src/jobs.ts:143-156`
  - `apps/web/app/(app)/leadmap/leads/[id]/page.tsx:31-42`
  - `apps/web/app/(app)/leadmap/leads/[id]/outreach/page.tsx:39-47`
- 種別 (class): **nested include tenant欠落 / AI入力越境 / read境界**
- なぜ実害か:
  - parent Leadだけtenant scopedで、reviews / websiteScans / socialProfiles / insights / campaignをtenant条件なしでincludeする。
  - foreign Review本文はAI safety入力と分析へ、foreign Insight/Campaignは営業文面生成へ入り、tenant AのAIOutput・OutreachDraftへ複製される。
  - 実LLM有効時はforeignデータが外部provider入力へ到達する。
- 重大度: **HIGH**
- 修正案:
  - to-manyはすべて`where: { tenantId }`、to-one Campaignはtenant一致検証を追加する。
  - provider呼出し直前に入力由来recordのtenant集合が単一tenantであることをassertする。

### B-R3-04 — #83入金取消はtenant付きInvoice lockが0件でもforeign Invoiceを更新できる

- file:line:
  - `apps/web/app/(app)/invoices/actions.ts:178-214`
  - `apps/web/app/(app)/approvals/actions.ts:261-303`
  - `packages/db/prisma/schema.prisma:824-849,881-907`
- 種別 (class): **raw SQL lock結果未検査 / ID単独update / payment→invoice tenant不整合**
- なぜ実害か:
  - Paymentの`tenantId`とrelation先Invoiceの`tenantId`はDB制約で一致しない。tenant A Payment→tenant B Invoiceはschema上可能。
  - 申請ActionはPaymentを`tenantId:A + invoiceId:B`で取得できる一方、Invoiceのtenant scoped取得がnullでも検査せずApprovalを作る。
  - 承認時の`SELECT ... WHERE id=B AND tenantId=A FOR UPDATE`は0行でも結果を無視する。その後、tenant A Paymentを削除し、`invoice.update({ id:B })`でtenant B InvoiceのpaidAmount/statusを変更する。
  - 正常系だけの`payment_reversal_evidence.spec.ts:27-83`ではこのcorrupted relationを検出できない。
- 重大度: **HIGH**
- 修正案:
  - 申請時にInvoiceの同tenant実在を必須化し、PaymentとInvoiceの両方が同tenantでなければApprovalを作らない。
  - 承認transactionではlock返却行を`count === 1`確認し、Invoiceをtenant scopedで再取得する。
  - Invoice更新は`updateMany({ id, tenantId })` + `count === 1`にし、Payment削除もtenant付きCASにする。

### B-R3-05 — invoice/dunningのto-one Customer chainがforeign宛先を外部送信へ渡す

- file:line:
  - `apps/web/lib/domains/finance/invoice-send.ts:42-71,116-175`
  - `apps/web/lib/domains/finance/dunning.ts:82-122,132-168,171-251`
  - `packages/db/prisma/schema.prisma:824-922`
- 種別 (class): **to-one relation tenant不整合 / PII・外部送信越境**
- なぜ実害か:
  - #96はAI主体を遮断するが、Invoice→Customer、Reminder→Receivable→Invoice→Customerのtenant一致は検証しない。
  - own parentがforeign Customerを参照すると、foreign emailがApproval payload、AISafetyLog、SendLog、providerの`to`へ入る。
  - 人間承認とexactly-onceが正しくても、承認対象のrecipient自体がforeignなら情報漏えいを防げない。
- 重大度: **HIGH**
- 修正案:
  - 各to-oneを子の`tenantId`付きで取得し、チェーン全体がactor tenantと一致しなければ送信申請・SendLog作成前にfail-closedする。
  - provider直前にも再検証し、foreign recipient fixtureでprovider回数0を固定する。

### B-R3-06 — foreign QuoteLineItemが請求書へ複製され、印刷画面にも露出する

- file:line:
  - `apps/web/app/(app)/quotes/actions.ts:174-176,211-235`
  - `apps/web/app/(app)/quotes/[id]/page.tsx:33-35`
  - `apps/web/app/print/quotes/[id]/page.tsx:20-35`
  - `apps/web/app/print/invoices/[id]/page.tsx:43-45`
  - `packages/db/prisma/schema.prisma:758-770,867-878`
- 種別 (class): **to-many tenant欠落 / 財務データ複製 / 印刷漏えい**
- なぜ実害か:
  - Quote parentはtenant scopedだが`lineItems: true`でforeign子を取得する。
  - 変換Actionは全lineItemsをtenant A InvoiceLineItemへ複製し、名称・数量・単価・金額を会計・顧客送付物へ永続化する。
  - Quote/Invoice印刷画面もforeign明細を表示・PDF化できる。
- 重大度: **HIGH**
- 修正案:
  - 画面取得は子にtenant条件を付ける。
  - 財務変換ではforeign childの存在を検出したら除外継続せず、Invoice/Audit作成前に全体を中止する。

### B-R3-07 — PurchaseOrderLineとEventCostのforeign子が在庫・粗利・会計候補を変更する

- file:line:
  - `apps/web/lib/domains/operations/procurement.ts:340-375`
  - `apps/web/lib/operations.ts:169-188`
  - `apps/web/lib/domains/finance/finance-bridge.ts:293-325`
  - `packages/db/prisma/schema.prisma:1583-1618,2615-2676`
- 種別 (class): **nested to-many tenant欠落 / 在庫・会計副作用越境**
- なぜ実害か:
  - PO receiveは未スコープlinesを処理し、foreign lineの数量でown asset在庫を増やせる。foreign assetなら、POをreceivedにした後で失敗し部分状態が残る。
  - Event profitability/finance bridgeは未スコープcostsを合算し、tenant Aのgross、snapshot、FinanceEvent、JournalCandidate、InvoiceCandidate、cashflowへ転記する。
  - Eventの`customerId`もbridge前にtenant再検証されない。
- 重大度: **HIGH**
- 修正案:
  - 全子・asset/customerをtenant一致検証し、foreign子が1件でもあれば書込み前にfail-closedする。
  - PO claimから全movement/line/Event/Outboxまで単一transaction化する。
  - Finance bridgeはbarrier取得後の同transaction内でchild/customerを再取得する。

### B-R3-08 — #97対象の単発Logistics作成がforeign Event参照を受け入れる

- file:line:
  - `apps/web/app/(app)/operations/logistics/actions.ts:54-82`
  - `apps/web/app/(app)/operations/logistics/page.tsx:22-30`
  - `packages/db/prisma/schema.prisma:1622-1642`
- 種別 (class): **入力ID tenant未検証 / cross-tenant relation作成 / to-one表示漏えい**
- なぜ実害か:
  - `createLogisticsTaskAction`はformの`eventId`をtenant検証せず、そのままtenant A LogisticsTaskへ保存する。
  - tenant B Event IDを知る利用者は、own task→foreign Event relationを作成でき、一覧の未検証to-one includeでforeign Event名を読める。
  - foreign Event削除時のcascadeで別tenantのtaskが削除される論理境界も生じる。
- 重大度: **HIGH**
- 修正案:
  - eventId指定時は`EventProject.findFirst({ id:eventId, tenantId })`を必須とし、不一致なら書込み前に拒否する。
  - 一覧to-oneも子tenant一致を確認する。

### B-R3-09 — loginがtenantを識別せずforeign Roleをsessionへ署名できる

- file:line:
  - `apps/web/app/login/actions.ts:23-41`
  - `packages/db/prisma/schema.prisma:146-201`
- 種別 (class): **認証tenant曖昧性 / role relation tenant不整合**
- なぜ実害か:
  - Userの一意性は`tenantId + email`だが、loginはemailだけで`findFirst`する。同一email複数tenantで別tenant選択またはログイン不能になる。
  - UserRole→Roleをtenant検証せず、foreign OWNER roleを7日sessionへ署名できる。以後のpermission判定全体が越境権限で動く。
- 重大度: **HIGH**
- 修正案:
  - tenant selector/slugを認証入力に含め、`tenantId + email`で取得する。
  - UserRoleとRole双方のtenant一致を検証し、不一致はsession発行前に拒否する。

### B-R3-10 — 画面・countの未スコープrelationが広範囲に残る

- file:line（代表）:
  - `apps/web/app/(app)/contracts/page.tsx:15`
  - `apps/web/app/(app)/communications/threads/[id]/page.tsx:16`
  - `apps/web/app/(app)/leadmap/routes/page.tsx:13`
  - `apps/web/app/(app)/subsidies/page.tsx:15`
  - `apps/web/app/(app)/operations/stocktakes/[id]/page.tsx:19`
  - `apps/web/app/(app)/admin/users/page.tsx:26`
  - `apps/web/app/(app)/operations/events/page.tsx:20`
- 種別 (class): **read/count nested relation tenant欠落**
- なぜ実害か:
  - foreign childをown parentへ接続すると、契約条項、メッセージ、補助金タスク、在庫line、role等が別tenant画面へ表示される。
  - `_count`もforeign子を数えるため、本文を出さなくても件数オラクルと集計汚染が残る。
- 重大度: **MED**
- 修正案:
  - to-many include/select/countへtenant条件を標準適用し、to-oneは子tenant一致を検証する。
  - 画面ごとの個別修正だけでなくtenant-safe query helper/repositoryで水平展開する。

### B-R3-11 — #95/#83のnegative evidenceがcorrupted parent-child fixtureを実証していない

- file:line:
  - `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:130-200,372-391`
  - `apps/web/tests/e2e/payment_reversal_evidence.spec.ts:27-83`
  - commit `0bd63cc`（#95、変更2 source files・test追加なし）
- 種別 (class): **tenant negative test gap**
- なぜ実害か:
  - 既存tenant specはforeign OutreachApprovalを検証するが、own Draft→foreign Lead、worker job、外部宛先を実行しない。
  - payment reversal specは同tenant正常系のみで、Payment.tenantIdとInvoice.tenantIdが異なるfixtureを持たない。
  - そのためB-R3-01/02/04が残っていてもCIはgreenになり得る。
- 重大度: **MED**
- 修正案:
  - own parent→foreign to-one childを意図的に作り、Approval/Audit/Reply/Suppression/SendLog/provider/Invoice更新が全て0件であることをproduction Action/coreで確認する。
  - spec内でquery形を再実装せず、production-shared coreまたは実Action POSTを呼ぶ。

## raw SQL / `findUnique` / `updateMany`補足

- inventory、invoice-send、lead convert/stage、stocktake、lease、deal-stageの主要lock SQLにはtenant条件がある。
- #83 payment reversalはSQL文にtenant条件があるが、**0行lockを検査せず後続のID単独updateへ進む**点が問題であり、tenant条件の文字列存在だけでは安全と判定できない。
- `apps/web/lib/approval.ts:128-205`の共通helperはtenant無し`findUnique/updateMany/update`を持つ。現在のproduction callsiteは直前にtenant scoped Approvalを取得しており、ae87573で直接越境する入口は確認できなかったが、helper契約へtenantIdを必須化する防御多重化を推奨する。
- 本番業務経路に`$queryRawUnsafe` / `$executeRawUnsafe`は確認しなかった（seed/test除外）。

## 修正優先順

1. B-R3-01/02/04/05: 外部送信・PII・money mutationのto-one境界を最優先でfail-closed化。
2. B-R3-06/07/08/09: 財務・在庫・認証・Logisticsの親子tenant整合を修正。
3. B-R3-11: production wiringを使うcorrupted fixture negative testを追加。
4. B-R3-10: tenant-safe query方針でread/count面を水平展開。

## 固定SHA境界

この判定は`ae8757328f69f0c210ac387b8f7f9429d2a76951`限定である。`origin/main`が動いた場合は再監査が必要。
