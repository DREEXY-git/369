# 92. CaseStudyConsent 保存条件接続 — anonymized=false 保存への突合必須化（最小実装・判定 GO）

> doc91（保存条件接続設計・READY / GO）の §0 人間決定に基づく最小実装。Mode B＋Consent / CaseStudy Governance / AI Safety Overlay。
> **保存条件接続のみ・解禁ゼロ・schema/migration/seed/package/lockfile/doc14 変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本実装 commit ではなく **CaseStudyConsent UI / `1913456`** のまま（本番確認前のため昇格しない）。

---

## 0. §0 人間決定（本ミッションで提出済み・矛盾なし）

```
SAVE_CONNECTION_POLICY: CONNECT_ONLY
TARGET_PURPOSE_FOR_ANONYMIZED_FALSE: internal_view
SUPPRESSION_CHECK_POLICY: CALLER_RESOLVES_SUPPRESSED_BOOLEAN
EXISTING_DATA_POLICY: NO_BACKFILL
ERROR_UX_POLICY: REDIRECT_WITH_REASON_CODE
```

5項目は相互に矛盾せず、すべて実装で満たした（下記 §3）。

## 1. 非エンジニア向け要約

- これまで匿名化を外す保存は「許諾あり（granted）」の**申告だけ**で通っていました（doc82 で「consentStatus=granted だけでは真正な許諾証拠として扱わない」と決めた暫定状態）。
- 今回、匿名化を外す保存のときだけ、**許諾台帳（CaseStudyConsent）の有効な行**（社内閲覧 internal_view の用途・期限内・取り消しなし・証跡あり・人間登録）が実在することを機械照合（validateCaseStudyConsentReconciliation）で確認するようにしました。**保存が今より厳しくなるだけ**で、何も解禁していません。
- 新規作成では台帳行を先に作れないため、匿名化オフの新規作成は拒否し、「匿名化ありで作成 → 許諾台帳に登録 → 編集で匿名化を外す」運用に固定しました。
- 変わらないこと: **anonymized=false は未解禁**（保存できるだけで AI・公開には使われない）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。

## 2. 実装前の read-only 監査（2026-07-05 実測）

| 確認事項 | 結果 |
|---|---|
| doc91 が CONNECT_ONLY 推奨 | ✅（doc91 §4） |
| validateCaseStudyConsentReconciliation が shared に存在 | ✅（doc90 実装・未接続） |
| validateCaseStudyConsent / validateCaseStudyConsentInput が無傷 | ✅ |
| case-studies/actions.ts に突合接続なし | ✅（grep 0件） |
| company-brain-reference に CaseStudyConsent なし | ✅（grep 0件） |
| 本番確認GO済み基準 = CaseStudyConsent UI / `1913456` | ✅（CURRENT_STATE） |
| SuppressionList 構造（tenantId/channel/value・email はドメイン登録あり得る）と共通判定 isSuppressed（@hokko/shared）の存在 | ✅ → suppressed=false 固定にせず安全に解決可能と判断（HOLD 不要） |

## 3. 実装内容（保存条件接続のみ）

### 3-1. create: 匿名化オフの新規作成を拒否（doc92 §5-1）

`createCaseStudyAction` は `anonymized=false` を一律拒否し `error=ledger_createNotAllowed` で new 画面へ戻す（CaseStudy ID が無く台帳行を突合できないため）。

### 3-2. update: 匿名化オフ保存に突合必須化（CONNECT_ONLY）

`updateCaseStudyAction` は `anonymized=false` のときだけ:

1. 許諾台帳を `where: { tenantId: user.tenantId, caseStudyId: existing.id }` で取得（テナント境界・NO_BACKFILL＝既存行の書き換えなし・保存時判定のみ）。
2. **suppressed を actions 層で解決**（CALLER_RESOLVES_SUPPRESSED_BOOLEAN）: `CaseStudy.customerId` があるときだけ Customer（tenantId スコープ）と SuppressionList（tenantId スコープ）を読み、shared の新純粋関数 `resolveCaseStudyConsentSuppressed` で boolean 化。**customerId があるのに Customer が見つからない場合は安全側で suppressed=true（保存拒否側）**。email はドメイン一致含む（isSuppressed 共通判定）・phone も照合。customerId が無い事例は主体なし＝false。
3. `validateCaseStudyConsentReconciliation`（targetPurpose='internal_view'・now=保存時刻・doc90 の15条件）で照合。
4. ok でなければ `error=ledger_<reason>` で edit 画面へ redirect（REDIRECT_WITH_REASON_CODE）。ok なら保存続行。

### 3-3. エラー表示（PII なし・抑止詳細なし)

edit 画面に reason コード別の日本語文言（台帳未登録・取り消し済み・期限切れ・用途不足）を追加。**suppressed 含む上記以外の理由は「有効な許諾条件を満たしていません」に丸める**（証跡本文・顧客名・メール・電話・抑止詳細を表示しない）。new 画面に `ledger_createNotAllowed` の案内文言＋運用ガイドを追加。

### 3-4. 安全ゲート更新（承認の証跡）

`scripts/check-company-brain-safety.mjs` の段階分離1（接続禁止）を「**承認済み接続の形**」検査へ更新: ①actions に validateCaseStudyConsentReconciliation が存在（消えたら FAIL）②台帳取得が tenantId/caseStudyId スコープ（形が変わったら FAIL）③create の匿名化オフ拒否が存在 ④targetPurpose internal_view（変更したら FAIL）。**段階分離2（canDisableAnonymization 門番の変更で FAIL）・段階分離3（company-brain-reference への接続で FAIL）・AI非注入検査・shared への Prisma 混入検査は不変**。

### 3-5. テスト

shared に `resolveCaseStudyConsentSuppressed` の単体テスト6本を追加（customerId なし=false／Customer 不在=安全側 true／email 完全一致／ドメイン一致／phone 一致／非該当=false）。**test 250→256**。突合の否定系（台帳なし・revoked・expired・purpose mismatch・suppressed・tenant 不一致・有効行で ok）は doc90 の既存20本が純粋関数レベルでカバー済み。Server Action 直接テストは既存構造では認証・redirect 依存で困難なため、危険な mock は作らず Unknowns に記録（§7）。

## 4. 変更ファイル（8）

1. `apps/web/app/(app)/brain/case-studies/actions.ts` — create 拒否＋update 突合必須化＋方針コメント
2. `apps/web/app/(app)/brain/case-studies/new/page.tsx` — ledger_createNotAllowed 文言＋ガイド
3. `apps/web/app/(app)/brain/case-studies/[id]/edit/page.tsx` — LEDGER_ERROR_MESSAGES＋チェックボックス説明
4. `packages/shared/src/case-study-consent.ts` — resolveCaseStudyConsentSuppressed（純粋関数・DB 読まない）
5. `packages/shared/src/__tests__/case-study-consent.test.ts` — 6本追加
6. `scripts/check-company-brain-safety.mjs` — 接続禁止 → 承認済み接続の形へ更新
7. `docs/audit/92_case_study_consent_save_condition_connection.md` — 本書
8. `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`369-vault/知識/CaseStudyConsent保存条件接続実装.md`・`369-vault/index.md` — 状態・要約

## 5. 検証（ローカル・全green・修正ループ0回）

| 検証 | 結果 |
|---|---|
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 4, ui files scanned: 156） |
| pnpm test | ✅ **256/256**（250→256） |
| pnpm typecheck | ✅ green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ green |
| prisma migrate status | ✅ up to date（pending なし＝schema/migration 無変更の裏付け） |
| pnpm db:seed | ✅ 完了 |
| Playwright smoke | ✅ **22/22 green**（既存21本回帰なし・台帳1周22本目も green） |

※ローカル検証のみ。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。

## 6. 今回やらなかったこと

- **anonymized=false は未解禁**（接続後も「保存できる」だけ・実名寄り運用の本格扱いは doc91 §6 段階7 の別承認）。
- **AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・company-brain-reference 変更なし**（機械検査で FAIL のまま維持）。
- externalAiAllowed true UI / publishStatus UI / 公開活用（PR・SEO・SNS・customer_voice）/ ApprovalRequest 接続なし。
- **schema/migration/seed/package/lockfile/doc14 変更なし**・外部送信なし・実LLMなし・AIコストなし・本番DB接続なし・push なし。
- 既存 validateCaseStudyConsent（匿名化の門番）・validateCaseStudyConsentInput・突合純粋関数の実装変更なし。

## 7. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「接続が必要」→ doc82 §5・doc89 §4・doc91 §3（granted は申告値）②「未接続だった」→ 実装前 grep 0件 ③「安全に suppressed 解決可能」→ SuppressionList schema＋shared isSuppressed の実測 ④「既存データ影響ゼロ」→ doc77/doc80/doc88（本番は架空のみ・片付け済み・NO_BACKFILL）⑤「動く」→ §5 の検証全green（smoke 22/22 実測）。
**Assumption Log**: ①本番 CaseStudy に anonymized=false の実データは無い（doc91 実測根拠）→ 保存時判定のみで安全 ②customerId 無し事例の suppressed=false は「抑止対象の主体が無い」ため安全（台帳行の有効性は突合で別途検査）③FakeLLM 継続。
**Unknowns Log**: ①Server Action（createCaseStudyAction/updateCaseStudyAction）の直接テストは認証・redirect 依存のため未整備（純粋関数は256本でカバー・接続形は安全ゲートで機械検査・E2E は smoke 22本目周辺で UI 経路を担保。危険な mock・認証回避は作らない方針）②本番での拒否 UX 実測（reason 別文言の見え方）は本番確認（別承認）で確認 ③実名寄り運用の設計（doc91 §6 段階7 以降）。
**Risk Register**: 最大=接続と解禁の混同 → §1/§6 と安全ゲート（門番不変・AI 非注入 FAIL 維持）で遮断。次点=保存が厳しくなる運用戸惑い → reason 別文言と台帳導線（既存 UI）で吸収・本番影響データ無し。残余=Server Action 直接テスト不足（Unknowns ①・多層防御で緩和）。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／§0 矛盾なし確認 ✅／create 拒否＋update 突合＋suppressed 解決＋reason 別 UX ✅／安全ゲート更新（承認の証跡） ✅／テスト6本追加（256） ✅／検証全green（smoke 22/22 含む） ✅／doc92・CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push・本番確認 ⏳（別承認）。

## 8. 次回推奨プロンプト案

> ①**doc92 実装 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0 テンプレート・別承認）**: 架空・匿名事例で「匿名化オフ保存が台帳なしで拒否される（reason 表示）→ 台帳登録（internal_view・期限内）→ 匿名化オフ保存が通る → 台帳取り消し → 再び拒否 → 片付け（匿名化に戻す・アーカイブ）」の1周。③その後の人間判断: anonymized=false の本格扱い（doc91 §6 段階7）／AI参照条件の扱い（段階8）／Customer Pain／Stage 2・3・★2・UX。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS 外部発信には個別承認なしに進まない。

## 9. 判定

**判定: GO**（保存条件接続のみ・検証全green・修正ループ0回）。**anonymized=false は未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま変わらない。
