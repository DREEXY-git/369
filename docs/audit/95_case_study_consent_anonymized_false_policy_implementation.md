# 95. CaseStudyConsent anonymized=false 本格扱い 最小実装 — 社内限定・制限表示（判定 GO）

> doc94（CaseStudyConsent anonymized=false 本格扱い設計・READY / GO）の §0 人間決定9項目に基づく最小実装（doc91 §6 段階7 の表示統治）。Mode E＋Consent / CaseStudy Governance / AI Safety Overlay。
> **表示・閲覧・注意文言の統治のみ・解禁ゼロ・schema/migration/seed/package/lockfile/company-brain-reference/doc14 変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本実装 commit ではなく **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま（本番確認前のため昇格しない）。

---

## 0. §0 人間決定（本ミッションで提出済み・矛盾なし・すべて安全側）

```
ANONYMIZED_FALSE_POLICY: INTERNAL_ONLY_RESTRICTED
VIEW_PERMISSION_POLICY: knowledge_update_only
LIST_DISPLAY_POLICY: badge_only
REVOCATION_POLICY: require_manual_reanonymize
CUSTOMER_NAME_POLICY: title_body_only_no_customer_master_join
OUTCOME_NUMBERS_POLICY: separate_approval_required
CUSTOMER_VOICE_POLICY: separate_customer_voice_purpose_required
AI_REFERENCE_POLICY: keep_anonymized_true_only
PUBLIC_USE_POLICY: prohibit_now
```

9項目は相互に矛盾せず、DB/schema/migration/AI参照条件/公開系の変更を要求しないため、停止条件に該当しないと判断して実装した。

## 1. 非エンジニア向け要約

- 実名寄り（匿名化オフ）の事例が「社内でどう見えるか」の統治を最小実装しました。**実名解禁ではありません**。
- 一覧では実名寄りの行に**バッジだけ**を追加（「AI参照対象外」「外部公開不可」・badge_only）。表示面は広げていません。
- 実名寄りの行の**タイトル・本文は、編集権限（knowledge:update）を持つ人だけに表示**されます（それ以外の人には「実名寄り事例（閲覧制限）」とだけ出る）。匿名化済み事例と通常一覧の見え方は従来どおりです。
- 編集画面には「**許諾が無効になっても自動では匿名化に戻りません。手動で戻して保存してください**」の注意を追加（自動書き換えはしない）。
- 変わらないこと: **anonymized=false は未解禁**（AI・公開には使われない）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。

## 2. 実装前の read-only 監査（2026-07-05 実測）

| 確認事項 | 結果 |
|---|---|
| doc94 判定 READY / GO・§0 候補9項目あり | ✅（grep 1・9） |
| doc93 で保存条件接続が本番確認GO済み | ✅（判定 GO 1件） |
| 基準 = CaseStudyConsent 保存条件接続 / `5e9461f` | ✅（CURRENT_STATE 実測 1/1） |
| company-brain-reference に CaseStudyConsent / validateCaseStudyConsentReconciliation なし（anonymized=true のみ参照） | ✅（grep 0件） |
| canDisableAnonymization 既定実装不変 | ✅（1件） |
| externalAiAllowed true UI / publishStatus UI なし | ✅（0件・0件） |
| 既存画面構造 = 一覧＋編集のみ（専用詳細ページなし） | ✅ → 大きな新規ページは作らず一覧・編集に最小表示（ミッション §7-2 どおり） |

## 3. 実装内容（表示・閲覧・注意文言のみ）

### 3-1. 一覧（badge_only・INTERNAL_ONLY_RESTRICTED）

`apps/web/app/(app)/brain/case-studies/page.tsx`: anonymized=false の行に **「AI参照対象外」「外部公開不可」バッジを追加**（既存の「実名寄り（許諾あり）」バッジは本番確認済み表示のため維持）。本文要約・顧客情報の表示拡張はしない。

### 3-2. 閲覧制限（knowledge_update_only）

同一覧で、実名寄り行の**タイトル・本文断片・タグ・業種・課題・提供内容・結果を `c.anonymized || canUpdate` のときだけ表示**。knowledge:update を持たない閲覧者には「実名寄り事例（閲覧制限）」のプレースホルダのみ表示。**匿名化済み事例と通常一覧の閲覧は無変更**。編集画面は従来どおり knowledge:update 必須（既存実装のまま）。

### 3-3. 取り消し時の注意（require_manual_reanonymize・自動書き換えなし）

`[id]/edit/page.tsx`: 実名寄り事例の編集画面に注意文言を追加— 「実名寄り（匿名化オフ）・AI参照対象外・外部公開不可・許諾が無効になっても**自動では匿名化に戻りません**・手動で『匿名化する』に戻して保存」。**既存データの自動書き換え・自動匿名化は実装していない**。

### 3-4. 触れなかった方針（§0 どおり）

- **title_body_only_no_customer_master_join**: Customer マスタ join 表示なし（安全ゲートで機械検査化 §3-5）。
- **separate_approval_required / separate_customer_voice_purpose_required**: 成果数値・顧客の声の専用表示・強調・公開は作らない。
- **keep_anonymized_true_only**: AI参照は anonymized=true のみ・company-brain-reference 無変更。
- **prohibit_now**: 公開系機能・ApprovalRequest 接続は一切作らない。

### 3-5. 安全ゲート拡張（scripts/check-company-brain-safety.mjs）

「anonymized=false の表示統治」検査を追加: ①一覧の注意バッジ（AI参照対象外・外部公開不可）が消えたら FAIL ②閲覧制限（`c.anonymized || canUpdate`）が消えたら FAIL ③case-studies の画面（表示層 page.tsx）が `prisma.customer` を参照したら FAIL（PII 表示面の拡張を機械遮断）。既存検査（AI 非注入・門番不変・承認済み接続の形・封印 UI）はすべて不変。

### 3-6. smoke 23本目

「実名寄り1周」を追加: 事例作成 → 台帳登録（internal_view・期限内）→ 編集で許諾あり＋匿名化オフ保存（突合通過）→ **一覧に実名寄り＋AI参照対象外＋外部公開不可バッジ表示** → 編集画面に「自動では匿名化に戻りません」表示 → **匿名化に戻して保存** → 封印 UI 0件 → アーカイブ片付け。

## 4. 変更ファイル（9）

1. `apps/web/app/(app)/brain/case-studies/page.tsx` — バッジ＋閲覧制限
2. `apps/web/app/(app)/brain/case-studies/[id]/edit/page.tsx` — 手動匿名化戻しの注意文言
3. `scripts/check-company-brain-safety.mjs` — 表示統治の機械検査3種
4. `apps/web/tests/e2e/smoke.spec.ts` — 23本目（実名寄り1周）
5. `docs/audit/95_case_study_consent_anonymized_false_policy_implementation.md` — 本書
6. `tasks/CURRENT_STATE.md`・`tasks/PROGRESS.md`・`369-vault/知識/CaseStudyConsent匿名化オフ本格扱い実装.md`・`369-vault/index.md` — 状態・要約

## 5. 検証（ローカル・全green・修正ループ0回）

| 検証 | 結果 |
|---|---|
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 4, ui files scanned: 156・新検査3種込み） |
| pnpm test | ✅ **256/256**（コードロジック変更なし＝件数不変） |
| pnpm typecheck | ✅ green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ green |
| pnpm db:seed | ✅ 完了 |
| Playwright smoke | ✅ **23/23 green**（既存22本回帰なし・新23本目=実名寄り1周も green） |

※ローカル検証のみ。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。

## 6. 今回やらなかったこと

- **anonymized=false は未解禁**（表示統治のみ。AI・公開に使う変更は一切ない）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**・company-brain-reference 無変更。
- **externalAiAllowed true UI なし・publishStatus UI なし・外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**・導入事例公開なし・ApprovalRequest 接続なし。
- Customer マスタ join による PII 表示拡張なし・既存データの自動書き換えなし・取り消し時の自動匿名化なし。
- schema/migration/seed/package/lockfile/doc14 変更なし・**外部送信なし・実LLMなし・AIコストなし**・本番DB接続なし・本番deployなし・push なし。

## 7. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「§0 は安全側で矛盾なし」→ 9項目すべて doc94 推奨値と一致・停止条件（DB変更等）非該当 ②「実装前の安全状態」→ §2 の実測（AI非注入 0・門番 1・封印 UI 0）③「動く」→ §5 の検証全green・**smoke 23/23 実測**（実名寄り1周が end-to-end で通る）④「表示統治が後退したら検知」→ 安全ゲート新検査3種の実走 passed ⑤「設計との整合」→ doc94 §4 案A・§7 の9項目。
**Assumption Log**: ①CEO ロール（knowledge:update 保有）での smoke により表示系は検証済み・閲覧制限の「非 update 者」側は実装ロジック（`c.anonymized || canUpdate`）とゲート検査で担保（read-only ロールでの E2E は既存 smoke 構成に無いため未実施・Unknowns へ）②実名寄りの実データは本番に無く、表示変更の本番影響はバッジ表示のみ ③FakeLLM 継続。
**Unknowns Log**: ①非 update ロール（閲覧のみの人）で実名寄り行が「閲覧制限」表示になることの画面実測（本番確認またはロール別 E2E・別承認）②取り消し済み台帳の検知を編集画面でリアルタイム表示するか（今回は注意文言のみ・実装拡張は別承認）③AI参照条件判断（doc91 §6 段階8）・公開活用判断（段階9）。
**Risk Register**: 最大=表示統治と解禁の混同 → 本書 §1/§6 と安全ゲート（AI非注入 FAIL・公開系なし）で遮断。次点=閲覧制限の漏れ（新しい表示面の追加時）→ ゲートの `prisma.customer` 検査と badge/制限マーカー検査で後退を機械検知。残余=非 update ロールの画面実測が未（Unknowns ①・ロジックは条件式で明確）。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／§0 矛盾なし確認 ✅／badge_only＋knowledge_update_only＋require_manual_reanonymize の最小実装 ✅／Customer join 禁止・成果数値/顧客の声/AI/公開の不作為 ✅／安全ゲート3検査＋smoke 23本目 ✅／検証全green ✅／doc95・CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push・本番確認 ⏳（別承認）。

## 8. 次回推奨プロンプト案

> ①**doc95 実装 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の**本番確認（利用者実測・§0 テンプレート・別承認）**: 架空事例で「台帳登録 → 匿名化オフ保存 → 一覧の実名寄りバッジ（AI参照対象外・外部公開不可）→ 編集画面の手動戻し注意 → 匿名化に戻す → アーカイブ片付け」の1周＋既存画面無回帰。③その後の人間判断: AI参照条件判断（doc91 §6 段階8）／公開活用判断（段階9）／Customer Pain／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 9. 判定

**判定: GO**（§0 の9決定どおりの最小実装・検証全green・修正ループ0回）。**anonymized=false は未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま変わらない。
