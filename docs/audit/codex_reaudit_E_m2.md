# Codex独立再監査 E — M2準備ページ / 送信中クレーム3経路

> 判定対象: `origin/main` @ `9bff4e91da89ea7739eb72d647671e7c85350783`
>
> 対象PR: #107 M2実運用準備ページ、#111 送信中クレーム3経路化
>
> 監査日: 2026-07-23
>
> 実施範囲: read-only静的監査。DB・Secrets・外部送信・実LLM・課金・本番操作は未実施。

## 結論

**CHANGES_REQUIRED**

M2準備ページの全DBクエリは`tenantId`でスコープされ、feature flag helperから画面へ渡る値もbooleanのみで、API key・SMTP credential等の秘密値は出力していない。`admin:read`も「PIIを取得しないread-only管理画面」という現在のRBAC設計には整合する。

一方、Human Gateチェックリストの「3経路すべてexactly-once済・二重送信ゼロ」は実装契約と一致しない。督促実装はpre-send crashでprovider 0回のままterminal化する**at-most-once**を明示的に選択し、証拠specもその1通落ちを固定している。請求書と営業メールにも同じclaim後・provider前の不確定窓がある。したがって「済」の緑表示は、本番ON判断に使う保証として過大である。

また、請求書クレーム集計は`FinanceEvent.status='pending_send'`だけを条件にしており、`type='payment_expected' / sourceType='Invoice'`を限定しない。現在のproduction writerではInvoice送信だけが`pending_send`を作るため通常データでは一致するが、schema上の`status/type/sourceType`は自由文字であり、legacy・手動・将来writerの非Invoice行を請求書クレームとして過大計上できる。

## 固定ref

- fetch後の`origin/main`: `9bff4e91da89ea7739eb72d647671e7c85350783`
- PR #107: merged、merge commit `7b5ca01518770d929576f556a66f9ff619550a9e`
- PR #111: merged、merge commit `32f6a58715f1385f16a0a5e684f93e183f03c97f`
- 監査branchは上記`origin/main`から作成し、元のdirty checkoutには触れていない。

## 観点別判定

### 1. 送信中クレーム3経路の捕捉

**PARTIAL PASS / 1件修正必要**

対象: `apps/web/app/(app)/admin/m2-readiness/page.tsx:52-70`

| 経路 | ページの条件 | productionのin-flight状態 | 判定 |
|---|---|---|---|
| 請求書 | `FinanceEvent.status='pending_send'` | `payment_expected + sourceType=Invoice + sourceId=invoiceId + pending_send` | **過大条件**。statusだけで非Invoice行も数える |
| 督促 | `CollectionReminder.status='sending'` | claim時に`sending`、finalizeで`sent|logged` | PASS |
| 営業メール | `OutreachSendLog.status in ('queued','sending')` | write-ahead直後が`queued`、provider claim後が`sending` | PASS |

`inFlightClaims`は3つの独立table countだけを加算しており、`sendLogByStatus.groupBy`の値は合計へ再加算していないため、ページコード内の二重カウントはない。同一Invoiceに請求書送信と督促送信が同時に存在する場合も、別の外部メール操作2件なので2クレームとして数えるのが妥当である。

現在のrepositoryで`status: 'pending_send'`を書き込むproduction codeはInvoice送信だけであり、正常writer由来データの漏れは確認しなかった。ただし`FinanceEvent.status`はschema上`String`で、`pending_send`をInvoice専用にするDB制約はない。請求書件数を正確な経路数として表示するなら、最低でも次のidentityへ限定する必要がある。

```ts
{
  tenantId: t,
  status: 'pending_send',
  type: 'payment_expected',
  sourceType: 'Invoice',
}
```

### 2. feature flagとSecrets非出力

**PASS**

対象:

- `apps/web/app/(app)/admin/m2-readiness/page.tsx:47-50,97-105`
- `packages/integrations/src/email/index.ts:25-28`
- `packages/ai/src/providers/index.ts:62-64`
- `packages/integrations/src/maps/index.ts:21-23`

- `isExternalSendEnabled()`は`EXTERNAL_SEND_ENABLED === 'true'`のbooleanだけを返す。
- `isExternalLlmEnabled()`はprovider/keyの成立をserver側で判定し、ページへはbooleanだけを返す。
- `isGoogleMapsEnabled()`はproviderがgoogleかつkeyが存在するかをboolean化する。
- JSXへ渡る値は`sendOn / llmOn / mapsOn`だけで、`process.env`、API key、SMTP user/pass、base URL等をrenderしていない。
- 画面に出る環境変数名は固定説明文字列であり、値ではない。

補足として、外部メールのbooleanはマスタースイッチだけを表し、`MAIL_PROVIDER=smtp`やSMTP credentialの準備完了までは検証しない。ただしカード見出しも「マスタースイッチ」と明示しているため、Secrets観点の不合格理由にはしない。

### 3. 権限とtenant scope

**PASS（role範囲の明示が必要）**

対象: `apps/web/app/(app)/admin/m2-readiness/page.tsx:34-68`

- 認証後、データ取得前に`admin:read`を検査している。
- 8本のPrisma queryはすべて`tenantId: user.tenantId`を持つ。
- 件数/groupByだけを取得し、Consent・Suppression・送信先等のPII本文を取得しない。
- deployment-wide flagはtenant非依存だがbooleanのみである。

現在のRBACではOWNERに加え、EXECUTIVE・ADMIN・READ_ONLYが`admin:read`を持つ。したがってこのページは「OWNER/ADMIN専用」ではない。全resourceを閲覧できるREAD_ONLYにも、秘密値なしの準備件数とON/OFFを見せるという現行ポリシーなら妥当である。運用意図がOWNER/ADMIN限定なら`admin:read`では広すぎるため、role key gateまたは専用permissionを別途Human Gateで決める必要がある。

### 4. 「3経路 exactly-once済」表記

**FAIL — HIGH**

対象:

- `apps/web/app/(app)/admin/m2-readiness/page.tsx:53-57,121-130`
- `apps/web/lib/domains/finance/dunning.ts:230-253,264-327`
- `apps/web/lib/domains/finance/invoice-send.ts:96-114,124-198`
- `apps/web/lib/domains/leadmap/outreach-send.ts:113-162`
- `apps/web/tests/e2e/m2_dunning_send_evidence.spec.ts:198-219`

ページは「3経路すべてexactly-once」「二重送信ゼロ」「済」と断定する。しかし督促coreの正式コメントは、claim後・provider前のcrashでは1通落ちを許容し、二重送信回避を優先する**at-most-once**だと明記する。実PG specも次をGREEN契約としている。

1. `CollectionReminder`を`sending`へcommit
2. provider前にfault
3. provider callは0
4. retryはproviderを呼ばない
5. そのまま`sent|logged`へterminal化

これは二重送信防止ではあるが、exactly-onceではない。「送信した」というterminal状態と実送信0件が両立する。

Invoiceも`pending_send`をprovider前にcommitし、retryは既存claimを`resume`してproviderを呼ばずSENTへfinalizeする。Outreachも`queued→sending`をprovider前にcommitし、retryは`sending`をprovider済みとみなして`sent`へ更新する。外部providerのidempotency key・送達照合・transactional relayがない以上、3経路ともDB claimだけでstrict exactly-onceを保証できない。

Human Gateチェックリストは、少なくとも次のどちらかが必要である。

- 現実の契約どおり「at-most-once（二重送信回避優先）。pre-send crashは未送信の可能性があり手動照合・再送が必要」と表示し、緑の「済」を外す。
- provider idempotency/送達照合を含む実装とcrash-window evidenceを追加してからexactly-onceを名乗る。

現在の監視カードも、滞留claimの再実行を単純なfinalizeとして案内すると、未送信を送信済みに確定し得る。送信provider側の記録照合を先に要求する案内が必要である。

## テスト/evidence状況

- `m2_dunning_send_evidence.spec.ts`は督促のat-most-once trade-offを直接証明しており、ページ表記との矛盾を再現可能な証拠になっている。
- M2 readinessページ自体について、3tenant/3経路のcount、非Invoice `pending_send`、cross-tenant除外、flag非漏えいを固定する専用specは見つからなかった。
- 本監査では禁止境界に従いDB testや実providerを起動していない。判定はcurrent mainのwriter、schema、既存実PG specの静的突合による。

## 最小修正条件

1. `invoiceClaims`をInvoice送信claimのlogical identityまで限定する。
2. 「3経路exactly-once済・二重送信ゼロ」の緑表示を実装契約へ合わせる。
3. 滞留claimはprovider送達記録を照合してから再送/finalizeを判断する旨を表示する。
4. 専用specで、各経路1件・別tenant各1件・非Invoice `pending_send` 1件を作り、対象tenantの表示が`1/1/1=3`で非Invoice/別tenantを数えないことを固定する。

## fixed SHA判定

`9bff4e91da89ea7739eb72d647671e7c85350783`に対するCodex E判定は **CHANGES_REQUIRED**。

修正は行っていない。この文書は監査結果のみであり、main merge・本番・DB・Secrets・外部送信・課金を伴わない。
