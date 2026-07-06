# 112. 高機密ラベル実装・解禁 可否判断（候補A+B完了後）— まだ runtime 解禁しない・docs-only

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（方針決定の記録。コード差分ゼロ）
- Audit Doc: 112
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Enablement Decision After Candidate A+B
- Status: GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `bc9772d424c37d076c248c520d9b61bb3ff476db`
- Scope: 候補A（閲覧判定の純粋関数）＋候補B（安全ゲート静的検査）完了後の「高機密ラベルを runtime 解禁してよいか」の §0 方針決定の記録
- Not Included: 実装・解禁・Customer Pain実装・Customer Pain runtime実装・schema変更・migration・RBAC変更・label定義変更・company-brain-reference変更・AI参照条件変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc112 push-only（別承認）
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain画面・Server Action / schema変更 / migration / RBAC変更 / label定義変更 / company-brain-reference変更 / 本番確認

## §0 人間決定値（12項目）

このミッションの送付をもって、以下12項目は**人間承認済みの安全側決定値**として確定する（承認されるのは「docs-only の方針決定記録」のみ。実装・解禁・本番反映・外部送信は一切承認されていない）。

```
HIGH_CONFIDENTIAL_RUNTIME_ENABLEMENT_POLICY: DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB
CANDIDATE_AB_STATUS_POLICY: CANDIDATE_A_AND_B_COMPLETED_AS_SAFETY_FOUNDATION
CANDIDATE_C_POLICY: REQUIRE_SEPARATE_HEAVY_APPROVAL_BECAUSE_SCHEMA_AND_MIGRATION
NEXT_PATH_POLICY: PREPARE_CANDIDATE_C_PREREQUISITE_DESIGN_DOCS_ONLY_OR_QUALITY_FOUNDATION
CUSTOMER_PAIN_RUNTIME_POLICY: DO_NOT_IMPLEMENT_CUSTOMER_PAIN_NOW
SCHEMA_POLICY: NO_SCHEMA_CHANGE_NOW
MIGRATION_POLICY: NO_MIGRATION_NOW
RBAC_POLICY: NO_RBAC_CHANGE_NOW
LABEL_POLICY: NO_LABEL_DEFINITION_CHANGE_NOW
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE_AND_NO_COMPANY_BRAIN_REFERENCE_CHANGE
PII_POLICY: PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

## 1. 非エンジニア向け要約

- ここまでで、守り方の「判定ロジック（候補A）」と「自動見張り（候補B）」が完成しました。今回はその上で、**「高機密ラベルを実際に使い始めてよいか（runtime 解禁）」を人間が判断した**回です。
- 決めた内容は **「候補A+Bが完了した今でも、まだ runtime 解禁はしない」**（`DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB`）です。**候補A完了**・**候補B完了**は「安全の土台」であって、それだけでは解禁の理由になりません。
- 次に実際にデータを扱う「候補C（Customer Pain の器＝schema・画面・Server Action）」に進むには、**schema と migration を伴う別の重い人間承認**が必要です。今回はそこへは進みません。
- これは**解禁ではない**。コードは1行も変わっていません。**高機密ラベル解禁なし**・**Customer Pain実装なし**（**Customer Pain runtime実装なし**）・**Data Classification実装なし**。

## 2. 候補A+Bで何が完了したか

- **候補A（doc110）**: 「この人はこの高機密詳細を見てよいか」を判定する**純粋関数**（`canViewCustomerPainDetail` / `evaluateCustomerPainAccess`）＋否定系テスト。標準閲覧式5条件（tenantId × knowledge:update × canAccessLabel × 人間 × 未アーカイブ）の AND を `packages/shared` 内のみで実装（DB・画面・保存には未接続）。
- **候補B（doc111）**: その守りが後退したら機械検知する**安全ゲート静的検査**を `scripts/check-company-brain-safety.mjs` に追記（既存ゲートは不変）。5条件消失・OR緩和・runtime/AI 混入・label定義変化を FAIL 判定。
- → 「守り方の設計・判定ロジック・自動見張り」は揃った。ただし**これは判定の部品であり、実データを扱う稼働（runtime 解禁）ではない**。

## 3. それでもまだ runtime 解禁しない理由

- **器（schema）がまだ**: Customer Pain のテーブルは未設計・未作成（NO_SCHEMA_CHANGE のまま）。判定ロジックはあっても、判定する対象の実データの入れ物がない。
- **実接続がまだ**: 候補A の純粋関数は画面・DB・`writeDataAccess`/`writeAudit` に接続していない。解禁とは、この判定を実画面・実データ・実記録に**つないで動かす**ことを意味する（§4）。
- **本番確認がまだ**: 解禁は本番確認まで含む重い工程。順序を飛ばすと安全性を実証できない。
- **可逆性の担保**: 一度実データに高機密を入れると後戻りが難しい。候補A+B（可逆）→ 候補C設計 → 候補C実装 → 本番確認、の順を守る。
- **候補A+B完了は前提条件であって解禁条件ではない**（CANDIDATE_A_AND_B_COMPLETED_AS_SAFETY_FOUNDATION）。土台が固まっただけで、解禁は別判断。

## 4. runtime 解禁とは何を意味するか

「高機密ラベルの runtime 解禁」は、次のいずれか（またはすべて）を実際に動かし始めることを意味する:

- Customer Pain の**器（schema）＋ migration** を作り、実データを保存できるようにする。
- 候補A の標準閲覧式を**実画面・実 Server Action で判定**し、非許可者に本文を出さない実装を稼働させる。
- 閲覧のたびに **writeDataAccess**、書き込みのたびに **writeAudit** を**実際に記録**する。
- そのための一覧/詳細画面・Server Action・否定系テストの実接続を稼働させる。

いずれも本番に影響するため、**個別の重い人間承認**を要する。今回はその**手前の判断のみ**で、runtime 解禁は行わない。

## 5. 候補Cに進むと何が重くなるか

- **schema変更・migration が必須**（`REQUIRE_SEPARATE_HEAVY_APPROVAL_BECAUSE_SCHEMA_AND_MIGRATION`）。DB の器を作る＝一度入れると後戻りが難しい、最も重い工程。
- **実データ・PII 近接**: Customer Pain は失注理由・クレーム等の生データで、顧客名・担当者名と紐づくと実害リスク（今も PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW）。
- **本番確認・可逆性の管理**: 画面・Server Action・記録・否定系テストを本番確認まで通す必要があり、工数と露出リスクが跳ね上がる。
- → だからこそ候補Cは「前提設計 docs-only」から始め、schema/migration の要否を最初に判定する（§6 案A）。

## 6. 次の選択肢

- **案A: 候補C前提設計 docs-only に進む** — Customer Pain の器（schema）が本当に必要か、必要ならどんな最小形か、を**紙の上（docs-only）**で設計する。実装・schema変更はしない。schema/migration が必要と判明したら、そこで停止して別の重い人間承認へ。
- **案B: CI / Test / Release Governance を先に強化する** — 解禁判断を保留し、品質基盤（自動テスト・リリース統治）を先に固める。Customer Pain ラインは一旦保留（証拠として保持・削除しない）。
- **案C: まだ判断保留にする** — 候補A+B の土台で一旦止め、次段の選択自体を先送りする。

## 7. 推奨案

- **推奨: 案A（候補C前提設計 docs-only）**。ただし**候補C本実装ではなく前提設計 docs-only** に限る。
- 理由: 候補A+B で守りの部品が揃った直後の自然な次段は「実データを扱う前の器の設計」であり、docs-only なら可逆・低リスクで前進できる。schema/migration の要否を最初に判定でき、重い承認の範囲を人間が正確に把握できる。
- ただし**案Aでも今回は実装しない**（DOCS_ONLY_NOW）。本書は「次にやること」を候補C前提設計 docs-only に向けるだけで、解禁も実装も schema 変更も行わない。案B（品質基盤優先）も人間が選べば別承認で開始できる。

## 8. 今回やらなかったこと

- **解禁ではない**・**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Customer Pain runtime実装なし**・**Data Classification実装なし**。
- **schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**。
- **company-brain-reference変更なし**・**AI参照条件変更なし**（AIに読ませない）。
- **PII保存なし**・**実顧客データ保存なし**。
- **外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし（commit まで）。
- 既存 docs は改名しない・HOLD 記録削除なし・frontmatter 一括適用なし・doc14 変更なし・docs/10_obsidian 変更なし。

## 9. Evidence Map

- 現在地の根拠: Scout 実測（HEAD = origin/main = origin/feature = `bc9772d424c37d076c248c520d9b61bb3ff476db`・working tree clean・`origin/main..HEAD` 空）。
- 候補A+B 完了の根拠: doc110（候補A＝`canViewCustomerPainDetail` / `evaluateCustomerPainAccess` ＋否定系テスト・正本反映済み）／doc111（候補B＝`scripts/check-company-brain-safety.mjs` 拡張・正本反映済み）。
- 安全の土台が生きている根拠: `node scripts/check-company-brain-safety.mjs` を read-only 実行 → **exit 0**（`Company Brain safety checks passed. (actions: 4, ui files scanned: 156)`）。候補A+B の守りが現時点で機械検査を通ることを確認。
- 封印維持の実測: company-brain-reference への CaseStudyConsent/CustomerPain 注入 0・`anonymized: true` 2・**apps の Customer Pain runtime 実装 0**・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）。
- 設計・順序の根拠: doc105（詳細設計・事前停止条件）／doc108（DO_NOT_ENABLE_YET）／doc109（候補A/B/C 分離・A+B 先行・C 別承認）。

## 10. Assumption Log

- 「候補A+B 完了は安全の土台であって解禁条件ではない」と判断し、runtime 解禁を見送った（CANDIDATE_A_AND_B_COMPLETED_AS_SAFETY_FOUNDATION）。
- §0 決定値12項目は、このプロンプト送付をもって人間承認済みとして扱う（承認範囲は docs-only の方針決定記録のみ）。
- 候補C は schema/migration を伴うため最も重い承認が必要と判断（前提設計 docs-only から始めるのが最小リスク）。

## 11. Unknowns Log

- 候補C前提設計で Customer Pain の器（schema）が実際に必要になるか・その最小形（未設計・NO_SCHEMA_CHANGE のまま）。
- 品質基盤（CI / Test / Release Governance）と Customer Pain ラインの優先順位（人間判断）。
- 高機密ラベル runtime 解禁の最終判断の時期（候補C前提設計後の個別人間承認・人間判断待ち）。

## 12. Risk Register

- 「候補A+B完了＝解禁してよい」と誤読されるリスク → 本書 §1・§3・§8・§15 で**解禁ではない**ことを明記して防ぐ。
- 順序を飛ばして候補Cに直行するリスク → §5・§6 で schema/migration を伴う別の重い承認と明記し、案A（前提設計 docs-only）を推奨。
- 判断を先送りしすぎて Customer Pain ラインが停滞するリスク → 案A は前提設計 docs-only へ前進する形で緩和。
- 未push commit の揮発リスク → 次の doc112 push-only（別承認）で解消。

## 13. Definition of Done

- [x] 候補A+B 完了後の §0 方針決定12項目（DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB ほか）を正式記録。
- [x] 「候補A+B完了でもまだ runtime 解禁しない」「候補Cは schema/migration を伴う別の重い承認」「次は候補C前提設計 docs-only または品質基盤強化」を明記。
- [x] read-only 安全確認（safety script exit 0）を Evidence Map に記録。
- [x] CURRENT_STATE / PROGRESS / vault ノート＋index の正本反映。
- [x] 許可5ファイルのみで Gate 全 green（code/schema/migration/RBAC/label定義/company-brain-reference/scripts/doc14/docs/10_obsidian 無変更）。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 14. 次回推奨プロンプト案

1. **doc112 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **候補C前提設計 docs-only ミッション**（doc113 候補。Customer Pain の器＝schema が必要かを最初に判定し、必要と判明したら停止して人間判断へ。実装・schema変更はしない）。
3. 品質基盤強化ミッション（CI / Test / Release Governance・別承認）。
4. 候補C本実装（Customer Pain schema・画面・Server Action・writeDataAccess/writeAudit 実接続）は、候補C前提設計と高機密ラベル解禁可否判断のあとの**別の重い人間承認**。

## 15. 判定

**判定: GO**（候補A+B 完了後の高機密ラベル実装・解禁 可否判断は「まだ runtime 解禁しない（`DO_NOT_ENABLE_RUNTIME_YET_AFTER_CANDIDATE_AB`）」で正式記録された）。

ただし、これは高機密ラベルの runtime 解禁ではない。**候補A完了**・**候補B完了**の土台の上でも、**まだ runtime 解禁しない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Customer Pain runtime実装なし**・**Data Classification実装なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**AI参照条件変更なし**・**PII保存なし**・**実顧客データ保存なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**候補Cは別の重い人間承認**（**候補C前提設計docs-only** から）・**CI / Test / Release Governance** を先に選ぶ道も可・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
