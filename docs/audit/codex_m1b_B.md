# Codex M1-b レーンB監査 — tenant越境・データ境界

## 結論

**CHANGES_REQUIRED**

PR #77 が修正した Event / Invoice / Meeting 詳細画面の to-many include と、OutreachApproval の tenant 付き `updateMany` は、対象コードの形としては正しい。一方で、同じ「各モデルが独立した `tenantId` を持つが、relation の外部キーには tenant が含まれない」schema 上で、外部送信、請求変換、入庫、粗利・会計ブリッジ、LeadMap AI / worker に未防御の親子 relation が残っている。したがって、この fixed SHA を tenant 境界の完了版とは判定できない。

## 固定条件

- Repository: `DREEXY-git/369`
- PR: `#77`（Draft / open）
- Base: `main` `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
- Fixed head: `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`
- Head branch: `claude/padn-m1b-hardening-v1`
- 対象差分: 24 files / +3491 / -355
- 監査方法: fixed head の source / Prisma schema / tests を静的照合
- `tasks/CODEX_QUEUE.md`: fixed head と base のどちらにも存在しなかったため、ユーザーが指定した監査項目を正として実施
- 制約: 指摘のみ。アプリコード、schema、DB、外部送信は変更・実行していない。DB 起動を要する Playwright E2E は実行していない

## Findings

### B-01 — login が tenant を識別せず、foreign Role を session に署名できる

- 重大度: **CRITICAL**
- 場所:
  - `apps/web/app/login/actions.ts:23-39`
  - `packages/db/prisma/schema.prisma:146-164` (`User`)
  - `packages/db/prisma/schema.prisma:167-180` (`Role`)
  - `packages/db/prisma/schema.prisma:190-201` (`UserRole`)
- 事実:
  - `User` の一意性は `@@unique([tenantId, email])` であり、email は全tenant共通ではない。
  - login は `findFirst({ where: { email, isActive: true } })` で tenant を選ばない。
  - `userRoles` とその to-one `role` を tenant 条件なしで include し、得た role key をそのまま7日間の session tokenへ署名する。
  - `UserRole.userId` / `roleId` の relation は単一IDで、`UserRole.tenantId` と親子tenantの一致をDBが保証しない。
- なぜ実害になるか:
  - 同じemailが複数tenantに存在すると、どのtenantの利用者を認証するかがDBの取得順に依存する。同一passwordなら別tenantのsessionを取得でき、異なるpasswordなら正しい利用者がログイン不能になる。
  - tenant A の UserRole が tenant B の OWNER Role を参照する不整合があると、foreign role が session に入り、以後のpermission判定に使われる。これは単なる表示漏れではなく権限昇格である。
- 修正案:
  - login 入力に tenant slug / tenant selector を必須化し、`tenantId + email` で一意取得する。
  - `userRoles` は `where: { tenantId: user.tenantId }` で絞り、roleの `tenantId` も一致検証して不一致は fail-closed にする。
  - 長期対策として tenant を含む複合外部キーを検討する。schema変更は別Human Gateとする。
- 必須否定テスト:
  - 2 tenant に同一emailを作成し、tenant指定なしでは認証しないこと。
  - tenant A user → tenant B role の壊れた UserRole fixture で、foreign role が token に入らないこと。

### B-02 — Invoice / Dunning / Outreach の to-one relation が foreign 宛先を外部送信へ渡す

- 重大度: **CRITICAL**
- 場所:
  - `apps/web/lib/domains/finance/invoice-send.ts:42-71,116-175`
  - `apps/web/lib/domains/finance/dunning.ts:82-122,132-168,171-251`
  - `apps/web/lib/domains/leadmap/outreach-request.ts:35-70`
  - `apps/web/lib/domains/leadmap/outreach-send.ts:98-145`
  - `packages/db/prisma/schema.prisma:824-846` (`Invoice`)
  - `packages/db/prisma/schema.prisma:2782-2828` (`LocalBusinessLead`)
  - `packages/db/prisma/schema.prisma:2957-2978` (`OutreachDraft`)
- 事実:
  - 親 Invoice / OutreachDraft は actor tenant で取得するが、to-one `customer` / `receivable` / `invoice.customer` / `lead` は tenant を検証せず include する。
  - `invoice-send.ts:157-175` は include した Customer.email をproviderの `to`へ渡す。
  - `dunning.ts:225-247` は `Receivable -> Invoice -> Customer` の未検証チェーンから宛先を取り、providerへ渡す。
  - `outreach-request.ts:48-67` は未検証のLeadを承認表示に使い、その `leadId` をtenant条件なしの`update`へ渡す。
  - `outreach-send.ts:103-145` は未検証の `draft.lead.email` を送信ログとprovider宛先に使う。
  - schema の relation は単一IDであり、親と子の `tenantId` 一致をDBが保証しない。
- なぜ実害になるか:
  - tenant A の親が tenant B の Customer / Lead を参照する不整合を作ると、tenant B のメールアドレスへ tenant A の請求書、督促、営業メールを送れる。承認やexactly-onceが正しくても、承認対象の宛先自体がforeignなら情報漏えいを防げない。
  - 承認申請だけでもforeign Leadのstageを`PENDING_APPROVAL`へ変更できる。
  - 申請時のmasked preview、Approval payload、送信ログにもforeign PIIが複製される。
- 修正案:
  - to-one は include に委譲せず、関連IDを取得後に `{ id, tenantId }` で別取得するか、子の `tenantId` をselectして一致を明示検証する。
  - 申請時だけでなくprovider直前にも全チェーンを再検証し、1箇所でも不一致なら送信ログ作成前に fail-closed にする。
  - Invoice→Customer、Reminder→Receivable→Invoice→Customer、Draft→Lead の共通validatorを用意する。
- 必須否定テスト:
  - tenant A parent → tenant B recipient のfixtureで、Approval / AISafetyLog / SendLog / provider callが全て0件であること。
  - 正常な同tenant chainは従来どおり1回だけ送信されること。

### B-03 — foreign QuoteLineItem が請求書へ複製され、印刷にも露出する

- 重大度: **HIGH**
- 場所:
  - `apps/web/app/(app)/quotes/actions.ts:174-176,211-235`
  - `apps/web/app/(app)/quotes/[id]/page.tsx:33-35`
  - `apps/web/app/print/quotes/[id]/page.tsx:20-35`
  - `apps/web/app/print/invoices/[id]/page.tsx:43-45`
  - `packages/db/prisma/schema.prisma:758-770` (`QuoteLineItem`)
- 事実:
  - Quote parent は tenant scoped だが、`lineItems: true` は子tenantを絞らない。
  - `convertQuoteToInvoiceAction` は未検証の全 lineItems を `buildInvoiceDraftFromQuote` に渡し、tenant A の新規Invoice明細へ複製する。
  - Quote / Invoice の印刷画面も lineItems を tenant 条件なしで取得して表示する。
- なぜ実害になるか:
  - foreign商品の名称・数量・単価・金額が別tenantの正式な請求下書きへ取り込まれ、会計・顧客送付物・監査証跡へ永続化される。
  - 詳細画面だけを修正しても、印刷URLではforeign明細がそのまま閲覧・PDF化できる。
- 修正案:
  - 全取得を `lineItems: { where: { tenantId: user.tenantId } }` にする。
  - 変換のような財務確定処理では、単にforeignを除外するだけでなく `quoteId` に紐づくforeign子の存在を検査し、存在時は全処理を中止して監査可能な整合性エラーにする。
- 必須否定テスト:
  - own / foreign lineItemを同一Quoteへ付け、詳細・印刷にforeignが0件であること。
  - 変換はforeign子がある場合にInvoice / InvoiceLineItem / Auditを1件も作らないこと。

### B-04 — PurchaseOrder の foreign line が在庫を変更し、失敗時に received 状態を残す

- 重大度: **HIGH**
- 場所:
  - `apps/web/lib/domains/operations/procurement.ts:335-375`
  - `packages/db/prisma/schema.prisma:1583-1618` (`PurchaseOrder`, `PurchaseOrderLine`)
- 事実:
  - `receivePurchaseOrder` は親POを tenant scoped で取得するが、`include: { lines: true }` は未スコープ。
  - POを `received` にclaimした後、全lineを順次 `applyInventoryMovement` へ渡し、line自身も `update({ where: { id } })` で更新する。
  - 親claim、各在庫移動、各line更新は1つのtransactionではない。
- なぜ実害になるか:
  - tenant B lineがtenant A assetを指すと、そのforeign数量でtenant A在庫が増える。
  - tenant B assetを指す場合は在庫helperが拒否しても、POは先に `received` 済みであり、途中までのline / movementだけが残り得る。再実行はclaimに負けるため自己回復しない。
- 修正案:
  - claim前に全lineの `tenantId` と全assetのtenantを検証し、不一致が1件でもあれば書込み前に中止する。
  - PO claim、全line検証、`applyInventoryMovementTx`、line CAS、Growth / DomainEventを単一transactionへ入れる。
  - line更新は `{ id, tenantId }` の `updateMany` + `count === 1` とする。
- 必須否定テスト:
  - foreign line→own asset と foreign line→foreign asset の両fixtureで、PO status / receivedAt / inventory / line / Growth / DomainEvent / Outboxが全て不変であること。

### B-05 — EventCost のforeign値が粗利と会計台帳候補へ入る

- 重大度: **HIGH**
- 場所:
  - `apps/web/lib/operations.ts:169-188`
  - `apps/web/lib/domains/finance/finance-bridge.ts:293-325`
  - `packages/db/prisma/schema.prisma:2615-2641` (`EventProject`)
  - `packages/db/prisma/schema.prisma:2667-2676` (`EventCost`)
- 事実:
  - 両関数とも親EventProjectは tenant scoped だが、`include: { costs: true }` は子tenantを絞らない。
  - `recordEventProfitabilitySnapshot` は全costを合算し、親EventProjectのcost / grossとsnapshotへ書く。
  - `bridgeEventProjectToFinance` は全costを合算し、FinanceEvent、JournalCandidate、InvoiceCandidate、cashflow、Audit、Growth / DomainEventを作る。
  - 同bridgeは `event.customerId` もtenant再検証せずInvoiceCandidateへ渡す (`finance-bridge.ts:319`)。
- なぜ実害になるか:
  - tenant B の原価がtenant Aの粗利、仕訳候補、請求候補、資金繰りに転記される。画面上のforeign非表示だけでは、経営指標と台帳候補の汚染は残る。
  - evidence spec はforeign EventCost fixtureを作るが、これら2サービスを呼ばないため回帰を検出しない。
- 修正案:
  - EventCostを tenant scoped で取得し、財務確定前にはforeign childの存在自体を整合性エラーとしてfail-closedにする。
  - customerIdも `{ id, tenantId }` で検証する。
  - bridgeの全検証をadvisory lock取得後の同transaction内で再実行する。
- 必須否定テスト:
  - foreign EventCost / foreign Customer fixtureで、EventProject、snapshot、FinanceEvent、JournalCandidate、InvoiceCandidate、Audit、Growth、DomainEvent、Outboxが全て0件・不変であること。

### B-06 — LeadMap の未スコープ子がAI入力・下書き・配信停止リストを汚染する

- 重大度: **HIGH**
- 場所:
  - `apps/web/lib/leadmap.ts:131-176,238-267`
  - `apps/worker/src/jobs.ts:143-168`
  - `apps/web/app/(app)/leadmap/leads/[id]/page.tsx:31-42`
  - `apps/web/app/(app)/leadmap/leads/[id]/analysis/page.tsx:15-22`
  - `apps/web/app/(app)/leadmap/leads/[id]/outreach/page.tsx:39-47`
  - `packages/db/prisma/schema.prisma:2862-2874` (`PlaceReview`)
  - `packages/db/prisma/schema.prisma:2927-2941` (`LeadInsight`)
  - `packages/db/prisma/schema.prisma:3015-3026` (`OutreachReply`)
- 事実:
  - Webの分析関数は親Leadだけtenant scopedにし、reviews / websiteScans / socialProfiles / insights / campaignを未スコープでincludeする。
  - foreign review textはAI安全検査と分析入力へ入り、foreign insight / campaignは営業文面生成へ入る。
  - workerの分析・生成jobも同じ未スコープincludeを持つ。
  - `OUTREACH_REPLY_CLASSIFICATION_JOB` は `draftId` のtenant所属を確認せず、tenant AのOutreachReplyをforeign draftへ作成する。unsubscribe時は `findFirst({ id })` だけでforeign Draft→Lead.emailを読み、tenant AのSuppressionListへ登録する。
- なぜ実害になるか:
  - foreignの口コミ、分析結果、営業条件が別tenantのAIOutputと営業下書きへ複製される。実LLM利用時には外部送信境界にも到達する。
  - foreign顧客のemailが別tenantへ漏えいし、そのtenantの配信停止リストを汚染するため、正当な営業送信も抑止される。
- 修正案:
  - 全to-manyへ `where: { tenantId }`、全to-oneへtenant一致検証を追加する。
  - reply jobは最初に `outreachDraft.findFirst({ id, tenantId })` で所有権を固定し、その後のReply / Lead / SuppressionList書込みを1 transactionで行う。
  - AI providerへ渡す直前に、入力由来recordのtenant集合が `{tenantId}` だけであることを検証する。
- 必須否定テスト:
  - foreign Review / Insight / Campaign / Draft / Lead fixtureで、AIOutput、OutreachDraft、OutreachReply、SuppressionList、外部provider callが全て0件であること。

### B-07 — 追加の画面系 nested include / count に同じ未防御パターンが残る

- 重大度: **MEDIUM**
- 場所（静的パターン掃引で実確認）:
  - `apps/web/app/(app)/planning-hokko/page.tsx:35` — productUsages / nextProposals
  - `apps/web/app/(app)/contracts/page.tsx:15` — risks / clauses
  - `apps/web/app/(app)/communications/threads/[id]/page.tsx:16` — messages
  - `apps/web/app/(app)/leadmap/routes/page.tsx:13` — stops
  - `apps/web/app/(app)/subsidies/page.tsx:15` — eligibilityChecks / tasks
  - `apps/web/app/(app)/subsidies/[id]/page.tsx:17` — tasks / eligibilityChecks
  - `apps/web/app/(app)/operations/purchase-orders/[id]/page.tsx:25` — vendor / lines
  - `apps/web/app/(app)/operations/stocktakes/[id]/page.tsx:19` — lines / asset
  - `apps/web/app/(app)/admin/users/page.tsx:26` — userRoles / role
  - `apps/web/app/(app)/operations/events/page.tsx:20` — unscoped relation `_count`
- なぜ実害になるか:
  - parentが自tenantでも、schema上foreign childを接続できるため、契約本文、補助金タスク、メッセージ、在庫、権限等が別tenantの画面・件数へ混入する。
  - `_count` もforeign childを数えるため、本文を隠しても件数オラクルと集計汚染が残る。
- 修正案:
  - to-manyは全てtenant条件付きinclude/select/countへ統一する。
  - to-oneは子tenantを取得して一致検証する。画面ごとの手修正だけでなく、tenant-safe query helperまたはrepository層で標準化する。
- 必須否定テスト:
  - 各domainから代表1件ずつforeign child fixtureを作り、DOM・count・更新Actionが不変であること。

### B-08 — `m1b_tenant_ai_boundary_evidence.spec.ts` は対象範囲には有効だが、production wiringの証明が不足する

- 重大度: **MEDIUM（テスト証拠の欠落）**
- 場所:
  - `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:130-200`
  - 同 `:238-309`
  - 同 `:311-370`
  - 同 `:372-391`
- 正しく実証している範囲:
  - tenant A parentへown / foreign childを同時に接続するfixtureは、現在のschemaが許す越境形を正しく再現している。
  - Event 7種、Invoice lineItems/payments、Meeting childrenについて、legacy includeがforeignを取得し、tenant付きincludeがownだけを取得するRED/GREENは妥当。
  - Event / Invoice / Meetingの実ページを開き、foreign markerがDOMに出ないこともproduction route wiringを確認している。
- 不足:
  - InvoiceのCustomer / Receivable / Quote / Receipt等to-one fixtureが無い。
  - external send、Quote→Invoice、PO receive、Event profitability / finance bridge、LeadMap workerを呼ばず、副作用0件を確認しない。
  - OutreachApprovalのGREEN/REDはproduction Actionを呼ばず、spec内でproductionと同じ形の`updateMany`を再実装している。production側がtenant条件を落としても、このspecはgreenのままになり得る。
- 修正案:
  - Outreachは実フォームのServer Action POST replay、またはexportしたdomain coreを呼び、ownだけ更新・foreign不変を確認する。
  - to-one recipientと各service mutationのnegative fixtureを追加し、DB行だけでなくprovider回数、Audit、Growth、DomainEvent、Outboxまで0件を確認する。

## `findUnique` / `updateMany` / raw SQL の照合結果

- `apps/web/lib/approval.ts:128-205` はtenant無しの `findUnique` / `updateMany` を持つ。ただし現時点のproduction callsiteは、直前に `ApprovalRequest.findFirst({ id, tenantId })` で所有権を確認してから同じIDを渡しており、今回のfixed headで直接越境できる経路は確認できなかった。helperへtenantIdを必須化する防御多重化は推奨する。
- `apps/web/lib/events.ts:220-247,273-289,347-369` の event / outbox helper はworker内部IDを使う。Web入力からforeign IDを渡す直接経路は確認できなかった。
- inventory、invoice-send、lead stage/convert、stocktake、leaseの業務raw SQLロックには `tenantId` 条件が入っている。
- `apps/web/lib/domains/meetings/upload.ts:240-263` のlease更新raw SQLはID + status + owner fenceで、claimのtenant固定後にのみ呼ばれる。今回のcall flow上で実用的な越境は確認できなかったが、将来helperを公開する場合はtenantIdもSQL条件へ含めるべきである。
- `$queryRawUnsafe` / `$executeRawUnsafe` の本番業務経路は確認できなかった（seed / test用途を除外）。

## 推奨する修正順

1. B-01 login / role と B-02 外部送信宛先を最優先でfail-closed化する。
2. B-03〜B-06の財務・在庫・AI/worker副作用をtransaction内のtenant検証へ統合する。
3. B-08のproduction wiring negative testを先に追加し、修正前RED / 修正後GREENを固定する。
4. B-07を共通tenant-safe query方針で水平展開する。

## 監査境界

この文書は `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4` 限定のread-only監査結果である。fixed SHAが変わった場合、この判定は失効し再監査が必要となる。
