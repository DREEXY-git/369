# CODEX AUDIT [G] — M1-b Phase 完了ゲート・doc 整合（ラウンド2）

> 監査対象: PR #77 `claude/padn-m1b-hardening-v1` @ `bb9ef05a78979813ad34a25b9dca724a0b1bf4f4`
>
> 比較 base: `main` @ `2ebc45aa585826d99aa9435bc330ed1d54152bf1`
>
> 契約・キュー: PR #76 `claude/delivery-contract-v1` @ `ca1f90a9529868799ae2bcc3f4795b9bde21c545`
>
> 独立 vault: `DREEXY-git/369-vault` main @ `c24180fa5dd4a4cd83fcc2c94b0fe294305f420a`
>
> 監査日: 2026-07-21 / レーン: G（Phase 完了ゲート・doc 整合）

## 結論

**PHASE 3 CLOSE HOLD / CHANGES_REQUIRED**

PR #77 の現 head だけで M1-b を DONE にすることはできない。exact-head CI は `stage3_e2e` と `release_gate` が failure で、full E2E は **415 passed / 6 failed**。同一 SHA の Codex E と F も `CHANGES_REQUIRED` を記録しており、「既知の穴 = 0」は成立していない。

また、M1-a は契約に書かれた「固定リスト約15本」がどこにも列挙されず、現 main を対象にした本番動作確認との対応表もない。M1-c は指定5 PR がすべて open で、採用/Close の終端判断が記録されていない。したがって、M1-b を将来閉じても Phase 3 全体は M1-a と M1-c の完了まで閉じられない。

## Findings

### G-01 — HIGH: #77 fixed head は CI RED かつ既知 blocker が残り、M1-b の終了条件を満たさない

- file: `tasks/DELIVERY_CONTRACT.md:56`（PR #76 @ `ca1f90a`）
- file: `tasks/CODEX_QUEUE.md:45-59`（PR #76 @ `ca1f90a`）
- related: `docs/audit/codex_m1b_E_v2.md` @ `0f042197ee10b41845183b6a69a567d041eb6e8d`
- related: `docs/audit/codex_m1b_F.md` @ `7b545b4bee8184923cfa1c65b8af5c5b8ad2970a`
- class: completion gate / known-gap closure / same-SHA evidence
- severity: **HIGH**
- なぜ実害か: 契約は M1-b を「1周の findings を有限化 → 潰す → 打ち切り」と定義し、queue は同一 fixed SHA の独立監査と CI green を要求する。ところが GitHub Actions run `29759499710` は `stage1=success`、`stage2_integration=success`、`stage3_e2e=failure`、`release_gate=failure`。M1-b 49件は43 PASS / 6 FAILで、Deal stage CAS が winner 2、human-only 境界5件がtimeoutした。さらに E/F は送信claim後・provider前の未送信誤確定、stale intent、post-commit retry重複などの blocker を記録している。これを DONE にすると「既知の穴 = 0」と実状態が食い違う。
- 修正案: E/Fおよび残るB/C/Dの blocking findingを同一の新 headで修正または契約どおり人間が `DEFERRED`/`WONTFIX` に終端化し、同一SHAの全required CI greenとA集約判定を得る。head更新時は旧判定を流用しない。

### G-02 — HIGH: M1-a の「固定リスト」が未定義で、主要フロー完了を有限に判定できない

- file: `tasks/DELIVERY_CONTRACT.md:55`（PR #76 @ `ca1f90a`）
- class: acceptance criteria / production evidence / finite scope
- severity: **HIGH**
- なぜ実害か: 終了条件は「固定リスト約15本の全 flow が動く/動かないと確定し、不良のみ修正」だが、flow名、入口URL、actor/tenant、期待結果、外部作用の封印、確認環境、証拠SHAを列挙した台帳が存在しない。過去の個別本番GOや今回のE2E green部分を寄せ集めても、現 main `2ebc45a` に対する固定リストの全件確認にはならない。リストがないままでは追加・除外が無制限になり、反ループ契約の「有限DONE」も検証できない。
- 修正案: 新規roadmapを増やさず、`DELIVERY_CONTRACT` 内に約15本を固定し、各行へ `PASS / FAIL / NOT_RUN`、確認環境、実測日、対象SHA、証拠リンクを持たせる。不良だけを有限reworkへ送り、全行が終端化した時点で M1-a を DONE とする。

### G-03 — HIGH: M1-c の指定5 PR に採用/Close判断がなく、棚卸しが完了していない

- file: `tasks/DELIVERY_CONTRACT.md:57`（PR #76 @ `ca1f90a`）
- class: Draft inventory / terminal decision
- severity: **HIGH**
- なぜ実害か: 契約の終了条件は各 Draft の「採用 or Close」決定であり、単に open のまま残すことではない。GitHub live stateでは次の5件がすべて open で、終端判断がない。

| PR | live state | 現在の非終端理由 |
|---|---|---|
| #22 | Draft / open、head `e3c410c`、非main base | 最新固定headに `CHANGES_REQUIRED / HOLD`。schemaを含み、本番migrationはHuman Gate |
| #28 | Draft / open、head `a8685af`、非main base | `EVIDENCE_GAP / CANONICAL HOLD`。公式一次資料とFunction Evidenceの対応不足 |
| #30 | Draft / open、head `6f91edb`、旧main base | v7.4 candidate program。現契約との採用/廃棄関係が未決定 |
| #3 | Draft / open、head `24782cc`、旧main base、mergeable=false | 旧Phase 3 closeout集約。後続main統合との差分を採用するかCloseするか未決定 |
| #54 | Ready / open、head `367025f`、旧main base、mergeable=false | `CHANGES_REQUIRED / MERGE HOLD`。Payment物理削除等のHighとappend-only reversal schema判断が未解決 |

また、文言が「ほか」で終わり対象集合が閉じていない。2026-07-21のlive open PRには #2、#76〜#80 もあるため、監査成果物PRを棚卸し対象から除外するのか、集約後Closeするのかを含む全件snapshotが必要である。
- 修正案: open PR全件を1回snapshotし、各行を `ADOPT`（採用先base/依存/Human Gateを明示）または `CLOSE`（superseded先/理由を明示）へ終端化する。#22/#28/#30/#3/#54は最低限必須とし、「保留」は M1-c DONE に数えない。

### G-04 — MEDIUM: 納品契約・queue・CURRENT_STATE・vault が同じ現在地を指していない

- file: `tasks/CURRENT_STATE.md:3-12`（PR #77 / main `2ebc45a`）
- file: `tasks/DELIVERY_CONTRACT.md:1-75`（PR #76 @ `ca1f90a`）
- file: `tasks/CODEX_QUEUE.md:45-64`（PR #76 @ `ca1f90a`）
- file: `369-vault/index.md:150-157`（in-repo mirror @ `bb9ef05`）
- file: `知識/案Bプラス並行前進とPhase3.5_Phase4開始.md:7-12`（standalone vault main @ `c24180f`）
- class: source-of-truth / documentation synchronization
- severity: **MEDIUM**
- なぜ実害か: `DELIVERY_CONTRACT.md` と `CODEX_QUEUE.md` は現 mainおよびPR #77 treeには存在せず、open PR #76上だけにある。一方、`CURRENT_STATE.md` は自ら「今の真実」と宣言しながら `main=35b0640` のEMERGENCY FIXとPR #55を最優先と記し、live main `2ebc45a`、PR #77、M1-a/b/cを反映していない。in-repo/standalone vaultは旧案B+の「ATOMIC_LEDGER_SYNC=PENDING」を残し、新しい有限M1契約やround2 queueへのリンクがない。vault同士は概ね同じ過去状態だが、contractの閲覧鏡像としては未同期である。
- 修正案: まず人間GateでPR #76の採否を決める。採用時は同じcommit系列で `CURRENT_STATE` をM1現在地へ更新し、安定節目としてstandalone vaultにM1契約の要約ノートとindexリンクを追加する。vaultはライブWIP正本にせず、GitHub refs/contractへのリンクと「M1進行中・Phase Close未了」を明記する。

## M1 到達度

| 項目 | 現在 | DONE条件との差 |
|---|---|---|
| M1-a 主要フロー動作確認 | **OPEN / DEFINITION GAP** | 約15本の固定リストと現main本番証拠がない |
| M1-b 脆弱性1周点検 | **CHANGES_REQUIRED** | CI 6 FAIL、E/F blocker、B/C/D/A集約未完 |
| M1-c Draft棚卸し | **OPEN** | 指定5件を含むopen PR全件のADOPT/CLOSE判断がない |
| Phase 3 Close | **HOLD** | M1-a/b/cの3条件が全て未充足。Business Phase CloseはHuman Gate |

## 「#77が緑＋Codex A GOならM1-b DONEか」への回答

**その2条件だけでは直ちにDONEではない。** Queue上のCodex A GOは、B〜Fの同一SHA判定を集約し、blocking findingが0または契約どおり終端化済みであることを含まなければならない。そこまで満たした新 headでrequired CIがgreenなら、M1-bは **Human Gateへ進める状態** になる。その後、人間が #77 をmainへmergeし、`DELIVERY_CONTRACT` 完了ログへmerge SHAと日付を追記して初めて M1-b DONEとなる。

現 head `bb9ef05` ではCI failureとE/F `CHANGES_REQUIRED`があるため、この条件付き経路の入口にも達していない。

## Phase 3 クローズに残るもの（有限順序）

1. **M1-b rework**: #77の同一SHA blockerを修正/終端化し、required CIを全greenにする。
2. **同一SHA独立監査**: B/C/D/E/F/Gを揃え、Aがblocking 0を確認して GO を集約する。
3. **M1-b Human Gate**: 人間が#77 merge可否を判断し、merge SHA/dateを完了ログへ記録する。
4. **M1-a**: 約15本の主要フローを固定し、現main/本番で各flowを1回ずつ実測、FAILだけを有限修正する。
5. **M1-c**: #22/#28/#30/#3/#54を含むopen PR全件をADOPTまたはCLOSEへ終端化する。
6. **doc/vault同期**: contract採用後にCURRENT_STATEとstandalone vaultの安定節目を同じM1状態へ揃える。
7. **Business Phase Close Human Gate**: M1-a/b/cのDONE記録を根拠に、人間がPhase 3 Closeを判断する。

## 監査上の制約

- コード、テスト、workflow、schema、migration、package/lockは変更していない。本書は指摘のみ。
- ローカルDB、seed、Playwright、実メール、実LLM、本番、Secretsには接触していない。
- CI値はPR #77 fixed headに紐づくGitHub Actionsログ本文、PR/Draft状態はGitHub live stateを使用した。

## 固定SHA判定

`bb9ef05a78979813ad34a25b9dca724a0b1bf4f4` に対するレーンG判定は **PHASE 3 CLOSE HOLD / CHANGES_REQUIRED**。

headが更新された場合、この判定は失効する。ただしM1-a固定リスト、M1-c終端判断、contract/vault同期の不足は、別の明示的なdoc更新が行われるまで継続する。
