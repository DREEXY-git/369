# 79. Phase 2-C-5 — CaseStudy AI参照の最小実装（判定 GO）

> doc78（2-C-5-ENTRY 設計・READY/GO）準拠で、company-brain-reference に**顧客事例を4テーブル目**として追加した記録。Mode E＋AI Safety/Quality/CaseStudy Reference Boundary/GitHub・Obsidian Overlay。
> **schema変更なし・migration変更なし・seed変更なし・package変更なし・knowledge/search 無変更・writeAIDataAccess 無変更・外部送信なし・実LLMなし・AIコストなし・本番接触なし・pushなし（commit-only）**。

---

## 1. 非エンジニア向け要約

- AI（ナレッジ検索）が**顧客事例を読めるようになりました**。ただし読めるのは **anonymized=true のみ**（匿名化済みの事例だけ）・**publishStatus private のみ**（非公開のみ）・**NORMAL/INTERNAL のみ**です。実名寄りの事例は、許諾ありと記録されていても読みません（doc78 の設計どおり・**consentStatus=granted を真正な許諾として扱わない**）。
- 読んだら1件ごとに **ai_reference 自動記録**（既存の仕組みが自動で効く形・/admin/data-access-logs の紫「AI参照」バッジ）。外部の AI には**外部LLM注入ゼロ**（externalAiAllowed ゲート維持・全件 false＝構造的ゼロ）。
- 「匿名化済みだけを読む」という条件自体を**安全ゲート（CI の自動見張り）に追加**したので、この条件が壊れると push のたびに機械が検知します。
- 検証: test 222・型・lint・ビルド・安全ゲート・**smoke 21/21**（新規=顧客事例の参照元表示）すべて green。判定: **GO**（ローカル検証まで。本番確認は push 後の別手順）。

## 2. 実際の変更（3ファイル＋docs）

| ファイル | 内容 |
|---|---|
| `apps/web/lib/company-brain-reference.ts` | **4テーブル目追加のみ**（既存3テーブルのロジック無変更）。entityType union に `'CaseStudy'`・Promise.all に `prisma.caseStudy.findMany`・caseStudyCandidates ブロック・selected の連結に追加 |
| `apps/web/tests/e2e/smoke.spec.ts` | 21本目「ナレッジ検索で顧客事例の参照元が表示される」（q=（架空）美容室の予約導線改善 → AIの回答＋参照した会社の頭脳＋タイトル表示。2-B-5 の18本目と同型・既存20本無変更） |
| `scripts/check-company-brain-safety.mjs` | **CaseStudy AI参照の検査を追加**: prisma.caseStudy.findMany 存在・**anonymized: true 存在・publishStatus: 'private' 存在**・entityType 'CaseStudy' 存在（欠けたら日本語エラーで exit 1）。既存検査（4actions・validateCaseStudyConsent・private 固定・externalAiAllowed UI 走査）は全維持 |

## 3. 参照条件の実装内容（doc78 §3/§5 準拠・全条件を where に明記）

- **where**: `tenantId`・`archivedAt: null`（tenantId / archivedAt:null 必須）・**`publishStatus: 'private'`（非公開のみ）**・**`anonymized: true`（匿名化済みのみ）**・`label: { in: AI_READABLE_LABELS }`（**NORMAL/INTERNAL のみ**）＋ canAccessLabel。
- **select しない（AI 文脈へ注入しない）**: **sourceNote / customerId / consentRecordId を注入しない**・consentStatus も select しない（参照条件に使わない＝granted を根拠にしない）。
- **文脈化**: `【顧客事例/業種】body`＋「課題:」「提供内容:」「結果（定性的）:」prefix。score 対象 = title/industry/tags/body/challenge/solution/outcome。
- **上限維持**: MAX_PER_TABLE=3・**MAX_TOTAL=5 据え置き**・MIN_SCORE=3・CONTEXT_TEXT_LIMIT=800（4テーブル化しても合計上限不変＝読み過ぎ防止）。
- **externalAiAllowed ゲート維持**: 既存の external フィルタ＋maskText をそのまま通る（CaseStudy は全件 false・true UI なし → 外部LLM時の注入は構造的にゼロ）。
- **ai_reference 自動記録**: knowledge/search の既存 brainRefs ループが entityType='CaseStudy' でレコード単位に自動記録（knowledge/search・audit・db は**無変更**）。

## 4. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| pnpm db:generate | ✅ 成功 |
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 4, ui files scanned: 151・**CaseStudy 参照条件の新検査4件込み**） |
| pnpm test | ✅ **222/222 passed**（24 files・既存無変更） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| ローカルPG＋seed | ✅ localhost のみ（値非表示確認済み）・caseStudies: 4（全件 anonymized=true / private・seed 無変更） |
| E2E smoke | ✅ **smoke 21/21 green**（21本目=顧客事例の参照元表示・既存20本回帰なし） |
| 後片付け | ✅ server 停止（curl 000）・pg_ctl -m fast stop |

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「匿名化済み・非公開のみ参照」→ 実装 where 句＋safety gate の機械検査（実行出力）②「参照元表示が動く」→ smoke 21本目 green ③「ai_reference 自動追随」→ knowledge/search 無変更＋brainRefs ループの既存実測（doc78 §2）④「外部LLM構造ゼロ」→ 既存 external フィルタ無変更＋UI 走査 151 ⑤「既存回帰なし」→ smoke 既存20本 green＋test 222。
**Assumption Log**: ①MAX_TOTAL=5 据え置きで回答品質維持（2-B-5 の前例）②FakeLLM 運用継続（実LLM解禁は別の重い承認）。
**Unknowns Log**: ①本番での参照元表示・ai_reference 記録の実測（push 後の利用者確認。**本番は seed 未投入のため、本番で確認するには架空事例を1件作成してから検索する手順になる**）②ConsentRecord 連携（別承認）③実LLM時の PII 検査拡張（別承認）。
**Risk Register**: 実名寄り事例の AI 混入は「anonymized:true 条件＋ゲート機械検査＋外部構造ゼロ＋全件記録」の4層で遮断（設計→実装→自動検証まで完了）。次点=参照スコアの不安定さ（低・決定的スコアリングでタイトル完全一致 +10 のため安定）。
**Definition of Done**: Scout ✅／read-only 監査 ✅／4テーブル目実装（既存3テーブル無変更）✅／smoke 21本目 ✅／safety gate 拡張 ✅／検証全green（test 222・typecheck・lint・build・gate・smoke 21/21）✅／doc79・CURRENT_STATE・PROGRESS・vault ✅／commit ✅／**pushなし** ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc79 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0）**: Vercel Ready・latest commit・CI green・ナレッジ検索で顧客事例が参照元表示される（本番は seed 未投入のため、先に架空・匿名の事例を1件作成 → タイトルで検索 → 「参照した会社の頭脳」に表示 → /admin/data-access-logs に **ai_reference（entityType=CaseStudy）** → 後片付けにアーカイブ）・externalAiAllowed true UI なし・既存画面無回帰。GO なら **Phase 2-C-5-PROD（doc80）**で基準昇格。③ConsentRecord 連携・Customer Pain は別承認。

## 7. 判定

**GO**（Phase 2-C-5 実装・ローカル検証まで完了）。GO済みプロダクト基準は **Phase 2-C-4 / `11e8f51`** のまま（本番確認 GO までは昇格しない）。ConsentRecord 連携・Customer Pain・高機密・実LLM・外部公開はすべて別承認。
