# Phase 3.5 と Phase 4 の Business Phase Close

> Phase 3.5（広告・SEO/Content・紹介）と Phase 4（AI社員・コントロールプレーン・成果台帳）を、人間の Vercel Production 確認をもって正式クローズした統合記録。#93〜#127 を1件ずつ蒸し返さず、**まとめて1つの完了記録**として残す。上位の目次は [[index]]、前段は [[案Bプラス並行前進とPhase3.5_Phase4開始]]。

- **日付**: 2026-07-23（Business Phase Close・人間承認）
- **基準 commit**: `main = 0dbea72`（**人間が Vercel Production `0dbea72` と代表画面を確認＝GO**）
- **判定**: Phase 3.5 = CLOSED ／ Phase 4 = CLOSED（いずれも「人間確認後にCLOSED可能」→ 人間確認済みで CLOSED 確定）
- **正本**: コード側 `369/tasks/DELIVERY_CONTRACT.md` §7＋`tasks/CURRENT_STATE.md`＋git refs＋各 PR。本ノートは閲覧用の要約。

## 何がクローズされたか（できるようになったこと）

### Phase 3.5 — 広告・SEO/Content・紹介（＝新規開拓を「安全な下書き」で支える3系統）

- **C19 広告**: 広告の read model と **AI 下書き**（`packages/shared/src/ads.ts`・`MarketingSuggestion.approvalStatus` schema:1728）。AI は案を**下書き**するだけで、承認・送信・削除は持たない。
- **C21 SEO/Content**: 未根拠クレームを AI に書かせない**承認ブリッジ**（`content-seo.ts`・`content-approval.ts`・`suggestion-approval.ts`）。生成物は人間承認を経るまで公開されない。
- **C22 紹介**: 紹介の記録と**紹介元ランキング**（誰の紹介が成約に繋がったか・#108）、**放置された紹介の要フォロー検知**（#110）（`referral.ts`・`CustomerReferral` schema:3467）。

### Phase 4 — AI社員・コントロールプレーン・成果台帳（＝AIの「働き」を証拠で見える化）

- **AI社員の証拠由来状態**（`ai-workforce.ts`・`agent-run-lifecycle.ts`・`ai-characters.ts`）: AI社員の状態は証拠から導く。止まっているものを「稼働中」と見せない。
- **Agent Control Plane v0**（`control-plane.ts`）: AI 実行の**遷移許可表**。巻き戻し禁止・stale（古い状態）を稼働中と誤表示しない。
- **Work Evidence（成果台帳）**（`outcome-evidence.ts`）: 成果は**証拠5区分のみ**。baseline（比較の起点）が無ければ削減時間を「計測なし」と正直に出す。

## 安全境界（クローズ後も不変）

- **AI は外部送信・承認・削除を持たない**。生成物は必ず下書き。
- **封印維持**: `EXTERNAL_SEND_ENABLED=false`・FakeLLM・`externalAiAllowed` 既定 false。
- **恒久 Human Gate**（自動実行しない）: main merge／Production（Vercel）／schema・migration／secret・env／外部送信／実LLM／課金／RBAC・機密ラベル／破壊的データ操作／Business Phase Close。詳細は [[セキュリティと権限]]。

## 作らないもの・移すもの（有限クローズ）

- **Phase 4.1／4.5 は作らない**。積み残しは**すべて Phase 5 候補**として整理する（[[プロンプト/Phase5/06_PHASE5_CLAUDE_CODE_SINGLE_PROMPT_V1|Phase 5 Claude Code統合完全プロンプト]] の Task Packet ガバナンスで扱う）。
- **Phase 5 へ移す製品課題**（承認済み Task Packet 待ち・本クローズでは着手しない）:
  - (a) F-R7-02 slice2（producer 側 canonical-id＋unified/bridge reader 統一・**schema 変更を伴う＝Human Gate**）
  - (b) post-commit 冪等（durable requestId）
  - (c) operations 監査の原子性（低 severity）
  - (d) M1-b 証拠 spec の件数ゲート（CI infra）
- **単なる文書整理**（今回実施）: `CURRENT_STATE.md`・`DELIVERY_CONTRACT.md`・本ノート1件、および Codex 依頼キュー `2026-07-23-B-f-r7-02-slice1-audit.md` の **OPEN→DONE**（実害は #126 で反映済み・役割終了）。**古い OPEN 監査依頼を新規 Phase 5 機能として扱わない**。

## 証拠の段階（言い過ぎない）

- 「Phase 3.5／4 の各系統は実装され CI green・人間が Vercel Production `0dbea72` を確認」までが確認済み。
- 「全機能完成」「完全自動運用」といった、証拠を超える表現は使わない。実運用（実メール送信・実LLM・課金）は封印のままで、解禁は各々個別の人間承認事項。
