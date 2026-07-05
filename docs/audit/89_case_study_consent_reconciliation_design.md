# 89. CaseStudyConsent 突合判定設計 — granted の真正性確認と anonymized=false 解禁前ゲート（docs-only・判定 READY / GO）

> doc88（CaseStudyConsent UI 本番確認 GO・基準 CaseStudyConsent UI / `1913456`）後の、doc83 §9 段階3（突合判定）の実装前安全設計。Mode B＋Consent / Legal Evidence / AI Safety Overlay。
> **docs-only・実装なし・validateCaseStudyConsent / validateCaseStudyConsentInput 変更なし・actions 変更なし・company-brain-reference 変更なし・schema/migration/seed/package 変更なし・doc14 追記なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent UI / `1913456`** のまま。

---

## 1. 非エンジニア向け要約

- 「許諾あり（granted）」を**本物とみなす前の照合ルール（突合判定）を設計**しました。まだ実装していません（**docs-only**）。
- 突合判定とは: 事例の「許諾あり」という申告を、**許諾台帳（CaseStudyConsent）と機械的に照合**して、「**有効な台帳行**が本当にあるか・期限切れでないか・取り消されていないか・用途が合っているか」を確認する仕組みです（doc82 の方針「**consentStatus=granted だけでは真正な許諾証拠として扱わない**」の実装形）。
- 大事な注意: **突合判定ができても実名解禁ではありません**。**anonymized=false は未解禁**のまま・**AI参照条件変更なし**（AIが読める顧客事例は匿名化済みだけ）・外部公開もなし。解禁はそれぞれ別の人間承認です。

## 2. 今回の目的

- doc83 §9 段階3 の実装承認を最小審査にするため、「有効な許諾と認める全条件」「拒否条件」「関数の置き場所（案A/案B）」「否定系テスト」「安全ゲート」「段階承認の割り方」を実装前に固定する。

## 3. read-only 監査結果（2026-07-05 実測）

| 対象 | 実測結果 |
|---|---|
| doc82 方針 | 「consentStatus=granted だけでは真正な許諾証拠として扱わない」「anonymized=false は別承認」存在（grep 2/2） |
| doc83 段階設計 | 突合判定=段階3・revoked/expired/suppressed の導出設計あり（grep 5件ほか） |
| doc87/doc88 | 台帳UIは実装済み＋本番確認 GO（基準 CaseStudyConsent UI / `1913456`・CURRENT_STATE と整合） |
| schema | CaseStudyConsent 存在（status/purpose/evidence/grantedAt/expiresAt 必須/revokedAt・relation なし） |
| actions | consents actions は validateCaseStudyConsentInput 使用（入力検証済み・人間のみ・writeAudit） |
| AI参照層 | company-brain-reference に CaseStudyConsent 参照 **0件**（AI 非注入・安全ゲートで恒久検査中） |
| 既存純粋関数 | `validateCaseStudyConsent`（匿名化の門番・case-study.ts）と `validateCaseStudyConsentInput`（台帳入力検証・case-study-consent.ts）は**別物として共存** |

## 4. 突合判定とは何か

- CaseStudy.consentStatus は画面で人間が選ぶ**申告値**。突合判定は、その申告を**台帳の実在レコードで機械確認**する層。
- 判定は read-only（台帳を読むだけ・書き換えない）。判定結果は「この事例のこの用途の許諾は有効か」の boolean＋理由コード。
- 使い道（将来・各別承認）: anonymized=false の保存条件・AI参照許諾（ai_reference purpose）の確認・公開系操作の前提チェック。

## 5. 有効な許諾と認める全条件（AND・1つでも欠けたら無効）

1. CaseStudy の `consentStatus` が `granted`
2. CaseStudy に紐づく**有効な台帳行**（CaseStudyConsent）が存在
3. **tenantId** が一致（テナント越え参照禁止）
4. **caseStudyId** が一致
5. 台帳行の status が `granted`
6. revokedAt が null（**revoked** でない）
7. expiresAt が現在日時より後（**expired** でない）
8. **purpose** に対象用途が含まれる（用途未記載・対象用途なしは無効）
9. **suppressed** ではない（対象 subject が **SuppressionList** に不在・配信停止の単一情報源を照会）
10. 対象 CaseStudy が archivedAt null（アーカイブ済みは対象外）
11. 対象 CaseStudy の publishStatus が private
12. 対象 CaseStudy の label が NORMAL / INTERNAL（高機密ラベルは対象外・別承認）
13. 台帳行は人間が登録したもの（AIロールは登録・変更不可＝既存 actions 層の前提を維持）
14. **evidence** が存在する（空は無効）
15. **evidence 本文を AI / audit summary / 外部送信へ注入しない**（判定は存在確認のみ・内容は使わない）

## 6. 無効な許諾として拒否する条件

- consentStatus が granted ではない／CaseStudyConsent が存在しない／tenantId 不一致／caseStudyId 不一致
- **revoked**（取り消し済み）／**expired**（期限切れ）／**suppressed**（SuppressionList 該当）
- purpose 未記載／purpose に対象用途がない／unknown purpose／unknown status
- archived CaseStudy／高機密ラベル／public・published 扱いの CaseStudy（publishStatus が private でない）
- evidence 空
- AI が登録・変更しようとしている場合（判定以前に mutation 自体を拒否）

## 7. purpose ごとの扱い（6区分）

| purpose | 意味 | 今回の扱い |
|---|---|---|
| **internal_view** | 社内閲覧用 | 突合判定の対象（設計のみ） |
| **ai_reference** | 将来の AI 参照許諾用 | 突合判定の対象（設計のみ。AI参照条件の変更は別承認） |
| **external_publish** / **pr** / **seo** / **customer_voice** | 公開系 | **台帳だけでは足りない**。ApprovalRequest・表現審査・公開前人間承認・取り下げ運用が必要（doc82 §9 の5前提）。**今回は公開系を解禁しない** |

## 8. anonymized=false との関係

- **今回は anonymized=false を解禁しない**（**anonymized=false は未解禁**のまま）。
- 突合判定が設計・実装されても、**即座に実名寄り事例を AI や公開に使ってよいわけではない**。anonymized=false の UI / 保存条件（validateCaseStudyConsent への突合接続）/ 本番確認は**別承認**。
- 現時点では **AI が読める顧客事例は anonymized=true のみ**。

## 9. AI参照との関係（固定）

- **company-brain-reference.ts は今回変更しない**・**AI参照条件変更なし**（AI参照条件はまだ変更しない）。
- **CaseStudyConsent は AI 文脈へ注入しない**。**evidence / customerId / purpose / consentId / consentStatus を AI 文脈へ注入しない**。
- **外部LLM送信なし・実LLMなし・AIコストなし・externalAiAllowed true UI なし・publishStatus UI なし**。
- **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。

## 10. validateCaseStudyConsent 拡張案（案A / 案B の比較と推奨）

| 案 | 内容 | 評価 |
|---|---|---|
| 案A | 既存 `validateCaseStudyConsent`（匿名化の門番）を拡張して台帳突合も担わせる | ✗ 既存の純粋判定（同期・DB非依存・否定系6本で恒久固定済み）に DB 依存が混入し、既存テスト・actions・安全ゲートの前提を壊すリスク |
| **案B（推奨）** | 新しい純粋関数 **`validateCaseStudyConsentReconciliation`**（台帳行の配列＋現在時刻＋対象用途を引数に取る同期判定）を追加し、既存関数は壊さない。DB 読み出しは actions/service 層の責務として分離 | ✅ 既存の匿名化判定を壊さない・純粋関数のまま否定系テストを分けやすい・段階実装しやすい |

**推奨は案B**（安全側）。純粋関数は「台帳行のリストを渡されて有効行があるか判定する」だけにし、prisma 読み出し・SuppressionList 照会は呼び出し側（actions/service）で行う。**最終実装は別承認**。

## 11. 否定系テスト案（実装時に必須・すべて reject を確認）

no consent record → reject／tenant mismatch → reject／caseStudyId mismatch → reject／**revoked** → reject／**expired** → reject／**suppressed** → reject／missing purpose → reject／purpose mismatch → reject／consentStatus not granted → reject／archived CaseStudy → reject／high confidentiality label → reject／unknown purpose → reject／unknown status → reject／AI role mutation → reject（actions 層）／evidence empty → reject／public・publishStatus not private → reject。＋肯定系: 全条件充足 → accept（1本）。

## 12. 安全ゲート案（scripts/check-company-brain-safety.mjs の拡張・実装時に同時）

- 突合判定関数（validateCaseStudyConsentReconciliation）の**否定系テスト**が存在すること。
- company-brain-reference が CaseStudyConsent を読んでいないこと（既存検査の維持）。
- evidence / consentId / customerId が AI 文脈へ入らないこと。
- **anonymized=false 解禁が同時に入っていないこと**（突合判定の commit に匿名化解禁の変更が混ざったら FAIL＝段階分離の機械担保）。
- externalAiAllowed true UI・publishStatus UI が存在しないこと（既存検査の維持）。
- delete/deleteMany が存在しないこと・AI role が mutation できないこと（既存検査の維持）。

## 13. 実装段階案（各段個別承認・今回は 1 のみ）

1. **docs-only 設計（今回 doc89）** ✅
2. 純粋関数 / service 設計（validateCaseStudyConsentReconciliation＋呼び出し層の形）
3. Server Action 側の保存条件への接続（例: anonymized=false 保存時の突合必須化＝匿名化解禁とセットの承認）
4. 否定系テスト・安全ゲート
5. 本番確認（利用者実測・§0）
6. anonymized=false の扱い判断（別承認）
7. AI参照条件の扱い判断（ai_reference purpose の使用・別承認）
8. 公開活用判断（ApprovalRequest・表現審査・さらに別承認）

## 14. 今回やらなかったこと

- **実装なし**: validateCaseStudyConsent / validateCaseStudyConsentInput 変更なし・CaseStudy/CaseStudyConsent actions 変更なし・company-brain-reference 変更なし・UI 修正なし・schema/migration/seed/package 変更なし・doc14 追記なし。
- **anonymized=false は未解禁**・AI参照条件変更なし・高機密ラベルなし・Customer Pain なし・本番接触なし・push なし。

## 15. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「granted は申告値」→ doc82 §5 grep 実測 ②「段階3の位置づけ」→ doc83 §9 grep 実測 ③「台帳が本番稼働済み」→ doc88（利用者実測 GO）④「既存2関数の分離」→ case-study.ts / case-study-consent.ts の export 実測（line 24 / 37）⑤「AI 非注入の現状」→ company-brain-reference の grep 0件。
**Assumption Log**: ①suppressed 照会の subject は台帳の customerId 経由で Customer の連絡先を引く形が候補（PII を判定層に持ち込まない設計は実装承認時に確定）②現在時刻は呼び出し側から渡す（純粋関数の決定性維持）③FakeLLM 継続。
**Unknowns Log**: ①suppressed 照会の具体形（customerId → Customer → subject の解決をどの層でやるか）②理由コードの粒度（UI 表示に使うか）③段階3実装と段階6（anonymized=false）を別 commit に分ける運用の§0 形式。
**Risk Register**: 最大=突合判定の実装と匿名化解禁が同時に入る事故 → §12 の「同時解禁で FAIL」ゲート案で機械遮断。次点=既存門番の破壊 → 案B（別関数）で回避。次点=「突合判定=解禁」の誤解 → §8 で明記。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／有効条件15項目 AND・拒否条件・purpose 6区分・案A/案B 比較（**案B推奨**）・否定系テスト17本案・安全ゲート案・実装8段階の固定 ✅／doc89 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 16. 次回推奨プロンプト案

> ①**doc89 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **突合判定の実装承認**（doc89 準拠・validateCaseStudyConsentReconciliation 純粋関数＋否定系テスト＋安全ゲート拡張のみ＝段階2＋4。保存条件への接続（段階3）と anonymized=false（段階6）はさらに別承認）／Customer Pain の扱い判断／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別承認なしに進まない。

## 17. 判定

**判定: READY / GO**（突合判定の設計は固定完了・実装は未着手・別承認）。**anonymized=false は未解禁**・**AI参照条件変更なし**・プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま変わらない。
