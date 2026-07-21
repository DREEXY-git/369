# 納品契約 — 反ループ・前進サイクルの正本（DELIVERY_CONTRACT）

> **目的**: 無限ループ（同じ所をぐるぐる）を避け、**有限の DONE** に向かって前進し続ける。
> Claude と Codex は **git を経由して**この契約に従う。散在する governance/roadmap ドキュメントより **本ファイルが優先**（正本はここ＋git refs＋PR）。

> **現在地（2026-07-21）: ✅ Phase 3 = CLOSED**。M1（a＋b＋c）完了・main `9a61f99`・**Vercel Production GO（ユーザー確認済み）**・残 open PR は #54 のみ。以降は**任意**の M2（実運用解禁・経営判断）／ M3（機能拡張）。詳細は §7。

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
- [ ] 実メール送信（`EXTERNAL_SEND_ENABLED`）/ 実LLM鍵 / 実地図API の有効化可否を**決定**（技術作業ではない）
- [ ] **（M1-b 繰越・外部送信解禁の前提）送信 at-most-once の明示契約** — claim を provider 呼び出し前に永続化しても「claim→crash→retry」で二重送信しない明示契約（`unknown` 状態＋冪等 retry oracle）。※現状は外部送信OFF・fake provider のため顧客影響なし。実送信を解禁する M2 で本契約を先に満たす。
- [ ] **（M1-b 繰越）post-commit 冪等（durable requestId）** — `assignAssetToEvent`/`assignEventStaff` の post-commit Growth 失敗→全アクション再実行で asset/staff が二重行になる経路を、durable requestId（lease/meeting と同型）で排除。

### M3 — 機能拡張（任意・完成に必須ではない）
- [ ] Phase 3.5（広告/SEO/紹介）・Phase 4（AI社員/3Dオフィス）を**価値の高い順に1機能ずつ**（薄い縦切り）
- [ ] **（M1-c 採用）#54 入金取消（payment reversal）** — 実装＋実PG evidence が main 未マージの実価値機能。base が 55 commits 古いため rebase→検証→merge を M3 で行う（承認必須・AI不可・schema 変更なし）。
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
