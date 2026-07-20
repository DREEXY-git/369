# CODEX AUDIT [E] — M1-b 証拠・テスト・CI 再監査

> 対象PR: [#77](https://github.com/DREEXY-git/369/pull/77)（Draft）
>
> 監査対象head: `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`
>
> 比較base: `main` @ `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
>
> Round 1判定: `CHANGES_REQUIRED` @ `1be06b5a5cc8f0e48ad659948b67d9821784a44d`
>
> 監査日: 2026-07-21 / レーン: E（証拠・テスト・CI）

## 結論

**CHANGES_REQUIRED**

Round 2で7本・49件のM1-b実PostgreSQL evidence specが追加され、Prisma mockを使わずproduction-shared coreとDB最終状態を直接検証する構造になった。Round 1の3 REDのうち、Finance bridge barrierとoutreach申請CASは実DBでGREENになった。

しかし固定headに紐づくCI #443は`stage3_e2e`がfailureであり、M1-bは **49件実行 / 43 PASS / 6 FAIL / skip 0**。deal stage CASは期待winner 1に対して実測winner 2、human-only action境界5件はすべて30秒timeoutで証拠が成立していない。

さらに、Invoice/outreachの送信状態機械は、DB claimをprovider呼出し前に永続化した後の障害を「provider呼出し済み」とみなす。claim後・provider前のprocess crashまたはprovider例外では、実際は未送信でもretryがproviderを呼ばずSENT/sentへ確定する。現在のgreen specはこの障害窓を通らないため、strict exactly-onceだけでなく「永久停止なし」の主張も証明していない。

M1-b専用count gateも未追加である。今回のログからskip 0は確認できるが、将来のspec削除・rename・skipをCIが機械的に検知できない。

## fixed SHA / CI確認

- ローカル隔離worktreeは`bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`へpinし、元のdirty checkoutには触れていない。
- GitHub live stateでもPR #77のheadは同じ`bb9ef05`、Draft / open。
- [CI #443 / run 29759499710](https://github.com/DREEXY-git/369/actions/runs/29759499710) はhead `bb9ef05`に紐づくPR run。Actionsのcheckout実体はPR merge ref `fcd7e356039ece1df870bcb37722e67d73eda13d`（`bb9ef05`をbase `2ebc45a`へmergeした検証tree）。

| job | 結果 | ログ本文の確認 |
|---|---:|---|
| `stage1` | success | unit / typecheck / lint / critical skip scan success |
| `stage2_integration` | success | DB integration / worker real-queue success |
| `stage3_e2e` | **failure** | full E2E `415 passed / 6 failed`。失敗6件はすべてM1-b |
| `release_gate` | **failure** | `stage3_e2e` failureを反映 |

### M1-b 7 specのログ実測

| spec | 収集数 | PASS | FAIL | 判定 |
|---|---:|---:|---:|---|
| `m1b_invoice_lifecycle_evidence.spec.ts` | 6 | 6 | 0 | テストはgreen。ただし送信前crash窓が欠落 |
| `m1b_outreach_send_evidence.spec.ts` | 7 | 7 | 0 | テストはgreen。ただしclaim後・provider前の窓が欠落 |
| `m1b_outreach_state_evidence.spec.ts` | 9 | 9 | 0 | 申請CAS・5段fault/retryを確認 |
| `m1b_operations_atomicity_evidence.spec.ts` | 5 | 5 | 0 | 対象coreのrollback/retryを確認 |
| `m1b_cas_misc_evidence.spec.ts` | 7 | 6 | **1** | deal stage並行CASでwinner 2 |
| `m1b_finance_bridge_idempotency_evidence.spec.ts` | 5 | 5 | 0 | PO/Damage barrier・rollback/retryを確認 |
| `m1b_tenant_ai_boundary_evidence.spec.ts` | 10 | 5 | **5** | tenant境界5件PASS、human-only 5件timeout |
| **合計** | **49** | **43** | **6** | **skip 0、stage3 failure** |

49件すべてにPASSまたはFAILの実行行があり、Playwright summaryにもskipはないため、このrunの実測skipは0。ただしM1-b専用JSON stats/count assertionは存在しない。

## Round 1の3 RED再判定

| RED | 再判定 | 根拠 |
|---|---|---|
| 外部送信 exactly-once | **RED継続** | provider前にclaim/`sending`を永続化し、retryはそれをprovider済みと誤認する。critical fault oracleが欠落 |
| Finance bridge barrier | **GREEN（対象範囲）** | `pg_advisory_xact_lock` + 同一transaction、PO/Damage各4並行で1組、fault後0→retry 1組が実PGでPASS |
| outreach申請CAS | **GREEN** | DRAFT→PENDING CAS、4並行winner 1、5段すべてfault後5表0→retry 1組が実PGでPASS |

## Findings

### E2-01 — HIGH: 送信claimが「provider開始」と「provider成功」を区別せず、未送信をSENT化する

対象:

- `apps/web/lib/domains/finance/invoice-send.ts:124-178`
- `apps/web/lib/domains/leadmap/outreach-send.ts:137-162`
- `apps/web/tests/e2e/m1b_invoice_lifecycle_evidence.spec.ts:113-205`
- `apps/web/tests/e2e/m1b_outreach_send_evidence.spec.ts:149-217`

Invoiceは`payment_expected=pending_send`をcommitしてからproviderを呼ぶ。既存`pending_send`のretryは`resume`となりproviderを呼ばずfinalizeする。したがって次の順序では実メール0件なのにInvoiceがSENTになる。

1. claim commit
2. process crash、またはproviderがthrow
3. retryが既存claimを`resume`
4. provider 0回のままInvoice SENT / claim approved

`__faultAfterClaimForTest`は実装されているが、6件のInvoice specから一度も使用されていない。現在のfault testはprovider成功後とfinalize途中だけである。

outreachも`queued→sending`をDBへcommitしてからproviderを呼ぶ。claim直後のcrash/provider例外で`sending`が残ると、retryは無条件に`sent`へ更新する。W1はclaim前、W2はprovider成功後にfaultを入れるため、同じcritical windowを避けている。

非idempotent providerと別DBの組合せでは、DB状態だけでstrict exactly-onceを証明できない。少なくとも契約をat-most-onceへ明示的に変更して未送信をsent扱いしないreconciliationを定義するか、provider idempotency key等で成功を照合できる設計と、その実PG oracleが必要。現状の「送信重複も永久停止も起きない」は不成立。

### E2-02 — HIGH: deal stage CAS evidenceが実際にRED（winner 2）

対象:

- `apps/web/lib/domains/deals/deal-stage.ts:31-49`
- `apps/web/tests/e2e/m1b_cas_misc_evidence.spec.ts:143-160`

CIログ本文は`Expected: 1 / Received: 2`。coreはtransaction外で現在stageを読み、その値を各呼出し自身のCAS条件に使うため、後発呼出しが先発commit後のstageを読み直すと両方が順番に成功できる。実装コメントとspecが主張する「同じ旧stageから異なる次stageへの競合winner 1」を保証していない。

期待旧stageまたはversionを同一request identityとして固定するなど、競合する2本が同じpreconditionを共有するproduction契約と、決定論的な実DB競合testが必要。

### E2-03 — HIGH: human-only action evidence 5件が全FAIL、2経路は未収集

対象:

- `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:466-678`

次の5件は全て約30秒でtimeoutし、ログは`browserContext.close: Test ended`を示す。

- `createGrowthEventAction`
- `createInventoryMovementAction`
- `assignAssetToEventAction`
- `requestOutreachApprovalAction`
- `updateOutreachDraftAction`

したがってhuman positive controlとAI-only / mixed roleのDB不変はfixed treeで証明されていない。またRound 1必須範囲の`emitGrowthEventFromDomainAction`と`adjustInventoryQuantityAction`は、7 spec内に直接testがない。17修正全体を直接実証したとは判定できない。

### E2-04 — MEDIUM: fault→0 / retry→期待件数の対が全障害窓には揃っていない

良好な対があるもの:

- outreach申請: 5段すべて0→retry 1組
- PO/Damage bridge: 代表faultで全台帳0→retry 1組
- Invoice発行、deal/temp、asset/damage/staff core: rollback後に肯定対照またはretry
- outreach送信: W1/W2/W3の定義済み窓ではretry収束

不足:

- Invoice claim後・provider前のfault/retry
- outreach `sending` claim後・provider呼出し前、およびprovider throwのfault/retry
- outreach編集fault後のretry期待件数
- unsubscribe fault後のretry期待件数
- bridgeは各downstream stepを総当たりせず、PO `after-journal` / Damage `after-invoice-candidate`の代表2点のみ

単一transactionの静的構造と代表faultは強い証拠だが、Round 1で要求した「各downstream create」「送信の全不可逆境界」まで満たしたとはいえない。

### E2-05 — MEDIUM: E-07のM1-b専用count gateは引き続き必要

対象: `.github/workflows/ci.yml:234-276`

現行CIはA2 12件、A2 repeat 12件、Phase B 14件にJSON count gateを持つが、M1-b 49件には専用gateがない。今回はfull E2Eログを人手集計して49件実行・skip 0を確認できたが、spec削除、rename、収集漏れ、skip化で件数が減っても、残りがgreenならCIは検知しない。

E-07は必要。最低条件は7ファイルを明示収集し、`--retries=0 --reporter=json`で`expected=49 / skipped=0 / unexpected=0 / flaky=0`を機械assertすること。テスト数を変更する場合は、同じPRで期待件数と理由を更新する。この監査PRではworkflowを変更しない。

## 17修正の実PG evidence総評

- **直接性:** 7 specはいずれも`@hokko/db`の実Prisma clientを使い、loopback PostgreSQL guard付き。`vi.mock` / `jest.mock` / Prisma mockはない。production-shared coreを呼び、DBを再取得して件数・値をassertしている。
- **成立済み:** Finance PO/Damage bridge、outreach申請/編集/配信停止の主要状態、operations asset/damage/staffの代表atomicity、Invoice発行、temporary item、親子tenant boundaryは該当testがgreen。
- **未成立:** strict送信exactly-once、deal stage競合、human-only action wiring。
- **未収集:** human-onlyの`emitGrowthEventFromDomainAction`と`adjustInventoryQuantityAction`、一部fault後retry。

よって「7 specが存在する」「Prisma mockではない」はPASSだが、「17修正の主張がすべて実PGで直接証明済み」はFAIL。

## 再監査の最小受入条件

1. 送信2経路でclaim直後・provider前crash/provider throwを再現し、未送信をsent/SENTへ誤確定しない契約を実装・実証する。strict exactly-onceを維持するならprovider側のidempotency/照合根拠を明示する。
2. deal stageの同一precondition競合がwinner 1となり、History/Audit各1・最終stage一致を実PGでPASSさせる。
3. human-only 5件のtimeoutを解消し、`emitGrowthEventFromDomainAction`と`adjustInventoryQuantityAction`もAI-only / mixed role DB不変＋human positive controlを直接収集する。
4. 不足するfault→0 / retry→期待件数の対を追加する。
5. M1-b専用count gateを追加し、現行件数では`expected=49`（追加test後は新件数）、`skipped=0 / unexpected=0 / flaky=0 / retries=0`を機械強制する。
6. 新headのPR CIで`stage1 / stage2_integration / stage3_e2e / release_gate`をすべてgreenにし、ログ本文またはJSON statsをfixed SHAへ結び付ける。

## 固定SHA判定

`bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`に対するCodex E判定は **CHANGES_REQUIRED**。

この判定は当該SHA専用。修正でheadが変われば失効し、同一fixed SHAのコード、49件以上のM1-b count/skip gate、CIログ本文を再監査する。
