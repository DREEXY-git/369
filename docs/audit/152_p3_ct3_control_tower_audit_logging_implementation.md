# 152. P3-CT-3 Control Tower 監査ログ配線 実装 — docs/roadmap/53 の記録（実装あり・1ファイルのみ・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower（成長機会の見るだけ画面）について、**「誰が・いつ・何の目的で見たか」を機密閲覧の帳簿（DataAccessLog）に正しく残す配線**を、設計（roadmap52）どおりに実装した作業です。画面の見た目は一切変えていません。
- 変えたのは **たった1ファイル**（`apps/web/lib/domains/growth/control-tower.ts`）だけです。
- 具体的に:
  - **財務が見える人（社長）が見たとき**: 今までどおり「機密閲覧」として1件記録（＋「許可」の印と、金額でない集計メモを付与）。
  - **財務が伏せられた人（担当者）が見たとき**: 今までは無記録でしたが、**今回から「閲覧」として1件記録**します。「担当者には金額が出ていない」ことを帳簿だけで説明できるようになりました。
  - どちらも **1回の閲覧につき1件**（カードごとに9件も作りません）。
- 帳簿に添えるメモは「財務表示の有無・カード枚数・要対応数」の**3つだけ**。**金額・カード別の件数・顧客の個人情報・秘密情報は絶対に入れていません**（コードにコメントで禁止リストも明記）。
- 重要操作の帳簿（AuditLog）と利用量の帳簿（UsageEvent）は**使っていません**（見るだけの画面なので設計どおり）。
- 大事な安全: 担当者に原価・粗利・未回収の実値を見せない方針は**まったく変わっていません**。今回の変更は帳簿の話だけで、画面表示・計算ロジックは不変です。顧客の個人情報も増やしていません。
- DB 設計・権限・デモデータの変更は**ありません**（既存の仕組みだけで実装）。外部送信・実 LLM・課金・本番反映もありません。
- 検証: 会社の自動テスト（単体）は 278 件すべて合格（回帰なし）、型チェック・lint・安全チェックも緑です。画面の E2E は push 後の CI で 74件・0失敗を確認予定（帳簿の記録は画面に出ないため影響なし）。
- 今回は commit のみで、push は別承認です。
- **実装あり（1ファイルのみ）・schema/migration/RBAC/seed 変更なし・writeAudit 不採用・UsageEvent 不採用・外部送信なし・実LLMなし・課金なし・本番なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **P3-CT-3 実装完了／担当者に金額実値なし／次は P3-CT-3 実装 push-only（別承認）**。

## 2. 実装前 CI 前提

- P3-CT-3 docs push 後 CI **run 28949692213 = success・stage1/stage3_e2e success・Run E2E 74 passed / 0 failed**。stage3_e2e ログ本文で env（LLM_PROVIDER=fake / MAIL_PROVIDER=log / EXTERNAL_SEND_ENABLED=false）・`Running 74 tests`・`74 passed (1.0m)`・growth_control_tower 2件 green を直接確認。stage3_e2e は 9 run 連続 green。この上で実装しました。

## 3. 何を変えたか（要点）

- `getControlTowerData` の末尾のみ変更。`actionableCount` を先に1回算出し、DataAccessLog の metadata（financeVisible / cardCount / actionableCount の3項目のみ）を作成。
- canViewFinance=true → `confidential_view`（既存）＋policyDecision:'allow'＋metadata。
- canViewFinance=false → `read`（新規・1閲覧=1件）＋label INTERNAL＋同 purpose＋policyDecision:'allow'＋metadata。
- 画面・純ロジック・e2e・db.ts・audit.ts・usage-events.ts は変更なし。

## 4. schema / RBAC / seed 影響（結論：いずれも変更なし）

- DataAccessLog テーブル・`writeDataAccess` 関数・action 値 `read`/`confidential_view` はすべて既存。新規 enum・カラム・migration・権限・seed は不要（STOP 非該当）。

## 5. 検証結果（成功／失敗／未実施）

- 成功: `pnpm test` = 278 passed / 0 failed／web・shared typecheck exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0／`git diff --check` OK／secret NONE／禁止領域差分なし（コード変更 1ファイルのみ）／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: e2e 実走（本サンドボックス不可・push 後 CI で 74/0 確認）／DataAccessLog 実書き込みの単体テスト（DB 依存のため追加せず・278 体制維持）。

## 6. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| コード変更は1ファイルのみ | git status = control-tower.ts のみ | 限定 |
| 既存 action のみ | db.ts の DataAccessAction に read/confidential_view 既存 | 新 enum なし |
| redaction 不変 | 表示・集計コード不変・追加は監査ログのみ | 担当者に実値なし |
| metadata allowlist | financeVisible/cardCount/actionableCount のみ | 金額/件数/PII なし |
| 単体緑 | pnpm test 278 passed / 0 failed | 回帰なし |
| 前提 CI | run 28949692213 = success・74/0 | 緑 |

## 7. Assumption / Unknowns / Risk（要約）

- 仮定: 1閲覧=1件で統制説明に足りる・metadata 3項目で足りる・既存 action で足りる。
- 未知: 実運用ログ量と保持期間・閲覧回数の利用量可視化の要否・P3-CT-4 の writeAudit action 値。
- 主リスクと対応: metadata 経由の漏えい→allowlist 3項目＋denylist コメント・finance 値/カード別件数を入れない／過大記録→redacted は read に分離／過少記録→read 追加で解消／e2e 回帰→表示不変・1ファイルのみ・push 後 CI 74/0。

## 8. Definition of Done

- roadmap53＋本書＋CURRENT_STATE/PROGRESS/Dashboard 更新／コード変更は control-tower.ts 1ファイルのみ／単体 278 passed・型/lint/safety 緑／Gate 全緑／commit-only（push・e2e 実緑は別）。

## 9. 次回推奨プロンプト案

> 「P3-CT-3 実装 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し 74 passed / 0 failed（growth_control_tower 2件 green）を確認。緑なら P3-CT-4 設計（別承認）へ。」

## 10. 判定

判定: **P3-CT-3 Control Tower 監査ログ配線 実装完了（commit-only）／コード変更は `apps/web/lib/domains/growth/control-tower.ts` 1ファイルのみ／DataAccessLog に confidential_view（finance）＋read（redacted）を1閲覧=1件記録／metadata allowlist 3項目のみ／writeAudit 不採用・UsageEvent 不採用・既存 action のみ／STOP 非該当**。**業務データ mutation なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・labels変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・外部送信/実LLM/AIコスト/課金/本番なし・runtime 解禁なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・状態永続化なし・metadata に金額/カード別件数/PII/secret/本文/scoreBreakdown なし・369-vault非編集・push なし（commit-only）**。前提 CI は run 28949692213（74/0）。次は P3-CT-3 実装 push-only（別承認）。
