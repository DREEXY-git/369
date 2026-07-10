# Roadmap 54 — P3-CT-4 Control Tower FakeLLM 下書き生成 設計（Candidate・docs-only・実装なし）

- 日付: 2026-07-08
- 種別: docs-only（設計のみ・コード差分ゼロ・実装なし・push なし・commit-only）
- 対象: AI Growth Opportunity Control Tower（`/growth/control-tower`）のカードから、人間が次に考えるための「次の一手ドラフト」を FakeLLM / deterministic に生成する段（P3-CT-4）の設計
- 記録: 本書（Candidate）＋ `docs/audit/153_p3_ct4_control_tower_fake_llm_draft_design.md`（非エンジニア向け）
- 前提: Phase 3 GO（roadmap46）→ CT v0 設計（47）→ 実装前 Gate PASS（48）→ P3-CT-1 read-only 画面（49/50）→ P3-CT-2 優先度ロジック（51）→ P3-CT-3 監査ログ配線 設計＋実装（52/53）まで完了。

## 1. 目的

Control Tower の各カードから、**人間が次に考えるための「下書き」「次の一手メモ」を生成できる段**を設計する。原則は不変: **AI は提案するだけ**。判断・承認・送信はすべて人間。AI は外部送信しない・承認しない・削除しない・請求/会計/入金/督促/返金/値引き/契約を確定しない。生成物は必ず下書き（DRAFT）であり、重要操作は既存 ApprovalRequest / `/approvals` 経由に限る。

## 2. 非目標

- 実装しない（本書は設計のみ・コード差分ゼロ）。
- 外部送信・メール送信・SNS投稿・Googleレビュー投稿・口コミ量産・ステマ（禁止側に固定）。
- 実LLM・AIコスト・課金・本番 deploy・runtime 解禁・externalAiAllowed true・EXTERNAL_SEND_ENABLED true。
- 状態永続化（dismiss/snooze/read/unread/pin/priority override）。
- schema/migration/RBAC/seed/ci.yml/playwright.config.ts/package.json/lockfile/369-vault の変更。
- Customer/Contact の生 PII の新規表示。

## 3. 前提 CI（回帰ゲート）

- P3-CT-3 実装 push 後 CI **run 28952843194**（run_number 151・head_sha `57c6bdc`）= completed / success・stage1 success・stage3_e2e success。
- stage3_e2e **ログ本文で直接確認済み**: `LLM_PROVIDER: fake`／`MAIL_PROVIDER: log`／`EXTERNAL_SEND_ENABLED: false`／`Running 74 tests using 2 workers`／`74 passed (1.1m)`（0 failed）／growth_control_tower `:17:1` 社長閲覧 ✓・`:30:1` 担当者 redaction ✓。stage3_e2e は 10 run 連続 green。

## 4. read-only 実査結果（既存資産の確認）

| 資産 | 場所 | 実査結果 |
|---|---|---|
| FakeLLM 下書き生成の完成形 | `apps/web/lib/leadmap.ts` `generateOutreachForLead` | **safeAiInput（注入検査・high は中止）→ FakeLLM タスク `generateOutreachDraft`（@hokko/ai）→ `outreachDraft.create`（status=DRAFT・generatedBy=FakeLLM）→ `saveAIOutputStandard`** の一気通貫パターンが既存。P3-CT-4 はこの型を踏襲する。 |
| AIOutput 標準保存 | `apps/web/lib/ai-safety-server.ts` `saveAIOutputStandard` | AIOutput create＋`runSafetyChecks` で PII 自動フラグ＋**UsageEvent `ai.output.generated`（billing=usage_only・metadata=task/model のみ・idempotencyKey=AIOutput id）を自動計測**＋任意で `writeAIDataAccess(ai_reference)`。**新規 UsageEvent eventType は不要**。 |
| AI 多重防御 | 同上 `assertAiToolAllowed`＋`checkToolPermission`（shared） | AI アクターは外部送信/削除/承認/権限変更/高機密参照/承認済み実行を**構造的に実行不可**（違反は AISafetyLog 記録＋例外）。 |
| OutreachDraft | schema.prisma 2931行 | leadId 必須・status=DRAFT 既定・OutreachApproval/OutreachSendLog/OutreachReply に接続。**リード紐付きの営業文はこのモデルが既存で十分**。 |
| ApprovalRequest | schema.prisma 281行＋`apps/web/lib/approval.ts` | `guardDangerousAction`（requiresApproval 判定→approvalRequest.create）既存。実送信は `/approvals`・`decideApprovalAction` 経由。 |
| Suppression | `leads/[id]/outreach/page.tsx` | `isSuppressed`（@hokko/shared）で抑止表示済み。送信段は既存導線が強制。 |
| AIOutput | schema.prisma 2101行 | task/purpose/entityType/entityId/output/outputText/confidence/safetyFlags — **リードに紐付かない汎用「次の一手メモ」の保存先として既存で十分**。 |
| 監査 | `apps/web/lib/db.ts`・`audit.ts` | writeAudit に `ai_run` の使用前例あり（leadmap）。DataAccessLog は P3-CT-3 の read/confidential_view 配線が稼働中。 |
| Control Tower 現状 | page.tsx・lib・shared | read-only・mutation/Server Action なし・deep link のみ・redaction は lib 段階で count=null。 |

## 5. P3-CT-4 の対象範囲と生成物候補（設計判断）

### 5.1 生成物候補の比較

| 候補 | 内容 | 判定 |
|---|---|---|
| A: deterministic 次の一手メモ | カードごとの固定テンプレ文言（純ロジック・保存なし） | 既存カードの「次の一手」deep link と重複が大きく、保存なしなら情報増が薄い。**単独では不採用**（B の fallback 文言として利用）。 |
| B: FakeLLM「次の一手ドラフト」→ AIOutput 保存 | カード（非finance または finance可視）から人間がボタンで生成 → FakeLLM（getLLMProvider・env 未設定は自動 Fake）→ `saveAIOutputStandard` で AIOutput に保存（task=`generateControlTowerNextStep` 案・下書き=提案メモ） | **v0 採用（本命）**。既存 schema のみで成立・UsageEvent 自動計測・PII 自動フラグ・mutation は AIOutput 1 create のみ（業務データを変えない）。 |
| C: リード系カード → 既存 OutreachDraft 導線へ deep link | 未追客/高機会/次回接触カードは既存 `/leadmap/leads/[id]` の `generateOutreachAction`（OutreachDraft 経路）へ誘導 | **v0 採用（委譲）**。CT 側で OutreachDraft 生成を二重実装しない。suppression 表示・OutreachApproval・HCG は既存導線がそのまま効く。 |
| D: ApprovalRequest を CT から直接作成 | — | **不採用**。重要操作の申請は既存ドメイン導線（dunning/invoice/outreach）に委譲し、CT は入口に徹する。 |

### 5.2 v0 スコープ（実装候補・別承認）

- 変更候補ファイル（実装段・最小）: `apps/web/app/(app)/growth/control-tower/actions.ts`（**新規** Server Action `generateControlTowerNextStepAction`: requireUser→人間のみ（AI ロール拒否）→hasPermission 読取系→対象カード key 検証→redacted カード拒否→FakeLLM or deterministic 文言→`saveAIOutputStandard`→`writeAudit(action='ai_run')`→revalidatePath）／`apps/web/app/(app)/growth/control-tower/page.tsx`（「AI 下書きメモを作る」ボタン＋直近 AIOutput メモの read-only 表示・自動送信/承認/削除ボタンは作らない）／必要なら `packages/ai` の tasks に `fakeControlTowerNextStep`（Zod スキーマ付き・prompts 登録）。e2e 1〜2件追加（生成→表示 smoke・redacted カードは生成不可）。
- FakeLLM 入力は **カード key・件数（canViewFinance に応じ redact 済み）・優先度ラベルのみ**。顧客名・メール・金額実値・placeId は入力に含めない。

## 6. 既存 schema で成立するか（最重要判定）

**YES — P3-CT-4 v0 は既存 schema のみで成立する。**

- 保存先: AIOutput（汎用メモ・候補B）／OutreachDraft（リード営業文・候補C=既存導線委譲）とも既存。
- 新規 table / column / enum / migration: **不要**。
- 新規 RBAC action / role: **不要**（Server Action は requireUser＋既存 read 系 hasPermission＋人間限定。AI_AGENT/AI_ASSISTANT の権限は変更しない）。
- 新規 seed: **不要**（既存リード/商談/カタログの seed で e2e 成立）。
- 新規 package / lockfile: **不要**（getLLMProvider/FakeLLM は既存）。
- 新規 UsageEvent eventType: **不要**（saveAIOutputStandard 経由で `ai.output.generated` が自動計測・billing=usage_only 固定・billable_candidate 不使用）。
- 状態永続化: **不要**（生成メモは AIOutput の履歴であり既読/ピン等は作らない）。

## 7. STOP 条件（実装段で該当したら停止・別承認）

新規 table/column/enum/migration／新規 RBAC action/role／新規 seed／新規 package/lockfile／新規 UsageEvent eventType／redaction で塞げない機密表示／Contact の生 PII／外部送信／実LLM／状態永続化／writeAudit の新規 action 値が必要になった場合／metadata に PII・金額・本文・prompt を入れる必要が生じた場合 — いずれかに該当したら**実装せず STOP・人間の別承認**。

## 8. AI 境界

- LLM_PROVIDER=fake のみ（env 未設定は自動 Fake）。実LLM・AIコストなし。externalAiAllowed true にしない・EXTERNAL_SEND_ENABLED true にしない。
- 入力は `safeAiInput` で注入検査（high は生成中止）。外部LLM送信は構造的にゼロ（解禁しない）。maskText 方針維持。
- **AI は送信・承認・削除しない**。`assertAiToolAllowed`／`checkToolPermission` の多重防御と ROLE_PERMISSIONS（AI_AGENT/AI_ASSISTANT）を変更しない。生成の起点も**人間のボタン操作のみ**（AI 自動起動しない）。
- 生成物は必ず下書き（AIOutput のメモ／既存導線の OutreachDraft=DRAFT）。重要操作は ApprovalRequest／`/approvals` 経由のみ。
- prompt・生成文・本文を UsageEvent/DataAccessLog の metadata に入れない（AIOutput の output/outputText に保存し、台帳 metadata は task/model 等の非PIIのみ＝既存規約どおり）。

## 9. redaction 方針（不変）

- financeGated かつ canViewFinance=false のカードは、**生成ボタンを出さない／Server Action 側でも拒否**（二重防御）。redacted カードの安全文言は「原価・粗利は財務閲覧権限が必要です。財務権限者または上長に確認してください。」等の deterministic 文言に留め、**FakeLLM に finance 実値を渡さない**（lib は count=null のまま＝P3-CT-3 までの構造を流用）。
- 原価・粗利・未回収・請求金額の実値を非権限者に渡さない。生成メモにも finance 実値を含めない（入力に無いものは出力されない構造）。
- 既存顧客追加提案候補カードは件数/匿名指標中心のまま。

## 10. PII 方針（非増加）

- Customer/Contact の生 PII（顧客名・メール・電話・住所）を CT の生成入力・生成メモ・metadata に**新たに入れない**。リード個社向け文面が必要な場合は既存 `/leadmap` 導線（候補C）へ委譲し、そこでの既存統制（isSuppressed 表示・OutreachApproval・writeAudit・AIOutput PII 自動フラグ）に従う。
- placeId・Google 由来データも入力に含めない（帰属・キャッシュ規約は既存のまま）。

## 11. Human Certification Gate

- 外部送信はしない。CT に送信ボタンを作らない。送信系は deep link まで（実送信は既存 ApprovalRequest→`/approvals`→`decideApprovalAction`→EXTERNAL_SEND_ENABLED=true＋人間承認時のみ、の既存 HCG を不変で維持）。
- 自動送信・自動承認・自動削除ボタンは作らない。

## 12. Consent / Suppression

- suppressed / opt-out の相手に対しては、既存 outreach 導線の `isSuppressed` 表示・送信前抑止チェックがそのまま効く（CT は deep link のみで新経路を作らない）。実装段では deep link 先の抑止表示を e2e で壊さないことを確認。
- positive Consent の用途別分離を壊さない。顧客の声・事例・口コミ・SNS 投稿・Googleレビューは対象外（禁止側）。

## 13. writeAudit / writeDataAccess / UsageEvent の扱い

- **writeAudit**: 下書き生成は AIOutput の create＝重要操作として `writeAudit(action='ai_run', entityType='AIOutput', entityId=<id>, summary='Control Tower 次の一手ドラフト生成')` を1生成=1件（既存 action 値 `ai_run` の前例あり・新 action 不要）。
- **writeDataAccess**: P3-CT-3 の閲覧配線（canViewFinance=true→confidential_view／false→read・1閲覧=1件・metadata allowlist 3項目）を**そのまま維持**。生成時は saveAIOutputStandard の `logDataAccess`（ai_reference）を必要時のみ利用。
- **UsageEvent**: saveAIOutputStandard 経由で `ai.output.generated`（billing=usage_only・metadata=task/model のみ）が**自動計測**される。新 eventType・billable_candidate は使わない。
- metadata に PII/secret/本文/prompt/金額/カード別件数を入れない（P3-CT-3 denylist を踏襲）。

## 14. 画面/UX（設計のみ）

- v0 で画面変更は**必要**（「AI 下書きメモを作る」ボタン＋生成メモの read-only 表示）だが、本書では実装しない。redacted カードにはボタンを出さない。自動送信/承認/削除ボタンは作らない。重要操作は既存 `/approvals`・各ドメイン導線への deep link のみ。

## 15. テスト方針（実装段）

- 設計段ではテストを書かない。実装段: 純ロジック（deterministic 文言・入力組み立て）があれば `packages/shared` に単体追加（`src/__tests__/` 配下）。e2e は「下書きメモ生成→表示」の smoke＋「担当者は redacted カードから生成不可」まで（**送信はテストしない**）。既存 **74 passed / 0 failed** と growth_control_tower 2件・security/redaction/HCG/Consent/Suppression 系を壊さない。

## 16. 触らないファイル（実装段でも）

schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・ci.yml・playwright.config.ts・package.json・pnpm-lock.yaml・369-vault・`apps/web/lib/db.ts`・`audit.ts`・`usage-events.ts`・`ai-safety-server.ts`（既存関数を変えず利用のみ）・既存 leadmap/approvals/dunning/invoice 導線。

## 17. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| FakeLLM→DRAFT→AIOutput の完成形が既存 | `generateOutreachForLead`（leadmap.ts 227-305行） | 型を踏襲可 |
| UsageEvent 自動計測 | `saveAIOutputStandard` 内 `recordUsageEvent(ai.output.generated)` | 新 eventType 不要 |
| AI の送信/承認/削除は構造的に不可 | `assertAiToolAllowed`＋checkToolPermission | 多重防御既存 |
| 保存先 schema 既存 | AIOutput（2101行）・OutreachDraft（2931行）・ApprovalRequest（281行） | 新 schema 不要 |
| Suppression 統制既存 | outreach ページの isSuppressed 表示・送信前抑止 | deep link 委譲で維持 |
| 回帰ゲート緑 | run 28952843194 = success・74/0（ログ本文直接確認） | 10 run 連続 green |

## 18. Assumption Log

- P3-CT-4 v0 は既存 schema のみで成立（実査に基づく判定・実装前 Gate で再確認）。
- FakeLLM/deterministic のみで「人間が次に考える」価値が出る（実LLM 品質は不要・封印維持）。
- 生成は人間ボタン起点・低頻度であり AIOutput 増加は運用上問題にならない。
- カード key・redact 済み件数・優先度ラベルだけを入力にすれば PII/finance 混入は構造的に起きない。

## 19. Unknowns Log

- 実装時、汎用メモ（AIOutput）だけにするか、リード系カードで既存 OutreachDraft 導線 deep link をどこまで前面に出すか（UX 判断・実装前 Gate で確定）。
- `packages/ai` に専用タスク（fakeControlTowerNextStep＋Zod＋prompts）を足すか、apps/web 内 deterministic 組み立てで済ますか（実装段の最小差分判断）。
- 生成メモの表示位置（カード内 or 別セクション）と e2e 追加数（+1〜2 → 75〜76 tests）。
- 将来の実LLM解禁・状態永続化はいずれも別承認（本設計では扱わない）。

## 20. Risk Register

| # | リスク | 重大度 | 対応 |
|---|---|---|---|
| R1 | AI 下書きが外部送信に滑る | 高 | 送信ボタンを作らない・deep link のみ・HCG/EXTERNAL_SEND_ENABLED=false 不変・assertAiToolAllowed 多重防御 |
| R2 | 生成入力/メモへの PII・finance 実値混入 | 高 | 入力はカード key/redact 済み件数/優先度のみ・redacted カードは生成拒否・saveAIOutputStandard の PII 自動フラグ |
| R3 | redaction 回帰 | 中 | 表示系は P3-CT-1〜3 の構造を変えない・担当者 redaction e2e 維持 |
| R4 | UsageEvent 誤分類（課金候補化・新 eventType 乱造） | 中 | 既存 ai.output.generated のみ・usage_only 固定・新 eventType は STOP |
| R5 | schema/状態永続化が欲しくなる | 中 | §7 STOP 条件で停止・別承認 |
| R6 | 口コミ量産・ステマ的利用 | 中 | 対象外かつ禁止側に固定（§12）・レビュー生成機能を作らない |

## 21. Definition of Done（本設計ミッション）

- 本書＋doc153 作成／CURRENT_STATE・PROGRESS・Dashboard 更新（計5ファイル・docs/tasks のみ）／コード差分ゼロ／Gate（diff-check・secret・safety・禁止領域・artifact・vault）緑／commit-only（push は別承認）。

## 22. 次回推奨プロンプト案

> 「doc153/roadmap54 push-only（別承認）: 本 commit を feature branch へ push（main へ push しない・force なし）。push 後 CI を read-only 確認し 74/0 を確認。緑なら P3-CT-4 実装前 Gate ミッション（別承認・docs-only）: roadmap54 §5.2/§6 の実装候補（actions.ts 新規＋page.tsx ボタン＋必要なら @hokko/ai タスク＋e2e 1〜2件）が既存 schema/RBAC/seed のみで成立するかを read-only 実査で最終判定し、P3-CT-4 実装計画を確定する。」

## 23. 判定

判定: **P3-CT-4 FakeLLM 下書き生成 設計完了（docs-only・実装なし）／既存 schema のみで成立（AIOutput・OutreachDraft・ApprovalRequest・saveAIOutputStandard・ai.output.generated 自動計測を再利用）／生成物は下書きのみ・人間ボタン起点・AI は送信/承認/削除しない・重要操作は ApprovalRequest／approvals 経由／redacted カードは生成拒否＋安全文言・FakeLLM に finance 実値と生 PII を渡さない／writeAudit=ai_run 既存値・writeDataAccess=P3-CT-3 方針維持・UsageEvent=既存 ai.output.generated のみ／STOP 非該当**。**実装なし・コード変更なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・labels変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。前提 CI は run 28952843194（74/0・ログ本文直接確認済み）。次は doc153/roadmap54 push-only（別承認）→ P3-CT-4 実装前 Gate（別承認）。
