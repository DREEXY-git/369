# CODEX AUDIT [E] — M1-b 証拠・テスト・CI

> 監査対象: `claude/padn-m1b-hardening-v1` @ `1be06b5a5cc8f0e48ad659948b67d9821784a44d`
>
> 比較base: `main` @ `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
>
> 対象PR: #77（Draft）
>
> 監査日: 2026-07-21
>
> レーン: E（証拠・テスト・CI）

## 結論

**CHANGES_REQUIRED — EVIDENCE GAP**

CIは固定SHA `1be06b5` でgreenだが、M1-bの17修正を直接実証する新規test/evidence specは差分に1件もない。既存E2Eは隣接機能の回帰を守るだけで、今回追加されたtransaction、CAS、write-ahead、bridge冪等、cross-tenant child filter、human-only wiringを直接呼び出していない。

17修正はいずれもDBの最終状態、並行競合、rollback、またはtenant別の取得結果に主張の中心があるため、**17件すべてに少なくとも1つの実PostgreSQL oracleが必要**。ただし1修正1specにする必要はなく、後述の7本へ集約できる。

また、spec設計のために実装を追跡した結果、次の3経路には単なる未検証を超えるRED候補がある。

1. 請求送信は外部送信後にDB transactionを開始するため、送信成功後のDB失敗・並行実行で二重送信し得る。
2. PurchaseOrder/Damage bridgeは`findFirst → 複数create`のcheck-then-createで、並行呼出しを直列化するDB barrierがない。
3. outreachはApprovalRequest CASを先にcommitしてからwrite-ahead log・draft・leadを更新するため、途中失敗後の再実行がCASでno-opになり、`APPROVED + queued/未作成 + PENDING_APPROVAL`等で停止し得る。

これらはClaude側でproduction-shared coreとfault hookを整備し、RED→GREENを固定SHAで提示する必要がある。Codex Eは実装しない。

## CI exact-head確認

GitHub Actions run: `29753207457`（CI #440、head `1be06b5`）

| job | 結果 | ログ本文の実測 |
|---|---|---|
| `stage1` | success | unit **48 files / 590 tests passed**、typecheck success、lint success、critical skip/only/fixme scan success |
| `stage2_integration` | success | DB integration **26 files / 163 tests passed**、worker real queue **1 file / 9 tests passed** |
| `stage3_e2e` | success | meeting repeat **10 passed**、A2 gate **12/12**、mixed-writer repeat **12/12**、Phase B gate **14/14**、full E2E **372/372 passed** |
| `release_gate` | success | 全gate successを確認 |

A2/Phase BのJSON gateは`skipped=0 / unexpected=0 / flaky=0 / retries=0`。full E2Eログは`Running 372 tests`→`372 passed`を確認した。

**注意:** 上記greenは既存回帰網の通過を示すが、M1-b専用証拠ではない。M1-b差分はproduction 13 filesのみで、test file変更は0。

## 既存テストが守っている範囲

- `inventory_atomicity_evidence.spec.ts`は通常の在庫入庫に対するFOR UPDATE/lost-updateだけ。イベント割当・破損記録・人員配置の複数行原子性は未検証。
- `finance_bridge.spec.ts`はEventProject bridgeのUI smokeだけ。PurchaseOrder/Damage bridgeの並行冪等性・rollbackは未検証。
- `p1_8_finance_bridge.itest.ts`は期待行をテスト内で直接createしており、今回変更されたbridge関数を呼ばない。
- `invoice_payment.spec.ts`は画面表示のみ。`issueInvoiceAction`と`executeInvoiceExternalSend`のDB最終状態・競合・障害注入は未検証。
- `p1_31_usage_event_invoice_send.itest.ts`と`p1_29_usage_event_outreach.itest.ts`はUsageEvent recorderの重複防止であり、送信本体のwrite-ahead/原子性を検証しない。
- `growth_boundary.spec.ts`は閲覧境界のみ。AI/混在roleからcreate actionを直POSTしたときのDB不変を検証しない。
- `operations_exec.spec.ts`は人員・リスク・物流の表示smokeのみ。
- `content_review_db_evidence.spec.ts`はcontent reviewがoutreach送信ログを増やさないことを確認するが、outreach送信承認そのものは実行しない。
- `p1_10_invoice_payment.itest.ts`の`issueInvoiceAction`言及は権限契約の静的確認で、Server Actionのtransaction/CASを実行しない。

## Findings

### E-01 — 外部送信の不可逆境界にexactly-once証拠がない

- file: `apps/web/lib/domains/finance/invoice-send.ts:78-116`
- file: `apps/web/app/(app)/approvals/actions.ts:208-303`
- class: external I/O / write-ahead / crash recovery / concurrency
- severity: **HIGH**
- 実害: 請求送信はemail送信がDB transactionより前にあり、DB失敗時のretryで同じ請求書を再送できる。outreachはwrite-ahead行を作るが、ApprovalRequest CAS、OutreachApproval、log、draft、lead、auditが別commitで、失敗後に安全に再開できる状態機械が証明されていない。
- 修正案: real DB + instrumented fake email providerで、送信回数と各DB行を同時に観測するcore evidenceを追加する。実SMTP・外部送信は使わない。

必須oracle:

1. 同一Invoiceの並行2実行でprovider call 1、Invoice SENT 1、`payment_expected` 1、Audit 1。
2. provider成功直後、FinanceEvent/Audit直前のfaultでretryしてもprovider callが2にならない。
3. outreach承認の並行2 submitでCAS winner 1、SendLog 1、provider call 1、UsageEvent 1。
4. SendLog create後・provider前、provider後・log update前、draft/lead更新前の各faultについてdurableな再開状態を固定し、retryで送信重複も永久停止も起こさない。
5. suppression対象はprovider call 0、SendLog suppressed 1、draft/leadの状態が契約どおり。

### E-02 — bridge冪等ガードがTOCTOUで、並行重複を防ぐ証拠がない

- file: `apps/web/lib/domains/finance/finance-bridge.ts:195-238`
- class: idempotency / check-then-create race / partial commit
- severity: **HIGH**
- 実害: `findFirst`と後続の複数createの間にunique constraint、advisory lock、transactional claimがない。同一sourceを並行bridgeすると両方が「未処理」を観測し、FinanceEvent/JournalCandidate/InvoiceCandidate/Audit/Growth/DomainEventを重複または片欠けにできる。
- 修正案: source logical identity単位のDB barrierと単一transaction、または同等の一意なclaimをproduction coreへ実装し、実接続2本で決定論的に競合させる。

必須oracle:

- PurchaseOrderを4並行bridgeし、`purchase_order/payment_expected/cashflow_expected/JournalCandidate/Audit/Growth/DomainEvent/Outbox`が契約件数1組。
- DamageLossRecordを4並行bridgeし、InvoiceCandidate 1、JournalCandidate 1、FinanceEvent群1組。
- 各downstream createのfaultで全行0、retryで1組。
- 同一source IDでもtenantが異なれば互いに干渉しない。

### E-03 — transaction/CAS修正にrollback・競合の実DB証拠がない

- file: `apps/web/app/(app)/invoices/actions.ts:105-134`
- file: `apps/web/app/(app)/communications/actions.ts:91-119`
- file: `apps/web/app/(app)/deals/actions.ts:9-38`
- file: `apps/web/app/(app)/operations/actions.ts:189-209,328-370`
- file: `apps/web/lib/domains/operations/events.ts:58-84`
- class: atomicity / CAS / replay
- severity: **HIGH**
- 実害: transactionの存在だけでは、全downstreamが同じtxを使うこと、CAS loserが副作用を作らないこと、post-commit Growth失敗後のretryが業務行を重複させないことを証明できない。
- 修正案: production-shared coreにtest-only fault callbackを注入できる形を用意し、Prismaをmockせず実PostgreSQLの最終状態で検証する。

必須oracle:

- Invoice発行: 4並行でDRAFT→ISSUED winner 1、Receivable 1、Audit 1。Receivable/Audit faultは全rollback、retryで1組。
- Temporary item: save/discard並行でwinner 1。saveならThread/Audit 1、discardならThread 0/Audit 1。途中faultは全rollback。
- Deal stage: invalid enumはDB増分0。異なる次stageの並行CASはHistory/Audit各1で最終stageと一致。
- Event asset: Usage + Movement + asset quantity/statusがall-or-nothing。Movement faultでUsage 0。Growth fault/retryの契約を明示し、usage/reserve重複を許さない。
- Lease damage: DamageLossRecord + damage Movement + asset statusがall-or-nothing。
- Event staff: Assignment.costRecorded、EventCost、Auditが一致。cost/audit faultで全0。post-commit Growth retryでassignmentを重複させない。

### E-04 — outreach申請・編集・unsubscribeの状態機械に競合証拠がない

- file: `apps/web/app/(app)/leadmap/actions.ts:128-219,225-305`
- class: approval integrity / atomicity / idempotency / race
- severity: **HIGH**
- 実害: 申請は5書き込みをtransaction化したがDRAFT→PENDINGのCASがなく、並行申請でApprovalRequest/OutreachApprovalを複数作り得る。編集はsnapshotの`wasPending`に依存し、承認決定との競合で「承認内容≠送信内容」を再発させない証拠がない。unsubscribeはSuppressionListとlead stageだけがtxで、前段Reply/AIOutputとの再実行契約が未定義。
- 修正案: draft logical request単位のCAS/lockと、編集対承認の決定論的競合specを追加する。

必須oracle:

- 同一draftの並行4申請でDraft PENDING、OutreachApproval 1、ApprovalRequest 1、Lead PENDING、Audit 1。
- downstream各段faultで5表の増分0、retryで1組。
- PENDING draftの編集でdraft DRAFT、両approval種REJECTED、Audit 1を同時確定。faultで元状態維持。
- 編集と承認送信を別接続で競合させ、送信payloadが承認時snapshotと完全一致するか、どちらかが明示conflictで停止する。
- unsubscribe再送でSuppressionList 1、Lead UNSUBSCRIBED。lead update faultではSuppressionListもrollback。cross-tenant同一emailは独立。

### E-05 — child tenant filterにcorrupted fixtureの漏えい防止証拠がない

- file: `apps/web/app/(app)/operations/events/[id]/page.tsx:54-66`
- file: `apps/web/app/(app)/invoices/[id]/page.tsx:66-71`
- file: `apps/web/app/(app)/meetings/[id]/page.tsx:16-24`
- file: `apps/web/app/(app)/approvals/actions.ts:221-229`
- class: tenant isolation / relational integrity / confidentiality
- severity: **HIGH**
- 実害: schemaが単一列FKを許すという前提で追加した防御なので、正常seedだけのUI smokeでは意味がない。親Aへtenant Bの子を意図的に結合したfixtureを作り、A画面・更新から排除されることを実測する必要がある。
- 修正案: test専用tenant A/Bを作り、foreign markerを本文・金額・名前へ入れたcorrupted child fixtureを直接insertする。

必須oracle:

- Event detailの7 child collectionでforeign marker非表示、集計金額にも不算入。
- Invoice lineItems/paymentsでforeign marker非表示、表示合計/履歴に不算入。
- Meeting minutes/decisions/actionItems/transcripts/segmentsでforeign marker非表示。
- outreach承認決定でforeign tenantのOutreachApproval statusはPENDINGのまま、対象tenant行だけ更新。

### E-06 — human-only guardのaction wiringをDB不変で証明していない

- file: `apps/web/app/(app)/growth/actions.ts:10-59`
- file: `apps/web/app/(app)/operations/actions.ts:39-88,328-355`
- file: `apps/web/app/(app)/leadmap/actions.ts:128-172`
- class: authorization / AI boundary / negative evidence
- severity: **MEDIUM**
- 実害: `isHumanUser`純関数のunitはあるが、今回変更したServer ActionがDB接触前に拒否することは未検証。AI roleに業務permissionが付く設計なので、action wiringの退行は実レコード作成に直結する。
- 修正案: AI-only、human+AI mixed role、human positive controlの認証済み実POSTを用意し、全関連tableの増分を比較する。

必須oracle:

- AI/mixed roleはGrowthEvent/Audit/DomainEvent/Outboxを0件のまま拒否。
- inventory movement/adjust/event assignmentはProductAsset/Movement/Usage/ApprovalRequest/Growthを不変。
- outreach edit/requestはDraft/Lead/ApprovalRequest/Audit/AISafetyLogをDB接触前不変。
- OWNER等の人間positive controlだけが1組作成できる。

### E-07 — M1-b専用count gateがなく、将来の未収集を検知できない

- file: `.github/workflows/ci.yml`（現行stage3のM1-b専用収集なし）
- class: CI evidence integrity
- severity: **MEDIUM**
- 実害: specを追加してもファイル名誤り、skip、対象grep漏れでfull E2Eだけgreenになり得る。現在のA2/Phase Bはexact count JSON gateを持つがM1-bにはない。
- 修正案: 7 specを1つのM1-b grep/tagへ束ね、`--retries=0 --reporter=json`で`expected=N / skipped=0 / unexpected=0 / flaky=0`を固定する。workflow変更を避ける場合でもfull E2Eログから同じJSONをartifact化し、件数gateを必須にする。

## Claude向け最小spec構成案

| spec案 | 主に覆う修正 | 最低限のテスト骨子 |
|---|---|---|
| `m1b_invoice_lifecycle_evidence.spec.ts` | invoice issue/send | CAS競合、全rollback、送信1回、FinanceEvent/Audit件数、send後fault recovery |
| `m1b_outreach_send_evidence.spec.ts` | approval write-ahead/send | concurrent approve、queued→sent、suppression、各crash window、provider call count |
| `m1b_outreach_state_evidence.spec.ts` | request/edit/unsubscribe | 5-write atomicity、parallel request、edit-vs-approve、suppression idempotency |
| `m1b_operations_atomicity_evidence.spec.ts` | asset/damage/staff | real row lock、fault rollback、core tuple件数、post-commit replay |
| `m1b_cas_misc_evidence.spec.ts` | deal/temp | invalid input、parallel winner 1、History/Thread/Audit整合、fault retry |
| `m1b_finance_bridge_idempotency_evidence.spec.ts` | PO/damage bridge | deterministic parallel barrier、全ledger件数1、fault rollback、tenant独立 |
| `m1b_tenant_ai_boundary_evidence.spec.ts` | child scopes/human-only | corrupted cross-tenant fixture、foreign marker非表示/不更新、AI DB増分0 |

共通条件:

- loopback/ephemeral PostgreSQLのみ。実メール、実LLM、Production、Secretsを使わない。
- Prisma mockでtransactionを「通ったこと」にしない。最終行数・値・relationをre-fetchする。
- 並行試験はsleep依存を避け、advisory lock、row lock、barrier、`pg_blocking_pids`等で競合経路を観測する。
- fault後の0件oracleと、同一入力retry後の期待件数oracleを対にする。
- fixture/cleanupはテスト生成IDに限定し、共有seedを広範囲deleteしない。
- exact-head、`retries=0`、skip/fixme/only 0、M1-b専用expected count固定。

## 固定SHA判定

`1be06b5a5cc8f0e48ad659948b67d9821784a44d`に対するCodex E判定は **CHANGES_REQUIRED**。

CI failureはない。blockerは「CIが赤」ではなく、17修正の主要主張を直接実証する実DB evidenceが存在しないこと、および上記RED候補3経路である。Claudeがspecと必要な実装修正を追加してheadが変わった時点で、この判定は失効し、新fixed SHAで再監査する。
