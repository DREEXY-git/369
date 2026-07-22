# Codex Round 3 再監査 — Lane C（原子性・一貫性）

- 対象: `origin/main`
- 固定 SHA: `ae8757328f69f0c210ac387b8f7f9429d2a76951`
- 監査日: 2026-07-22
- Task Queue: `tasks/CODEX_QUEUE.md`「ラウンド3」。対象SHAはユーザー指定の `ae87573` を優先。
- 判定: **CHANGES_REQUIRED**
- 方法: source / schema / tests の read-only 静的監査。DB・外部送信・本番・Secrets は未使用。DB必須 evidence spec は実行していない。

直近の境界修正では、#93 `decideAiGateAction`、#97 event/logistics Actions、#96 invoice/dunning approved-send Actions の `isHumanUser` 判定が DB 接触前に置かれていることを確認した。#95 B-06 も draft を tenant scope で確定後に write する。ただし #95 B-02 は下記 C-05 の部分確定を残す。また、旧C監査対象の invoice-send / outreach-send / finance-bridge と対応 evidence spec は `bb9ef05` から byte-for-byte 不変であり、旧 finding は最新 main でも解消していない。

## C-01 — `payment_reversal` が cashflow 集計対象外で、取消後も入金実績が残る

- file:line: `apps/web/app/(app)/approvals/actions.ts:291-296`, `apps/web/lib/domains/finance/cashflow.ts:88-102`, `packages/shared/src/finance.ts:378-405`, `apps/web/tests/e2e/payment_reversal_evidence.spec.ts:58-74`
- 種別: 財務集計の不整合 / dead ledger event
- 重大度: **HIGH**

入金取消は `FinanceEvent(type='payment_reversal', direction='outflow', status='posted')` を作り、「inflow−outflow で純額を戻す」としている。しかし `getCashflowUnifiedData` は `cashflow_expected/payment_expected/payment_received` しか取得せず、shared の `CF_FLOW_TYPES` にも `payment_reversal` がない。5,000円の入金後に全額取消しても cashflow の `inflowActual/netActual` は +5,000円のままで、取消 event は表示計算に一度も入らない。現行 spec は reversal 行の存在だけを確認し、集計値を検証していない。

修正案:

- `payment_reversal` を正式な `FinanceEventType` と cashflow query / summary の実績対象に追加し、posted outflow として差し引く。
- `payment_received + payment_reversal` の全額・一部取消で `netActual` が純入金額と一致する unit / DB evidence test を追加する。

## C-02 — Payment 削除が request-level 冪等性の anchor を消し、元リクエストの retry で取消済み入金が復活する

- file:line: `apps/web/app/(app)/approvals/actions.ts:276-294`, `apps/web/lib/domains/finance/payments.ts:68-80`, `apps/web/lib/domains/finance/payments.ts:92-159`, `packages/db/prisma/schema.prisma:881-892`, `apps/web/tests/e2e/payment_reversal_evidence.spec.ts:27-82`
- 種別: idempotency tombstone loss / replay consistency
- 重大度: **HIGH**

`recordInvoicePayment` は `(tenantId, requestKey)` から導出した `Payment.id` の存在を request-level 冪等性の唯一の anchor にする。一方、取消はその Payment 行を物理削除する。取消後に元の requestKey がネットワーク retry・queue replay・古いクライアント再送されると、同じ ID が再び空いているため Payment / `payment_received` / Audit が新規作成され、取消済み入金が復活する。既存 DomainEvent identity は重複 hit になるため、Payment と FinanceEvent だけが再作成され event lineage も片欠けする。現行 reversal spec は requestKey 由来の Payment を使わず、取消後 replay を検証しない。

修正案:

- Payment を削除せず immutable に残し、`reversedAt/reversalId` 相当の durable state または別 Reversal/tombstone を request identity に結び付ける。
- `recordInvoicePayment` は reversed identity の retry を再計上せず、元結果への収束または明示的 fail-closed にする。
- 「record(requestKey) → reverse → 同じ requestKey を逐次/並行 retry」の negative test で Payment・actual cashflow・Audit・DomainEvent の増分0を確認する。

## C-03 — 入金取消の申請が check-then-create で、重複 PENDING と監査片欠けを作れる

- file:line: `apps/web/app/(app)/invoices/actions.ts:186-214`, `packages/db/prisma/schema.prisma:281-312`, `apps/web/tests/e2e/payment_reversal_evidence.spec.ts:39-56`
- 種別: TOCTOU / non-atomic approval request
- 重大度: **MED**

同じ payment の PENDING 検索と `ApprovalRequest.create` の間に transaction・lock・unique constraint がないため、並行申請は双方が miss を観測して2件作れる。1件目の承認が Payment を削除すると、2件目は毎回 `payment not reversible` で決定 transaction が rollback し、解消不能な PENDING として残る。また ApprovalRequest create と `writeAudit` も別 commit なので、その間の crash は監査なしの危険操作申請を残す。現行 spec は単発申請のみ。

修正案:

- `(tenantId, paymentId, active reversal)` identity を advisory lock / schema-backed unique claim で直列化し、既存申請へ収束させる。
- ApprovalRequest と request Audit を同じ transaction で確定する。
- 並行4申請、create後 fault、既存取消済み Payment への再申請を覆う test を追加する。

## C-04 — Deal stage は不正な `expectedStage` を現状態へ置換し、`lostReason` も過去値を保持する

- file:line: `apps/web/lib/domains/deals/deal-stage.ts:33-61`, `apps/web/app/(app)/deals/actions.ts:9-22`, `apps/web/tests/e2e/m1b_cas_misc_evidence.spec.ts:143-167`, `apps/web/tests/e2e/deals_lost_reason_smoke.spec.ts:1-34`
- 種別: stale-intent CAS fail-open / state payload inconsistency
- 重大度: **MED**

Action は client の `expectedStage` をそのまま渡すが、core は欠落・非enum値を `deal.stage` に置換する。古い画面の captured POST から `expectedStage` を落とす／壊すと、リクエスト時点の最新 stage を新しい expected として stale な target を適用でき、導入目的だった stale-intent 拒否を迂回する。現行並行 test は正しい `expectedStage` だけを渡す。

また `lostReason` は LOST への遷移で非空のときだけ update data に入る。LOST(reason=A) → 他 stage → LOST(reasonなし) では A が一度も clear されず、今回の失注理由として再表示・再集計される。smoke spec は select の存在だけで遷移意味論を検証しない。

修正案:

- Server Action 到達経路では `expectedStage` の欠落・非enumを `invalid-stage` として書き込み前に拒否する。後方互換が必要なら trusted internal API と user intent API を分離する。
- LOST 以外へ移るときは `lostReason=null`、LOST へ移るときは今回入力を明示的に set（空を許すなら null）する。
- malformed/missing expectedStage の negative test と、LOST(A)→CONTACT→LOST(empty/B) の履歴・集計 test を追加する。

## C-05 — B-02 の tenant update が count 0 を成功扱いし、承認セットを部分確定する

- file:line: `apps/web/lib/domains/leadmap/outreach-request.ts:36-75`, `apps/web/lib/domains/leadmap/outreach-send.ts:103-145`, `apps/web/tests/e2e/m1b_outreach_state_evidence.spec.ts:104-169`
- 種別: partial commit / fail-open relation integrity
- 重大度: **HIGH**

#95 は Lead update に `tenantId` を追加して foreign Lead の書換えを防いだが、`updateMany.count` を確認しない。tenant不一致の Draft→Lead relation が既に存在すると、Draft=`PENDING_APPROVAL`、OutreachApproval、ApprovalRequest、Audit は commit され、Lead だけ更新されない。それでも戻り値は `requested` になる。後続 send core は同じ foreign relationを `include:{lead:true}` で読み、foreign Lead のメールを tenant A の承認として送信対象にできるため、単なる表示ずれではない。

現行 evidence は正しい同一tenant relationだけを作り、「5表すべて確定」という主張を count 0 ケースで検証していない。

修正案:

- Lead update の count が1でなければ throw して transaction 全体を rollbackする。
- claim後の Draft/Lead 読取でも両方の tenant identity を照合し、不一致を fail-closed にする。
- foreign Lead を参照する同tenant Draft fixtureで、申請・Approval・Audit・送信がすべて0になる negative test を追加する。

## C-06 — Invoice approved-send は production wrapperを含め resumable でなく、未送信を `SENT` にできる

- file:line: `apps/web/lib/approval.ts:173-207`, `apps/web/app/(app)/invoices/actions.ts:220-248`, `apps/web/lib/domains/finance/invoice-send.ts:124-232`, `packages/integrations/src/email/smtp.ts:21-33`, `apps/web/tests/e2e/m1b_invoice_lifecycle_evidence.spec.ts:113-205`
- 種別: crash consistency / external side effect / false exactly-once / event loss
- 重大度: **HIGH**

#96 の人間ガードは action 境界で正しく効くが、送信状態の原子性は未解消である。

- `executeApprovedAction` は executor 前に Approval を `executing` として commitする。直後の process crash はメール0回・Approval永久 executingとなり、retryは `already-executed` でcoreへ再入できない。
- Invoice core は provider前に `pending_send` claimをcommitする。claim直後 crashまたは並行retryは既存claimを「provider済み」とみなし、provider 0回のまま Invoice=`SENT` / claim=`approved` / Auditを確定する。
- SMTPが `{status:'failed'}` を返しても同じfinalizeへ進む。
- finalize後の DomainEvent/Outbox/Growth/Usage はpost-commitで、crash後のretryは approved claimを `done` として即returnするため欠落を修復しない。

現行specはcoreを直接呼ぶため production wrapper の executing crashを通らず、用意済みの `__faultAfterClaimForTest` も使用していない。

修正案:

- Approval claim、send attempt、provider receipt、Invoice finalize、transactional outboxを1つのdurable state machineとして設計する。
- provider idempotency key / receipt確認なしに `pending_send` を成功証跡として扱わない。`failed/suppressed` はSENTにしない。
- stale executing のlease/fencing付きtakeoverと、外部再送なしの内部evidence補修を実装する。
- wrapper claim直後、claim後provider前、provider failed、finalize後event前の各fault/race testをproduction経路で追加する。

## C-07 — Outreach の `sending` と suppression snapshot が成功証跡にならず、未送信・失敗・抑止対象を `SENT` にできる

- file:line: `apps/web/lib/domains/leadmap/outreach-send.ts:103-205`, `packages/integrations/src/email/smtp.ts:21-33`, `apps/web/tests/e2e/m1b_outreach_send_evidence.spec.ts:149-297`
- 種別: resumable state machine / TOCTOU / external-send consistency
- 重大度: **HIGH**

`queued→sending` をcommitしてから providerを呼ぶため、その2文間のcrashやprovider throwでは未送信の `sending` が残る。retryは `sending` を無条件に `sent` へ昇格する。providerが通常契約どおり `{status:'failed'}` を返す場合も、SendLogだけfailedになり、Draft/Lead/Approvalと戻り値は `SENT/sent` になる。現行W2 testはprovider成功後hookだけで、provider前crash・失敗を覆わない。

さらに suppression はSendLog transaction前にsnapshotされ、provider直前に共有barrierで再検証されない。判定後に配信停止がcommitしても送信でき、queued作成後に抑止されたretryではqueued logを残したまま他状態だけ抑止終端に進む。

修正案:

- attempt claimとprovider-confirmed receiptを分け、provider idempotency/reconciliationで成功確認できる場合だけsentへ進める。
- suppression writerとsend claimに宛先identity単位の共有barrier/fencingを持たせる。
- sending commit後provider前fault、provider throw/failed、delayed providerとの並行retry、suppression競合のdeterministic testsを追加する。

## C-08 — Dunning approved-send はwrite-ahead無しで、provider失敗を `sent` にし、crashでApprovalを永久停止させる

- file:line: `apps/web/lib/approval.ts:173-207`, `apps/web/app/(app)/invoices/actions.ts:332-363`, `apps/web/lib/domains/finance/dunning.ts:219-275`, `packages/integrations/src/email/smtp.ts:21-33`, `packages/db/src/__tests__/p1_15_dunning.itest.ts:93-110`
- 種別: external side effect / crash consistency / non-atomic writes
- 重大度: **HIGH**

#96 のAI遮断は正しいが、dunning本体にはdurable send attemptがない。Approval claim後provider前crashはexecutingで永久停止し、provider成功後Reminder更新前crashは「メール送信済み・Reminder pending・Approval executing」を残す。throw後のclaim reset→retryはprovider側結果が曖昧なら二重送信になり得る。

また `newStatus` はprovider結果でなく `EXTERNAL_SEND_ENABLED` だけから `sent` に決まるため、SMTPが `{status:'failed'}` を返してもReminder=`sent`、Audit/Growth/Approval=`executed` になる。DB testはproduction coreを呼ばず、成功状態を手作業で再現するだけなのでこの窓を証明しない。

修正案:

- Invoice/Outreachと共通のdurable send-attempt + provider idempotency/receipt契約へ統合する。
- `failed/suppressed` をsentへ変換せず、retryable/failed terminalを明示する。
- production wrapperを通すclaim前後・provider前後・DB write途中のfault testsとprovider failed testを追加する。

## C-09 — Finance bridge は重複を直列化するが、lock前の古いsource金額を恒久台帳化する

- file:line: `apps/web/lib/domains/finance/finance-bridge.ts:293-329`, `apps/web/lib/domains/finance/finance-bridge.ts:333-395`, `apps/web/tests/e2e/m1b_finance_bridge_idempotency_evidence.spec.ts:139-259`
- 種別: stale-read TOCTOU / ledger consistency
- 重大度: **MED**

advisory xact lockと単一transactionは同じbridge関数を通るduplicate writerを1組に収束させる。しかし EventProject/PurchaseOrder/DamageLossRecord と金額・期日・名称はtransaction/lockの外で読み取る。source更新writerはこのadvisory lockを共有しないため、読取後・lock前のsource更新を跨ぐと古い金額を台帳化できる。その後は既存markerがretryをno-opにし、自動修復されない。対象sourceとevidence specは旧監査SHAから変更がない。

修正案:

- advisory lock取得後、同じtransaction内でsource row/必要な子行を再取得し、そのsnapshotから台帳値を導出する。
- source更新と共有するrow lock/revision CAS、固定lock順序、bridge済み後の再計上契約を定義する。
- pre-readとlock取得の間にsource金額を更新するdeterministic race testを追加する。

## 総合判定

`ae87573` に対する Lane C 判定は **CHANGES_REQUIRED**。特に C-01/C-02 の入金取消、C-05 のoutreach部分確定、C-06〜C-08の外部送信状態機械は、財務実績または外部副作用を誤って確定できるためrelease-blockingである。
