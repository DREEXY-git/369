# 150. P3-CT-2 Control Tower 優先度ロジック精緻化 — docs/roadmap/51 の記録（実装あり・純ロジック中心・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower（成長機会の見るだけ画面）の**「どのカードを上に出すか」の並び順ロジックを賢くした**作業です。画面の見た目はほぼ変えていません。
- 変えたのは、計算用の純粋なロジック（DBに触れない・部品化されたコード）です。今までは「重要度＋件数」を足すだけでしたが、今回は**「重要度 × (基礎＋緊急度) × 信頼度」**という説明できる式に精緻化しました。
  - 重要度: その機会が経営にどれだけ効くか。
  - 緊急度: 件数が多いほど上がるが、一定件数で頭打ち（過剰に釣り上げない）。
  - 信頼度: そのデータの確からしさ（会社の頭脳の補充候補や件数だけの指標は低め）。
- 各カードに「なぜこのスコアか」の内訳（重要度・緊急度・信頼度）も持たせ、説明できるようにしました。
- 大事な安全: 担当者（財務権限なし）に金額（原価・粗利・未回収）の実値を見せない方針は**まったく変えていません**。金額系カードは相変わらず件数を持たず（データ構造レベルで空）、「原価・粗利は財務閲覧権限が必要です（機密情報）。」と表示されます。顧客の個人情報も増やしていません（件数だけ）。
- DB 設計・権限・デモデータは一切変えていません。外部送信・実 LLM・課金・本番反映もありません。乱数や現在時刻に依存しない（同じ入力なら必ず同じ結果）ようにしています。
- 検証: 会社の自動テスト（単体）は 278 件すべて合格（新しく7件足して全部緑）、型チェック・lint・安全チェックも緑です。画面の E2E は push 後の CI で確認します（74件・0失敗を見込み。見た目・伏せ字は変えていないので影響なし）。
- 今回は commit のみで、push は別承認です。
- **schema/migration/RBAC/seed 変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **P3-CT-2 優先度ロジック精緻化 完了／担当者に金額実値なし／次は P3-CT-2 push-only**。

## 2. 実装前 CI 前提

- P3-CT-1 の push 後 CI run 28944487139（run_number 148・head_sha 664546c）= completed / success・stage1 success・stage3_e2e success・Run E2E 74 passed / 0 failed・Upload report on failure=skipped・env fake/log/false。growth_control_tower 2件 green（社長閲覧／担当者 redaction）。これが **P3-CT-1 CI green 完了**の根拠で、この上で優先度ロジックを精緻化しました。

## 3. 何を変えたか（要点）

- 純ロジック `growth-control-tower.ts` のスコア式を「重要度×(基礎+緊急度)×信頼度」に精緻化（上限100・件数0は0・redacted は中位「要確認」・同点は重要度で安定ソート）。
- 各カードに scoreBreakdown（重要度・緊急度・信頼度）を追加し、なぜそのスコアかを説明可能に。
- 単体テストを6→13件に増やし、上限・緊急度の頭打ち・並び順・redaction・priority ラベル・説明内訳を検証。
- 画面・データ整形層・E2E は変えていません（見出し・伏せ字・件数取得は不変）。

## 4. schema / RBAC / seed 影響（結論：いずれも変更なし）

- schema/migration: 変更なし（純ロジックのみ）。
- RBAC/権限: 変更なし。seed: 変更なし。
- 状態永続化（既読・スヌーズ・ピン留め等）: 作っていません（本段の対象外・必要になれば別承認）。

## 5. 検証結果（成功／失敗／未実施）

- 成功: `pnpm test` = 278 passed / 0 failed（新規7含む・回帰なし）／`pnpm --filter @hokko/web typecheck` exit 0／`pnpm --filter @hokko/shared typecheck` exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0／`git diff --check` OK／secret NONE／禁止領域差分なし／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: E2E（growth_control_tower＋全 spec）＝本サンドボックスで実走不能。push 後の CI で 74/0 を確認。純ロジック変更は見出し・伏せ字を変えないため既存 e2e は緑維持見込み。

## 6. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| P3-CT-1 CI green 完了 | run 28944487139 success・74/0・growth_control_tower 2件 green | 緑 |
| 純ロジック精緻化 | growth-control-tower.ts の score=impact×(base+urgency)×confidence・上限100 | deterministic |
| redaction 不変 | financeGated&!canViewFinance→count=null・notice・単体テスト | 担当者に実値なし |
| PII 非増加 | 既存顧客は件数のみ | 据え置き |
| schema/RBAC/seed 非変更 | git status に該当差分なし | 既存のみで成立 |
| 単体テスト緑 | pnpm test 278 passed / 0 failed | 回帰なし |

## 7. Assumption Log

- 重要度・緊急度上限・信頼度は v0/P3-CT-2 仮置き（deterministic）。実運用値は後続で調整。
- 純ロジック変更は見出し・伏せ字を変えないため既存 e2e は緑維持。
- signals interface 不変のため画面・データ整形層は変更不要。

## 8. Unknowns Log

- 実運用での最適スコア閾値。P3-CT-3 以降の状態管理（既読/スヌーズ）は新規 schema が必要で別承認。scoreBreakdown の UI 可視化は将来検討。

## 9. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 担当者に金額露出 | 高 | redaction 不変・pure logic でも count=null・単体＋e2e で担保 |
| R2 | 既存 e2e 74/0 回帰 | 中 | 見出し・伏せ字不変・push 後 CI で 74/0 確認 |
| R3 | スコア誤判定 | 中 | scoreBreakdown で説明可能・v0 仮置き・後続調整 |
| R4 | 将来 schema 必要（状態管理） | 低 | 本段不採用・必要時 STOP・別承認 |

## 10. Definition of Done

- 純ロジック精緻化＋単体13件／pnpm test 278 passed・型/lint/safety・diff-check・secret NONE 緑／禁止領域差分なし・artifact なし・369-vault非編集／業務 mutation なし・schema/migration/RBAC/seed 変更なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・redaction 不変・PII 非増加／e2e 実緑は push 後 CI（74/0 見込み）／commit-only（push は別承認）。

## 11. 次回推奨プロンプト案

> 「P3-CT-2 push-only（別承認）: 優先度ロジック精緻化 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し、Run E2E 74 passed / 0 failed（growth_control_tower の社長閲覧・担当者 redaction 2件が緑）を確認。緑なら P3-CT-3 設計（状態管理が要るなら schema 影響を実装前 Gate で判定・別承認）を提案。」

## 12. 判定

判定: **P3-CT-2 優先度ロジック精緻化 完了（commit-only・純ロジック中心）／業務 mutation なし・read-only／STOP 非該当（既存 schema・RBAC・seed のみで成立）／単体 278 passed・型/lint/safety 緑／e2e 実緑は push 後 CI（74/0 見込み）／担当者に原価・粗利・未回収の実値なし／Customer・Contact の生 PII 非増加**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。P3-CT-1 CI green 完了の根拠は run 28944487139。次は P3-CT-2 push-only（別承認）。
