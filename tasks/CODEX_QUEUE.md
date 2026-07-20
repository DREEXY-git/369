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

## 更新履歴

- 2026-07-20: 初版。ラウンド1 = M1-b（PR #77 @ `1be06b5`）の独立監査を A〜G へ割当。
