# 87. CaseStudyConsent UI 実装 — 許諾台帳の登録・閲覧・取り消し（判定 GO）

> doc86（CaseStudyConsent UI設計・READY / GO）準拠の最小実装記録。Mode E＋Consent / Privacy / CaseStudy Governance / UI Safety / Server Action Safety / AI Safety Overlay。
> **schema変更なし・migration変更なし・seed変更なし・package変更なし・company-brain-reference 無変更・外部送信なし・実LLMなし・AIコストなし・本番接触なし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent schema / `812ae69`** のまま（本番確認 GO までは昇格しない）。

---

## 1. 非エンジニア向け要約

- 顧客事例の**許諾台帳の画面ができました**。事例ごとに「許諾の一覧・新規登録・閲覧・取り消し」ができます（doc86 の設計どおり・**UI のスコープはこの4操作のみ**・自由な編集は作っていません）。
- 守られていること: 登録・取り消しは**人間のみ**（AIは操作不可）・すべて監査ログに記録・**行の削除はできない**（取り消しても履歴が残る）・証跡欄は**所在説明のみ**（原本や個人情報を貼らないガイドを画面に明記）・**有効期限は必須**（期限なし許諾は登録できない）。
- **AIの読み方は一切変わっていません**: AIが読める顧客事例は匿名化済みだけのまま・**許諾台帳そのものをAIは読みません**・実名解禁もしていません。
- 検証: 安全ゲート・**test 230**・型・lint・ビルド・**smoke 22/22** すべて green。判定: **GO**(ローカル検証まで。本番確認は push 後の別手順)。

## 2. 実装内容と変更ファイル

| ファイル | 内容 |
|---|---|
| `apps/web/app/(app)/brain/case-studies/[id]/consents/page.tsx` | 一覧（事例単位＝ルート案1・状態/用途/証跡所在/期限・取り消し済み表示・revoke ボタン） |
| `.../consents/new/page.tsx` | 新規登録フォーム（purpose 6区分 checkbox・evidence・grantedAt・expiresAt・note・**証跡ガイド明記**） |
| `.../consents/[consentId]/page.tsx` | 詳細（台帳情報のみ表示・revoke 導線） |
| `.../consents/actions.ts` | Server Action **2本のみ**: `createCaseStudyConsentAction` / `revokeCaseStudyConsentAction` |
| `.../consents/purpose-labels.ts` | purpose 6区分の表示ラベルと日付整形（表示用の小モジュール） |
| `apps/web/app/(app)/brain/case-studies/[id]/edit/page.tsx` | 編集画面に「許諾台帳」導線リンクを1つ追加（既存フォームは無変更） |
| `packages/shared/src/case-study-consent.ts` | 純粋関数: `CASE_STUDY_CONSENT_PURPOSES`（6区分）・`isCaseStudyConsentPurpose`・`validateCaseStudyConsentInput` |
| `packages/shared/src/__tests__/case-study-consent.test.ts` | **否定系テスト8本**（test 222→**230**）: purpose 空/未知/大文字揺れ拒否・evidence 空拒否・grantedAt/expiresAt 欠落拒否・**期限逆転拒否** |
| `packages/shared/src/index.ts` | barrel 1行追加のみ |
| `scripts/check-company-brain-safety.mjs` | **CaseStudyConsent 検査を追加**: consents actions の isHumanUser・writeAudit・**物理削除禁止**・validateCaseStudyConsentInput 使用／登録画面の証跡ガイド文言／**company-brain-reference に CaseStudyConsent が存在しないこと（AI 非注入の機械検査）**／shared 否定系テストの存在 |
| `apps/web/tests/e2e/smoke.spec.ts` | **22本目**: 事例作成→編集画面→許諾台帳→登録→一覧表示→取り消し→片付け（アーカイブ）の1周＋externalAiAllowed/publishStatus UI 0件確認（既存21本無変更） |

## 3. 安全境界（doc86 準拠・実装で固定）

- **人間のみ**: 両 action とも requireUser → **isHumanUser**（AIロール一律拒否）→ hasPermission（**knowledge:update**）→ **tenantId** スコープ（対象 CaseStudy は同一 tenantId・archivedAt null・private のみ）。
- **writeAudit 必須**（create/revoke 各1回）: summary は用途・期限・取り消し日などの**最小情報のみ。evidence / note の本文・PII は audit に入れない**。
- **物理削除禁止**: delete/deleteMany 不使用（安全ゲートで機械検査）。revoke は status='revoked'＋revokedAt セットのみ・行は残る。再 revoke は拒否（検索条件で機械的に不可）。
- 入力検証は shared の純粋関数（**用途未記載は不許可・evidence 空拒否・expiresAt 必須・expiresAt が grantedAt 以前なら拒否**）＋長さ上限（evidence 1000・note 500）。
- **customerId は入力させない**: CaseStudy.customerId を自動反映（無ければ null）。**Customer picker なし・氏名/メール/電話は画面に表示しない（PII 非複製）**。
- status は create 時 **granted 固定**（画面から変更不可）。update（自由編集）なし。

## 4. AI参照に与える影響なし（機械検査つき）

- **company-brain-reference.ts は無変更**（git diff 対象外・安全ゲートが「CaseStudyConsent という文字列が存在しないこと」を常時検査）。
- **CaseStudyConsent は AI 文脈へ注入しない**・**anonymized=false は未解禁**・**ConsentRecord連携までは anonymized=true のみAI参照**。
- **externalAiAllowed true UI なし・publishStatus UI なし**（smoke 22本目でも 0件を機械確認）・**外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。
- 突合判定（granted の真正性確認・validateCaseStudyConsent の拡張）は**未実装**（doc83 §9 段階3・別承認）。

## 5. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| pnpm db:generate | ✅ 成功 |
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 4, ui files scanned: 156・**CaseStudyConsent 検査込み**） |
| pnpm test | ✅ **230/230 passed**（222→230・否定系8本追加・既存無変更） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| ローカルPG＋seed | ✅ localhost のみ・caseStudies: 4（seed 無変更） |
| E2E smoke | ✅ **smoke 22/22 green**（22本目=許諾台帳1周・既存21本回帰なし・修正ループ0回） |
| 後片付け | ✅ server 停止（curl 000）・pg_ctl -m fast stop |

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「4操作のみ・人間のみ・記録つき」→ actions.ts 実装＋安全ゲート機械検査＋smoke 22本目 green ②「物理削除禁止・AI 非注入」→ 安全ゲートの新検査（実行出力 passed）③「入力検証」→ 否定系テスト8本 green ④「既存回帰なし」→ smoke 既存21本 green＋test 230 ⑤「設計準拠」→ doc86 §4〜§10 との対応（本書 §2〜§4）。
**Assumption Log**: ①権限は knowledge:update 流用（doc86 の基本候補どおり・新 permission 追加なし）②日付は date 入力の 00:00 UTC 基準で保存（表示は YYYY-MM-DD）③FakeLLM 運用継続。
**Unknowns Log**: ①本番での1周実測（push 後の利用者確認。本番は架空事例を1件作成→台帳登録→取り消し→アーカイブ片付けの手順）②突合判定の実装詳細（doc83 §9 段階3・別承認）③revoke 理由欄の要否（初期は note で代替・将来判断）。
**Risk Register**: 証跡欄への原本/PII 貼り付け → 画面ガイド＋audit 最小情報＋ゲートのガイド文言検査で抑止（機械的な PII 検査は誤判定が多く運用担保・2-C-4 と同方針）。証跡改変 → update 自由編集なし＋物理削除禁止で抑止。「台帳=実名解禁」の誤解 → §4 と UI 文言（AI参照条件は変わりません）で抑止。
**Definition of Done**: Scout ✅／read-only 監査 ✅／UI 3画面＋actions 2本＋純粋関数＋否定系テスト8本 ✅／安全ゲート拡張 ✅／smoke 22本目 ✅／検証全green（gate・test 230・typecheck・lint・build・smoke 22/22）✅／doc87・CURRENT_STATE・PROGRESS・vault ✅／commit ⏳（ゲート後）／**push なし** ⏳（別承認）。

## 7. 次回推奨プロンプト案

> ①**doc87 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0 テンプレート・doc49 の型）**: Vercel Ready・latest commit・CI green・架空事例1件作成→許諾台帳へ→登録（証跡は所在説明のみ）→一覧表示→取り消し→事例アーカイブで片付け・externalAiAllowed/publishStatus UI なし・既存画面無回帰。GO なら基準昇格（doc88 候補）。③その後: **突合判定（doc83 §9 段階3・別承認）**／Customer Pain／Stage 2・3・★2・UX。

## 8. 判定

**判定: GO**（CaseStudyConsent 台帳UI 実装・ローカル検証まで完了）。**AI参照条件変更なし・anonymized=false は未解禁・ConsentRecord連携までは anonymized=true のみAI参照**。プロダクト基準は **CaseStudyConsent schema / `812ae69`** のまま（本番確認 GO までは昇格しない）。突合判定・公開活用・高機密・実LLM・外部送信はすべて別承認。
