# 60. P3-CT-5 完全クローズ＋Control Tower v0 完遂 — CI 80/0 正本化（Candidate・docs-only）

- 日付: 2026-07-10
- 種別: docs-only（本書時点のコード変更なし）
- 対応 audit: `docs/audit/159_p3_ct5_closeout_and_control_tower_v0_completion.md`
- 実行形態: 統合オートパイロット v4.0（人間承認 = push GO 2回・各フェーズの内部 Gate は従来どおり）

## 1. 本オートパイロットで完了したこと（commit 連鎖）

| Phase | 内容 | commit |
|---|---|---|
| A | 完全機能台帳 v1.0 正本化＋C41-C44 番号整合（roadmap58/audit157） | `25b5cb9` |
| B | P3-CT-5 設計＋実装前 Gate A〜I 全 PASS（roadmap59/audit158） | `848317c` |
| C | P3-CT-5 実装（page.tsx＋e2e 3件・検証全緑） | `14d6b7d` |
| D | push 前敵対的レビュー（3視点独立）→ medium 1件修正 | `d1d8e36` |
| E | push GO（人間承認）→ push → CI ログ本文確認 | run 29127896331 |
| F | 本書＋audit159＋CURRENT_STATE/PROGRESS/Dashboard＋369-vault 同期 | 本 commit |

## 2. CI 実測（正本）

- run **29127896331**（CI #156・head `d1d8e36`・event push）= **success**。stage1 success・stage3_e2e success・Upload(on failure)=skipped。
- Run E2E ログ本文: `Running 80 tests using 2 workers` → **`80 passed (1.2m)`**（failed 0）。
- 封印 env: `LLM_PROVIDER: fake`・`MAIL_PROVIDER: log`・`EXTERNAL_SEND_ENABLED: false`（ログ本文で確認）。
- growth_control_tower.spec.ts **8件すべて ✓**: 既存5（:17/:30/:49/:65/:77）＋P3-CT-5 新規3（:87 社長 deep link 可視＋実行ボタン不存在／:106 担当者に承認入口非表示／:116 「実行しない」宣言の常時表示）。
- stage3_e2e **15 run 連続 green**（28930122157→…→29122397143(77/0)→29125940482(77/0)→**29127896331(80/0)**）。

## 3. P3-CT-5 の実装内容（確定）

- Control Tower に「人間の判断待ち（承認導線）」セクション: 承認待ち PENDING 件数＋`/approvals` 入口（**approval:approve 権限者のみ取得・表示**）／営業メール下書き（DRAFT+PENDING_APPROVAL）件数＋`/leadmap/leads` 入口（leadmap:read）。
- **リンクのみ**。フォーム・Server Action・承認/却下/送信ボタンなし。件数は count のみ（金額・PII・件名・本文を取得しない）。固定文言「送信・承認・実行はこの画面からは行いません」を常時表示（e2e で恒久監視）。

## 4. push 前敵対的レビューの結果と対応

- 3視点（権限/redaction・e2e回帰・PII/監査）の独立レビューを実施。**本実装起因の high/medium はゼロ**。
- **既存欠陥 medium 1件を2視点が独立検出し、push 前に修正（`d1d8e36`）**: `/leadmap/leads`・`[id]`・`[id]/outreach` の3ページが requireUser のみで、leadmap:read を持たないロール（EXTERNAL_EXPERT）が URL 直打ちでリード情報・下書き本文に到達できた（P3-CT-5 以前から存在）。`/approvals`（Phase 1-19）と同型の**データ取得前 AccessDenied 遮断**を3ページに追加。RBAC 定義・schema・seed は不変。
- 記録した残課題（今回対応せず・悪用可能な穴ではない）:
  - LOW: OutreachDraft 件数は leadmap:read を持つ EXTERNAL_PARTNER/READ_ONLY にも表示される（RBAC の設計意図どおり・count のみ）。
  - LOW: 「実行しない」宣言の e2e はメモ定型文と文言ニアミス（将来文言統一時に strict-mode 注意）。
  - LOW: 実行ボタン不存在ガードは button role のみ（リンク型導線は対象外）。
  - INFO: `app/(app)/layout.tsx` の Topbar は全ロールに PENDING 件数を権限ゲートなしで表示（既存実装・本段のゲートはそれより厳格な深層防御）。need-to-know を厳密化するなら Topbar 側の別ミッション。

## 5. Control Tower v0 完遂判定

| 段 | 状態 | 記録 |
|---|---|---|
| P3-CT-0 設計 | ✅ | roadmap47/48 |
| P3-CT-1 read-only 画面 | ✅ | roadmap49/50 |
| P3-CT-2 優先度ロジック | ✅ | roadmap51 |
| P3-CT-3 監査ログ | ✅ | roadmap52/53 |
| P3-CT-4 AI 下書き（FakeLLM・二重防御） | ✅ | roadmap54-57 |
| **P3-CT-5 承認導線 deep link** | ✅ **本書（CI 80/0）** | roadmap59＋本書 |
| P3-CT-6 e2e | 畳み込み消化（72→74→77→**80**） | 各段 |
| P3-CT-7 push/CI/Gate | 畳み込み消化（15 run 連続 green） | 各段 |

判定: **AI Growth Opportunity Control Tower v0 は全段完遂**。「見る→考える（AI 下書き）→動く（承認導線）」が read-only＋人間承認の型で一気通貫し、redaction・AI 境界・封印 env が CI で恒久監視されている。

## 6. 台帳・ロードマップ接続（roadmap58 の正本番号で）

- 直接: C18（Growth）・C27（承認導線/Workflow）・C03（Permission/Approval）・C46（本書）。間接: C04/C05（AI境界・敵対的レビュー）・C08/C09・C20（OutreachDraft 導線・送信はしない）・C28・C38・C39（leadmap ゲート強化）。
- Phase 3（AI Growth Engine）第一縦切り完遂。次の人間判断: Phase 3 の**次の縦切り選定**（候補: Growth Event Ledger 最小版〔C18〕／Control Tower の朝報連携〔C28〕／CRM 閲覧統制の残課題解消〔doc125 の HOLD・C03/C39〕／Topbar 件数の need-to-know 厳密化〔§4 INFO〕等）。いずれも設計 docs-only から・別承認。
- 封印不変: 外部送信・実LLM・課金・本番 deploy・runtime 解禁・状態永続化は個別人間承認のまま。

## 7. 検証・判定

- 単体 278/0・web tsc 0・lint 0・safety 0・diff-check OK・secret NONE・禁止領域差分 0（schema/migrations/seed/rbac/labels/ci.yml/playwright.config/package/lockfile 不変）・CI 80/0 ログ本文確認。
- 判定: **P3-CT-5 完全クローズ／Control Tower v0 完遂／STOP 非該当**。**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・redaction 不変（強化）・PII 非増加**。次は本 commit の push-only（人間 GO）→ Phase 3 次縦切りの人間選定。
