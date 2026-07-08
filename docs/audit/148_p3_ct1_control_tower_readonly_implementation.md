# 148. P3-CT-1 AI Growth Control Tower v0 read-only 画面 実装 — docs/roadmap/49 の記録（実装あり・read-only・369-vault非編集）

## 1. 非エンジニア向け要約

- Phase 3 の最初の実際の画面「AI Growth Opportunity Control Tower（成長機会の管制塔）」の **v0（見るだけ版）を作りました**。今回は「実装あり」ですが、範囲は**見るだけ（read-only）**に限定しています。
- どんな画面か: 会社の既存データ（新規開拓リード・商談・会社の頭脳・Golden Path・資金繰り・顧客件数）から「次に手を打つべき成長機会」を9枚のカードにまとめ、優先度順に1画面で見られる画面です。場所は `/growth/control-tower`（メニュー「Growth・DX OS」に追加）。
- 9枚のカード: 社長が見るべき成長機会／未回収リスク／停滞商談／低粗利改善候補／未追客リード／高機会リード／次回接触推奨／Company Brain 改善候補／既存顧客追加提案候補。各カードは「件数・理由・出典・次の一手（既存画面へのリンク）」を持ちます。
- 安全面: スタッフには原価・粗利・未回収などの**金額の実値を見せません**（「原価・粗利は財務閲覧権限が必要です（機密情報）。」と表示、または件数のみ）。この伏せ字は画面だけでなく**データを作る段階でも金額を渡さない**ようにしています。顧客の個人情報（PII）は増やさず、件数など匿名の指標だけにしています。
- AI はダミー（FakeLLM）で、外部送信・承認・削除・自動実行はしません。ボタンから何かを送ることもありません（重要操作は既存の承認画面へのリンクまで）。データの書き換え（mutation）は一切していません。監査ログだけは、金額に触れる閲覧のときに最小1件だけ記録します（金額や個人情報はログに入れません）。
- DB 設計変更・migration・権限変更・デモデータ変更は一切していません（実装前チェックで「既存のまま作れる」と確認済みでした）。外部送信・実 LLM・課金・本番反映もしていません。
- 検証: 会社の自動テスト（単体）は 271 件すべて合格（新しく6件足して全部緑）、型チェック・lint・安全チェックもすべて緑です。画面の E2E テストは、この環境ではブラウザ/DB が無く動かせないため、push 後の CI（本番同等の自動テスト）で確認します（既存72件＋新規2件＝74件、0 失敗を見込み）。
- 今回は commit のみで、push は別承認です。
- **schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package/lock変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**。判定 **P3-CT-1 read-only 実装完了（commit-only）／業務データ書き換えなし／スタッフに金額実値なし**。

## 2. 実装前 CI 前提

- doc147/roadmap48 push が起動した run 28940565283（run_number 147・head_sha a5708e3）= completed / success・stage1 success・stage3_e2e success・Run E2E 72 passed / 0 failed・Upload report on failure=skipped・env fake/log/false。stage3_e2e は 6 run 連続 72/0。この緑の上に実装しました。

## 3. 実装したこと（要点）

- 見るだけ画面 `/growth/control-tower`（ログイン確認＋会社ごとのデータ読み取り＋9枚カード）。
- 優先度計算などの純ロジック（DB非依存・単体テスト付き）。
- データ整形層（既存データを read-only 集計＋金額の伏せ字）。
- メニュー1行追加（Radar アイコン）。
- E2E テスト（社長は閲覧できる／スタッフは金額実値が出ない）。
- 記録（roadmap49・本書）＋現在地更新（CURRENT_STATE・PROGRESS・Dashboard）。

## 4. schema / RBAC / seed 影響（結論：いずれも変更なし）

- schema / migration: 変更なし（既存テーブルの見るだけ集計のみ）。
- RBAC / 権限: 変更なし（既存の「読む」権限と canViewFinance を使用）。
- seed / デモデータ: 変更なし（対象データは既にデモに存在）。
- 状態永続化（既読・スヌーズ・ピン留め・並び順固定）: 作っていません（v0 の対象外）。将来必要なら実装前に別承認。

## 5. 検証結果（成功／失敗／未実施）

- 成功: 単体テスト `pnpm test` = 271 passed / 0 failed（新規6含む・回帰なし）／`pnpm --filter @hokko/web typecheck` exit 0／`pnpm --filter @hokko/shared typecheck` exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0（ui 156→157）／`git diff --check` OK／secret scan NONE／禁止領域差分なし／artifact 混入なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: E2E（growth_control_tower＋全 spec）。理由＝本サンドボックスに Postgres/GitHub Actions/ブラウザが無く実走不能。push 後の CI（stage3_e2e）で 74/0 見込みを確認する。

## 6. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 実装前 CI 緑 | run 28940565283 success・72/0・6 run 連続 | 緑 |
| read-only（業務 mutation なし） | page に mutation/Server Action/form なし・lib は count/read のみ | 書き換えなし |
| finance 実値を担当者に出さない | control-tower.ts で canViewFinance=false 時 null・UI redaction・e2e（sales） | 漏えいなし |
| PII 非増加 | Customer は件数のみ・Contact 未参照 | 据え置き |
| schema/RBAC/seed 非変更 | git status に該当差分なし | 既存のみで成立 |
| 単体テスト緑 | pnpm test 271 passed / 0 failed | 回帰なし |
| 型/lint/safety 緑 | typecheck/lint/safety exit 0 | 緑 |

## 7. Assumption Log

- v0 のしきい値（停滞14日・次回接触30日・高機会 priority>=70）は仮置き（deterministic・状態永続化なし）。実運用値は P3-CT-2 で調整。
- 停滞商談は「更新14日超かつ未失注」で近似（enum に依存しない安全側）。
- 既存 seed に対象データ（リード・商談・会社方針・カタログ・顧客・イベント）が存在するため CI で件数表示できる。

## 8. Unknowns Log

- 最適スコアリング式・しきい値（P3-CT-2）。Company Brain 改善候補の下書き粒度（v0 は LLM 未使用の deterministic 文言）。E2E 実緑（74/0 見込み）は push 後の CI で確定。

## 9. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 担当者に finance 実値露出 | 高 | lib で null 化＋UI redaction＋e2e で担保 |
| R2 | 既存 e2e 72/0 回帰 | 中 | read-only 追加のみ・push 後 CI で 74/0 確認 |
| R3 | 描画中 writeDataAccess 二重記録 | 低 | force-dynamic・finance 参照時のみ1件・金額/PII 非記録 |
| R4 | AI 提案が外部送信/実LLM に滑る | 中 | LLM 未呼び出し・deterministic・送信導線なし |

## 10. Definition of Done

- P3-CT-1 read-only 画面・純ロジック・データ整形層・nav・e2e・docs/tasks/dashboard を最小実装／単体 271 passed・型/lint/safety・diff-check・secret NONE 緑／禁止領域差分なし・artifact なし・369-vault非編集／業務データ mutation なし・schema/migration/RBAC/seed 変更なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし／e2e 実緑は push 後 CI（74/0 見込み）／commit-only（push は別承認）。

## 11. 次回推奨プロンプト案

> 「P3-CT-1 push-only（別承認）: read-only 実装 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し、Run E2E が 74 passed / 0 failed（既存72＋新規2）であること、担当者（sales）に原価・粗利の実値が出ないことを確認。in_progress は報告して停止・failure は失敗 job/step のみ報告。緑なら次は P3-CT-2（優先度ロジック精緻化・別承認）。」

## 12. 判定

判定: **P3-CT-1 AI Growth Control Tower v0 read-only 画面 実装完了（commit-only）／業務データ read-only（mutation なし）／STOP 非該当（既存 schema・RBAC・seed のみで成立）／単体 271 passed・型/lint/safety 緑／e2e 実緑は push 後 CI（74/0 見込み）／担当者に原価・粗利・未回収の実値なし／Customer・Contact の生 PII 非増加**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は P3-CT-1 push-only（別承認）→ CI で 74/0 確認 → P3-CT-2。
