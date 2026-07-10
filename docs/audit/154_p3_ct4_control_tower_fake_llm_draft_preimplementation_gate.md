# 154. P3-CT-4 Control Tower FakeLLM 下書き生成 実装前 Gate — docs/roadmap/55 の記録（docs-only・実装なし・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower の「AI 下書きメモ生成」（P3-CT-4）を実装する前の**最終安全点検（Gate）**です。設計（roadmap54）どおりに作れるかを、実際のコードと DB 設計を読んで確認しました。コードは1行も変えていません。
- 点検結果: **合格（PASS）**。以下をすべて実物で確認しました。
  - **DB 設計の変更は不要**: 下書きメモの保存先（AIOutput）・営業文の下書き（OutreachDraft）・承認申請（ApprovalRequest）はすべて既存。
  - **権限の変更は不要**: 生成は人間のボタン操作だけ（AI ロールは砦関数 isHumanUser で拒否）。AI に送信・承認・削除の権限を足さない原則もそのまま。
  - **デモデータの変更は不要**: 今の CI（74件全部合格）が、既存データで Control Tower のカードが表示できることを実測で証明済み。
  - **無料の疑似 AI（FakeLLM）だけで動く**: AI の接続設定が無ければ必ず FakeLLM に切り替わる仕組みが既存（実 AI・AI コスト・課金なし）。
  - **財務が伏せられた担当者のカードからは生成できない**: 画面でボタンを出さない＋サーバー側でも拒否の二重防御で成立。AI への入力にも金額実値・顧客の個人情報を渡しません。
  - **帳簿も既存のまま**: 重要操作の帳簿は既存の ai_run、閲覧の帳簿は P3-CT-3 のまま、利用量の帳簿は既存の ai.output.generated が自動で1件（課金しない）。
- 実装で変えるのは最小3点と確定: ①生成用のサーバー処理（新規1ファイル）②画面のボタン（1ファイル）③自動テスト1〜2件追加（74→75〜76件）。触ってはいけないファイルの一覧も固定しました。
- 新しいテーブル・権限・デモデータ・パッケージ・利用量種別・状態保存が必要になったら**即 STOP して人間の承認を仰ぐ**条件も明文化しています。
- 今回は commit のみで、push は別承認です。実装も別承認です。
- **docs-only・実装なし・schema/migration/RBAC/seed 変更なし・外部送信なし・実LLMなし・課金なし・本番なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **Gate PASS／次は doc154/roadmap55 push-only（別承認）→ P3-CT-4 実装（別承認）**。

## 2. 前提 CI

- P3-CT-4 設計 docs push 後 CI **run 29114587876 = success**・stage1/stage3_e2e success・**Run E2E 74 passed / 0 failed**（ログ本文で env fake/log/false・Running 74 tests・74 passed・growth_control_tower 2件 ✓ を直接確認）。stage3_e2e は 11 run 連続 green。

## 3. Gate 判定の要点（A〜I）

- A 既存 schema のみ = YES（AIOutput/OutreachDraft/ApprovalRequest 既存・新 table/column/enum 不要）。
- B 既存 RBAC のみ = YES（hasPermission(leadmap,create) の前例＋isHumanUser・AI に送信/承認/削除を追加しない）。
- C 既存 seed のみ = YES（CI 74/0 が既存 seed での CT 表示を実測証明・追加 e2e も既存データで可）。
- D FakeLLM のみ = YES（getLLMProvider はキー未設定で必ず Fake・全タスクに fakeX 実装・実LLM/AIコスト不要）。
- E redaction/PII = 成立（redacted 生成拒否の二重防御・入力はカード key/redact 済み件数/優先度のみ）。
- F HCG/Consent/Suppression = 不変で成立（AI は送信/承認/削除しない・下書きのみ・実送信は既存 approvals 委譲・isSuppressed 維持）。
- G Audit/UsageEvent = YES（writeAudit=既存 ai_run・DataAccessLog=P3-CT-3 維持・UsageEvent=ai.output.generated のみ・新 eventType/billable_candidate 不要）。
- H 実装対象 = 確定（actions.ts 新規＋page.tsx ボタン＋e2e 1〜2件・@hokko/ai タスク追加は不採用・db.ts/audit.ts/usage-events.ts/schema/seed/RBAC は触らない）。
- I STOP 条件 = 非該当（該当項目ゼロを実査で確認・実装中に必要化したら即 STOP）。

**結論: Gate = PASS。**

## 4. 検証結果（成功／失敗／未実施）

- 成功: read-only 実査（roadmap54/153・CT 4ファイル・leadmap.ts・ai-safety-server.ts・leadmap/actions.ts・approval.ts・rbac.ts・providers/index.ts・tasks.ts・schema 6 モデル・seed・package.json）／`git diff --check` OK／secret NONE／`node scripts/check-company-brain-safety.mjs` exit 0／禁止領域差分なし／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: pnpm test/typecheck/lint/e2e（docs-only でコード不変のため対象外・直近の緑 = run 29114587876 の 74/0 が有効）。

## 5. Evidence Map（要約）

| 主張 | 証跡 |
|---|---|
| FakeLLM 既定フォールバック | providers/index.ts:21-24 |
| 人間起点生成＋ai_run 前例 | leadmap/actions.ts:90-124 |
| AI に送信/承認/削除なし | rbac.ts:70/100-112＋assertAiToolAllowed |
| isHumanUser 砦 | rbac.ts:156-158 |
| schema 既存 | AIOutput/OutreachDraft/ApprovalRequest |
| 既存 seed で表示可 | CI 74/0（growth_control_tower 2件 green） |

## 6. Assumption / Unknowns / Risk（要約）

- 仮定: getLLMProvider 直呼び＋deterministic で品質が足りる・e2e +1〜2 は既存 seed で安定。
- 未知: メモ表示位置・deterministic の純ロジック化有無・e2e 追加数（75 or 76）— いずれも安全境界に影響しない実装時判断。
- 主リスクと対応: 外部送信への滑り→送信ボタンなし＋HCG 不変／PII・finance 混入→入力制限＋二重防御／schema 必要化→即 STOP。

## 7. Definition of Done

- roadmap55＋本書＋CURRENT_STATE/PROGRESS/Dashboard の計5ファイルのみ変更／コード差分ゼロ／Gate A〜I 判定完了（PASS）／検証 Gate 全緑／commit-only（push・実装は各別承認）。

## 8. 次回推奨プロンプト案

> 「doc154/roadmap55 push-only（別承認）: main へ push しない・force なし。push 後 CI を read-only 確認し 74/0 を確認。緑なら P3-CT-4 実装ミッション（別承認・roadmap55 §7 の実装計画どおり・STOP 条件付き）へ。」

## 9. 判定

判定: **P3-CT-4 実装前 Gate = PASS（docs-only・実装なし・STOP 非該当）／既存 schema・RBAC・seed・安全基盤のみで成立／実装計画確定**。**実装なし・コード変更なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。前提 CI は run 29114587876（74/0）。次は doc154/roadmap55 push-only（別承認）。
