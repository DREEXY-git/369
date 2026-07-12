# Roadmap 56 — P3-CT-4 Control Tower FakeLLM 下書き生成 実装（Candidate・実装あり・commit-only）

- 日付: 2026-07-10
- 種別: 実装あり（コード変更は actions.ts 新規＋page.tsx＋e2e spec の3ファイルのみ）・commit-only（push は別承認）
- 対象: Control Tower のカードから人間起点で FakeLLM/deterministic の「次の一手ドラフト」を生成し、AIOutput に下書き保存する最小実装（P3-CT-4）
- 記録: 本書（Candidate）＋ `docs/audit/155_p3_ct4_control_tower_fake_llm_draft_implementation.md`（非エンジニア向け）
- 設計/Gate 根拠: roadmap54（設計）＋roadmap55（実装前 Gate = PASS・§7 実装計画）
- 前提 CI: **run 29116334142 = success・74 passed / 0 failed**（stage3_e2e ログ本文で env fake/log/false・growth_control_tower 2件 green を直接確認・12 run 連続 green）。

## 1. 実装目的

社長など権限のある人間が、Control Tower の成長機会カードから「次に何を考えるべきか」のたたき台（下書きメモ）をワンクリックで取得できるようにする。**AI は提案するだけ**: 送信・承認・削除・請求/会計/契約/督促/返金/値引きの確定は行わない。生成物は必ず下書き（AIOutput）で、重要操作は既存導線・`/approvals` に委譲する。外部送信・実LLM・AIコスト・課金・本番 deploy はなし。

## 2. 実装範囲（roadmap55 §7 どおり・最小差分）

1. **`apps/web/app/(app)/growth/control-tower/actions.ts`（新規）** — `generateControlTowerNextStepAction`。処理順: `requireUser` → `isHumanUser` で AI ロール拒否 → `hasPermission(user,'leadmap','create')`（AI 下書き生成の既存前例と同じ権限）→ FormData の cardKey を **9 key の allowlist で検証** → `getControlTowerData` でサーバー側再取得・対象カード存在確認 → **redacted / financeGated×!canViewFinance は拒否（二重防御）** → FakeLLM 入力を安全項目のみに制限（card key/タイトル/優先度/reason/redact 済み件数/財務表示 boolean）→ `safeAiInput`（injection high は生成せず戻す）→ `getLLMProvider().chat`（LLM_PROVIDER 未設定/fake は必ず FakeLLM）＋ **deterministic fallback**（provider 失敗時も必ず下書きを返す）→ `saveAIOutputStandard`（AIOutput 保存・`ai.output.generated` UsageEvent 自動計測・PII 自動フラグ）→ `writeAudit(action='ai_run', entityType='AIOutput')` → `revalidatePath('/growth/control-tower')` → redirect。
2. **`apps/web/app/(app)/growth/control-tower/page.tsx`（最小変更）** — 非 redacted カードに「AI 下書きメモを作る」ボタン（`data-testid=ct-generate-<key>`）、redacted カードには安全な説明のみ（「AI 下書きは財務権限者のみ作成できます。」＝既存 redaction 文言と重複しない別文言でスタッフ e2e の toHaveCount(2) を壊さない）。ページ下部に「AI 下書きメモ（最新・下書きのみ）」セクション（AIOutput task=`generateControlTowerNextStep` の直近3件を read-only 表示・`data-testid=ct-memo-item`）。**送信/承認/削除ボタン・外部送信導線は作らない**。既存カード一覧・priority・actionableCount・redaction 表示・既存 selector は不変。
3. **`apps/web/tests/e2e/growth_control_tower.spec.ts`（e2e 2件追加・74→76）** — ①社長が生成→下書きメモが表示される（ct-generate-ceo_attention クリック→ct-memo-item 表示・「次の一手ドラフト」含む・finance カードにもボタン可視）②担当者は redacted finance 2カード（unpaid_risk/low_margin_projects）に生成ボタンが出ない＋非 finance カードには出る。送信テストなし・既存2件不変・strict-mode 安全（testid 使用）。

## 3. 変更ファイル / 触らなかったファイル

- 変更（コード3）: `growth/control-tower/actions.ts`（新規）・`growth/control-tower/page.tsx`・`tests/e2e/growth_control_tower.spec.ts`／docs・tasks 5（本書・audit155・CURRENT_STATE・PROGRESS・Dashboard）。
- 任意ファイル（shared 純ロジック＋単体）は**触っていない**（deterministic 文言は actions.ts 内で完結し最小差分で済んだため）。
- 触っていない危険領域: schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・db.ts・audit.ts・usage-events.ts・ai-safety-server.ts・leadmap/approvals/finance 配下・.github/workflows・playwright.config.ts・package.json・pnpm-lock.yaml・369-vault・README/AGENTS/CLAUDE.md・docs/release（git status で差分 0 を確認）。

## 4. AI 境界

生成は**人間のボタン操作のみ**起点（`isHumanUser` で AI ロール混在も拒否）。LLM_PROVIDER=fake のみ（getLLMProvider はキー未設定で必ず FakeLLM・実LLM/AIコスト/externalAiAllowed true なし）。AI は送信・承認・削除しない（assertAiToolAllowed/ROLE_PERMISSIONS 不変）。生成物は必ず下書き（AIOutput）で、下書きメモ本文にも「送信・承認・実行は行いません」と明記。

## 5. redaction 方針（不変）

redacted カードは UI でボタン非表示＋Server Action でも `card.redacted || (financeGated && !canViewFinance)` を拒否（二重防御）。FakeLLM 入力・メモ・AIOutput に金額実値（原価・粗利・未回収額・請求額）を入れない（redacted カードは入力自体不可・非 redacted カードの count は redact 済み集計値のみ）。担当者に財務実値が出ない既存構造（lib の count=null・redaction 文言・staff e2e toHaveCount(2)）は不変。

## 6. PII 方針（非増加）

FakeLLM 入力は card key/タイトル/優先度/reason/件数/boolean のみで、顧客名・メール・電話・住所・Contact 生 PII・placeId・Google 生データ・secret・env 値・token・prompt 原文・scoreBreakdown 詳細・URL query を含めない。saveAIOutputStandard の PII 自動フラグ（runSafetyChecks）も既存どおり作動。Customer/Contact の生 PII 列は増やしていない。

## 7. HCG / Consent / Suppression

Control Tower に送信ボタンを作っていない。外部送信は既存 ApprovalRequest／`/approvals` 経由のみ（不変）。CT 側に新しい送信経路なし。isSuppressed・positive Consent 用途別分離は既存導線のまま（本実装は触れない）。口コミ/SNS/Googleレビュー投稿は対象外（禁止側）。

## 8. writeAudit / DataAccessLog / UsageEvent

- writeAudit: 1生成=1件 `action='ai_run'`・entityType='AIOutput'・entityId=保存 id・summary は安全文言（leadmap 前例踏襲・audit.ts 非変更・新 action 値なし）。
- DataAccessLog: P3-CT-3 方針維持（getControlTowerData 経由の read/confidential_view 1閲覧=1件。生成 action がサーバー側再取得を行うため、生成1回につき閲覧ログが1件増えるのは仕様どおりの副作用として記録）。
- UsageEvent: `saveAIOutputStandard` 経由の既存 `ai.output.generated`（usage_only・metadata=task/model のみ）のみ。`recordUsageEvent` の直接呼び出し・新 eventType・billable_candidate なし。

## 9. 検証結果（成功／失敗／未実施）

- 成功: `pnpm test` = **278 passed / 0 failed**（回帰なし・shared 非変更）／`pnpm --filter @hokko/web typecheck` exit 0／`pnpm --filter @hokko/shared typecheck` exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0（ui files 157→158）／`git diff --check` OK／secret scan NONE／禁止領域差分 0／artifact なし／369-vault 差分 0。
- 失敗: なし。
- 未実施: e2e 実走（本サンドボックスは Playwright ブラウザ DL 不可の既知制約）→ **push 後 CI（stage3_e2e）で 76 passed / 0 failed（既存74＋新規2）を確認**（push は別承認）。

## 10. STOP 条件（非該当を確認）

新 schema/migration・新 RBAC action/role・新 seed・新 package/lockfile・新 UsageEvent eventType・billable_candidate・実LLM・externalAiAllowed true・EXTERNAL_SEND_ENABLED true・外部送信・AI の承認/送信/削除・状態永続化・redaction で塞げない機密表示・Contact 生 PII・ci.yml/playwright.config.ts 変更 — いずれも**不要のまま実装完了（STOP 非該当）**。

## 11. Evidence Map

| 主張 | 証跡 |
|---|---|
| 人間起点＋権限＋二重防御 | actions.ts（isHumanUser→hasPermission(leadmap,create)→allowlist→再取得→redacted 拒否） |
| FakeLLM のみ＋fallback | getLLMProvider（キー未設定は Fake）＋try/catch deterministic fallback |
| AIOutput 標準保存＋UsageEvent 自動計測 | saveAIOutputStandard 呼び出し（task=generateControlTowerNextStep） |
| 監査 | writeAudit(ai_run, AIOutput)（leadmap/actions.ts:117 前例踏襲） |
| redaction 不変 | page.tsx（redacted はボタン非表示＋別文言）・staff e2e の redaction toHaveCount(2) 不変 |
| 検証緑 | pnpm test 278/0・typecheck×2・lint・safety・diff-check・secret NONE |
| 前提 CI | run 29116334142 = 74/0（ログ本文直接確認） |

## 12. Assumption Log

- e2e 2件は既存 seed で安定（CT カード9枚は常設・ceo_attention は非 finance で常時ボタンあり・testid で strict-mode 安全）。
- 生成による AIOutput/AuditLog/AISafetyLog/DataAccessLog の増加は人間起点・低頻度で運用上問題なし。
- FakeLLM の `【FakeLLM】要点:` echo＋deterministic 本文で「たたき台」価値が出る（実LLM 品質は不要）。

## 13. Unknowns Log

- push 後 CI の実測（76/0 見込み・e2e はローカル実走不能のため CI が正）。
- 下書きメモの実運用上の文言チューニング（後続の別承認で調整・安全境界に影響なし）。
- カード別メモのフィルタ表示等の UX 拡張（必要になれば別段・状態永続化は STOP 対象のまま）。

## 14. Risk Register

| # | リスク | 重大度 | 対応 |
|---|---|---|---|
| R1 | 外部送信への滑り | 高 | 送信ボタンなし・deep link のみ・HCG/EXTERNAL_SEND_ENABLED=false 不変 |
| R2 | PII/finance 実値の混入 | 高 | 入力 allowlist・redacted 二重拒否・PII 自動フラグ・メモに金額なし |
| R3 | 既存 e2e 回帰（redaction 文言カウント等） | 中 | redacted カードの新文言は既存 redaction 文言と非重複・既存2件不変・CI 76/0 で確認 |
| R4 | e2e flaky（server action 待ち） | 中 | testid＋auto-wait の expect・送信テストなし・生成1回のみ |
| R5 | UsageEvent 誤分類 | 低 | saveAIOutputStandard 経由のみ・新 eventType なし |
| R6 | schema/状態永続化の必要化 | 低 | 発生せず（STOP 非該当）・将来必要なら STOP |

## 15. Definition of Done

- Scout 前提一致／実装は許可ファイル内（コード3＋docs 5）／Server Action 新規・page.tsx 最小変更・e2e 2件追加／schema・migration・RBAC・seed・package・lockfile 変更なし／外部送信・実LLM・AIコスト・課金・本番なし／redaction 不変・PII 非増加／AI は送信・承認・削除しない・生成物は下書きのみ／pnpm test・typecheck・lint・safety・diff-check・secret すべて緑／forbidden diff・artifact・vault 差分なし／commit-only（push は別承認）。

## 16. 次回推奨プロンプト案

> 「P3-CT-4 実装 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし・amend/rebase/reset なし）。push 後 CI（stage1・stage3_e2e）を read-only 確認し、Run E2E **76 passed / 0 failed**（既存74＋P3-CT-4 新規2: 社長の下書き生成／担当者の redacted 生成不可）と env fake/log/false をログ本文で直接確認。緑なら P3-CT-5 設計（承認 deep link 強化等・別承認）を提案。実装・rerun はしない。」

## 17. 判定

判定: **P3-CT-4 Control Tower FakeLLM 下書き生成 実装完了（commit-only）／コード変更は actions.ts 新規＋page.tsx＋e2e spec の3ファイルのみ／人間起点・FakeLLM+deterministic・生成物は AIOutput の下書きのみ／redacted 生成拒否の二重防御・FakeLLM 入力から finance 実値と生 PII を排除／writeAudit=ai_run・DataAccessLog=P3-CT-3 方針維持・UsageEvent=ai.output.generated のみ／STOP 非該当**。**業務データ mutation は AIOutput/監査ログの追記のみ・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・labels変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。単体 278 passed・型/lint/safety 緑・e2e 実緑は push 後 CI（76/0 見込み）。前提 CI は run 29116334142（74/0）。次は P3-CT-4 実装 push-only（別承認）。

## 18. 追補（2026-07-10・push 前 敵対的レビューによる修正 — commit 83fd4bc への fix commit）

push 前に **6視点の敵対的レビュー（15エージェント・独立検証つき）** を commit `83fd4bc` に対して実行し、以下を確定・修正した（**push 前に発見・未 push のため外部影響ゼロ**）。

- **high（6視点すべてが独立検出・全 verify real=true）: finance 件数が AI 下書きメモ表示経由で漏れる。** 社長が finance カード（未回収リスク/低粗利改善候補）から生成したメモ本文には、deterministicDraft の `現状: ${card.reason}`（「未回収・延滞の案件が N 件あります。」等）と FakeLLM echo（`件数: N`/`要約: …`）の2経路で **finance 件数**が入る。一方 page.tsx のメモ表示クエリは tenantId＋task のみで**閲覧者の canViewFinance を見ていなかった**ため、担当者がメモ経由でカード redaction が隠している件数を見られた。**修正**: メモ表示クエリに閲覧者側 redaction フィルタを追加（canViewFinance=false は financeGated カード由来メモを `entityId notIn` で除外・生成側の二重防御に加え表示側にも防御を追加）。
- **low: leadmap:create を持たないロール（READ_ONLY/ADMIN 等）にも生成ボタンが表示され、押しても無言で失敗（denied/blocked クエリが未表示）。** **修正**: ボタン描画を `isHumanUser(user) && hasPermission(user,'leadmap','create')` でゲート（Server Action と同一判定を UI にも適用）＋ `?denied=1`/`?blocked=injection` に安全な通知文を表示（既存 redaction 文言・'表示可'/'非表示' と非重複＝既存 e2e 不変）。
- **e2e 恒久担保**: 社長テストに unpaid_risk メモ生成を追加＋新テスト「担当者には finance 由来の AI 下書きメモが表示されない」（同一ファイル直列実行で決定的）。**テスト数 74→77**（本文中の「76」見込みは 77 に更新）。
- 再検証: `pnpm test` 278 passed / 0 failed・web/shared typecheck exit 0・lint exit 0・safety exit 0・diff-check OK・secret NONE・禁止領域差分 0。変更は page.tsx＋e2e spec＋docs のみ（schema/RBAC/seed/actions.ts の安全境界は不変）。
