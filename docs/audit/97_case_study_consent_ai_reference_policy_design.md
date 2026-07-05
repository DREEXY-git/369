# 97. CaseStudyConsent AI参照条件設計 — ai_reference purpose と anonymized=false の扱い（docs-only・判定 READY / GO）

> doc96（anonymized=false 本格扱い本番確認 GO・基準 `611e51e` 昇格）後の次段（doc91 §6 段階8）。AIが読む顧客事例の条件を今後どう扱うかの実装前設計。Mode G＋AI Safety Overlay。
> **docs-only・実装なし・company-brain-reference 変更なし・AI参照条件変更なし・code/schema/migration/seed/package/doc14 変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 1. 非エンジニア向け要約

- 許諾台帳のライン（設計→台帳→照合→保存の門番→見せ方の統治）は全段本番確認GOまで完了しました。次に決めるのは「**AIが読む顧客事例の範囲を今後どうするか**」です。
- 現状: AIが読む顧客事例は **anonymized=true のみ**（匿名化済みだけ）。実名寄り事例・許諾台帳の中身は AI に一切渡っていません。
- 本書は3案を比較し、**現状維持（KEEP_ANONYMIZED_TRUE_ONLY）を推奨**として固定しました。台帳に **ai_reference** の用途が書いてあっても、**それだけでは AI参照の解禁条件にしません**。
- 今回は設計だけです。**AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない・外部LLM送信なし・AIコストなし**のまま変わりません。

## 2. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| 基準 = **CaseStudyConsent anonymized=false 本格扱い / `611e51e`**（doc96 で昇格・全段本番確認GO） | doc96・doc14 §60・CURRENT_STATE 実測 |
| AIが読む CaseStudy は **anonymized=true のみ**（＋tenantId・archivedAt null・private・NORMAL/INTERNAL） | company-brain-reference.ts line 110 実測（`anonymized: true`） |
| select は title/body/industry/challenge/solution/outcome/tags/label/externalAiAllowed のみ＝**sourceNote/customerId/consentRecordId/consentStatus を注入しない** | 同 select 実測（doc78 §3 の設計どおり） |
| **CaseStudyConsent / 突合判定は AI 文脈へ一切注入されていない** | company-brain-reference の grep 0件（実測） |
| 外部LLM時は **externalAiAllowed** ゲートで注入ゼロ（true にする UI が存在しない＝構造的ゼロ） | doc45/doc79・安全ゲート検査稼働 |
| 安全ゲートが AI 非注入・`anonymized: true` 条件・非注入ゲートを常時機械検査 | scripts の grep 実測（CaseStudyConsent 19・AI非注入 1・anonymized: true 2） |
| ai_reference 監査ログは既存ループでレコード単位に自動記録 | doc78/doc80（本番実証済み） |
| 実名寄り事例は「保存＋社内限定表示」まで（**AI参照対象外**バッジを本番表示）。保存の門番は **internal_view** の有効台帳行を要求（doc92）が、これは保存条件であって AI参照条件ではない | doc95/doc96・doc92 |

## 3. 論点

1. **anonymized=false を AI に読ませるか**: 読ませない（推奨）。実名寄り本文には顧客名等が含まれ得るため、AI 文脈へ入れると FakeLLM でも出力・ログ経由の露出面が増える。表示統治（knowledge_update_only）と矛盾する（AI 回答は権限に関係なく閲覧され得る）。
2. **ai_reference purpose の意味**: 台帳の ai_reference は「顧客が AI 参照まで許諾した」記録であって、**単独では解禁条件にしない**（NOT_SUFFICIENT_ALONE）。解禁するなら purpose＋人間承認＋権限・マスキング・監査の全部が前提（案C の条件群）。
3. **台帳・証跡の注入可否**: しない（DO_NOT_INJECT）。証跡の所在説明・purpose・取り消し状態は判断材料であって AI の知識にする必要がなく、注入は PII 近接情報の露出面になる。
4. **要約経由の折衷案**: 実名寄り事例の価値を AI に活かすなら、**人間承認済みの匿名化要約を別レコードとして作り、それだけを anonymized=true として読ませる**案（案B）が安全な中間形。ただし要約作成・承認・取り消し追従の運用設計が必要で、今回は候補記録に留める。
5. **外部LLM・コストとの関係**: いずれの案でも外部LLM送信は構造的ゼロを維持（externalAiAllowed true UI なし）。新たな AI コストも発生させない。
6. **監査ログ**: 既存の ai_reference ログ（レコード単位）を維持。参照条件を将来変える場合もログ形式の変更は別承認。

## 4. 選択肢比較（3案）

| 案 | 内容 | メリット | 注意 |
|---|---|---|---|
| **案A（推奨）: KEEP_ANONYMIZED_TRUE_ONLY** | AI参照は **anonymized=true のみ**を維持。ai_reference purpose は将来の前提候補に留める。**今回解禁ゼロ・実装変更ゼロ** | 最も安全・現状の本番確認済み構成と完全一致・表示統治（編集権限者のみ閲覧）とも整合・コスト/露出面の増加なし | 実名寄り事例の内容は AI 回答に活きない（匿名化済み事例で代替） |
| 案B: DERIVED_ANONYMIZED_SUMMARY_ONLY | 将来、実名寄り事例から**人間承認済みの匿名化要約**だけを別途作り、それだけを AI参照候補にする（原本は読ませない） | 実名寄りの知見を安全な形で AI に活かせる・原本非注入を維持 | 要約の作成・承認・台帳取り消し時の追従（要約の無効化）の運用設計が必要＝承認が重い。今回は設計候補のみ |
| 案C: RESTRICTED_REALNAME_AI_REFERENCE_LATER | 将来、**ai_reference purpose＋強い人間承認＋閲覧権限連動＋マスキング＋外部LLM禁止＋専用監査**を全部揃えた場合に限り、実名寄りの AI参照を検討 | 理論上は許諾に基づく最大活用 | 権限非対称（AI 回答は権限外の人にも届く）・取り消し追従・マスキング精度など未解決論点が多い。**現時点では非推奨・実装しない** |

**推奨は案A（KEEP_ANONYMIZED_TRUE_ONLY）**: AIが読む顧客事例は今後も **anonymized=true のみ**。anonymized=false の実名寄り事例は保存・表示統治までであり AI参照には使わない。ai_reference purpose が台帳にあってもそれだけでは解禁条件にしない。CaseStudyConsent の台帳行・証跡・purpose は AI文脈へ注入しない。外部LLM送信は引き続き構造的ゼロ・AIコスト発生もなし。ただし**推奨を出しても §0 人間決定までは何も変えない**（そもそも案A は変更ゼロ）。

## 5. AI参照へ入れないもの（不変事項）

- **anonymized=false（実名寄り）事例の本文・タイトル・全フィールド**。
- **CaseStudyConsent の台帳行・証跡（所在説明含む）・purpose・取り消し状態**（DO_NOT_INJECT・**CaseStudyConsent は AI 文脈へ注入しない**）。
- sourceNote / customerId / consentRecordId / consentStatus（従来から非select・継続）。
- 高機密ラベル（CUSTOMER_CONFIDENTIAL 等）のデータ（従来どおり NORMAL/INTERNAL のみ）。

## 6. 外部LLM・AIコストとの関係（不変事項）

- **外部LLM送信なし**: externalAiAllowed を true にする UI が存在しないため外部LLMへの Company Brain 注入は構造的ゼロ（STRUCTURAL_ZERO）。本設計はこれを変えない。
- **実LLMなし・AIコストなし**: FakeLLM 前提を継続。案B/案C を将来採る場合も、新たな AI コストは予算承認（別承認）が前提。
- 変更する場合はマスキング（maskText）・個別人間承認が前提（3c-5 の解禁は別承認のまま）。

## 7. 次回 §0 人間決定候補

実装（または現状維持の正式決定）時に人間が選ぶ項目（候補形式・OTHER は詳細必須・推奨はすべて安全側）:

```
AI_REFERENCE_POLICY: 【KEEP_ANONYMIZED_TRUE_ONLY / DERIVED_ANONYMIZED_SUMMARY_ONLY / RESTRICTED_REALNAME_AI_REFERENCE_LATER / OTHER】（推奨: KEEP_ANONYMIZED_TRUE_ONLY）
CASE_STUDY_SOURCE_POLICY: 【ANONYMIZED_TRUE_ONLY / HUMAN_APPROVED_DERIVED_SUMMARY_ONLY / OTHER】（推奨: ANONYMIZED_TRUE_ONLY）
CASE_STUDY_CONSENT_INJECTION_POLICY: 【DO_NOT_INJECT / BOOLEAN_GATE_ONLY_LATER / OTHER】（推奨: DO_NOT_INJECT）
AI_REFERENCE_PURPOSE_POLICY: 【NOT_SUFFICIENT_ALONE / REQUIRED_BUT_NOT_SUFFICIENT_LATER / OTHER】（推奨: NOT_SUFFICIENT_ALONE）
EXTERNAL_LLM_POLICY: 【STRUCTURAL_ZERO / MASKED_APPROVED_LATER / OTHER】（推奨: STRUCTURAL_ZERO）
AI_COST_POLICY: 【NO_NEW_AI_COST / BUDGET_APPROVAL_REQUIRED_LATER / OTHER】（推奨: NO_NEW_AI_COST）
DATA_ACCESS_LOG_POLICY: 【KEEP_EXISTING_AI_REFERENCE_LOG / EXTEND_LATER_WITH_APPROVAL / OTHER】（推奨: KEEP_EXISTING_AI_REFERENCE_LOG）
SAFETY_GATE_POLICY: 【KEEP_CURRENT_NON_INJECTION_GATE / ADD_EXPLICIT_KEEP_ANONYMIZED_TRUE_GATE_LATER / OTHER】（推奨: KEEP_CURRENT_NON_INJECTION_GATE）
IMPLEMENTATION_POLICY: 【DOCS_ONLY_NOW / IMPLEMENT_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DOCS_ONLY_NOW）
```

## 8. 実装する場合の段階案（各段個別承認）

1. **doc97 設計（今回・docs-only）** ✅
2. **§0 人間決定**（§7 の9項目。案A＝現状維持なら実装は不要で、決定の記録のみ）
3. （案B/案C を選んだ場合のみ）詳細設計 docs-only（要約レコードの器・承認フロー・取り消し追従・マスキング）
4. schema/実装の最小変更（個別承認・company-brain-reference 変更は個別承認）
5. 否定系テスト・安全ゲート更新（非注入検査の形の更新＝承認の証跡）
6. 本番確認（利用者実測・§0）
7. 外部LLM関連は 3c-5 の別承認ラインのまま（本段階案に含めない）

## 9. 今回やらなかったこと

- **company-brain-reference 変更なし・AI参照条件変更なし**（anonymized=true のみ参照を維持・実測どおり）。
- **CaseStudyConsent は AI 文脈へ注入しない**（DO_NOT_INJECT 維持）・anonymized=false の AI参照解禁なし・ai_reference purpose の実装接続なし。
- **外部LLM送信なし・実LLMなし・AIコストなし・外部送信なし**・externalAiAllowed true UI / publishStatus UI なし。
- **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**・公開活用なし・ApprovalRequest 接続なし。
- DB/schema/migration/seed/package/lockfile/doc14 変更なし・本番確認記録なし・本番接触なし・push なし。

## 10. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「現状 AI参照は anonymized=true のみ」→ company-brain-reference.ts line 110 の実測（`anonymized: true`・select に consent系なし）②「CaseStudyConsent 非注入」→ grep 0件（実測）③「非注入・条件維持の機械検査稼働」→ scripts の grep 実測 ④「全段本番確認GO の土台」→ doc96・doc14 §60・基準 `611e51e` ⑤「実名寄りは AI参照対象外と本番表示済み」→ doc95/doc96（バッジ実測）。
**Assumption Log**: ①案A は実装変更ゼロ＝リスク追加ゼロ ②案B の要約レコードは anonymized=true の新規 CaseStudy（または専用モデル）として既存参照条件に乗せられる（詳細は案B 採択時の別設計）③FakeLLM 継続。
**Unknowns Log**: ①§0 の9決定（人間）②案B 採択時の要約運用設計（作成者・承認者・台帳取り消し時の要約無効化）③外部LLM解禁（3c-5）の将来判断（本設計のスコープ外・別承認）。
**Risk Register**: 最大=「台帳に ai_reference があるから AI に読ませてよい」という誤解 → 本書 §3-2/§4/§5 で「purpose 単独では解禁しない」を固定・安全ゲートの非注入検査で機械遮断。次点=権限非対称（AI 回答は閲覧権限に関係なく届く）→ 案A 維持で回避・案C の未解決論点として明記。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（AI参照条件・非注入・ゲート）✅／論点6・3案比較（**案A推奨**）・非注入リスト・外部LLM/コスト不変・§0 候補9項目・段階案 ✅／doc97 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 11. 次回推奨プロンプト案

> ①**doc97 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **AI参照条件の §0 人間決定**（§7 の9項目をチャット提出。KEEP_ANONYMIZED_TRUE_ONLY 維持なら実装不要＝決定の記録のみ）→（案B/C の場合のみ）詳細設計→実装承認。③並行選択肢: 公開活用判断（ApprovalRequest・表現審査・今は進めない）／Customer Pain（高機密ラベル対応が先）／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 12. 判定

**判定: READY / GO**（AI参照条件の扱いは設計固定完了・**実装は未着手・§0 人間決定後の別承認**。推奨の案A は現状維持＝変更ゼロ）。**anonymized=true のみ 参照・anonymized=false は未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
