# Codex 作業キュー（CODEX_QUEUE）— 独立監査レーン A〜G

> `DELIVERY_CONTRACT.md` §4 の運用版。**Claude = 実装＋自己テスト。Codex = 独立監査**（実装者は自己監査しない）。
> 受け渡しは **git**。Codex は findings を git に書き戻し、Claude がそれを読んで実装する。
> Codex も反ループ規律に従う: **1周で打ち切り・前進のみ・DONE は再監査しない**（新規発見は新項目）。

---

## 現在の監査対象（このラウンド）

- 対象: ブランチ `claude/padn-m1b-hardening-v1` @ `1be06b5`（= 現 main `2ebc45a` ＋ M1-b ハードニング17件）。
- これは **PR #77（未 merge・Draft）**。実装者が自己監査しないため、**merge 前に独立監査が必要**。
- 参考: 直近 main 統合済み7件（#63/#74/#58/#61/#64/#75/#73）は自己テスト＋人間 Gate のみで merge され、**独立監査は未実施**。回帰の観点で B/F レーンが併せて点検する。

---

## レーン A〜G（Codex チャットごとの担当）

| レーン | 担当領域 | このラウンドの具体タスク |
|--|--|--|
| **A** | correctness 統括・再監査リード | #77 の17修正が正しいか＋実装者の見落とし。B〜F の結論を集約し **GO / CHANGES_REQUIRED** を固定 SHA に紐付けて宣言 |
| **B** | tenant越境・データ境界 | main＋#77 の親子tenant整合を独立掃引（to-one 関係・raw SQL・`updateMany`/`findUnique` の tenantId 欠落・M1-b の見落とし） |
| **C** | 原子性・一貫性 | `$transaction`/CAS/冪等の正しさ。write-ahead ログの正当性。外部 I/O が tx 内に無いか。F3 の未 tx 箇所（`emitFinanceEvent` 等）の実害度 |
| **D** | AI境界・権限・承認 | `isHumanUser` ガードの網羅性。承認決定経路。**I5 の残**（AI 到達可能な send/approve/delete が無いか。event-projection/logistics 系） |
| **E** | 証拠・テスト・CI | 既存 evidence spec が主張を実証しているか。**M1-b は spec 無し** → spec を要する修正を指摘。CI が該当 SHA で green か（ログ本文で件数確認） |
| **F** | 回帰・統合 | 7 merge ＋ M1-b の相互作用で回帰が無いか（tenant 絞り込みで正常系が壊れていないか・enum 検証で既存フロー拒否が出ないか等） |
| **G** | Phase 完了ゲート・doc 整合 | `DELIVERY_CONTRACT` の **M1 クローズ条件**（既知の穴0＋主要フロー動作確認＋Draft棚卸し）への到達度。contract/vault 整合。「Phase 3 クローズに残るもの」を列挙 |

---

## 成果物フォーマット（git へ書き戻す）

各レーンは:

1. `claude/padn-m1b-hardening-v1` @ `1be06b5` を checkout して監査する。
2. findings を `docs/audit/codex_m1b_<lane>.md` に記述する。**各 finding =** `file:line` / class / なぜ実害か / 重大度(HIGH/MED/LOW) / 修正案。**実装はしない・指摘のみ**（実装は Claude）。
3. ブランチ `codex/m1b-<lane>-audit-v1` へ push し **Draft PR**（title: `CODEX AUDIT [<lane>]: <要約>`）を開く。
4. **A レーン**は各レーンの結論を集約し、`docs/audit/codex_m1b_A_summary.md` に **GO / CHANGES_REQUIRED** を明記。
5. 判定は **固定 SHA `1be06b5`** に紐付ける。**CI green は前提であり PASS の根拠にしない**。

**禁止**: main への直接 push / merge・本番・schema・secret・外部送信の有効化・課金。これらは人間 Gate。

---

## ラウンド2（現行・2026-07-20）— 対象 SHA 更新

ラウンド1（`1be06b5`）で **Codex E が CHANGES_REQUIRED**（証拠 gap＋3 RED 候補）。Claude が対応済み。**新しい監査対象 = PR #77 の最新 head（現在 `bb9ef05`）** = 現 main ＋ M1-b 17修正 ＋ ラウンド2:

- **7本の実PG証拠spec**（`apps/web/tests/e2e/m1b_*.spec.ts`）を新設（E の要求）。
- **E-01 exactly-once**: 請求送信＝write-ahead claim→provider→finalize、outreach 送信＝resumable state machine（fault hook 付き）。
- **E-02 barrier**: finance bridge を `pg_advisory_xact_lock` ＋単一 tx 化（TOCTOU 解消）。
- **E-04 CAS**: outreach 申請 DRAFT→PENDING の CAS ＋ 編集 vs 承認の決定論的競合。
- **testable core を `next/cache` 非依存の `lib/` へ移設**（e2e loader が spec を load できるように）。

各レーンは **PR #77 の最新 head を checkout** し、**監査した exact SHA に判定を pin**（head が動いたら最新で再監査）。**CI green の SHA を対象にするのが望ましい**（`bb9ef05` の CI 結論を確認）。

- **A**: ラウンド2全体を統括再監査し GO / CHANGES_REQUIRED を宣言。
- **E（再監査）**: 自身のラウンド1 CHANGES_REQUIRED が解消したか（7 spec＋3 RED 修正）を検証。成果物は `codex/m1b-E-audit-v2`。
- **B/C/D/F/G**: 初回監査（ラウンド1 の担当領域のまま・対象 SHA のみ `bb9ef05` へ）。

## 更新履歴

- 2026-07-20: 初版。ラウンド1 = M1-b（PR #77 @ `1be06b5`）の独立監査を A〜G へ割当。
- 2026-07-20: ラウンド2。対象を `bb9ef05`（M1-b＋7証拠spec＋E-01/E-02/E-04 修正＋core 移設）へ更新。E は v2 で再監査。

---

## ラウンド3（2026-07-21・write 権限復旧後・最新 main 再監査＋独立監査）

**前提**: Codex A〜G の M1-b 監査は `bb9ef05`（M1-b 修正**前**）が対象。一部 findings は Claude が final main で既に解消済み（**stale**）:
- deal-stage「勝者2」→ expectedStage CAS 化で解消（#77）
- human-only 境界 timeout / stage3_e2e 赤 → toLowerCase 修正で **CI 全 green**（final main `80b1fc5`）

**Codex の 403（push 不可）復旧後、git 経由で以下を依頼:**

### Codex（独立監査）への依頼
1. **未 push の監査を push**: `git push origin codex/m1b-{B,C,D,G}-audit-v2`（E-v2/F-v2 は push 済み）。Claude が読み取り→取り込み。
2. **最新 main `80b1fc5` を再監査**（bb9ef05 の stale 判定をやり直す）。deliverable: `docs/audit/codex_reaudit_<lane>_80b1fc5.md` ＋ branch `codex/reaudit-<lane>` を push。判定は監査時 SHA を明記。
3. **Claude が単独 merge した money/core を独立監査**（自己監査の盲点補完）:
   - #83 入金取消（`payment_reversal` 分岐・`decideApprovalAction`）
   - M3-3 deal-stage `lostReason`（`lib/domains/deals/deal-stage.ts`）
   - #93 `decideAiGateAction` の `isHumanUser` ガード
   観点: AI境界 / 原子性 / tenant越境 / 承認バイパス / 後方互換。

### Claude（実装・並行）
- Codex D [P1] `decideAiGateAction` isHumanUser → **#93 で対応済み**。
- D の残り [P1] 調査＋修正: 承認済み invoice/dunning 送信の AI role 遮断 / I5 見送りの event/logistics → Outbox → webhook 外部 POST の AI 主体遮断。
- 機能: ①今日の打ち手 統合ビュー ②入金遅れ回収。

### 取り込み記録
Claude は各 findings 取り込み時に PR コメント/§7 へ **CLAUDE_INTEGRATED（監査 SHA・対応 PR）** を記録。前進のみ・stale は「解消済み」と明記して close。

---

## ラウンド4（2026-07-22・Phase 3.5 紹介スライスの独立監査）

**対象 SHA**: 最新 main `0ba767a`（#98/#99 セキュリティ＋ #100/#101 Phase 3.5 紹介 反映済み）。
**依頼**: Claude が実装・単独 merge した「紹介」スライスを、Codex が独立監査（自己監査の盲点補完）。read-only・指摘のみ・実装は Claude。

### 監査対象（#100 / #101）
1. **#101 紹介記録テーブル**（新規 `CustomerReferral` ＋ migration `20260722071500_phase35_customer_referral`）
   - `apps/web/app/(app)/growth/referral/records/actions.ts`（create / status 更新）
   - `apps/web/app/(app)/growth/referral/records/page.tsx`（一覧・フォーム・遷移）
   - `packages/shared/src/referral.ts`（`canTransitionReferralRecord` / `summarizeReferralRecords`）
   - `packages/db/prisma/schema.prisma`（`CustomerReferral`）＋ migration SQL
2. **#100 朝礼 紹介候補カード**（`apps/web/app/(app)/reports/morning/page.tsx` の追加分・`classifyReferralSource` 利用）
3. **フレーキー修正**（`apps/web/tests/e2e/m1b_tenant_ai_boundary_evidence.spec.ts:577` を poll 化）が **security 検査を弱めていないか**（count===1 のままか）。

### 観点
- **tenant 越境**: `CustomerReferral` は tenantId スカラ。actions の `findFirst({id, tenantId})` / `updateMany({id, tenantId})`、page の `findMany({tenantId})` で越境 read/write が無いか。migration の index/型が schema と一致か。
- **AI 境界**: `AI_AGENT` は `marketing:create` を持つ。両 action の `isHumanUser` ガードで AI 主体の作成/更新が確実に遮断されるか（人間 role のみ・isAiAgent 不整合も）。
- **原子性/一貫性**: status 更新は read(status)→`canTransitionReferralRecord`→`updateMany` の TOCTOU。並行更新で不正遷移や二重確定が起き得るか（CAS 化の要否）。create の冪等性（requestKey 無し）の実害度。
- **権限**: `marketing:read/create/update` の付与（OWNER/DEPT_MANAGER/STAFF）と画面ゲートの整合。
- **入力検証/PII**: estimatedValue の parse・maxLength、#100 が氏名を出さず件数のみ・DataAccessLog が metadata-only か。

### 成果物（git へ）
`docs/audit/codex_reaudit_referral_0ba767a.md`（各 finding = file:line / class / なぜ実害 / 重大度 / 修正案）＋ branch `codex/reaudit-referral` を push。判定は監査 SHA `0ba767a` を明記。

**禁止**: main への直接 push/merge・本番・DB・Secrets・外部送信・課金の有効化。これらは人間 Gate。既知未完（D-04/D-05・B/C defense-in-depth）は重複起票しない。

### 更新履歴（追補）
- 2026-07-22: ラウンド3 完了（B/C/D/G 再監査を Claude が取り込み: #93/#95/#96/#97＋#98 B-01＋#99 C-01/D-R3-01）。
- 2026-07-22: ラウンド4。Phase 3.5 紹介スライス（#100/#101）を対象 `0ba767a` で独立監査依頼。
