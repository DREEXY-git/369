# Roadmap 55 — P3-CT-4 Control Tower FakeLLM 下書き生成 実装前 Gate（Candidate・docs-only・実装なし）

- 日付: 2026-07-10
- 種別: docs-only（Gate 判定と実装計画のみ・コード差分ゼロ・実装なし・push なし・commit-only）
- 対象: P3-CT-4（CT カードからの「次の一手ドラフト」生成・roadmap54 §5.2/§6 の実装候補）が既存 schema・既存 RBAC・既存 seed・既存安全基盤のみで成立するかの実装前 Gate
- 記録: 本書（Candidate）＋ `docs/audit/154_p3_ct4_control_tower_fake_llm_draft_preimplementation_gate.md`（非エンジニア向け）
- 前提: P3-CT-4 設計（roadmap54/audit153）まで完了・設計 docs push 後 CI green 確認済み。

## 1. 目的

P3-CT-4 の実装に入る前に、roadmap54 で設計した実装候補を **read-only 実査**で最終判定し（推定で断定しない）、実装計画（変更ファイル・触らないファイル・安全境界・テスト方針・STOP 条件）を確定する。

## 2. 非目標

- 実装しない（actions.ts を作らない・page.tsx/@hokko/ai/e2e を変更しない・コード差分ゼロ）。
- schema/migration/RBAC/seed/package/lockfile/ci.yml/playwright.config.ts/369-vault の変更なし。
- 外部送信・メール送信・SNS/口コミ/Googleレビュー投稿・実LLM・AIコスト・課金・本番 deploy・runtime 解禁・状態永続化なし。

## 3. 前提 CI（回帰ゲート）

- P3-CT-4 設計 docs push 後 CI **run 29114587876**（run_number 152・head_sha `e43bab5`）= completed / success・stage1 success・stage3_e2e success・**Run E2E 74 passed / 0 failed**（ログ本文で直接確認: env `LLM_PROVIDER: fake`/`MAIL_PROVIDER: log`/`EXTERNAL_SEND_ENABLED: false`・`Running 74 tests`・`74 passed (1.1m)`・growth_control_tower `:17:1` 社長閲覧 ✓・`:30:1` 担当者 redaction ✓・failed/flaky/strict-mode violation なし）。stage3_e2e は 11 run 連続 green。

## 4. read-only 実査したファイル

roadmap54/audit153（設計）／CT 現行4ファイル（page.tsx・lib/domains/growth/control-tower.ts・shared/growth-control-tower.ts・growth_control_tower.spec.ts）／`apps/web/lib/leadmap.ts`（generateOutreachForLead 完成形）／`apps/web/lib/ai-safety-server.ts`（safeAiInput・saveAIOutputStandard・assertAiToolAllowed）／`apps/web/app/(app)/leadmap/actions.ts`（generateOutreachAction: hasPermission(leadmap,create)→生成→writeAudit(ai_run)）／`apps/web/lib/approval.ts`（guardDangerousAction）・approvals/decideApprovalAction・invoice-send/dunning（HCG 型）／outreach ページ isSuppressed／schema.prisma（AIOutput 2101・OutreachDraft 2931・ApprovalRequest 281・AuditLog/DataAccessLog/UsageEvent・LocalBusinessLead/Customer/Deal）／`packages/shared/src/rbac.ts`（ROLE_PERMISSIONS・isAiRole・isHumanUser）／`packages/ai/src/providers/index.ts`（getLLMProvider）・`packages/ai/src/tasks.ts`（fakeOutreachDraft 等の fakeX 群）／db.ts・audit.ts・usage-events.ts／package.json（検証コマンド）・e2e login helper・seed.ts（CT 対象データ）。

## 5. Gate 判定（A〜I）

| # | 判定項目 | 結果 | 根拠（実査） |
|---|---|---|---|
| A | 既存 schema のみで成立 | **YES** | AIOutput（task/purpose/entityType/output/outputText/confidence/safetyFlags）に汎用「次の一手ドラフト」を保存可。リード営業文は既存 OutreachDraft 導線へ deep link 委譲（CT 側で新規生成しない）。ApprovalRequest は既存 guardDangerousAction/decideApprovalAction で足りる（CT から直作成しない）。**新規 table/column/enum 不要**。 |
| B | 既存 RBAC のみで成立 | **YES** | 表示は既存 requireUser＋read 系（P3-CT-1 で稼働中）・finance は hasPermission(finance,read)。生成 Server Action は人間起点で `hasPermission(user,'leadmap','create')` の前例（generateOutreachAction:94）を踏襲＋`isHumanUser`（rbac.ts:156）で AI ロール拒否。**新規 action/role 不要・AI_AGENT/AI_ASSISTANT に送信/承認/削除を追加しない**（rbac.ts:70 コメントの原則不変）。 |
| C | 既存 seed のみで成立 | **YES** | seed.ts に LocalBusinessLead/Deal/ProductCatalogItem/Customer 等の CT 対象データが既存（36 箇所）で、**CI 74/0（growth_control_tower 2件 green）が既存 seed で CT カード表示可能なことを実測証明**。追加 e2e（生成→表示 smoke）も既存 seed のリード/カードで書ける。**新規 seed 不要**。 |
| D | FakeLLM/deterministic のみで成立 | **YES** | `getLLMProvider` は `env.LLM_PROVIDER || 'fake'` でキー未設定は**必ず FakeLLM フォールバック**（providers/index.ts:21-24）。tasks.ts の全タスクに fakeX 実装（fakeOutreachDraft 等）があり実LLM失敗時も fake へ。**実LLM・AIコスト・externalAiAllowed true 不要**。CI env も fake 固定。 |
| E | redaction / PII 境界 | **YES（成立）** | redacted カードは UI でボタン非表示＋**Server Action 側でも card key×canViewFinance を再判定して拒否**（二重防御・lib の count=null 構造を流用）。FakeLLM 入力はカード key/redact 済み件数/優先度ラベルのみ＝finance 実値・顧客名・メール・電話・住所・placeId を渡さずに成立。metadata/audit/UsageEvent に金額・カード別件数・PII・secret・本文を入れない（saveAIOutputStandard の metadata は task/model のみの既存規約）。 |
| F | HCG / Consent / Suppression | **YES（不変で成立）** | AI は送信/承認/削除しない（assertAiToolAllowed＋checkToolPermission の多重防御既存）。生成物は下書きのみ（AIOutput／既存導線の OutreachDraft=DRAFT）。実送信は既存 ApprovalRequest→/approvals→decideApprovalAction に委譲。isSuppressed 表示・送信前抑止・positive Consent 用途別分離は既存導線がそのまま効く（CT は deep link のみで新経路を作らない）。 |
| G | Audit / UsageEvent | **YES** | writeAudit は既存 `ai_run`（generateOutreachAction:117 の前例そのまま・新 action 不要）。DataAccessLog は P3-CT-3 の read/confidential_view 配線維持（変更不要）。UsageEvent は saveAIOutputStandard 経由の `ai.output.generated`（usage_only・metadata=task/model のみ）が自動計測＝**新 eventType・billable_candidate 不要**。 |
| H | 実装対象ファイル候補 | **確定** | ①`apps/web/app/(app)/growth/control-tower/actions.ts` **新規**（generateControlTowerNextStepAction: requireUser→isHumanUser→hasPermission(leadmap,create)→card key 検証→redacted 拒否→safeAiInput→FakeLLM（getLLMProvider）or deterministic→saveAIOutputStandard→writeAudit(ai_run)→revalidatePath）②`page.tsx` 変更（「AI 下書きメモを作る」ボタン＋直近 AIOutput メモの read-only 表示・redacted カードは非表示・送信/承認/削除ボタンなし）③`apps/web/tests/e2e/growth_control_tower.spec.ts` に e2e 1〜2件追加（74→75〜76）④@hokko/ai タスク追加は**不採用**（既存 getLLMProvider 直呼び＋apps/web 内 deterministic 組み立てで最小差分・prompts/schemas 変更も不要）⑤shared 純ロジックは**原則不変**（deterministic 文言組み立てを純ロジック化する場合のみ growth-control-tower.ts＋単体テスト追加を許容・schema 影響なし）。**db.ts・audit.ts・usage-events.ts・ai-safety-server.ts・schema・seed・RBAC・labels・ci.yml・playwright.config.ts・package/lockfile は触らず成立**。 |
| I | STOP 条件 | **非該当** | 新規 schema/migration・新 RBAC action/role・新 seed・新 package/lockfile・新 UsageEvent eventType・billable_candidate runtime・実LLM・externalAiAllowed true・EXTERNAL_SEND_ENABLED true・外部送信・AI による承認/送信/削除・状態永続化・redaction で塞げない機密表示・Contact 生 PII・metadata への金額/カード別件数/PII/secret/本文・ci.yml/playwright.config.ts 変更 — **いずれも不要と実査で確認**。実装段で必要になったら即 STOP・別承認。 |

## 6. Gate 結論

**Gate = PASS（STOP 非該当）。P3-CT-4 v0 は既存 schema・既存 RBAC・既存 seed・既存安全基盤（safeAiInput／saveAIOutputStandard／assertAiToolAllowed／guardDangerousAction／isSuppressed／isHumanUser／getLLMProvider fake フォールバック）のみで成立する。** 実装は別承認（P3-CT-4 実装ミッション）。

## 7. P3-CT-4 実装計画（実装段・別承認で適用）

- 変更ファイル（最小）: `growth/control-tower/actions.ts`（新規）／`growth/control-tower/page.tsx`（ボタン＋メモ表示）／`growth_control_tower.spec.ts`（e2e +1〜2）。任意: `packages/shared/src/growth-control-tower.ts`＋`src/__tests__/growth-control-tower.test.ts`（deterministic 文言の純ロジック化・DB 非依存）。
- 触らないファイル: schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・db.ts・audit.ts・usage-events.ts・ai-safety-server.ts・leadmap/approvals/dunning/invoice 導線・ci.yml・playwright.config.ts・package.json・pnpm-lock.yaml・369-vault。
- e2e 追加方針: 「社長が下書きメモを生成→画面に表示される」smoke＋「担当者は redacted カードから生成できない」の1〜2件（送信はテストしない）。既存 74 件と growth_control_tower 2件・security/redaction/HCG/Consent/Suppression 系を壊さない。CI で 75〜76 passed / 0 failed を確認。
- 検証: pnpm test（278＋α）・web/shared typecheck・lint・safety script・diff-check・secret scan・commit-only → push-only → CI。

## 8. redaction / PII 方針（不変）

担当者（canViewFinance=false）に原価・粗利・未回収・請求金額の実値を渡さない構造は不変。redacted カードは生成不可（UI＋Server Action の二重防御）。FakeLLM 入力・生成メモ・metadata に finance 実値・生 PII・placeId を入れない。既存顧客カードは件数/匿名指標のまま。

## 9. AI 境界・HCG・Consent/Suppression（不変）

LLM_PROVIDER=fake のみ・生成は人間ボタン起点のみ・AI は送信/承認/削除しない・生成物は必ず下書き・重要操作は ApprovalRequest／/approvals 経由・送信ボタンを作らない・suppressed/opt-out は既存導線の抑止がそのまま効く・口コミ量産/ステマ/Googleレビュー投稿は禁止側に固定。

## 10. writeAudit / DataAccessLog / UsageEvent 方針（確定）

writeAudit=既存 `ai_run`（1生成=1件・entityType='AIOutput'）／DataAccessLog=P3-CT-3 配線維持（変更なし）／UsageEvent=saveAIOutputStandard 経由の `ai.output.generated` のみ（usage_only・metadata=task/model のみ・新 eventType/billable_candidate 不使用）。

## 11. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| FakeLLM フォールバック既定 | providers/index.ts:21-24（`LLM_PROVIDER \|\| 'fake'`・キー未設定は必ず Fake） | D=YES |
| 人間起点生成＋ai_run の前例 | leadmap/actions.ts:90-124（hasPermission(leadmap,create)→writeAudit(ai_run)） | B/G=YES |
| AI に送信/承認/削除なし | rbac.ts:70/100-112（AI_AGENT/AI_ASSISTANT 権限）＋assertAiToolAllowed | F=YES |
| isHumanUser 砦 | rbac.ts:156-158（AI ロール混在も拒否） | B/E=YES |
| 保存先 schema 既存 | schema.prisma AIOutput/OutreachDraft/ApprovalRequest | A=YES |
| 既存 seed で CT 表示可 | seed.ts の対象データ＋CI 74/0（growth_control_tower 2件 green 実測） | C=YES |
| UsageEvent 自動計測 | saveAIOutputStandard 内 recordUsageEvent(ai.output.generated) | G=YES |
| 回帰ゲート緑 | run 29114587876 = success・74/0（ログ本文直接確認） | 前提充足 |

## 12. Assumption Log

- @hokko/ai タスク追加なし（getLLMProvider 直呼び＋deterministic 組み立て）で FakeLLM 出力の品質が「たたき台」として足りる。
- e2e +1〜2 件は既存 seed・既存 login helper で安定して書ける（strict-mode 配慮は P3-CT-1 の知見を踏襲）。
- 生成は低頻度・人間起点で AIOutput/AuditLog の増加は運用上問題にならない。

## 13. Unknowns Log

- 生成メモの表示位置（カード内 or 別セクション）と文言の最終形（実装時の UX 判断・安全境界には影響しない）。
- deterministic 文言を shared 純ロジック化するか actions.ts 内に留めるか（実装時の最小差分判断・どちらでも schema 影響なし）。
- e2e が 75 か 76 か（追加 1 or 2 件の判断）。

## 14. Risk Register

| # | リスク | 重大度 | 対応 |
|---|---|---|---|
| R1 | 外部送信への滑り | 高 | 送信ボタンを作らない・deep link のみ・HCG/EXTERNAL_SEND_ENABLED=false 不変・assertAiToolAllowed |
| R2 | PII/finance 実値の混入 | 高 | 入力はカード key/redact 済み件数/優先度のみ・redacted 生成拒否（二重防御）・PII 自動フラグ |
| R3 | redaction 回帰 | 中 | 表示構造不変・担当者 redaction e2e 維持＋「生成不可」e2e を追加 |
| R4 | UsageEvent 誤分類 | 中 | ai.output.generated のみ・usage_only 固定・新 eventType は STOP |
| R5 | schema/状態永続化の必要化 | 中 | Gate で不要と確認済み・実装中に必要になれば即 STOP・別承認 |
| R6 | e2e 増加による CI 不安定化 | 低 | +1〜2 件の read-only/生成 smoke に限定・送信テストなし |

## 15. Definition of Done（本 Gate ミッション）

- 本書＋doc154 作成／CURRENT_STATE・PROGRESS・Dashboard 更新（計5ファイル・docs/tasks のみ）／コード差分ゼロ／Gate A〜I を実査に基づき判定（PASS）／検証 Gate（diff-check・secret・safety・禁止領域・artifact・vault）緑／commit-only（push は別承認）。

## 16. 次回推奨プロンプト案

> 「doc154/roadmap55 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し 74/0 を確認。緑なら **P3-CT-4 実装ミッション（別承認・実装あり・commit-only）**: roadmap55 §7 の実装計画どおり `growth/control-tower/actions.ts` 新規＋`page.tsx` ボタン＋e2e 1〜2件（任意で shared deterministic 純ロジック＋単体）。redacted 生成拒否の二重防御・FakeLLM 入力制限・writeAudit(ai_run)・saveAIOutputStandard 経由・送信/承認/削除ボタンなし。STOP 条件該当時は停止・別承認。」

## 17. 判定

判定: **P3-CT-4 実装前 Gate = PASS（docs-only・実装なし・STOP 非該当）／既存 schema・RBAC・seed・安全基盤のみで成立（A〜I 全項目 YES を read-only 実査で確認）／実装計画確定（actions.ts 新規＋page.tsx ボタン＋e2e 1〜2件・@hokko/ai タスク追加は不採用・触らないファイル明記）**。**実装なし・コード変更なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・labels変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。前提 CI は run 29114587876（74/0・ログ本文直接確認済み）。次は doc154/roadmap55 push-only（別承認）→ CI 74/0 確認 → P3-CT-4 実装ミッション（別承認）。
