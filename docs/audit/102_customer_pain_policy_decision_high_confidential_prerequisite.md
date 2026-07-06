# 102. Customer Pain 方針決定 — HIGH_CONFIDENTIAL_PREREQUISITE_FIRST（守り方が先）の正式決定（docs-only・判定 GO）

> doc101（Customer Pain 入口レビュー・READY / GO）の §14 で用意した9項目の**正式決定の記録**。Mode B＋Security / Privacy / AI Safety Overlay。docs-only / commit-only。
> **Customer Pain 実装なし・Data Classification 実装なし・高機密ラベル実装/解禁なし・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・apps/packages/scripts 変更なし・AI参照条件変更なし・公開活用なし・PII/実顧客データ保存なし・本番確認なし・外部送信なし・実LLMなし・AIコストなし・doc14 変更なし・push なし**。
> プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 0. §0 人間決定値（本ミッションで提出済み・すべて doc101 の安全側推奨値・矛盾なし）

```
CUSTOMER_PAIN_POLICY: HIGH_CONFIDENTIAL_PREREQUISITE_FIRST
DATA_CLASSIFICATION_POLICY: REQUIRE_CUSTOMER_CONFIDENTIAL_LABEL_DESIGN
PII_POLICY: PROHIBIT_PII_NOW
CUSTOMER_NAME_POLICY: PROHIBIT_CUSTOMER_NAME_NOW
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE_NOW
PUBLIC_USE_POLICY: PROHIBIT_PUBLIC_USE
VIEW_PERMISSION_POLICY: KNOWLEDGE_UPDATE_ONLY_OR_HIGHER
AUDIT_POLICY: REQUIRE_ACCESS_LOG_AND_WRITE_AUDIT_DESIGN
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

9項目とも安全側の決定であり、**決定＝現状維持（Customer Pain 未実装のまま）・実装不要**（DOCS_ONLY_NOW）。

## 1. 非エンジニア向け要約

- Customer Pain（顧客課題＝**失注理由・クレーム・不満・競合比較などの生データ**）について、**「守り方が先」（HIGH_CONFIDENTIAL_PREREQUISITE_FIRST）を正式決定**しました。
- つまり: **Customer Pain はまだ実装しません**。先に **Data Classification / 高機密ラベル運用設計**（どのラベルで守り・誰が見られて・見た記録をどう残すか）を行います（これも設計であって解禁ではありません）。
- **PII・顧客名・担当者名・実顧客データは今は保存しません**。**AIに読ませない**・**公開しない**も正式決定です。
- これは**変更ではなく決定の記録**です。コードは1行も変わっていません。

## 2. 決定の根拠と現状確認（read-only 監査・2026-07-05 実測）

| 確認事項 | 結果 |
|---|---|
| doc101 に9項目の候補と安全側推奨・「高機密が先」の根拠が記録済み | ✅（grep 実測・全決定値の裏付けあり） |
| **Customer Pain の実装は apps / packages に存在しない**（決定と完全一致＝差分ゼロ） | ✅（grep 0件） |
| **CUSTOMER_CONFIDENTIAL 等の高機密ラベルは定義済み**（schema enum・labels.ts）**だが Company Brain での高機密扱いは未解禁**（doc39 以来の保留・解禁は個別人間承認の重い判断） | ✅（実測 2/2） |
| AI参照条件は不変（注入0・anonymized: true 2・doc98 の KEEP_ANONYMIZED_TRUE_ONLY のまま） | ✅ |
| 公開系 UI なし（externalAiAllowed/publishStatus UI 0/0・公開系 tsx 0） | ✅ |
| プロダクト基準 = CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま | ✅（CURRENT_STATE） |

**決定内容と現状（Pain 未実装・高機密未解禁・封印維持）が完全に一致しているため、本決定によるコード変更・移行作業は発生しない。**

## 3. この決定で固定されたこと

1. **守り方が先**（HIGH_CONFIDENTIAL_PREREQUISITE_FIRST）: Customer Pain の器・画面・API を作る前に、高機密ラベル・権限・監査・AI禁止方針の前提設計を行う。**Customer Pain はまだ実装しない**。
2. **Data Classification / 高機密ラベル運用設計が次の前提**（REQUIRE_CUSTOMER_CONFIDENTIAL_LABEL_DESIGN・設計は docs-only・**高機密ラベルの解禁は個別人間承認の重い判断**のまま）。
3. **PII は今は保存しない**（PROHIBIT_PII_NOW）・**顧客名も保存しない**（PROHIBIT_CUSTOMER_NAME_NOW・将来も customerId 参照のみ方向）・**担当者名・実顧客データも同様**。
4. **AIに読ませない**（PROHIBIT_AI_REFERENCE_NOW・原則 AI 参照禁止で開始。**AI参照条件変更なし**＝AIが読む事例は匿名化済みのみ・**CaseStudyConsent は AI 文脈へ注入しない**も不変）。
5. **公開しない**（PROHIBIT_PUBLIC_USE・**外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**）。
6. 閲覧は **knowledge:update 以上**（KNOWLEDGE_UPDATE_ONLY_OR_HIGHER・将来設計ではラベル許可ロールとの交差条件を検討）。
7. **閲覧の記録（アクセスログ=writeDataAccess）と書き込み監査（writeAudit）の設計が必要**（REQUIRE_ACCESS_LOG_AND_WRITE_AUDIT_DESIGN・DESIGN のみ・実装は別承認）。
8. **今回は docs-only**（DOCS_ONLY_NOW）。将来の各段（Data Classification 設計→高機密対応の最小実装→Pain schema→read-only→書き込み→実データ判断）は doc101 §15 の段階承認を踏む。

## 4. 今回やらなかったこと・変わらないこと

- **Customer Pain 実装なし**（テーブル/画面/Server Action/API 作成なし）・Data Classification 実装なし・高機密ラベル実装/解禁なし。
- **DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし**・apps/packages/scripts 変更なし・company-brain-reference 変更なし。
- **AI参照条件変更なし・AIに読ませない**・CaseStudyConsent の AI 文脈注入なし・anonymized=false の AI参照解禁なし。
- **PII・顧客名・担当者名・実顧客データの保存なし**・公開活用/ApprovalRequest 接続なし・**外部送信なし・実LLMなし・AIコストなし**。
- **本番確認なし**・本番DB直接接続なし・本番deployなし・doc14 追記なし・push なし。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「決定値は入口レビューの推奨と一致」→ doc101 §14 の候補・推奨と §0 提出値の突合（9/9 一致）②「決定と現状が一致」→ §2 の実測（Pain 実装 0件・高機密未解禁・封印維持）③「高機密が先の根拠」→ doc101 §6・doc70/doc33/doc39 ④「AI/公開の境界は決定済み」→ doc98/doc100 ⑤「基準不変」→ CURRENT_STATE 実測。
**Assumption Log**: ①決定＝現状維持のため回帰リスクゼロ（コード無変更）②Data Classification 設計は既存の labels.ts / writeDataAccess を土台にできる見込み（設計で確定）③FakeLLM 継続。
**Unknowns Log**: ①Data Classification / 高機密ラベル運用設計の詳細（doc103 候補・閲覧制限・writeDataAccess 粒度・ゲート検査・別承認）②高機密ラベル解禁の承認範囲（設計後の個別人間承認）③Pain と CRM 既存データ（失注/クレーム系）の重複整理（設計時）。
**Risk Register**: 最大=「決定済み＝実装してよい」という誤読 → §3-8 で「各段は段階承認」と固定。次点=「ラベルは定義済み＝使ってよい」の誤解 → 解禁は個別人間承認の重い判断と再明記。docs-only・現状維持決定のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（doc101 反映済み・Pain 未実装・封印維持の確認）✅／§0 9項目の正式決定を記録 ✅／doc102 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc102 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **Data Classification / 高機密ラベル運用設計 docs-only**（doc103 候補・閲覧制限・writeDataAccess・AI遮断・ゲート検査の設計。**解禁ではない**・解禁は設計後の個別人間承認）。③並行選択肢: CI・Test・Release Governance 等の品質基盤強化／Stage 2・3・★2・UX。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別人間承認なしに進まない。

## 7. 判定

**判定: GO**（Customer Pain の §0 決定＝**HIGH_CONFIDENTIAL_PREREQUISITE_FIRST（守り方が先）**を正式記録。実装不要・コード差分ゼロ・実データゼロ）。**AIに読ませない・公開しない・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
