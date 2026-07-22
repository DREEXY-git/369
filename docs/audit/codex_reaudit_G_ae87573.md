# Codex Round 3 再監査 [G] — Phase 完了ゲート・doc 整合

- 対象: `DREEXY-git/369` main `ae8757328f69f0c210ac387b8f7f9429d2a76951`
- 監査日: 2026-07-22
- レーン: G（Phase 完了ゲート・doc 整合）
- 方式: source / git refs / GitHub PR・Actions / DELIVERY_CONTRACT / CODEX_QUEUE / CURRENT_STATE / in-repo・独立 vault の read-only 照合
- 変更範囲: 本書のみ。アプリ、テスト、workflow、DB、schema、Secrets、外部送信、本番には触れていない。

## Verdict

**PHASE 3 HISTORICAL CLOSE は維持 / ROUND 3 CLOSE HOLD（CHANGES_REQUIRED）**

Phase 3 は `tasks/DELIVERY_CONTRACT.md` の反ループ規約どおり再オープンしない。一方、最新 main の Round 3 を「既知findingの処理完了」とするには、同一SHAのB/C/D再監査、直接の否定証拠、契約への `CLAUDE_INTEGRATED` 記録、Draft/doc/vaultのライブ整合が不足している。

#93/#95/#96/#97 の対象箇所には意図した防御が入っており、PR #97 head `bc041e0f4a1243d8862e41dfeb1b47c0fd8b7f62` と main `ae87573` は tree `bf1af5021a0f84f2127a287de58b8b7a5fcd519c` で一致する。exact-tree CI run `29803407331` も `stage1 / stage2_integration / stage3_e2e / release_gate` が全て success（unit 590、DB integration 163、worker 9、E2E 425）。ただし4修正でテストファイルは変更されず、CI greenだけでは今回のmixed AI role / foreign tenant否定条件を直接実証しない。

## 直近修正の再確認

| 項目 | mainで確認した防御 | Gレーン判定 |
|---|---|---|
| D-01 / #93 | `apps/web/app/(app)/approvals/actions.ts:20-26` で permission + `user.isAi` + role由来 `isHumanUser` をDB接触前に確認 | 指定入口のsource修正は有効。Actionをmixed roleで実行する直接証拠は未追加 |
| D-02 / #97 | 旧D監査が列挙した event 5 Action（同 `:283-285,367-369,456-458,470-472,488-490`）と logistics 3 Action（`operations/logistics/actions.ts:22-24,54-56,86-88`）に `isHumanUser` | 列挙済み8入口のsource修正は有効。event名前空間全体のPASSではなく、同一SHAのD判定が必要 |
| D-03 / #96 | `apps/web/app/(app)/invoices/actions.ts:221-227,333-339` で承認済みinvoice/dunning送信実行を `user.isAi || !isHumanUser` で拒否 | production Action入口のsource修正は有効。core多重防御と直接否定証拠はD再監査事項 |
| B-02 / #95 | `apps/web/lib/domains/leadmap/outreach-request.ts:67-69` がLead更新を `{ id, tenantId }` の `updateMany` に限定 | 当該更新経路は有効。旧B-02全体（送信宛先relation等）のcloseを意味しない |
| B-06 / #95 | `apps/worker/src/jobs.ts:160-171` が先に `{ draftId, tenantId }` でDraftを確定し、不一致をskip | 当該worker経路は有効。旧B-06全体とproduction negative evidenceはB再監査事項 |

## Findings

### G-01 — HIGH: 修正4件のsource/回帰CIは揃ったが、Round 3のfinding終了条件が揃っていない

- file: `tasks/CODEX_QUEUE.md:76-91`
- file: `tasks/DELIVERY_CONTRACT.md:20-24,46-50,54-74,84-95`
- 種別: completion gate / independent audit / evidence traceability
- なぜ実害か: queueは最新main再監査と、取り込み時の `CLAUDE_INTEGRATED（監査SHA・対応PR）` を要求する。しかしcontract §7には #93/#95/#96/#97、`ae87573`、Round 3のB/C/D/G判定が記録されていない。さらに #97 本文自身がD-04/D-05とB/C残件をfollow-upとして明記している。4コミットで変更されたのはproduction 6ファイルとqueueだけでテスト変更は0件であり、既存の全体CI greenはmixed role/foreign IDで対象Action・workerを直接叩いて副作用0を示す証拠ではない。これをRound 3完了と扱うと、人間専用・tenant専用という安全境界を「source目視だけでclose」することになる。
- 重大度: **HIGH**
- 修正案: main `ae87573` と同一treeをB/C/Dが再監査し、各旧findingを `FIXED / PARTIALLY_FIXED / LIVE` に分解する。対象Action/workerをmixed role・foreign tenantで実行し、DB/Outbox/provider副作用0を確認する否定specを追加する。A集約後、contract §5末尾と§7に監査SHA・対応PR・未解決項目の前進先をappendする。Phase 3は再オープンせず、新しいforward itemとして管理する。

### G-02 — MEDIUM: Round 3 queueの固定SHAと成果物名が旧mainを指し、現在のdispatch正本になっていない

- file: `tasks/CODEX_QUEUE.md:68-83`
- 種別: fixed-SHA dispatch / stale queue
- なぜ実害か: queueは対象を `80b1fc5`、成果物を `codex_reaudit_<lane>_80b1fc5.md` と固定しているが、その後 #93/#95/#96/#97 がmainへ入り、live refは `ae87573` である。今回のユーザー上書きがなければ各レーンが修正前treeを再監査し、すでに失効した判定を提出する。fixed SHAが違う監査結果を混在させると、A集約で「同一SHA quorum」を作れない。
- 重大度: **MEDIUM**
- 修正案: 履歴のRound 3本文は残し、末尾にrevisionをappendして `TARGET_SHA=ae87573...`、成果物名、必要レーン、旧 `80b1fc5` 判定失効を明記する。A集約は全レーンの監査SHA一致を機械的に確認する。

### G-03 — MEDIUM: Draft棚卸し台帳は#54を「close」と記すが、GitHub live stateでは旧PR #54がopenのまま

- file: `tasks/DELIVERY_CONTRACT.md:6,59,72,88-91`
- related: GitHub PR `#54`（open / head `367025fc0b843a3fd8e78bb012e09b5411d398a1` / mergeable=false）
- 種別: Draft inventory / terminal-state mismatch
- なぜ実害か: contractはM1-cをDONEとし、#54を#83で置換して「旧 #54 は close」と記録する一方、GitHubのopen PR検索では#54だけが残る。後継#83のmain統合は事実でも、旧PRがopenだと自動棚卸し・人間のPR一覧では未処理に見え、同じpayment reversalを再採用する余地が残る。これはPhase 3を再オープンする理由ではないが、Draft棚卸しの終端状態が実体と一致していない。
- 重大度: **MEDIUM**
- 修正案: #54を `superseded by #83 / no unmerged value` の根拠付きでcloseするか、closeまでcontractを「採用済み・close action pending」と訂正する。GitHub stateと§7の語を同じ終端状態に揃える。

### G-04 — HIGH: CURRENT_STATEが「今の真実」として旧Emergency main/PRを最優先にしている

- file: `tasks/CURRENT_STATE.md:3-12,14-31,33-38`
- 種別: canonical current-state drift / operational routing
- なぜ実害か: ファイルは「現在地の1枚サマリー」「今の真実」と自称する一方、先頭は `main=35b0640`、PR #55、EMERGENCY FIX V82を最優先とする。live main `ae87573`、Phase 3 historical close、M3完了、Round 3再監査を反映していない。次の担当者がこの文書を正本として読むと、すでに終了したlaneへ戻るか、contractと競合するqueueを作り、反ループ規約を壊す。
- 重大度: **HIGH**
- 修正案: CURRENT_STATEは履歴を`PROGRESS.md`へ委ね、現時点の1枚に更新する。Phase 3 historical close、M2見送り、M3/修正main、Round 3の未終端監査、Human Gateだけを記載し、可変SHAはgit refsを参照する既存ルールを維持する。

### G-05 — MEDIUM: 安定節目であるPhase 3 close/M1完了がin-repo・独立vaultへ鏡像化されていない

- file: `369-vault/index.md:157-164`
- related: 独立 `DREEXY-git/369-vault` main `c24180fa5dd4a4cd83fcc2c94b0fe294305f420a`
- 種別: contract / Obsidian mirror alignment
- なぜ実害か: app側contractはPhase 3 closeとM1-a/b/c DONEを安定節目として記録するが、in-repo indexと独立vaultの最新mainはmain `2ebc45a` 時点のPADN移行までで、M1契約・Phase 3 closeへ辿るノート/リンクがない。vaultはライブWIP正本ではないためRound 3の途中値を固定すべきではないが、Business Phase Closeという安定節目まで未反映だと、非エンジニアがObsidianだけを読む場合に現在の完成境界を復元できない。
- 重大度: **MEDIUM**
- 修正案: app側contract/CURRENT_STATEの整合修正後、Phase 3 closeの定義、M1-a/b/cの証拠SHA、M2見送り、安全封印、以後のfindingはforward itemとする規約を1つの日本語ノートへadditiveに鏡像し、両indexからリンクする。Round 3の未確定判定はvaultへ固定せずGitHub refs/contractへリンクする。

## Phase / doc 到達度

| 判定対象 | 到達度 |
|---|---|
| Phase 3 historical close | **維持**。`9a61f99` 時点のBusiness Phase Closeを本監査で再オープンしない |
| #93/#95/#96/#97 source反映 | **確認済み**。指定された入口・更新箇所には防御あり |
| exact-tree regression CI | **PASS**。PR #97 headとmainのtree一致、required 4 jobs green |
| Round 3 独立監査close | **HOLD**。B/C/D同一SHA判定、直接否定証拠、A集約が未了 |
| M1-c Draft実体整合 | **HOLD（housekeeping）**。#83採用済みだが旧#54がopen |
| contract / queue / CURRENT_STATE | **CHANGES_REQUIRED**。queue targetと現在地がstale、取り込み記録なし |
| contract / vault | **CHANGES_REQUIRED**。安定したPhase close鏡像が未反映 |

## 次に閉じる有限順序

1. B/C/Dが `ae87573` 同一treeで修正4件と残findingを再判定する。
2. 必要なmixed-role / foreign-tenant否定specを追加し、新headのexact-tree CIを通す。
3. Aが同一SHAを集約し、contractへ `CLAUDE_INTEGRATED` とforward itemsをappendする。
4. #54のGitHub state、CURRENT_STATE、queueをlive stateへ揃える。
5. 安定したclose記録だけを369-vaultへ鏡像する。

## 監査制約

- ローカルのdirty checkoutは変更せず、隔離worktreeで `origin/main` exact SHAを監査した。
- ローカルDB、seed、migration、Playwright、実メール、実LLM、課金、本番、Secretsは実行・参照していない。
- 本書は指摘のみで、production code/testsを修正しない。
