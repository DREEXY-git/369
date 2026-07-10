# Phase 3 Gate 残統制方針と人間判断チェックリスト — Phase 3 前の残りの決めごとを紙で整理した回（HOLD）

> 出典（正本）: `369` リポジトリ `docs/audit/126_phase3_gate_remaining_controls_policy.md`（判定 B: HOLD）＋ `docs/audit/127_phase3_gate_human_decision_checklist.md`（判定 B: HOLD継続）。本ノートはその要約。
> 関連: [[CustomerContact閲覧統制追加監査]] / [[Phase3Gate判断確認]]

## これは何か

- Phase 3（AI Growth Engine）へ進む前に残っている「設計の決めごと」を、コードを**一切変えず**に文章として正本化し（doc126）、続けてそれを社長（人間）が決めるための**チェックリスト**に整理した（doc127）2回分の記録です。実装ではありません。
- すでに良い点として、Customer 詳細画面は権限のない人に顧客機密が見えない仕組み（`assertCanViewConfidential`）が効いており、営業メールの外部送信は「人間承認 → 配信停止リスト（SuppressionList）チェック → 送信フラグ（EXTERNAL_SEND_ENABLED）がONのときだけ送信」で守られています。既定では実送信しません（LogEmailProvider）。AIは外部送信を単独で実行できません。

## 社長に決めてほしいこと（やさしい言い換え）

- ① **Customer一覧**の行ごとの機密制御を据え置くか格上げするか（据え置き＝生の個人情報列を足さない約束を維持、が暫定既定）。
- ② **LocalBusinessLead** / **LocalBusinessContact** の連絡先（電話・メール・住所）閲覧を現状維持か、参照ログ（DataAccessLog）一体化に格上げするか。
- ③ **Contact** 単体を親顧客のラベルに従わせるか（従属が既定方針）。
- ④ 営業送信を **opt-out**（配信停止方式・SuppressionList 強制）で正式運用してよいか。
- ⑤ 同意記録（**ConsentRecord**）を用途別に分けてよいか。
- ⑥ 回帰テスト（品質チェック）の合格を Phase 3 前の必須条件にするか（格上げ推奨）。
- いずれも**人間 Phase Gate 承認**事項で、AIが勝手に決めることはありません。

## 変わらない約束

- **schema変更なし・migrationなし・RBAC変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし。**
- 送信安全ゲート（人間承認＋Suppression 強制＋送信フラグ既定OFF）と AI境界（FakeLLM・externalAiAllowed 既定false）は封印のまま。安全ゲートは exit 0（合格）。
- GitHub が正本、Obsidian はナレッジ。

## 次の一手（すべて人間判断・別承認）

1. チェックリスト（doc127 の6点）への人間の決定を受領し、Phase 3 移行 GO/HOLD を確定記録（→ doc128）
2. 回帰ゲート green の実測確認（別途）
3. 格上げを選んだ場合の schema/RBAC 変更は事前停止条件として別の重い承認

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
