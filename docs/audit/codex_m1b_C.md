# Codex M1-b Lane C 監査（Round 2）

- 監査レーン: C（原子性・一貫性）
- 対象: PR #77 `claude/padn-m1b-hardening-v1`
- 固定 SHA: `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`
- 比較 base: `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
- Task Queue: `ca1f90a9529868799ae2bcc3f4795b9bde21c545:tasks/CODEX_QUEUE.md` の Round 2（対象 head には同ファイルが無いため dispatch 側を参照）
- 監査日: 2026-07-21
- 判定: **CHANGES_REQUIRED**

実装・DB・外部送信には触れず、固定 SHA の source / schema / evidence spec を静的に独立監査した。実 PostgreSQL を使う evidence spec は、DB 操作の実行承認が無いため本監査では実行していない。

## C-01 — Invoice の claim は「provider 成功」の証跡ではなく、未送信でも `SENT` と cashflow を確定できる

- file:line: `apps/web/lib/domains/finance/invoice-send.ts:124-198`, `packages/integrations/src/email/types.ts:9-20`, `packages/integrations/src/email/smtp.ts:21-33`, `apps/web/tests/e2e/m1b_invoice_lifecycle_evidence.spec.ts:113-205`
- class: crash consistency / external side effect / invalid CAS / idempotency
- severity: **HIGH**

`pending_send` claim は provider 呼出し前に commit される。一方、既存 `pending_send` を見た retry / 並行実行は `resume` となって provider を呼ばず、そのまま Invoice を `SENT`、claim を `approved` にする。したがって次の再現が成立する。

1. 1本目が claim を commit する。
2. `__faultAfterClaimForTest`（line 170）で provider 前に停止する、または1本目が provider 前で待っている間に2本目を開始する。
3. retry / 2本目は line 135-136 で `resume`、line 156-179 を通らず、line 184-198 で送信成功扱いを確定する。

メールは0回でも Invoice=`SENT`、`payment_expected=approved`、Audit が成立する。さらに SMTP provider は失敗を throw せず `{status:'failed'}` で返すが、line 174-178 は失敗を拒否せず同じ finalize に進む。この場合も送信失敗なのに `SENT` と入金予定が確定する。並行 VOID / 入金等が Invoice の CAS に勝って `flip.count===0` になっても、claim 更新は line 190 で CAS 成否と無関係に試行される。特に部分入金等で claim が `pending_send` のままなら `approved` になり、Invoice 状態遷移と資金予定の対応が切れる。VOID が先に claim を `ignored` にした場合でも、provider 前の Invoice 状態再検証が無いため無効化後にメールを送信できる。

`pending_send` 自体は cashflow 金額集計から除外されている。しかし上記の false finalize 後は `approved` になり、未送信請求を入金予定へ誤計上するため、write-ahead 化だけでは実害を防げない。現在の契約は exactly-once ではなく「最大1回だが、送らず成功扱いにできる」at-most-once である。

必須修正:

- claim / provider-confirmed（provider receipt）/ finalized / failed を区別した durable 状態にする。
- provider に永続 idempotency key を渡し、成功 receipt を保存・照合できる場合だけ retry が finalize する。provider がその契約を持たない場合は exactly-once を主張せず、曖昧状態を fail-closed / reconciliation 対象にする。
- provider の `failed` / `suppressed` は `SENT` にせず retryable/failed として残す。
- `payment_expected` の `approved` 化は、provider 成功証跡と Invoice CAS 成功の両方を同一確定条件にする。VOID / 入金 writer と共有する Invoice row fence も必要。

必須 test:

- claim commit 後・provider 前 crash → retry 後も provider 0 のまま `SENT/approved` にならない negative test。
- 1本目の provider を barrier で停止し、2本目を並行実行しても provider 成功前に finalize されない race test。
- provider throw と `{status:'failed'}` の双方で Invoice / cashflow / Audit が成功扱いにならない test。
- send と VOID / 全額・一部入金を同じ Invoice で競合させ、外部送信・Invoice 状態・`payment_expected` が矛盾しない test。

## C-02 — Outreach の `sending` は「呼出し前」と「成功後」を識別できず、未送信・失敗を `sent` に昇格する

- file:line: `apps/web/lib/domains/leadmap/outreach-send.ts:137-205`, `packages/integrations/src/email/types.ts:9-20`, `packages/integrations/src/email/smtp.ts:21-33`, `apps/web/tests/e2e/m1b_outreach_send_evidence.spec.ts:149-275`
- class: crash consistency / resumable state machine / external side effect
- severity: **HIGH**

line 142 で `queued→sending` を DB に確定してから line 145 で provider を呼ぶ。この2文の間で crash する、または provider が throw すると、durable state は `sending` だが送信成功の事実はない。retry は line 158-162 で `sending` を無条件に `sent` へ昇格し、provider を呼ばず draft / lead / Approval を完了する。

provider が throw せず `{status:'failed'}` を返す通常の SMTP 失敗でも、SendLog は `failed` になる一方、line 189-205 は `blocked` だけで分岐するため draft / lead は `SENT`、戻り値も `sent` になる。現行 W2 spec は「provider 成功後」の hook だけを作っており、`sending` commit 後・provider 呼出し前、および provider 失敗を覆っていない。

必須修正:

- `sending` を provider 成功証跡として扱わない。attempt claim と provider receipt を別状態にし、永続 idempotency key / provider reconciliation により成功が確認できる場合だけ `sent` へ進める。
- `failed` / `suppressed` を draft / lead の `SENT` と成功戻り値へ変換しない。
- 並行敗者が単に `noop` で終わるだけでなく、勝者の失敗・lease 失効後に安全に takeover / reconcile できる契約を定義する。

必須 test:

- `queued→sending` CAS 直後・`email.send` 直前の fault hook を追加し、retry が未送信を `sent` にしない test。
- provider throw / `{status:'failed'}` の negative test。
- provider を barrier で停止中に retry を走らせ、成功前に SendLog / draft / lead / Approval が terminal にならない race test。
- provider 成功後・DB 更新前 crash は同じ provider idempotency key で収束し、重複送信もしない test。

## C-03 — Finance bridge は重複 writer を直列化するが、ロック前の古い source snapshot を恒久台帳化できる

- file:line: `apps/web/lib/domains/finance/finance-bridge.ts:293-329`, `apps/web/lib/domains/finance/finance-bridge.ts:333-361`, `apps/web/lib/domains/finance/finance-bridge.ts:365-395`, `apps/web/tests/e2e/m1b_finance_bridge_idempotency_evidence.spec.ts:139-259`
- class: TOCTOU / stale read / ledger consistency
- severity: **MED**

advisory xact lock と既存判定・downstream writes の単一 transaction は、同じ高レベル bridge 関数を通る並行 duplicate を1組へ収束させる。しかし EventProject / PurchaseOrder / DamageLossRecord と金額・期日・名称は transaction と lock の外で読み取られている。source 更新 writer はこの advisory lock を取得しないため、bridge が古い値を読んだ直後に source が更新されると、bridge は更新後に lock を取得して古い金額を台帳化できる。その後は既存 marker が retry を no-op にするため、自動修復されない。

現行 evidence spec は同じ不変 fixture への bridge 同士の並行実行と downstream rollback を確認するだけで、source update との競合を確認しない。

必須修正:

- advisory lock 取得後、同じ transaction 内で source row（必要な子行を含む）を再取得し、その snapshot から金額・期日・説明を導出する。
- source 更新を許すなら source row `FOR UPDATE` / revision CAS を共有し、bridge 済み後の更新を拒否または再計上契約へ送る。ロック順序を固定して deadlock を避ける。

必須 test:

- bridge の source 読取と lock 取得の間に source 金額を更新する deterministic barrier test。確定値が最新 snapshot と一致するか、revision conflict で全 rollback することを確認する。

## C-04 — Invoice finalize 後の DomainEvent / Outbox / Growth / Usage は replay で修復されず消失できる

- file:line: `apps/web/lib/domains/finance/invoice-send.ts:150`, `apps/web/lib/domains/finance/invoice-send.ts:181-232`, `apps/web/lib/growth.ts:28-65`, `apps/web/tests/e2e/m1b_invoice_lifecycle_evidence.spec.ts:113-205`
- class: post-commit event loss / non-transactional composition
- severity: **MED**

Invoice=`SENT`、claim=`approved`、Audit は line 184-198 の transaction で確定するが、`INVOICE_SENT` DomainEvent / Outbox / GrowthEvent と UsageEvent は commit 後に別処理で作られる。finalize commit 後・line 201 前の crash ではイベントが0件のままになる。retry は既存 approved claim を line 150 で `done` として即 return するため修復経路がない。

また `emitGrowthEvent` 自体も DomainEvent(+Outbox) と GrowthEvent を別 write にしている。DomainEvent 確定後に GrowthEvent が失敗すると片欠けし、同じく Invoice replay は早期 return する。現行 spec は正常完走時の件数と finalize transaction 内 fault だけを確認し、finalize commit 後の crash を覆っていない。

必須修正:

- Invoice finalize transaction に `emitDomainEventInTx` / Outbox / Growth を同梱するか、finalize と同時に durable outbox job を作り、replay / worker が欠落を修復できるようにする。
- `done` replay は必須 evidence の存在・identity を照合し、不足時に外部メールを再送せず内部 evidence だけを idempotent に補修する。

必須 test:

- finalize commit 後・event emit 前 crash → retry / worker で provider 回数は増えず DomainEvent / Outbox / Growth / Usage が各1へ収束する test。
- DomainEvent 成功後・GrowthEvent 失敗を注入し、片欠けが恒久化しない test。

## C-05 — Suppression 判定と send claim が同じ barrier を共有せず、登録競合で抑止対象へ送信できる

- file:line: `apps/web/lib/domains/leadmap/outreach-send.ts:103-145`, `apps/web/tests/e2e/m1b_outreach_send_evidence.spec.ts:277-297`
- class: TOCTOU / external-send compliance
- severity: **HIGH**

suppression 一覧と `blocked` は SendLog transaction より前に読み取られ、provider 直前にも再検証されない。`blocked=false` の読取後、line 145 の provider 呼出し前に同一宛先が SuppressionList へ追加されても送信が進む。反対に SendLog=`queued` の作成後・retry 前に suppression が追加されると、retry は `blocked=true` のため queued を消化せず draft / lead / Approval だけを抑止終端へ進め、孤立 queued log を残す。

現行 suppression spec は処理開始前から登録済みの静的ケースだけで、登録との競合を覆っていない。

必須修正:

- 宛先 identity 単位で suppression writer と send claim が共有する barrier / fencing 契約を設け、抑止確定後の provider 呼出しを禁止する。
- 既存 queued attempt が後から抑止された場合の terminal state を明示し、queued のまま残さない。

必須 test:

- suppression 読取後・provider 前に登録を確定する deterministic race test。provider 0、SendLog suppressed、draft / lead / Approval が整合した終端へ収束することを確認する。

## 確認済み事項（追加 finding なし）

- `email.send` は Invoice（`invoice-send.ts:174`）・Outreach（`outreach-send.ts:145`）とも Prisma transaction の外にあり、DB lock を保持した外部 I/O にはなっていない。
- Invoice claim の `pending_send` は `queries.ts:6,20-22`、`cashflow.ts:6,24-26`、`packages/shared/src/finance.ts:271-283,378-405` の金額集計対象外である。raw/recent 件数と `byStatus` には観測されるが、pending のまま cashflow 金額へは加算されない。
- Finance bridge の `pg_advisory_xact_lock(hashtextextended(...))` は同一 tenant/source identity の協調 writer を transaction 終了まで直列化し、downstream DB writes / DomainEvent / Outbox は同じ transaction に入っている。64-bit hash collision は異なる source を余分に直列化するだけで、lock 後の exact source 判定により誤収束はしない。
- F3 の公開 `emitFinanceEvent` / `createJournalCandidate` / `createInvoiceCandidate` は現在それぞれ内部で単一 `$transaction` を張り、production callsite は固定 SHA 内に存在しない。したがって旧「内部片欠け」の即時実害は解消している。ただし公開 wrapper 自体に source identity の unique / idempotency barrier はなく、将来の retry 呼出しを重複から守る契約ではない。
