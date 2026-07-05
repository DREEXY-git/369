# 84. CaseStudyConsent schema 追加（schema-only・判定 GO）

> doc83（ConsentRecord連携器選択・**案B推奨** = CaseStudyConsent 事例許諾専用新モデル）準拠の schema-only 実装記録。§0 人間決定4点（2026-07-05 チャット提出）に基づく。
> **schema-only・UI 未実装・actions 変更なし・突合判定なし・seed 変更なし・外部送信なし・実LLMなし・AIコストなし・本番接触なし・push なし（commit-only）**。
> プロダクト機能基準は本記録 commit ではなく **Phase 2-C-5 / `6d656a3`** のまま。

---

## 1. 非エンジニア向け要約

- 顧客事例の**許諾専用台帳の「器」だけ**を追加しました（**CaseStudyConsent schema**）。テーブルの箱と索引を作っただけで、**登録画面も判定ロジックもまだありません**＝この commit で挙動が変わる画面はゼロです。
- 器は doc83 の設計どおり: 「どの事例に・どの顧客が・何の用途で・いつまで・どんな証跡で」を記録できる形。**期限（expiresAt）は必須**（§0 で「期限なし許諾は認めない」と人間決定）。
- 既存のメール営業の同意台帳（ConsentRecord）には**一切触れていません**。migration は**追加のみ migration・破壊的SQLなし**です。
- 安全状態は不変: **ConsentRecord連携までは anonymized=true のみAI参照**・**anonymized=false は未解禁**・外部公開なし。

## 2. §0 人間決定値（2026-07-05 チャット提出・そのまま記録）

| 決定 | 値 | 実装への反映 |
|---|---|---|
| CONSENT_FIELD_POLICY | KEEP_EXISTING_CONSENT_RECORD_ID_UNCHANGED | 既存 CaseStudy.consentRecordId は**今回変更なし**（rename なし・CaseStudy model 無変更） |
| EVIDENCE_STORAGE_POLICY | TEXT_POINTER_ONLY | **evidence** は証跡の**所在説明のみ**（原本本文・PII を貼らない・schema コメントに明記） |
| EXPIRES_AT_POLICY | **NULL_NOT_ALLOWED** | **expiresAt** を **DateTime 必須**にした（期限なし許諾は認めない） |
| REGISTRATION_PERMISSION_POLICY | HUMAN_KNOWLEDGE_UPDATE_ONLY | 将来 UI は人間のみ・AI 登録不可（schema コメントに明記・UI 実装時に適用） |

## 3. 実際の変更（schema＋migration＋docs のみ)

| ファイル | 内容 |
|---|---|
| `packages/db/prisma/schema.prisma` | **CaseStudyConsent model 1件のみ追加**（CaseStudy 直後・安全方針コメント11行付き）。**既存 ConsentRecord 変更なし・既存 CaseStudy 変更なし**・SuppressionList/Customer/enum 無変更・relation 追加なし |
| `packages/db/prisma/migrations/20260705002819_phase2c_consent_case_study_consent/migration.sql` | **追加のみ migration**: CREATE TABLE "CaseStudyConsent"＋CREATE INDEX 2本のみ。**破壊的SQLなし**（DROP/DELETE/TRUNCATE/ALTER/RENAME/UPDATE = 0 を grep で機械確認） |

フィールド（doc83 §7 のフィールド案どおり・expiresAt のみ §0 で必須化）: id / **tenantId**（index）/ **caseStudyId**（index・relation なし ID 参照）/ **customerId**（String?・ID 参照のみ・PII 複製なし）/ **status**（default "granted"・granted|revoked の2状態）/ **purpose**（String[]・internal_view|ai_reference|external_publish|pr|seo|customer_voice の明示列挙・用途未記載は不許可）/ **evidence**（所在説明のみ）/ **grantedAt** / **expiresAt**（**必須**）/ **revokedAt**（取り消しでも行は消さない）/ **grantedById** / note / createdAt / updatedAt。expired は expiresAt から導出・suppressed は SuppressionList から導出（台帳に固定しない）。

## 4. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| prisma validate | ✅ valid |
| prisma migrate dev（ローカルPG・localhost のみ・値非表示確認） | ✅ migration `20260705002819_phase2c_consent_case_study_consent` 作成＋適用＋client 生成 |
| migration.sql 破壊的SQL 検査 | ✅ CREATE TABLE＋CREATE INDEX 2本のみ・DROP/DELETE/TRUNCATE/ALTER/RENAME/UPDATE = **0** |
| prisma migrate status | ✅ 13 migrations・Database schema is up to date |
| pnpm test | ✅ **222/222 passed**（24 files・既存無変更） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| E2E smoke | 未実施（schema-only で画面挙動不変のため。**未実施のものを成功扱いしない**） |
| 後片付け | ✅ pg_ctl -m fast stop |

## 5. 今回やらなかったこと（すべて後続の別承認）

- **UI 未実装**（台帳の登録・閲覧画面なし＝書き込み経路ゼロ。本番テーブルは空のまま）・**writeAudit は未実装**（UI 実装時にセット）。
- **validateCaseStudyConsent 拡張は未実装**（突合判定は doc83 §9 段階3）・**anonymized=false は未解禁**・**ConsentRecord連携までは anonymized=true のみAI参照**を維持。
- 既存 ConsentRecord 変更なし・CaseStudy.consentRecordId 変更なし・AI参照条件変更なし・externalAiAllowed true UI なし・publishStatus UI なし。
- **外部公開なし**・**PR配信なし**・**SEOページ公開なし**・SNS投稿なし・**顧客の声公開なし**・Customer Pain なし・高機密ラベルなし・**実LLMなし**・**外部送信なし**・**AIコストなし**・Phase 8 なし・ENSHiN OS 外部発信なし・doc14 追記なし（本番確認記録ではないため）。

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「追加のみ」→ migration.sql 全文（CREATE TABLE＋INDEX 2本）＋destructive grep 0 の実行出力 ②「既存 model 不変更」→ git diff が schema.prisma の CaseStudyConsent ブロック追加のみ ③「検証 green」→ validate/migrate dev/status/test 222/typecheck/lint/build の実行出力 ④「設計準拠」→ doc83 §7 フィールド案との対応（expiresAt 必須化のみ §0 決定による差分）⑤「§0 決定」→ 利用者チャット提出（2026-07-05・4点とも明示値）。
**Assumption Log**: ①status 2状態＋expired/suppressed 導出は doc83 の器設計どおり ②migration 名は指示の `phase2c_consent_case_study_consent` を使用 ③FakeLLM 運用継続。
**Unknowns Log**: ①本番への migration 反映は push 後の Vercel prebuild（migrate deploy）経由＝利用者の本番確認（§0 テンプレート・doc49 の型）が後続 ②台帳 UI の権限 action の具体設計（HUMAN_KNOWLEDGE_UPDATE_ONLY の実装形・UI 承認時）③突合判定の実装詳細（doc83 §9 段階3）。
**Risk Register**: 残リスク低。書き込み経路ゼロ（UI なし）のため本番テーブルは空のまま＝実データ混入は構造的に不可能。破壊的SQLゼロを機械確認済み。次点=「器ができた=連携済み」の誤解 → 本書 §5 と CURRENT_STATE で「突合判定・UI は未実装・**anonymized=false は未解禁**」を明記。
**Definition of Done**: Scout 一致 ✅／§0 4点確定・矛盾なし ✅／read-only 監査（doc83 方針・既存 model・重複なし）✅／CaseStudyConsent model 追加 ✅／追加のみ migration ✅／検証 green（validate・migrate・status・test 222・typecheck・lint・build）✅／doc84・CURRENT_STATE・PROGRESS・vault ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 7. 次回推奨プロンプト案

> ①**doc84 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0 テンプレート・doc49 の型）**: Vercel Ready・latest commit・build green（=migrate deploy 成功の前例枠組み）・CI green・既存主要画面無回帰・**CaseStudyConsent の画面なし=schema-only のため正常**。GO なら基準昇格の判断。③その後の人間選択（いずれも別承認）: 台帳 UI（人間のみ・writeAudit・doc83 §9 段階2）／突合判定（段階3）／Customer Pain／Stage 2・3・★2・UX。

## 8. 判定

**GO**（CaseStudyConsent schema 追加・ローカル検証まで完了）。器のみで挙動不変・書き込み経路ゼロ。**ConsentRecord連携までは anonymized=true のみAI参照**・**anonymized=false は未解禁**のまま。プロダクト基準は **Phase 2-C-5 / `6d656a3`** のまま（本番確認 GO までは昇格しない）。
