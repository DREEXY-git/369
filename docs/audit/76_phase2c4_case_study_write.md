# 76. Phase 2-C-4 — CaseStudy 人間書き込み（作成・編集・アーカイブ・判定 GO）

> Phase 2-C-3（read-only・本番確認GO済み基準 `408857d`）の顧客事例に、**人間ユーザーの書き込み（作成・編集・アーカイブ）**を最小実装した記録。Mode E＋Quality/AI Safety/Consent・Privacy/GitHub・Obsidian/CaseStudy Write Boundary の各 Overlay 適用。
> **schema変更なし・migration変更なし・seed変更なし・AI参照なし（company-brain-reference 無変更）・外部送信なし・実LLMなし・AIコストなし・本番接触なし・pushなし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例（Case Study）を**人間が育てられる**ようになりました: 作成・編集・アーカイブの3操作です。**AIは書き換えられません**（会社の頭脳の他3テーブルと同じ仕組み）。
- 最大の特徴は**許諾の門番**です: **許諾状態が「許諾あり（granted）」でない限り、匿名化を外せません**。保存時に機械的に拒否され、この判定自体が自動テストと安全ゲートで常時見張られます。**顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない**入力ガイドも作成・編集画面に明記しました。
- 非公開（private）固定・外部AI送信禁止・物理削除禁止（アーカイブのみ）もこれまでどおりです。公開機能は存在しません。
- 検証: 自動テスト **222本**（否定系6本追加）・型・lint・ビルド・安全ゲート（4actions 体制）・**smoke 20/20** すべて green。判定: **GO**（ローカル検証まで。本番確認は push 後の別手順）。

## 2. 実際の変更（9ファイル＋docs）

| ファイル | 内容 |
|---|---|
| `apps/web/app/(app)/brain/case-studies/actions.ts` | **新規・Server Action 3操作**（create/update/archive）。playbooks（2-B-4）の実証済みの型を流用: requireUser → **isHumanUser（AI mutation禁止）** → hasPermission（knowledge:create / knowledge:update）→ 入力検証 → **tenantId スコープ** → prisma → **writeAudit** → revalidatePath → redirect |
| `apps/web/app/(app)/brain/case-studies/new/page.tsx` | 新規作成画面（入力ガイド・許諾状態 Select・匿名化チェックボックス既定ON） |
| `apps/web/app/(app)/brain/case-studies/[id]/edit/page.tsx` | 編集画面（tenantId・archivedAt:null のみ対象・プリフィル） |
| `apps/web/app/(app)/brain/case-studies/page.tsx` | 一覧に権限別の 新規作成/編集/アーカイブ 導線＋denied 表示を追加（権限が無い人には出さない・action 側でも必ず拒否） |
| `packages/shared/src/case-study.ts` | **新規・純粋判定**: `validateCaseStudyConsent`（**consentStatus=granted 以外では匿名化解除不可**）・`canDisableAnonymization`・4値検証。X-05-2 A案と同じ「shared 純粋関数＋単体テスト」の型（`'use server'` ファイルは async 関数しか export できないため検証ロジックは shared に置く） |
| `packages/shared/src/__tests__/case-study.test.ts` | **否定系テスト6本**（none/requested/revoked で匿名化解除拒否・granted のみ許可・未知の consentStatus 拒否・大文字揺れも拒否） |
| `packages/shared/src/index.ts` | barrel に1行追加（labels.ts / rbac.ts は無変更） |
| `scripts/check-company-brain-safety.mjs` | **safety gate 拡張**: BRAIN_ACTIONS 3→**4本体制**（case-studies で物理削除禁止・label 2択・isHumanUser 共通化を機械検査）＋CaseStudy 固有2検査（validateCaseStudyConsent 使用・**publishStatus private固定**）＋否定系テストファイル存在検査 |
| `apps/web/tests/e2e/smoke.spec.ts` | 19本目の期待値を書き込み解禁に合わせて意図的に更新（doc57 の test16 更新と同じ扱い）＋**20本目=作成→編集→アーカイブの1周** |

- **作らなかったもの（境界維持）**: CustomerPain・ConsentRecord/SuppressionList 変更・RBAC/labels 変更・company-brain-reference 接続（**AI参照なし**=2-C-5 別承認）・externalAiAllowed true UI・高機密ラベル・公開機能・実顧客データ。

## 3. 安全制御の実装内容

- **AI mutation禁止**: 3 action すべての先頭で `isHumanUser(user)` を必須通過（shared 共通判定・単体テスト済み・ゲートが import 文まで機械検査）。UI のボタン非表示だけに頼らない。
- **権限**: 作成=knowledge:create・編集/アーカイブ=knowledge:update。無権限は `?denied=1` へ。
- **tenantId スコープ**: 全クエリ tenantId 必須・編集/アーカイブは `archivedAt: null` のみ対象。
- **writeAudit**: create/update/archive の3操作すべてで記録（entityType='CaseStudy'・entityId・summary・tenantId・actorId。既存 helper をそのまま使用）。
- **label 2択**: `ALLOWED_LABELS = ['NORMAL', 'INTERNAL'] as const;`（ゲートの完全一致検査対象）。
- **externalAiAllowed false固定**: create で false 固定・update では触らない・true にする UI なし（ゲート走査 151 ファイルで確認）。
- **publishStatus private固定**: create で 'private' 固定・update では触らない・変更 UI なし（ゲートに固定検査を追加）。
- **anonymized default true**・**consentStatus** default 'none'（none|requested|granted|revoked の4値のみ）。**consentStatus=granted 以外では匿名化解除不可**（shared 純粋関数で機械拒否・エラーメッセージも UI に定義）。ConsentRecord テーブルとの連携は行わず、CaseStudy フィールド上の状態のみを扱う（連携は後続の別承認）。
- **物理削除禁止**: archivedAt のソフトアーカイブのみ（delete/deleteMany はゲートが禁止検査）。
- **入力ガイド**: 「**顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない**」「匿名化を外せるのは許諾ありのときだけ」「常に非公開で作成」「外部AI送信は許可できない」を new/edit 両画面に明記。

## 4. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| pnpm db:generate | ✅ 成功 |
| node scripts/check-company-brain-safety.mjs | ✅ passed（**actions: 4**, ui files scanned: **151**）。※初回実行は複合 import が完全一致検査に不一致で意図どおり FAIL → import 分割で解消（ゲートが正しく機能する実証・修正ループ1回） |
| pnpm test | ✅ **222/222 passed**（216→222・否定系6本追加・24 files） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| ローカルPG＋seed | ✅ localhost のみ（値非表示確認済み）・caseStudies: 4 |
| E2E smoke | ✅ **smoke 20/20 green**（19本目=期待値の意図的更新・20本目=作成→編集→アーカイブ1周・既存18本回帰なし） |
| 後片付け | ✅ server 停止（curl 000）・pg_ctl -m fast stop |

- ミッション §16 のテスト一覧のうち、DB を要する項目（作成・編集・アーカイブ・一覧反映・writeAudit 記録）は **smoke 20本目**で end-to-end 検証。純粋ロジック項目（匿名化解除の拒否）は**否定系テスト6本**で検証。AIロール拒否・権限拒否は「actions が isHumanUser＋hasPermission を必ず通る」構造をゲートで機械固定＋既存 isHumanUser テスト5本で担保（rbac 実証の X-05-2 と同じ枠組み）。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「AI mutation禁止・label 2択・物理削除禁止・isHumanUser 共通化」→ safety gate 4actions 体制の機械検査（実行出力）②「許諾なしに匿名化を外せない」→ 否定系テスト6本＋actions の validateCaseStudyConsent 使用をゲートで検査 ③「書き込み1周が動く」→ smoke 20本目（作成→一覧→編集→アーカイブ→消える）④「既存回帰なし」→ smoke 既存18本 green＋test 222 ⑤「型の踏襲」→ playbooks actions（2-B-4・本番GO済み）との構造一致。
**Assumption Log**: ①consentStatus は当面 CaseStudy フィールド上の申告値（ConsentRecord との突合連携は後続別承認）②「実名寄り」運用が始まるのは granted 記録後のみ、という運用が入力ガイド＋機械拒否で守られる前提。
**Unknowns Log**: ①本番での書き込み動作（push 後の利用者実測）②ConsentRecord 連携・許諾取得の運用フロー設計（後続別承認）③2-C-5 AI参照時の anonymized/consentStatus の扱い（別承認・安全側は「匿名化済みのみ参照」）。
**Risk Register**: 最大リスクは**許諾なしの実顧客情報の記入**（中）→ 多層防御: 機械拒否（匿名化解除）＋入力ガイド＋非公開固定＋外部AI送信封印＋writeAudit で追跡可能。次点は smoke 20本目の安定性（低・既存 create フローと同型）。ConsentRecord 未連携のため granted の真正性は運用依存（連携設計を後続承認に明記）。
**Definition of Done**: Scout ✅／実装前監査 ✅／actions 3操作 ✅／new/edit/一覧導線 ✅／許諾・匿名化制御 ✅／否定系テスト ✅／safety gate 拡張 ✅／smoke 追加 ✅／検証全green ✅／doc76・CURRENT_STATE・PROGRESS・vault ✅／commit ✅／**pushなし** ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**Phase 2-C-4 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0）**: Vercel Ready・latest commit・CI green・ナビ「顧客事例」→ 作成画面が開く → 作成できる → 編集できる → アーカイブできる → 匿名化解除が許諾なしで拒否される → externalAiAllowed true UI なし → 既存画面無回帰。GO なら **Phase 2-C-4-PROD（doc77 候補）**で基準昇格。③その後 **Phase 2-C-5 AI参照は別承認**（anonymized/consentStatus の参照条件を含めて設計）。

## 7. 判定

**GO**（Phase 2-C-4 実装・ローカル検証まで完了）。GO済みプロダクト基準は **Phase 2-C-3 / `408857d`** のまま（本番確認 GO までは昇格しない）。**pushなし（commit-only）**・2-C-5・Customer Pain・高機密・公開機能・外部送信はすべて別承認。
