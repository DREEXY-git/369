# 納品契約 — 反ループ・前進サイクルの正本（DELIVERY_CONTRACT）

> **目的**: 無限ループ（同じ所をぐるぐる）を避け、**有限の DONE** に向かって前進し続ける。
> Claude と Codex は **git を経由して**この契約に従う。散在する governance/roadmap ドキュメントより **本ファイルが優先**（正本はここ＋git refs＋PR）。

> **現在地（2026-07-23）: ✅ Phase 3 / Phase 3.5（広告・SEO/Content・紹介）/ Phase 4（AI社員・コントロールプレーン・成果台帳）= すべて CLOSED**。main `0dbea72`・**Vercel Production `0dbea72` を人間確認済み**（Business Phase Close 承認 2026-07-23）。**Phase 4.1／4.5 は作らず、残件はすべて Phase 5 候補**（§5・製品課題と文書整理は分離）。詳細は §7。（旧記録: Phase 3 = CLOSED は 2026-07-21・main `9a61f99`。）

---

## 1. DONE の定義（有限・これに達したら Phase 3 をクローズ宣言）

**DONE = ①「既知の穴 = 0」＋ ②「主要フローが本番で動作確認済み」＋ ③「未マージ Draft の棚卸し完了」**

- ❌ **目標にしないもの**:「脆弱性ゼロ」「完璧」「全機能網羅」「無限再監査」。これらは定義上終わらないため採用しない。

---

## 2. 不変ルール（反ループ）

1. **前進のみ**: DONE にした項目は **再監査・再オープンしない**。新しい発見は過去項目の蒸し返しではなく、**新項目として §5 の末尾に積む**。
2. **1周＝打ち切り**: 監査・点検は **1周で区切る**。「見つかったら永遠に」にしない。
3. **台帳が正**: 各項目は **OPEN → DONE の単調遷移**。DONE には **commit SHA と日付**を刻む（§7）。
4. **rework は最大2回**: 同一項目の修正が2回で解決しなければ、人間へエスカレーションし、`DEFERRED`/`WONTFIX` の終端にして **次へ進む**。堂々巡りしない。
5. **ドキュメントを増やさない**: governance/roadmap の新規ファイルを作らない。状態は本ファイル＋git refs＋PR に集約する。

---

## 3. サイクル（1項目を1回だけ通す・戻らない）

```
① 実装（Claude・薄い縦切り）
② テスト/監査（Claude 自己テスト unit/typecheck/lint＋証拠spec ／ Codex 独立監査を git 経由・固定SHA）
③ 判定: 問題なし？
     なし → ④へ
     あり → rework（最大2回）→ 解決で④ ／ 未解決は人間エスカレーション → DEFERRED にして次へ
④ 人間確認事項の抽出（この項目に §6 の Human Gate があるか列挙）
⑤ 人間チェック（merge ボタン等）。無ければスキップ
⑥ DONE 記録（§7 へ SHA＋日付）
⑦ 次項目へ（③〜⑥を蒸し返さない）
```

**原則**: テスト/監査が通り、人間確認事項をチェックし終えたら **必ず次へ進む**。同じ項目に留まらない。

---

## 4. Codex 連携（git 経由）

- **役割分担**: Claude = 実装＋自己テスト。Codex = **独立監査**（実装者は自己監査しない）。
- **受け渡し**: PR（差分＋証拠）＋ PR コメント（監査結果の台帳）＋ CLAUDE.md の codex handoff hook。
- **Codex が稼働していない時**: 人間 Gate（merge 前確認）が最終防波堤。**Codex 不在で作業を止めない**（人間判断で前進可）。

---

## 5. 有限ワークリスト（前進のみ・末尾に追加）

### M1 — 安全に使える（= Phase 3 クローズ条件）
- [x] **M1-a** 主要フロー動作確認（固定リスト 18本）— **DONE 2026-07-20**（§7・main `da9b475` 上で18フロー静的検証・17✅／不良1件（F16 ナレッジ検索の権限ゲート欠落）を修正）
- [x] **M1-b** 脆弱性1周点検（tenant越境 / 原子性 / AI境界 / 承認バイパス の4クラス×全モジュール）— **DONE 2026-07-20**（§7・#77 head `c58811b`・CI GREEN・実PG証拠 49/49）。残ハードニング3件は下記へ繰越（前進のみ・蒸し返さない）
- [x] **M1-c** Draft 棚卸し（#22 / #28 / #30 / #3 / #54 ほか）— **DONE 2026-07-20**（§7・open 10件を判定＝8 Close／1 採用(#54)／M1-b監査3件 close）

### M2 — 実運用の解禁（任意・人間のビジネス判断のみ）
- [x] 実メール送信（`EXTERNAL_SEND_ENABLED`）/ 実LLM鍵 / 実地図API の有効化可否を**決定** — **決定 2026-07-21: 見送り（練習モード＝デモ運用を継続）**。技術側は解禁可能（§7）だが、実送信・課金を伴うため経営判断で当面 OFF。再検討はいつでも可。
- [x] **（M1-b 繰越・外部送信解禁の前提）送信 at-most-once の明示契約** — **完了済み（再確認 2026-07-21）**。両送信経路（outreach `outreach-send.ts` / invoice `invoice-send.ts`）が write-ahead claim→CAS→claim 生成者のみ provider 1回の状態機械で実装済み。証拠 spec（`m1b_outreach_send_evidence` / `m1b_invoice_lifecycle_evidence` の計装 provider オラクル）が「crash→retry でも provider≤1」「並行2実行でも provider=1」を実 PG で assert し **CI stage3_e2e green**。※再実装しない（前進のみ）。
- [ ] **（M1-b 繰越）post-commit 冪等（durable requestId）** — `assignAssetToEvent`/`assignEventStaff` の post-commit Growth 失敗→全アクション再実行で asset/staff が二重行になる経路を、durable requestId（lease/meeting と同型）で排除。

### M3 — 機能拡張（任意・完成に必須ではない）
- [x] **Phase 3.5（広告・SEO/Content・紹介）・Phase 4（AI社員・コントロールプレーン・成果台帳）** を価値の高い順に薄い縦切りで実装 — **CLOSED 2026-07-23**（Business Phase Close・§7）。#93〜#127 で C19 広告／C21 SEO・Content／C22 紹介＋AI社員/Control Plane/Work Evidence を実装し各 PR で CI green、**人間が Vercel Production `0dbea72` を確認**。**Phase 4.1／4.5 は作らず、残件は Phase 5 候補**（下記の未チェック項目＝Phase 5 の承認済み Task Packet 待ち）。
- [x] **（M3-1）LeadMap 追客（フォローアップ）ボード** — **DONE 2026-07-21**（#85・main `ed26c36`・CI 全 green・Vercel 自動デプロイ）。「送信→追客→商談化」の追客を1画面化（送信済み未反応リードを最終接触日数で並べ、追客メール下書き＝承認フロー／商談化へ導線）。schema 変更なし・`leadmap:read` ゲート・tenant スコープ・既存 action 再利用。nav 導線 68→69 に伴い nav-contract＋e2e 5アサーションを同期。
- [x] **（M3-2）朝礼レポートに要追客を前出し** — **DONE 2026-07-21**（#87・main `5ccf79d`・CI 全 green 一発）。追客ボードと同条件（SENT/OPENED/CLICKED × 最終接触5日超/記録なし）の count＋top5 を `/reports/morning` に「🔔 今日追うべきリード（要追客）」として表示し `/leadmap/followup` へ導線。件数は `dashboard:read`・氏名/導線は `leadmap:read`（redaction 多層防御）。schema/nav 変更なし。nav 未変更のため導線数回帰なし（前回の教訓を反映し e2e 影響を事前確認）。
- [x] **（M3-3）失注理由の記録＋傾向可視化（負けから学ぶ）** — **DONE 2026-07-21**（#89・main `9851c54`・CI 全 green 一発）。既存だが未使用だった `Deal.lostReason` を活用: 案件を LOST にする際に理由を選び保存（deal-stage core は **LOST 遷移時のみ**・非 LOST は不変＝後方互換で M1-b CAS spec に影響なし）、詳細に理由バッジ、一覧に「失注理由の傾向」集計カード。schema/nav 変更なし・PII 非依存・`deal:read` 配下。既存 /deals・deal-stage e2e への影響を事前確認。
- [x] **（M3-4）停滞案件（次アクション期限切れ）の可視化** — **DONE 2026-07-21**（#91・main `6eca9a4`・CI 全 green 一発）。受注前ステージ（CONTACT/HEARING/PROPOSAL/QUOTE/NEGOTIATION/INTERNAL_REVIEW）で `nextActionAt` 期限切れの案件を `/deals` 最上部に「⏰ 停滞案件」カード＋行「要対応」赤バッジ＋ヘッダ件数で前出し。既取得 deals の JS 抽出（追加クエリなし）・schema/nav 変更なし・`deal:read` 配下。既存 /deals・lead_convert e2e への影響を事前確認。
- [x] **（M1-c 採用）#54 入金取消（payment reversal）** — **DONE 2026-07-21**（#83 として現 main へ rebase＝cherry-pick 統合・`decideApprovalAction` に payment_reversal 分岐を union・CI 全 green・main `10d988f`）。旧 #54 は close（後継 #83）。
- [ ] **（M1-b 繰越・CI infra）M1-b 証拠 spec の件数ゲート** — `.github/workflows/ci.yml` に期待件数ゲート（expected=49・skip/unexpected/flaky/retries=0）を追加し、静かな未実行（spec の collection 漏れ）を検知する。
- [ ] **（M1-a 繰越・低優先）operations 監査の原子性** — `recordEventCost`/`recordEventRevenue`（`lib/domains/operations/events.ts`）は create/update 後に `writeAudit` を別 await（非 tx）。稀な失敗で監査行だけ欠落し得る低severity。$transaction 化を M3 で（M1-b の原子性クラスは close 済みのため前進のみの新項目として計上）。

---

## 6. Human Gate 台帳（人間だけができる = ここに達したら Claude は列挙して停止し、チェックを待って次へ）

main merge / 本番（Vercel）/ schema・migration / secret・env / 外部送信 / 課金 / RBAC・ABAC・機密ラベル / 破壊的データ操作 / Business Phase Close。

---

## 7. 完了ログ（DONE の記録・追記のみ・削除しない）

- **2026-07-20** Phase 3 correctness 7件を main マージ（#63/#74/#58/#61/#64/#75/#73・main `2ebc45a`）。typecheck 全通過・unit 590 green を実測。Vercel 目視 **GO（想定通り）**。Obsidian② 反映（独立リポ `c24180f`）。
- **2026-07-20** **M1-b 脆弱性1周点検 DONE**。#77（`claude/padn-m1b-hardening-v1` head `c58811b`）で4クラス（tenant越境/原子性/AI境界/承認バイパス）を全モジュール1周点検→**17件ハードニング**（schema 変更ゼロ・全て防御追加）。**CI GREEN**（全4ステージ stage1/stage2_integration/stage3_e2e/release_gate pass・M1-b 実PG証拠 spec **49/49 pass**・回帰なし）。Codex 独立監査 E-v2/F-v2 の正当性指摘（deal-stage 勝者2＝expectedStage CAS 化、human-only login lowercase）を解消。**ユーザー選択A（今 merge・有限化）**で M1-b を DONE とし、残ハードニング3件（送信 at-most-once 明示契約 / post-commit 冪等 / CI 件数ゲート）は §5 M2・M3 の follow-up へ繰越（**前進のみ・再オープンしない**）。M1-a / M1-c へ前進。
- **2026-07-20** **M1-c Draft 棚卸し DONE**。open PR 10件を全判定: **Close 8**（Codex M1-b 監査 #78/#79/#80＝役割終了・CLAUDE_INTEGRATED 記録／既に main 済み #22・#3／docs-only 統治文書 #28・#30＝DELIVERY_CONTRACT が正本／stale base #2）、**採用 1**（#54 入金取消→ §5 M3 backlog）。各 close は未マージコード損失ゼロを git で検証（ancestor 判定・docs-only 判定）し根拠コメントを残した。残 open は #54 のみ。
- **2026-07-20** **M1-a 主要フロー動作確認 DONE**。main `da9b475` 上で固定18フロー（認証/CRM/案件ステージ/見積/見積→請求/請求発行・入金/財務/リード抽出/AI分析/Outreach下書き/承認→送信/承認decide/在庫/イベント/会議/ナレッジ/AIタスク/監査）を静的検証（route＋action→core 結線＋権限ガード＋$tx/CAS＋Fake フォールバック＋tenant スコープ）。**17✅**。不良 **1件のみ修正**: F16 ナレッジ検索（`knowledge/search/page.tsx`）に `knowledge:read` の基礎権限ゲートが無く、権限を持たないロールがナレッジ横断 AI Q&A を実行し得た → sibling `brain/catalog`・WIP-4 と同型の fetch 前ゲートを追加（RBAC 定義は不変＝Human Gate 非該当・typecheck/lint green）。低severity 2件（F14 監査原子性・F18 query-before-gate＝描画は gate 済み無漏洩）は §5 M3 follow-up／許容。**Vercel Production GO はユーザー確認済み**。→ **M1（a＋b＋c）完了＝Phase 3 は有限クローズ可能**。次は M2（実運用解禁・人間判断）か M3（#54 rebase／機能拡張）。
- **2026-07-21** ✅ **Phase 3 CLOSED（Business Phase Close・ユーザー宣言）**。#81 を CI 全ステージ green（stage1/stage2_integration/stage3_e2e/release_gate＝all success）確認後に merge → main `9a61f99`。**Vercel Production `9a61f99` 緑をユーザー確認**。これで §1 の DONE 定義（①既知の穴0＝M1-b／②主要フロー本番動作確認＝M1-a＋Vercel GO／③Draft 棚卸し＝M1-c）を**すべて充足**し Phase 3 を有限クローズ。**前進のみ・再オープンしない**（Phase 3 は以降 再監査しない）。残 open は #54（M3 backlog）のみ。次サイクルは**任意**: M2（実メール送信/実LLM/実地図の有効化を経営判断＋前提の送信 at-most-once 契約）または M3（#54 rebase→検証→merge・Phase 3.5/4 を価値順に薄い縦切り）。
- **2026-07-21** **M2 判断＝見送り（練習モード継続）**＋**#54 入金取消 DONE**＋**at-most-once 契約は既存実証で完了確認**。(1) M2 の技術前提「送信 at-most-once」は再監査の結果 **既に実装＋CI 実証済み**（両送信経路の計装 provider オラクルで provider≤1／並行=1）と判明したため再実装しない（前進のみ）。(2) 実運用解禁（実メール/実LLM/実地図＝env・secret・課金）は**ユーザー経営判断で当面見送り**、デモ運用を継続（再検討はいつでも可）。(3) M1-c 採用の #54 入金取消を **#83** として現 main へ rebase 統合（CI 全 green・main `10d988f`）。→ **M1・M2 は判断完了。以降は M3（機能拡張・薄い縦切り）を価値順に。**
- **2026-07-21** **M3-1 追客ボード DONE**（#85・main `ed26c36`）。LeadMap の売上導線で唯一欠けていた「追客」を薄い縦切りで追加（read-only 集計＋既存 action 再利用・schema 変更ゼロ）。CI は初回 nav-count 回帰（68→69）で赤→ nav-contract（unit）＋ nav_permissions/visual_evidence/release_regression（e2e 5アサーション）を同期して green。新規 `leadmap_followup_smoke` は pass。**教訓**: nav 追加時は導線数を持つ全アサーション（unit＋e2e）を sweep する。次は M3 の次機能（価値順）へ。
- **2026-07-21** **M3-2 朝礼要追客 DONE**（#87・main `5ccf79d`）。追客ボードの要追客を AI朝礼レポートへ前出し（毎朝の touchpoint で取りこぼし可視化）。**nav 変更なし＝前回の nav-count 回帰を再発させない設計**とし、手元で unit 590 まで通してから push→CI 一発 green。売上導線 M3-1（追客ボード）→M3-2（朝礼前出し）で「送って終わり」を毎朝ゼロへ。
- **2026-07-21** **M3-3 失注理由 DONE**（#89・main `9851c54`）。既存 field `Deal.lostReason`（未使用）を活用し「負けから学ぶ」導線を追加（LOST 時の理由記録・詳細表示・一覧の傾向集計）。core は LOST 遷移限定で後方互換（M1-b CAS spec 非影響）・schema/nav 変更なし。事前 e2e 影響確認＋手元 unit 590 通過で CI 一発 green。売上導線: 追客ボード→朝礼前出し→失注学習、で「取り、追い、負けから学ぶ」を一通り。
- **2026-07-21** **M3-4 停滞案件 DONE**（#91・main `6eca9a4`）。受注前で次アクション期限切れの案件を /deals に前出し（放置→失注を防ぐ）。既取得 deals の JS 抽出で追加クエリ・schema・nav 変更なし。事前 e2e 影響確認＋手元 unit 590 で CI 一発 green。**このセッションの M3: 追客ボード→朝礼要追客→失注理由→停滞案件 の4機能で「取り・追い・負けから学び・取りこぼさない」売上導線が一通り完成。** 4連続投入したためユーザーへ checkpoint（続行 or 一息）を確認。
- **2026-07-23** ✅ **Phase 3.5（広告・SEO/Content・紹介）CLOSED（Business Phase Close・人間承認）**。C19 広告 read model＋AI下書き（`packages/shared/src/ads.ts`・`MarketingSuggestion.approvalStatus`＝schema:1728）／C21 SEO/Content の承認ブリッジ（`content-seo.ts`・`content-approval.ts`・`suggestion-approval.ts`）／C22 紹介（`referral.ts`・`CustomerReferral`＝schema:3467・紹介元ランキング #108・要フォロー検知 #110）の3系統を **#93〜#127** の範囲で実装し、各 PR で CI 全ステージ green を実測。**人間が Vercel Production `0dbea72` を確認**（代表画面 GO）。AI は外部送信・承認・削除を持たず生成物は必ず下書き（封印維持）。#93〜#127 の個別詳細は本節の各行＋PR 履歴を正とし、ここでは**統合クローズ記録として要約**する。**前進のみ・再オープンしない**。
- **2026-07-23** ✅ **Phase 4（AI社員／コントロールプレーン／成果台帳）CLOSED（Business Phase Close・人間承認）**。AI社員の証拠由来状態（`ai-workforce.ts`・`agent-run-lifecycle.ts`・`ai-characters.ts`）／Agent Control Plane v0（`control-plane.ts`＝AI実行の遷移許可表・巻き戻し禁止・stale を「稼働中」と見せない）／Work Evidence（`outcome-evidence.ts`＝成果は証拠5区分のみ・baseline なしは「計測なし」）を実装し CI green（roadmap 69〜92 の証拠段階）。**人間が Vercel Production `0dbea72` を確認**。外部操作・実LLM・課金は封印のまま（§6 Human Gate 不変）。**Phase 4.1／4.5 は作らない**。残件は Phase 5 候補として §5 と Phase 5 governance（Task Packet）へ移管。**前進のみ・再オープンしない**。
- **2026-07-23** **台帳整理（前進のみ）**: Codex 依頼キュー `docs/coordination/codex-queue/2026-07-23-B-f-r7-02-slice1-audit.md` を **OPEN→DONE**。同 slice1 監査は Codex `be37a55`（reaudit-B-cashflow）で実施され、実害3件（B-S1-01/02/03）は **#126（main `93d4e5f`）** で反映済みのため依頼は役割終了。**古い OPEN 監査依頼を新規 Phase 5 機能として扱わず、実態確認の上で台帳を DONE に単調遷移**（§2 台帳が正）。
- **2026-07-23** **Phase 5 へ移す残件（製品課題）と文書整理の切り分け**。製品課題＝(a) F-R7-02 slice2（producer 側 canonical-id＋unified/bridge reader 統一・schema 変更を伴う＝Human Gate)／(b) post-commit 冪等 durable requestId（§5 M2 の未完）／(c) operations 監査の原子性（§5 M3 の未完・低 severity）／(d) M1-b 証拠 spec の件数ゲート（§5 M3・CI infra）。これらは **Phase 5 の承認済み Task Packet（`PHASE5_TASK_PACKET_APPROVED`）を待って着手**し、本 Business Phase Close では**着手しない**。文書整理＝本コミットの3点（CURRENT_STATE／DELIVERY_CONTRACT／369-vault クローズ記録1件）＋本台帳整理のみ。
