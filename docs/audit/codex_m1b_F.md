# CODEX AUDIT [F] — M1-b 回帰・統合（ラウンド2）

> 監査対象: PR #77 `claude/padn-m1b-hardening-v1` @ `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`
>
> 比較 base: `main` @ `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
>
> 対象範囲: main 統合 #63 / #74 / #58 / #61 / #64 / #75 / #73 ＋ M1-b ＋ラウンド2
>
> 監査日: 2026-07-21
>
> レーン: F（回帰・統合）

## 結論

**CHANGES_REQUIRED**

指定された既存フローのうち、lease / cashflow / meeting / PADN A2 / Phase B と、7統合に対応する PO / stocktake / lead conversion は exact SHA の CI で green を確認した。tenant 条件付き include は自 tenant の正常行を残し、Deal の UI 選択肢・共有定数・Prisma enum も一致している。outreach の申請・編集による承認無効化・承認/却下の happy path も実 PostgreSQL spec で通過した。ラウンド2の core 移設は、移設前 `3cc11b4` と移設後 `bb9ef05` の対象7関数および4 action wrapperを関数単位で比較し、差分0だった。

ただし、固定 SHA の CI は **415 passed / 6 failed** で `stage3_e2e` と `release_gate` が failure である。また、承認済みメールを未送信のまま `sent` と確定し得る crash window、Deal stage の stale intent を防げない CAS、post-commit failure 後の通常再送で業務行を重複させ得る経路を確認した。

## Findings

### F-01 — provider 呼出し前の crash を「送信済み」と誤確定する

- file: `apps/web/lib/domains/leadmap/outreach-send.ts:140-161`
- related test: `apps/web/tests/e2e/m1b_outreach_send_evidence.spec.ts:149-218`
- class: approval integrity / external I/O / crash recovery
- severity: **HIGH**
- なぜ実害か: `queued → sending` の CAS は provider 呼出しより先に commit される。CAS 成功直後から `email.send()` 呼出し直前までにプロセスが落ちると、メールは送られていないのに durable state は `sending` になる。retry は `sending` を無条件に `sent` へ変え、Draft/Lead/ApprovalRequest も送信完了として確定するため、正規の人間承認フローが「承認済み・送信済み表示だが実メール未送信」で終了する。
- 証拠の穴: 現在の W1 hook は SendLog 作成後かつ `queued → sending` claim 前、W2 hook は provider 呼出し後にある。`sending` claim 後・provider 前の窓を注入する hook/oracle がない。
- 修正案: provider が idempotency key を受ける設計にして provider receipt/message ID を永続化し、その receipt なしに `sent` へ進めない。対応できない provider では `sending` を自動で `sent` と推定せず、照会・人間再確認可能な `unknown` 状態へ止める。claim後/provider前の fault spec を追加する。

### F-02 — Deal stage CAS が画面表示時の stage を検証せず、並行変更が複数成功する

- file: `apps/web/app/(app)/deals/[id]/page.tsx:105-108`
- file: `apps/web/app/(app)/deals/actions.ts:9-18`
- file: `apps/web/lib/domains/deals/deal-stage.ts:30-49`
- evidence: `apps/web/tests/e2e/m1b_cas_misc_evidence.spec.ts:143-160`
- class: stale intent / CAS / lost update
- severity: **MEDIUM**
- なぜ実害か: form は `dealId` と変更先 `stage` だけを送り、core は実行時に現在 stage を読み直してその値を CAS 条件に使う。後着 request が先着 request の commit 後に読めば、先着後の stage を自分の期待値として採用して両方が成功する。画面表示後に別担当者が進めた stage を、古い画面から警告なしで上書きできる。
- 実測: exact SHA の full E2E で「異なる次stageへの並行CASは勝者1本」が失敗し、winner が1本に収束しなかった。
- enum 回帰の判定: `DEAL_STAGES`、Prisma `DealStage`、詳細画面の option は11値で一致し、不正値拒否 spec は通過している。既存の正規値が enum 検証で拒否される回帰は確認しなかった。
- 修正案: #75 と統合済みの lead stage と同型に、画面表示時の `expectedStage` を hidden input → action → core へ渡し、`where: { stage: expectedStage }` で CAS する。stale は専用結果で UI に再読込を促す。

### F-03 — fixed SHA の full E2E / release gate が赤い

- file: `.github/workflows/ci.yml:275-318`
- file: `apps/web/playwright.config.ts:8-10`
- file: `apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:505-679`
- class: CI integration / regression evidence
- severity: **MEDIUM**
- なぜ実害か: GitHub Actions CI run `29759499710` の `stage3_e2e` job `88410685310` は、F-02 の assertion failure 1件と human-only browser evidence の30秒 timeout 5件で失敗し、`release_gate` も failure になった。固定 SHA に green の統合証跡がないままでは merge gate を満たさない。
- timeout の事実: `createGrowthEventAction`、`createInventoryMovementAction`、`assignAssetToEventAction`、`requestOutreachApprovalAction`、`updateOutreachDraftAction` の5 testが各30秒 timeout。各 test は human positive control に加え、AI-only / AI+OWNER の新規 context・login・Action replay を行う。
- 修正案: F-02を修正した上で、human-only spec の認証/context setupを共通化するか、role variantを分割して1 testの実行時間を予算内へ収める。必要ならこの DB 境界 spec に根拠付き timeoutを設定し、exact SHA で `unexpected=0 / flaky=0 / retries=0` を再確認する。

### F-04 — post-commit Growth 失敗後の通常再送は core 業務行を重複させる

- file: `apps/web/lib/domains/operations/events.ts:70-98,108-149`
- file: `apps/web/app/(app)/operations/actions.ts:321-334,454-466`
- evidence gap: `apps/web/tests/e2e/m1b_operations_atomicity_evidence.spec.ts:169-217,282-320`
- class: retry semantics / idempotency / integration
- severity: **MEDIUM**
- なぜ実害か: asset割当とstaff配置は core transactionを commitした後に `emitGrowthEvent` を await する。Growth 側が失敗すると Server Action 全体はエラーになるが、production UIには「Growthだけをresume」する経路がない。利用者が同じ操作を再送すると、`EventProductUsage + reserve Movement` または `EventStaffAssignment + EventCost + Audit` がもう一組作られ、在庫履歴やイベント原価が重複する。
- evidence gap: 現行 spec は post-commit fault 後に `emitGrowthEvent` を直接呼ぶ「Growth-only resume」を人工的に実行しており、実際の action/core 全体再送を検証していない。
- 修正案: action inputへ durable requestId/fingerprint を通して core transactionを冪等化するか、core commitと同一 transactionで outbox を確定し、非同期 consumer がGrowthを再送する。spec は post-commit fault後に production action相当を再実行し、業務行が1組のまま収束することを確認する。

## 回帰確認結果

### tenant 絞り込み

- Event詳細7子、Invoice詳細のlineItems/payments、Meeting詳細のminutes/decisions/actionItems/transcripts/segmentsは、foreign childを除外しつつ自 tenant childを表示する positive controlが通過した。
- 正規作成経路（seed、invoice create/formalize、meeting upload、event operations）は親と同じ `tenantId` を子へ明示設定している。
- 判定: **正常系が消える回帰は確認なし**。

### Deal enum

- 共有 `DEAL_STAGES` と Prisma enum、UI option は一致。不正 enum はDB書込み0。
- 判定: **正規値拒否の回帰は確認なし**。ただし F-02 の stale-intent/CASは要修正。

### outreach 承認無効化と正規承認

- 申請 happy path、並行申請、編集による両approval無効化、編集 fault rollback、編集対承認、approve/reject、suppression のspecは通過。
- 判定: **編集による承認無効化が通常の再申請・承認/却下を壊す回帰は確認なし**。ただし承認後の外部送信 recovery に F-01 がある。

### core の `lib/` 移設

`3cc11b4` → `bb9ef05` で次を関数単位に抽出比較し、全て差分0:

- `updateDealStageCore`
- `decideTempItemCore`
- `requestOutreachApprovalCore`
- `updateOutreachDraftCore`
- `applyUnsubscribeCore`
- `decideOutreachApprovalCore`
- `runOutreachSendStateMachine`
- 対応する `updateDealStageAction` / `decideTempItemAction` / outreach edit/request / `decideApprovalAction` wrapper

判定: **配置変更そのものによる引数・redirect・revalidate・例外処理の挙動差は確認なし**。

## 7 main 統合＋指定gateの CI 証跡

GitHub Actions: CI run `29759499710`、head `bb9ef05` の PR merge ref `fcd7e35`。

| 対象 | exact SHA での結果 |
|---|---|
| #63 lease lifecycle / #74 child tenant | booking、double-booking、lifecycle、line tenant の各specが全てpass |
| #58 purchase order | confirm/revert、承認、並行、fault、AI境界、receive idempotencyがpass |
| #61 meeting | repeat gate **10/10 pass**。full E2Eのatomicity/upload idempotencyもpass |
| #64 stocktake | lifecycle 7 testがpass |
| #75 lead conversion | guard/idempotency/UI guardの正常・否定・並行系がpass |
| #73 vault docs | docs-only。runtime差分なし |
| cashflow | child tenant 3 test、既存画面回帰がpass |
| PADN A2 | count gate **12/12**、mixed-writer repeat **12/12**、skip/unexpected/flaky 0 |
| PADN Phase B | canonical writer gate **14/14**、skip/unexpected/flaky 0 |
| M1-b tenant/outreach | tenant positive controlとoutreach state/send coreはpass |
| full E2E | **415 passed / 6 failed** |
| stage1 / stage2 | success / success |
| stage3_e2e / release_gate | **failure / failure** |

## 監査上の制約

- ローカルDB接続、migrate、seed、Playwright browser downloadは実行していない。
- E2E実測は、PR #77 fixed SHA に紐づく ephemeral PostgreSQL の GitHub Actionsログを使用した。
- 実メール、実LLM、本番環境、Secretsには接触していない。

## 固定SHA判定

`bb9ef05a78979813ad34a25b9dca724a0b1bf4f4` に対するレーンF判定は **CHANGES_REQUIRED**。

head が更新された場合、この判定は失効する。F-01〜F-04の修正と exact SHA の release gate green 後に再監査する。
