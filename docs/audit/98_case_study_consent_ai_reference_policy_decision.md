# 98. CaseStudyConsent AI参照条件決定 — KEEP_ANONYMIZED_TRUE_ONLY 維持（docs-only・判定 GO）

> doc97（AI参照条件設計・READY / GO）の §0 人間決定9項目の**正式決定の記録**。Mode B / Mode G の docs-only 決定記録。
> **実装なし・company-brain-reference 変更なし・AI参照条件変更なし・code/schema/migration/seed/package/doc14 変更なし・本番確認記録なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 0. §0 人間決定値（本ミッションで提出済み・すべて doc97 の安全側推奨値・矛盾なし）

```
AI_REFERENCE_POLICY: KEEP_ANONYMIZED_TRUE_ONLY
CASE_STUDY_SOURCE_POLICY: ANONYMIZED_TRUE_ONLY
CASE_STUDY_CONSENT_INJECTION_POLICY: DO_NOT_INJECT
AI_REFERENCE_PURPOSE_POLICY: NOT_SUFFICIENT_ALONE
EXTERNAL_LLM_POLICY: STRUCTURAL_ZERO
AI_COST_POLICY: NO_NEW_AI_COST
DATA_ACCESS_LOG_POLICY: KEEP_EXISTING_AI_REFERENCE_LOG
SAFETY_GATE_POLICY: KEEP_CURRENT_NON_INJECTION_GATE
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

9項目とも現状維持（安全側）の決定であり、**実装は不要**（DOCS_ONLY_NOW）。

## 1. 非エンジニア向け要約

- doc97 で用意した9つの選択項目について、人間がすべて**安全側＝現状維持**を正式決定しました。**KEEP_ANONYMIZED_TRUE_ONLY を正式決定**——つまり **AIが読む顧客事例は匿名化済み（anonymized=true のみ）を今後も維持**します。
- **anonymized=false（実名寄り）の事例は AI に読ませません**。許諾台帳の **ai_reference** 用途が書いてあっても、**それだけでは解禁条件にしません**（NOT_SUFFICIENT_ALONE）。
- **CaseStudyConsent の台帳行・証跡・purpose は AI 文脈へ注入しません**（DO_NOT_INJECT・「CaseStudyConsent は AI 文脈へ注入しない」を維持）。
- **外部LLM送信なし**（STRUCTURAL_ZERO のまま）・**実LLMなし・AIコストなし**（NO_NEW_AI_COST）。
- これは**変更ではなく決定の記録**です。コードは1行も変わっていません（company-brain-reference 変更なし・AI参照条件変更なし・実装なし）。

## 2. 決定の根拠と現状確認（read-only 監査・2026-07-05 実測）

| 確認事項 | 結果 |
|---|---|
| doc97 に9項目の候補と安全側推奨（KEEP_ANONYMIZED_TRUE_ONLY / NOT_SUFFICIENT_ALONE / DO_NOT_INJECT / STRUCTURAL_ZERO / NO_NEW_AI_COST 等）が存在 | ✅（grep 実測） |
| 現行実装は AIが読む顧客事例＝**anonymized=true のみ**（決定と完全一致＝差分ゼロ） | ✅（company-brain-reference の `anonymized: true` 2件実測） |
| CaseStudyConsent / 突合判定の AI 文脈注入 0件（DO_NOT_INJECT と一致） | ✅（grep 0件） |
| externalAiAllowed true UI 0件・publishStatus UI 0件（STRUCTURAL_ZERO と一致） | ✅ |
| ai_reference 監査ログは既存形式で稼働（KEEP_EXISTING_AI_REFERENCE_LOG と一致） | ✅（doc78/doc80 本番実証済み） |
| 安全ゲートの非注入・条件維持検査が稼働（KEEP_CURRENT_NON_INJECTION_GATE と一致） | ✅ |
| プロダクト基準 = CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま | ✅（CURRENT_STATE 実測） |

**決定内容と現状実装が完全に一致しているため、本決定によるコード変更・移行作業は発生しない**（実装なし）。

## 3. この決定で固定されたこと

1. **AIが読む顧客事例は anonymized=true のみ**を維持（ANONYMIZED_TRUE_ONLY・**anonymized=false は AI に読ませない**）。
2. **CaseStudyConsent の台帳行・証跡・purpose は AI 文脈へ注入しない**（DO_NOT_INJECT）。
3. **ai_reference purpose は単独では解禁条件にしない**（NOT_SUFFICIENT_ALONE。将来変更するなら purpose＋人間承認＋権限・マスキング・監査の全前提＋個別承認）。
4. **外部LLM送信なし**（STRUCTURAL_ZERO・externalAiAllowed true UI なし を維持）。
5. **実LLMなし・AIコストなし**（NO_NEW_AI_COST・FakeLLM 前提継続）。
6. ai_reference 監査ログは既存形式を維持（KEEP_EXISTING_AI_REFERENCE_LOG）。
7. 安全ゲートは現行の非注入検査を維持（KEEP_CURRENT_NON_INJECTION_GATE・追加ゲートは将来の別承認）。
8. **今回は docs-only**（DOCS_ONLY_NOW・実装なし）。将来この決定を変更する場合は doc97 §8 の段階（詳細設計→個別承認→実装→本番確認）を踏む。

## 4. 今回やらなかったこと・変わらないこと

- **実装なし・company-brain-reference 変更なし・AI参照条件変更なし**（決定＝現状維持のためコード差分ゼロ）。
- **anonymized=false は未解禁**（保存・表示統治まで。AI参照・公開には使わない）・CaseStudyConsent の AI 文脈注入なし。
- **外部LLM送信なし・実LLMなし・AIコストなし・外部送信なし**・公開活用/ApprovalRequest 接続/PR配信/SEOページ公開/SNS投稿/顧客の声公開なし。
- **code/schema/migration/seed/package/doc14 変更なし**・本番確認記録なし・本番DB直接接続なし・本番deployなし・push なし。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「決定値は設計の推奨と一致」→ doc97 §7 の候補・推奨と §0 提出値の突合（9/9 一致）②「決定と現状実装が一致」→ §2 の実測（anonymized: true 2件・非注入 0件・封印 UI 0件）③「監査ログ・ゲート稼働」→ doc78/doc80・scripts 実測 ④「基準不変」→ CURRENT_STATE 実測。
**Assumption Log**: ①決定＝現状維持のため回帰リスクゼロ（コード無変更）②将来の変更は doc97 §8 の段階承認で扱う ③FakeLLM 継続。
**Unknowns Log**: ①案B（DERIVED_ANONYMIZED_SUMMARY_ONLY）へ将来進む場合の要約運用設計（採択時の別設計）②外部LLM解禁（3c-5）の将来判断（スコープ外・別承認）③公開活用（doc91 §6 段階9）の判断（別承認）。
**Risk Register**: 最大=「決定済みだから将来も自動で変えてよい」という誤読 → §3-8 で「変更は段階承認が前提」と固定。残余=なし相当（docs-only・現状維持決定のため本番リスクゼロ）。
**Definition of Done**: Scout 一致 ✅／read-only 監査（決定と現状の一致確認）✅／§0 9項目の正式決定を記録 ✅／doc98 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc98 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **公開活用判断**（ApprovalRequest・表現審査・doc91 §6 段階9・今は進めない）／**Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2・3・★2・UX改善**／**CI・Test・Release Governance 等の品質基盤強化**。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 7. 判定

**判定: GO**（AI参照条件の §0 決定＝**KEEP_ANONYMIZED_TRUE_ONLY 維持**を正式記録。実装不要・コード差分ゼロ）。**anonymized=true のみ 参照・anonymized=false は未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
