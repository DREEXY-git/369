# 100. CaseStudyConsent 公開活用方針決定 — PROHIBIT_NOW（今は公開しない）の正式決定（docs-only・判定 GO）

> doc99（公開活用判断 前提整理・READY / GO）の §7 で用意した10項目の**正式決定の記録**。Mode B の docs-only 決定記録。
> **実装なし・公開ページなし・ApprovalRequest接続なし・AI参照条件変更なし・company-brain-reference 変更なし・code/schema/migration/seed/package/doc14 変更なし・本番確認なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 0. §0 人間決定値（本ミッションで提出済み・すべて doc99 の安全側推奨値・矛盾なし）

```
PUBLIC_USE_POLICY: PROHIBIT_NOW
PUBLIC_PURPOSE_POLICY: PURPOSE_NOT_SUFFICIENT_ALONE
APPROVAL_POLICY: APPROVAL_REQUEST_REQUIRED_LATER
CONTENT_REVIEW_POLICY: HUMAN_REVIEW_AND_FACT_CHECK_REQUIRED
CUSTOMER_NAME_POLICY: EXPLICIT_PERMISSION_REQUIRED
OUTCOME_NUMBERS_POLICY: EVIDENCE_REQUIRED_AND_APPROVAL
CUSTOMER_VOICE_POLICY: CUSTOMER_VOICE_PURPOSE_AND_APPROVAL_REQUIRED
REVOCATION_TAKEDOWN_POLICY: TAKEDOWN_REQUIRED_LATER
PUBLISH_CHANNEL_POLICY: NO_PR_SEO_SNS_NOW
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

10項目とも安全側の決定であり、**実装は不要**（DOCS_ONLY_NOW・決定＝現状の非公開状態の維持）。

## 1. 非エンジニア向け要約

- **「今は公開しない」を正式決定**しました（PROHIBIT_NOW）。顧客事例の外部公開・**導入事例公開なし**・PR・SEO・SNS・顧客の声は、いずれも進めません。
- 許諾台帳の公開系用途（external_publish / pr / seo / customer_voice）が書いてあっても、**それだけでは公開できない**（PURPOSE_NOT_SUFFICIENT_ALONE）ことも正式決定です。
- 将来公開を検討する場合の関門（ApprovalRequest・表現審査＝人間レビューと事実確認・顧客名の明示許諾・成果数値の根拠確認・取り下げ運用・PR/SEO/SNS はチャネルごとの承認）も決定として固定しました。
- これは**変更ではなく決定の記録**です。公開機能はもともと存在せず、コードは1行も変わっていません。

## 2. 決定の根拠と現状確認（read-only 監査・2026-07-05 実測）

| 確認事項 | 結果 |
|---|---|
| doc99 に10項目の候補と安全側推奨（PROHIBIT_NOW / PURPOSE_NOT_SUFFICIENT_ALONE 等）が存在 | ✅（grep 実測・全決定値の裏付けあり） |
| 公開系 UI・公開機能は存在しない（決定と完全一致＝差分ゼロ） | ✅（公開系 tsx 0件・publishStatus 'private' 固定） |
| **publishStatus UIなし・externalAiAllowed true UIなし** | ✅（grep 0件・0件） |
| AI参照条件は doc98 で KEEP_ANONYMIZED_TRUE_ONLY 決定済み・**AI参照条件変更なし** | ✅（doc98 grep 実測） |
| **CaseStudyConsent は AI 文脈へ注入しない**（company-brain-reference 注入 0件・anonymized: true 2件） | ✅（実測） |
| プロダクト基準 = CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま | ✅（CURRENT_STATE） |

**決定内容と現状（公開機能ゼロ・非公開固定）が完全に一致しているため、本決定によるコード変更・移行作業は発生しない**（公開活用は未実装のまま）。

## 3. この決定で固定されたこと

1. **今は公開しない**（PROHIBIT_NOW）: **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし・導入事例公開なし**を継続。**ApprovalRequest接続なし**（接続は将来の解禁設計時）。
2. **purpose は単独では公開条件にならない**（PURPOSE_NOT_SUFFICIENT_ALONE）: 台帳の公開系用途は必要条件の一つに過ぎない。
3. 将来公開する場合は **ApprovalRequest 必須**（APPROVAL_REQUEST_REQUIRED_LATER・公開=危険操作として承認手続き）。
4. **人間レビューと事実確認必須**（HUMAN_REVIEW_AND_FACT_CHECK_REQUIRED・表現審査・公開前人間承認）。
5. **顧客名は明示的な掲載許諾が前提**（EXPLICIT_PERMISSION_REQUIRED）。
6. **成果数値は根拠確認＋承認が前提**（EVIDENCE_REQUIRED_AND_APPROVAL）。
7. **顧客の声は customer_voice purpose＋承認が前提**（CUSTOMER_VOICE_PURPOSE_AND_APPROVAL_REQUIRED）。
8. **取り下げ運用が前提**（TAKEDOWN_REQUIRED_LATER・許諾取り消し時は公開物も停止対象）。
9. **PR / SEO / SNS は今はゼロ**（NO_PR_SEO_SNS_NOW・将来もチャネルごとの個別承認・自動実行は恒久禁止）。
10. **今回は docs-only**（DOCS_ONLY_NOW）。**恒久禁止事項**（doc99 §5: AI虚偽口コミ・実体験でない体験談・根拠なし成果数値/No.1表記・ステマ・非開示アフィリエイト・公開系の自動実行）は許諾があっても解除されない。**将来変更時の段階承認**: 公開活用を進める場合は doc99 §8 の段階（§0 再決定→ApprovalRequest/表現審査の詳細設計→最小実装承認→本番確認→チャネルごとの個別承認）を踏む。

## 4. 今回やらなかったこと・変わらないこと

- **公開活用は未実装**のまま・実装なし・UI変更なし・ApprovalRequest接続なし・公開ページ作成なし。
- **AI参照条件変更なし**（doc98 の KEEP_ANONYMIZED_TRUE_ONLY のまま）・**CaseStudyConsent は AI 文脈へ注入しない**・**anonymized=false は未解禁**（保存・表示統治まで）。
- **外部LLM送信なし・実LLMなし・AIコストなし・外部送信なし**・company-brain-reference 変更なし。
- code/schema/migration/seed/package/lockfile/doc14 変更なし・本番確認なし・本番DB接続なし・本番deployなし・push なし。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「決定値は前提整理の推奨と一致」→ doc99 §7 の候補・推奨と §0 提出値の突合（10/10 一致）②「決定と現状が一致」→ §2 の実測（公開系 tsx 0・封印 UI 0/0・非公開固定）③「AI境界は決定済み」→ doc98 grep 実測 ④「恒久禁止・関門の親設計」→ doc99 §5/§6・doc82 §7 ⑤「基準不変」→ CURRENT_STATE 実測。
**Assumption Log**: ①決定＝現状維持（公開機能ゼロ）のため回帰リスクゼロ ②恒久禁止事項は将来どの §0 再決定でも解除されない ③FakeLLM 継続。
**Unknowns Log**: ①将来公開を進める場合の ApprovalRequest / 表現審査の詳細設計（doc99 §8 段階3・別承認）②法務レビュー体制の整備時期 ③取り下げ SLA・公開物管理台帳の詳細（別設計）。
**Risk Register**: 最大=「決定済み＝いつか自動で公開してよい」という誤読 → §3-10 で「将来変更は段階承認が前提」と固定。次点=公開系 purpose の誤解 → PURPOSE_NOT_SUFFICIENT_ALONE の正式決定で遮断。docs-only・公開機能ゼロのため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（公開未実装・未公開・AI参照条件不変の確認）✅／§0 10項目の正式決定を記録 ✅／doc100 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc100 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2・3・★2・UX改善**／**CI・Test・Release Governance 等の品質基盤強化**。③公開活用を将来進める場合は、ApprovalRequest・表現審査・公開前承認・取り下げ運用の詳細設計（doc99 §8 段階3）から再開（別承認）。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 7. 判定

**判定: GO**（公開活用の §0 決定＝**PROHIBIT_NOW（今は公開しない）**を正式記録。実装不要・コード差分ゼロ・公開ゼロ）。**外部公開なし・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・anonymized=false は未解禁**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
