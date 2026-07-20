# DomainEvent 識別子の canonical 移行（PADN Phase A → A2 → B）

> 入金の冪等化とイベント同一性を、**利用者を壊さず・巻き戻しても二重化しない**順序で main へ入れ切った長編アーク。正本は GitHub（Control Root [[#66]]・PR #71/#72）。ここは why の要約。関連: [[安全第一の哲学]]・[[AIの役割と境界]]・[[意思決定ログ]]・[[CIStage3E2E失敗修復と72Green化]]。

## 何が危なかったか（2つの真の blocker）

- **B1（cross-tenant Payment 衝突）**: `payments.ts` が client 発行の idempotency key を **global な `Payment.id`** に使い、tenant 条件なしの `findUnique` をしていた。別テナントが同じ key を出すと衝突し、入金拒否・「この key は存在するか」を外から探れる presence oracle になり得た。
- **B2（canonical writer 切替 × 巻き戻しの非互換）**: イベント同一性キーを legacy(FNV 32bit) から canonical(単射) へ切り替えた後に main へ巻き戻すと、main は canonical 行を自分の重複と認識できず DomainEvent/Outbox/Webhook が**二重化**し得た。

## 効いた設計判断

- **順序がすべて（reader を先に canonical 対応させる）**: 先に main の**読み手**を「canonical 優先＋検証付き legacy fallback」にしておけば、後から**書き手**を canonical に切り替えても、巻き戻し時に既存 canonical 行を読めて二重化しない。これが Phase A→A2→B の分割理由。
- **1 フェーズ 1 軸**: Phase A2 は**意味論のみ**（identity 契約導入・encoding は legacy 維持）、Phase B は**encoding のみ**（canonical へ切替・意味論不変）。同時に2つ変えない。
- **schema を触らずに直す**: Payment 同一性は列追加ではなく **server 由来の単射 ID `derivePaymentRequestId(tenantId, requestKey)`**（`pay:` + `encodeURIComponent` 連結）で表現。dedupe の無損失保存も列追加ではなく **`payload.idem` メタ**。→ migration という人間 Gate を回避しつつ B1 を修復。tenant は必ずセッション actor 由来・取得行の `tenantId===actor.tenantId` を fail-closed 検証。
- **並行の直列化点**: `Invoice FOR UPDATE`（encoding 非依存）＋ 同一 logical identity への **PostgreSQL advisory lock**。lock key の bigint 化は **PG 側 `hashtextextended`** で行い、クライアント実装差による hash drift を構造的に消した。
- **fail-closed**: FNV 衝突で無関係行へ誤収束させず、`EventIdentityCollisionError` で明示的に落とす（他人の行 ID を返さない・黙って捨てない）。
- **原子性**: Payment / Invoice / Receivable / FinanceEvent / Audit / DomainEvent / Outbox / Growth を単一 transaction に同梱。Outbox は新規 DomainEvent 作成時のみ。
- **巻き戻し規約**: Phase B の rollback 先は **Phase A（reader を持つ landed main）のみ**。pre-A（canonical 非対応）へは戻さない。

## どう入れたか（証拠主義）

- **Phase A v1 は人間が却下**: 最初の dual-reader だけの版（PR #71 旧 head）は「監査範囲不足・identity 契約不一致・rollback barrier 不足・mixed-version race・FNV 衝突誤収束」で **HUMAN_GATE_REJECTED**。CI green だけでは PASS にしない文化がここで効いた。→ 設計監査（B/C/D）を挟んで作り直し。
- **固定 SHA 監査**: 実装ごとに head を凍結し、writer とは**別個体**の C（実装）/ D（テスト・CI ログ本文）/ E（統合・巻き戻し）が独立再監査。head が動けば過去 PASS は失効。
- **Phase A2**: PR #71（head `8f52e14`）→ 3 lane PASS → 人間 merge（main `62c0ae8`）。B1 と VOID 復活競合もここで吸収。
- **Phase B**: PR #72（head `37ae7a1`）→ writer を canonical へ切替＋不足 spec 移植。CI で fault-injection テスト1件が並列 drift で落ちたが、真因は**テスト側の tenant 全域 baseline**（Phase A2 の repeat-gate と同クラス）で payments.ts は健全と実測判定 → 専用 tenant 隔離で修復（rework 1）→ 3 lane PASS → 人間 merge（main `0263a98`）。
- **cross-flip 不変性の本命 oracle**: pre-B の legacy キー行がある状態で切替後に同一 identity を emit → canonical-first miss → 検証付き legacy fallback で converge → 増分 0（writer 切替をまたいでも二重化しない）を実 PG で実証。
- **旧 PR #57 は superseded**: cda7188 は pre-A2 版で B1 未修復（raw key を PK 使用）・barrier 無のため rebase せず、価値ある部分（VOID race / idempotency 証拠）だけを現 main の上へ移植。cda7188 は main の祖先にならない。

## 人間 Gate を最後まで人間に残した

main merge・vault main 反映・schema/migration・Secrets・本番・外部送信・依存変更・Phase Close・PR close は最後まで人間判断。AI は Draft PR と独立監査・記録まで。**速さより壊さないこと**（[[安全第一の哲学]]）を、CI green を前提条件に留め PASS 根拠にしない運用で貫いた。
