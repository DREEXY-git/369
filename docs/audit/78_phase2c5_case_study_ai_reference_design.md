# 78. Phase 2-C-5-ENTRY — CaseStudy AI参照の安全設計（docs-only・判定 READY / GO）

> Phase 2-C-4 本番確認GO（doc77・基準 `11e8f51`）を受けた、**AI が顧客事例を読む前の安全設計**。Mode G（AI Safety設計）。doc44（2-A-3c-1）→doc59（2-B-5-ENTRY）と同じ「設計を先に固定→実装は別承認」の型。
> **docs-only・実装なし・code変更なし・company-brain-reference.ts 変更なし・schema/migration/seed 変更なし・DB操作なし・外部送信なし・実LLMなし・AIコストなし・本番接触なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- AI に顧客事例を読ませる**前に**、「何を読んでよいか・何を絶対に読ませないか・読んだら必ず記録する」を設計として固定しました。まだ**実装していません**（実装は次の別承認）。
- いちばん大事な決定: **AI が読めるのは「匿名化済み（anonymized=true）」の事例だけ**を第一候補にします。許諾ありでも実名寄りの事例は当面 AI に読ませません（許諾の真正性を機械で確認する仕組み=ConsentRecord 連携がまだ無いため、安全側に倒します）。
- 外部の AI には今までどおり**構造的にゼロ**（externalAiAllowed=false のものは外部LLMに一切注入されない既存ゲートをそのまま流用）。読んだら1件ごとに **ai_reference 記録**が残ります。
- 判定: **READY / GO**（実装に進める設計が固定できた。実装は別承認）。

## 2. read-only 監査結果（現状の実測）

1. **company-brain-reference.ts（実測・無変更）**: 3テーブル構成（CompanyPolicy/ProductCatalogItem/SalesPlaybookEntry）。共通制約 = tenantId・archivedAt:null・AI_READABLE_LABELS(NORMAL/INTERNAL)・canAccessLabel・MAX_PER_TABLE=3・MAX_TOTAL=5・MIN_SCORE=3・CONTEXT_TEXT_LIMIT=800・決定的スコアリング（LLM不使用）。**外部LLM時は externalAiAllowed=true のみ注入＋maskText（true UI が無いため注入ゼロ=安全側デフォルト）**。
2. **knowledge search（実測・無変更）**: `getCompanyBrainReferences` → `answerKnowledgeQuestion` → **brainRefs 1件ごとに `writeAIDataAccess`（action=ai_reference・entityType/entityId/label・purpose は質問先頭80字のみ=本文/PII を入れない）**。entityType を増やせばレコード単位記録は自動で追随する構造。
3. **DataAccessLog / writeDataAccess の既存設計確認**: `apps/web/lib/db.ts` の writeDataAccess＋`lib/audit.ts` の writeAIDataAccess が稼働中（2-B-5 で3テーブル目まで本番確認GO済み・表示は /admin/data-access-logs の紫「AI参照」バッジ）。
4. **CaseStudy model（実測）**: title/body/industry/challenge/solution/outcome/**anonymized**/**consentStatus**/consentRecordId/customerId/**publishStatus**/tags/label/externalAiAllowed/sourceType/**sourceNote**/archivedAt 他。書き込み層（2-C-4）は「granted 以外で匿名化解除不可」を機械拒否済み・本番実証済み。
5. **safety gate（実測・無変更）**: 4actions 体制＋validateCaseStudyConsent 使用＋publishStatus private 固定を機械検査中。AI参照実装時のゲート拡張余地あり（§6）。
6. **重複確認**: doc78 未存在・PROGRESS 2-C-5 セクション未存在・既存 AI参照設計（doc44/doc59）と矛盾なし=**company-brain-reference の4テーブル目候補**として既存の型に足すだけで成立。

## 3. 設計: AI が CaseStudy を読む条件（参照条件・第一候補）

**参照対象（すべて AND・既存3テーブルの制約に CaseStudy 固有の2条件を追加）**:

| 条件 | 値 | 根拠 |
|---|---|---|
| **tenantId 必須** | 検索ユーザーの tenantId 一致 | 既存共通制約 |
| **archivedAt:null 必須** | アーカイブ済みは読まない | 既存共通制約 |
| **publishStatus private のみ** | 'private' のみ（他値は将来の公開系=対象外） | 2-C-3/2-C-4 の非公開固定と一致 |
| label | **label NORMAL / INTERNAL のみ**（canAccessLabel も通す・**高機密ラベルなし**） | 既存 AI_READABLE_LABELS |
| **anonymized=true のみ参照を第一候補** | 匿名化済みだけを AI に読ませる | §4 の理由 |

- **anonymized=false は今回参照対象外候補**とする（実名寄り事例は AI 回答に混ぜない）。
- **consentStatus は参照条件に使わない**（表示・監査には残すが、**consentStatus=granted でも真正性はConsentRecord未連携のため慎重扱い**=granted を「AI に実名寄りを読ませてよい証拠」として扱わない）。**ConsentRecord連携は別承認**で、連携後に anonymized=false の参照可否を再設計する。

## 4. anonymized / consentStatus の扱い（判断理由）

- **なぜ匿名化済みのみか**: ①現時点の granted は CaseStudy フィールド上の申告値であり、許諾記録との突合（ConsentRecord 連携）が未実装 ②AI 回答は knowledge search 画面に表示され、閲覧者の範囲が書き込み者より広い ③「顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない」（doc71 §6-1）を AI 経路でも最も強い形（匿名化済みのみ）で維持するため。
- **段階解禁の道筋（すべて別承認）**: ConsentRecord 連携（許諾の取得・記録・失効・突合）が実装され、granted の真正性が機械確認できるようになった後に、anonymized=false の参照可否を改めて設計する。

## 5. 設計: 文脈化・除外・記録

- **entityType**: union に `'CaseStudy'` を追加。**ai_reference 記録**は既存の brainRefs ループがレコード単位で自動記録（entityType='CaseStudy'・purpose は質問先頭のみ・本文/PII なし）。
- **AI 回答に使うフィールド（要約的利用の候補）**: `【顧客事例/業種】body`＋「課題: challenge」「提供内容: solution」「結果（定性的）: outcome」の prefix 付き文脈化（playbook の「言わない:」方式の踏襲）。CONTEXT_TEXT_LIMIT=800・MAX_PER_TABLE=3・**MAX_TOTAL=5 は据え置き候補**（4テーブル化しても合計上限は変えない=読み過ぎ防止）。
- **注入しないフィールド**: **sourceNote（出典メモ=内部情報のため除外候補・既存3テーブルと同じ扱い）**・customerId・consentRecordId（ID 参照は展開しない=doc59 の related IDs 未展開と同方針）・consentStatus/anonymized の生値（文脈には入れない。参照元バッジ表示は UI 設計時に検討）。
- **外部LLM封印**: **externalAiAllowed ゲート維持**=既存の共通処理をそのまま通る。**externalAiAllowed=false の場合、外部LLM注入ゼロ**（CaseStudy は create で false 固定・true UI なし・静的ゲート監視中のため、外部LLM時の注入は構造的にゼロ）。FakeLLM はローカル実行のため外部送信に該当しない（doc44 §5 の整理を踏襲）。**実LLMなし・AIコストなし**は本設計でも不変。
- **Prompt Injection / RAG Safety**: 事例本文はユーザー入力由来のため、①prefix（【顧客事例/…】）で「参照データであること」を構造上明示 ②doNotSay 方式と同様に指示文として解釈されにくい形へ文脈化 ③既存の決定的スコアリング（LLM 不使用）を維持し、検索段階での injection 余地を作らない ④将来の実LLM解禁時には maskText に加えて PII 検査（顧客名・数値パターン）の追加を候補として明記（実装は別承認）。

## 6. 実装時の付帯作業（次回別承認の範囲）

1. company-brain-reference.ts への4テーブル目追加（§3/§5 の条件・数十行の最小差分・既存3テーブル無変更）。
2. smoke 1本追加（顧客事例の参照元表示・2-B-5 の18本目と同型）。
3. 静的安全ゲート拡張候補: 「CaseStudy 参照クエリに `anonymized: true` が含まれること」の機械検査。
4. 単体テスト候補: 参照条件の純粋ロジック部分（必要に応じ shared 化）。
- schema/migration/seed/labels/RBAC 変更は不要の見込み（必要になったら停止が実装ミッションの停止条件）。

## 7. 変更しないもの（境界の再確認）

**外部公開なし・PR配信なし・SEOページ公開なし・顧客の声公開なし・顧客名・取引先名・成果数値の公開なし**・SNS投稿なし・**Customer Pain は別承認**・高機密ラベル解禁なし・externalAiAllowed true UI なし・ConsentRecord/SuppressionList 変更なし・Phase 8 なし・ENSHiN OS 外部発信なし。将来の PR/SEO/導入事例公開は別承認（顧客許諾・表記・レビュー・人間承認が前提）。

## 8. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「4テーブル目として成立」→ company-brain-reference.ts 全文実測（3テーブルの共通構造）②「レコード単位 ai_reference が自動追随」→ knowledge/search/page.tsx の brainRefs ループ実測 ③「匿名化の機械制御が実在」→ doc76（validateCaseStudyConsent・否定系6本）＋doc77（本番実証）④「外部LLM注入ゼロの構造」→ 参照 helper の external フィルタ実測＋静的ゲートの UI 走査 ⑤「重複なし」→ doc78/PROGRESS セクション未存在の実測。
**Assumption Log**: ①MAX_TOTAL=5 据え置きで4テーブル化しても回答品質が保たれる（2-B-5 で3テーブル化時に据え置きで問題なしの前例）②FakeLLM 運用継続（実LLM解禁は外部送信解禁とセットの別の重い承認）。
**Unknowns Log**: ①ConsentRecord 連携の設計詳細（別承認・連携後に anonymized=false 参照可否を再設計）②参照元 UI での匿名化/許諾バッジ表示の要否（実装ミッションで判断）③実LLM解禁時の PII 検査（maskText 拡張・別承認）。
**Risk Register**: 最大リスクは**実名寄り事例の AI 回答混入**（重大度高）→ 対応: anonymized=true のみ参照＋granted を参照条件に使わない＋外部LLM構造ゼロ＋ai_reference 全件記録の4層。次点は文脈経由の prompt injection（低〜中）→ prefix 文脈化＋決定的スコアリング＋参照は read-only（AI に書き込み経路なし）。
**Definition of Done**: Scout 一致 ✅／read-only 監査（reference/search/log/model/gate/docs）✅／参照条件の固定（匿名化済みのみ・第一候補）✅／除外・記録・封印の設計 ✅／実装時の付帯作業の列挙 ✅／doc78・CURRENT_STATE・PROGRESS・vault 記録 ✅／commit ✅／push ⏳（別承認）。

## 9. 次回実装プロンプト案

> **Phase 2-C-5 — CaseStudy AI参照の実装（doc79 候補・別承認）**。doc78 §3/§5 準拠で company-brain-reference.ts に4テーブル目を追加: `prisma.caseStudy.findMany({ where: { tenantId, archivedAt: null, publishStatus: 'private', anonymized: true, label: { in: AI_READABLE_LABELS } }, select: {…sourceNote/customerId/consentRecordId 除外} })`＋【顧客事例/業種】prefix 文脈化＋MAX_TOTAL=5 据え置き＋entityType union に 'CaseStudy'。smoke 1本追加（21本体制）＋静的ゲートに anonymized:true 検査追加。knowledge/search・audit・db は無変更（ai_reference は自動追随）。schema/migration/seed/labels/RBAC 無変更。検証全green（test/typecheck/lint/build/smoke）→ commit-only・push別承認 → 本番確認（利用者実測）。

## 10. 判定

**READY / GO** — 参照条件（匿名化済みのみ・非公開のみ・NORMAL/INTERNAL のみ・外部LLM構造ゼロ・全件記録）を設計として固定。**実装なし**・実装は次回別承認。ConsentRecord 連携・Customer Pain・高機密・実LLM・外部公開はすべて別承認のまま。
