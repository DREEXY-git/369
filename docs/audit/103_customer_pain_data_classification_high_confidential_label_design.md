# 103. Customer Pain Data Classification — 高機密ラベル運用設計（docs-only・判定 READY / GO）

> doc102（Customer Pain 方針決定・HIGH_CONFIDENTIAL_PREREQUISITE_FIRST）を受けた「守り方の設計」。Mode B＋Security / Privacy / Data Classification / AI Safety / GitHub・Obsidian Overlay。
> **これは Data Classification の設計であって解禁ではない**。**高機密ラベル解禁は未実施・Customer Pain 実装は未着手**のまま。
> **docs-only・実装なし・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・apps/packages/scripts 変更なし・company-brain-reference 変更なし・AI参照条件変更なし・PII/実顧客データ保存なし・本番確認なし・外部送信なし・実LLMなし・AIコストなし・doc14 変更なし・push なし（commit-only）**。
> プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま。

---

## 1. §0 固定方針（本ミッションで人間承認済み・21項目）

DATA_CLASSIFICATION_SCOPE=DESIGN_ONLY／TARGET_DOMAIN=CUSTOMER_PAIN／TARGET_LABEL_POLICY=CUSTOMER_CONFIDENTIAL_DEFAULT_CANDIDATE／**HIGH_CONFIDENTIAL_ENABLEMENT_POLICY=DO_NOT_ENABLE_NOW**／**CUSTOMER_PAIN_IMPLEMENTATION_POLICY=DO_NOT_IMPLEMENT_NOW**／PII_POLICY=PROHIBIT_BODY_PII_AND_REAL_CUSTOMER_DATA_NOW／CUSTOMER_REFERENCE_POLICY=CUSTOMER_ID_REFERENCE_ONLY_LATER／VIEW_PERMISSION_POLICY=KNOWLEDGE_UPDATE_AND_LABEL_ALLOWED_ROLE_INTERSECTION／ACCESS_LOG_POLICY=WRITE_DATA_ACCESS_REQUIRED_LATER／WRITE_AUDIT_POLICY=WRITE_AUDIT_REQUIRED_LATER／AI_REFERENCE_POLICY=PROHIBIT_AI_REFERENCE／PUBLIC_USE_POLICY=PROHIBIT_PUBLIC_USE／SAFETY_GATE_POLICY=DESIGN_REQUIRED_BEFORE_IMPLEMENTATION／TEST_POLICY=NEGATIVE_TESTS_REQUIRED_BEFORE_ENABLEMENT／DB_POLICY=NO_SCHEMA_CHANGE／MIGRATION_POLICY=NO_MIGRATION／RBAC_POLICY=NO_RBAC_CHANGE_NOW／LABEL_DEFINITION_POLICY=NO_LABEL_DEFINITION_CHANGE_NOW／UI_POLICY=NO_UI_IMPLEMENTATION／IMPLEMENTATION_POLICY=DOCS_ONLY_NOW／PUSH_POLICY=NO_PUSH_COMMIT_ONLY。

## 2. 非エンジニア向け要約

- Customer Pain（失注理由・クレーム・不満・競合比較などの生データ）を将来扱うための「**守り方の設計**」をまとめました。**これは設計であって解禁ではありません**。何も実装していません。
- 決めた骨子: **既定ラベルは CUSTOMER_CONFIDENTIAL（顧客機密）を候補**にする／**見られる人を絞る**（編集権限＋ラベル許可ロールの両方を満たす人だけ）／**見た記録を残す**（writeDataAccess）／書いた記録も残す（writeAudit）／**AIには読ませない**／**公開しない**／本文に個人情報や顧客名を書かせない。
- 重要な発見: 既存のラベル設定では、CUSTOMER_CONFIDENTIAL は **AI ロールや STAFF にも閲覧許可が及ぶ**（CRM 用の既存設計）。Customer Pain でそのまま使うと守りが足りないため、**ラベルだけに頼らず追加の関門（AIロール除外・権限交差）が必須**、を設計の中心に据えました。

## 3. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| doc102 で HIGH_CONFIDENTIAL_PREREQUISITE_FIRST 等9項目が正式決定済み | doc102 grep 実測（全項目確認） |
| ConfidentialityLabel enum に CUSTOMER_CONFIDENTIAL / CONFIDENTIAL / STRICT_SECRET 等が定義済み | schema.prisma 実測 |
| **labels.ts の CUSTOMER_CONFIDENTIAL 許可ロールに AI_AGENT / AI_ASSISTANT / STAFF が含まれる**（CRM の Customer 既定ラベル用の設計） | packages/shared/src/labels.ts 実測（★本設計の中心論点） |
| canAccessLabel（ロール×ラベルの共通判定）が存在 | labels.ts 実測 |
| **writeDataAccess は定義済みで使用実績あり**（lib/db.ts・leadmap 分析／marketing／dx／brain/policies の計9箇所） | grep 実測 |
| writeAudit は 38 ファイルで使用（書き込み監査の標準） | grep 実測 |
| Customer Pain の実装は apps/packages に 0件 | grep 実測 |
| AI/公開の封印維持（brain-ref 注入0・anonymized: true 2・封印UI 0/0・公開系 tsx 0） | 実測 |
| 基準 = CaseStudyConsent anonymized=false 本格扱い / `611e51e` | CURRENT_STATE 実測 |

## 4. Data Classification の目的

「どの情報を・どのラベルで守り・誰が見られて・見たら何が記録され・AIと外部に出ないことをどう機械保証するか」を、**データが入る前に**確定すること。CaseStudyConsent ライン（許諾→照合→門番→表示統治）で確立した「機械検査で後退を防ぐ」型を、高機密領域に拡張する。

## 5. Customer Pain に必要なデータ分類

| 情報 | 分類候補 | 扱い |
|---|---|---|
| 課題の一般化された記述（顧客特定不能） | INTERNAL 相当 | 将来も通常運用可 |
| 失注理由・クレーム・不満・競合比較・成果未達（顧客文脈つき） | **CUSTOMER_CONFIDENTIAL（既定候補）** | 本設計の対象 |
| 極端な機微（法的紛争・重大クレーム等） | STRICT_SECRET 候補（例外運用） | §0 候補で人間決定 |
| PII（担当者名・連絡先）・顧客名の本文記載 | **保存禁止**（本文への複製禁止・将来も customerId 参照のみ） | §14 |

## 6. CUSTOMER_CONFIDENTIAL を既定候補にする理由

①CRM 側（Customer 等）の既定ラベルと同族で、意味（顧客機微）が一致 ②enum・バッジ・canAccessLabel が既に存在し **label定義変更なし** で始められる ③HR/LEGAL/FINANCIAL 系は領域が違い、STRICT_SECRET は日常運用に硬すぎる。ただし §7 のとおり **ラベル単独では守りが不足**するため、交差条件（§10）とセットで初めて成立する。

## 7. 高機密ラベルを今は解禁しない理由（HIGH_CONFIDENTIAL の扱い）

1. **既存許可ロールが広すぎる**: labels.ts の CUSTOMER_CONFIDENTIAL は AI_AGENT / AI_ASSISTANT / STAFF まで許可（CRM 画面用）。Company Brain 型の知識画面でそのまま使うと「AIロールが高機密を読める」構成になり得る。**RBAC_POLICY=NO_RBAC_CHANGE_NOW / LABEL_DEFINITION_POLICY=NO_LABEL_DEFINITION_CHANGE_NOW** のため今回はロール表も変えず、**画面側の交差条件（§10）で絞る設計**を先に固定する。
2. writeDataAccess の適用パターン（Company Brain 初）と安全ゲート・否定系テストが未整備（§17/§18）。
3. doc39 以来「Company Brain の高機密扱いは別の重い承認」と位置づけられており、**解禁は本設計→§0 決定→実装→本番確認の後の個別人間承認**。

## 8. 閲覧権限設計候補

- 原則: **「knowledge:update 以上」かつ「canAccessLabel(role, CUSTOMER_CONFIDENTIAL) が真」かつ「AIロールでない（isHumanUser）」**の3条件 AND。
- 一覧はプレースホルダ（「顧客機密（閲覧制限）」）のみ・詳細は3条件を満たす人だけ（実名寄り事例の「閲覧制限」表示と同型・doc95 の前例）。
- より狭い代替案: EXECUTIVE_ADMIN_ONLY（OWNER/EXECUTIVE/ADMIN のみ）——§0 候補で人間決定。

## 9. knowledge:update と label許可ロールの交差条件

`hasPermission(user, 'knowledge', 'update') && canAccessLabel(user.roles, label) && isHumanUser(user)` を Pain 閲覧の標準式として固定する（実装時）。**ラベル（canAccessLabel）だけに頼らない**のが本設計の要点——既存ロール表を変えずに（NO_RBAC_CHANGE / NO_LABEL_DEFINITION_CHANGE）、AI ロールと閲覧専用ロールを画面側で確実に除外できる。

## 10. writeDataAccess 設計候補（閲覧の記録）

- **高機密行の詳細閲覧のたびに writeDataAccess を1件記録**（accessType='view'・entityType='CustomerPain'・entityId・label・actorId。**本文・PII は記録に入れない**）。
- 一覧のプレースホルダ表示は記録対象外（内容が見えないため）・詳細表示のみ記録。既存の使用実績（leadmap 分析等9箇所）と同じ helper（lib/db.ts）を流用し、新規機構は作らない。
- 参照ログの閲覧自体は既存の `/admin/data-access-logs` 系の運用に乗せる（AI の ai_reference と同じ台帳思想）。

## 11. writeAudit 設計候補（書き込みの記録）

- create / update / archive の3操作（物理削除禁止・Company Brain 4テーブルと同型）で **writeAudit 必須**。summary に本文・PII・顧客名を入れない（CaseStudyConsent の「audit に証跡本文を入れない」前例を踏襲）。
- ラベル変更（例: INTERNAL→CUSTOMER_CONFIDENTIAL）は独立した audit イベントとして記録する候補。

## 12. PII / 顧客名 / 担当者名 / 実顧客データの扱い

- **今は保存しない**（PROHIBIT_BODY_PII_AND_REAL_CUSTOMER_DATA_NOW・設計〜実装〜本番確認が終わるまで実顧客データ投入なし）。
- 将来も **本文への PII・顧客名・担当者名の複製は禁止方向**（登録画面のガイド文言＋機械検査の設計を実装時に行う。CaseStudyConsent の証跡ガイドと同型）。

## 13. Customer マスタ参照と本文への複製禁止方針

- 顧客との紐づけは **customerId 参照のみ**（CUSTOMER_ID_REFERENCE_ONLY_LATER）。表示時も Customer マスタを join した PII 表示はしない（doc95 の `prisma.customer` 禁止検査を Pain 画面にも拡張する候補・§17）。

## 14. AI参照との関係

- **AIに読ませない**（PROHIBIT_AI_REFERENCE）: company-brain-reference に CustomerPain を追加しない。**company-brain-reference 変更なし・AI参照条件変更なし**（AIが読むのは匿名化済み CaseStudy のみ・doc98 決定のまま）・**CaseStudyConsent は AI 文脈へ注入しない**も不変。
- labels.ts 上は AI_AGENT が CUSTOMER_CONFIDENTIAL を許可されているが、**AI参照はラベルではなく参照層（company-brain-reference）で遮断**されており、Pain を参照層に追加しない限り AI には一切渡らない。この「追加しないこと」を安全ゲートで機械検査する（§17）。

## 15. 公開活用との関係

- **公開しない**（PROHIBIT_PUBLIC_USE・doc100 の関門思想と同じ）。**外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。失注理由・クレームの二次利用（提案書転記等）も個別判断（doc101 §10 継承）。

## 16.（§8〜15 の統合）実装時の最小構成イメージ

閲覧3条件 AND＋一覧プレースホルダ＋詳細で writeDataAccess＋3操作 writeAudit＋customerId 参照のみ＋AI参照層への非追加＋公開系なし——を「Company Brain 高機密型」の標準テンプレートとして固定し、将来の HR/LEGAL 系にも再利用する。

## 17. 安全ゲート設計候補（後退の機械検知）

実装時に scripts/check-company-brain-safety.mjs へ追加する検査の候補:
1. **AI 非注入**: company-brain-reference に `CustomerPain`/`customerPain.findMany` が現れたら FAIL。
2. **交差条件の維持**: Pain 閲覧コードに `isHumanUser`・`canAccessLabel`・`hasPermission` の3点が揃わなければ FAIL。
3. **参照ログの維持**: Pain 詳細表示コードに `writeDataAccess` が無ければ FAIL。
4. **PII join 禁止**: Pain の画面（表示層）が `prisma.customer` を参照したら FAIL（doc95 検査の拡張）。
5. **物理削除禁止・externalAiAllowed/publishStatus UI なし**（既存検査の対象拡大）。

## 18. 否定系テスト候補（NEGATIVE_TESTS_REQUIRED_BEFORE_ENABLEMENT）

①AIロール（AI_AGENT/AI_ASSISTANT）で詳細閲覧 → 拒否 ②knowledge:read のみ（update なし）→ 拒否 ③ラベル許可外ロール → 拒否 ④3条件を満たす人 → 閲覧でき writeDataAccess が1件残る ⑤本文に PII/顧客名パターン → 入力検証で拒否（設計時に精査）⑥公開系 UI 不在 ⑦AI参照層に CustomerPain 不在。

## 19. 実装前の承認ゲート

**実装に進む前に必ず**: ①本設計（doc103）の push ②Data Classification の §0 人間決定（§20）③（解禁を含む場合）**高機密ラベル解禁の個別人間承認**（重い判断・doc39/doc70 以来の位置づけ）④実装承認（schema→read-only→書き込みの各段個別承認・実データはさらに後）。

## 20. 次回 §0 人間決定候補（今回は決定しない・推奨はすべて安全側）

```
DATA_CLASSIFICATION_POLICY: 【CUSTOMER_CONFIDENTIAL_DEFAULT / STRICT_SECRET_FOR_EXTREME_CASES / OTHER】（推奨: CUSTOMER_CONFIDENTIAL_DEFAULT・極端例の STRICT_SECRET 例外は運用で個別判断）
LABEL_ENABLEMENT_POLICY: 【DESIGN_ONLY_NOW / ENABLE_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DESIGN_ONLY_NOW）
VIEW_PERMISSION_POLICY: 【KNOWLEDGE_UPDATE_AND_LABEL_ALLOWED_ROLE / EXECUTIVE_ADMIN_ONLY / OTHER】（推奨: KNOWLEDGE_UPDATE_AND_LABEL_ALLOWED_ROLE＋AIロール除外の3条件 AND）
ACCESS_LOG_POLICY: 【WRITE_DATA_ACCESS_REQUIRED / DESIGN_LATER / OTHER】（推奨: WRITE_DATA_ACCESS_REQUIRED）
WRITE_AUDIT_POLICY: 【WRITE_AUDIT_REQUIRED / DESIGN_LATER / OTHER】（推奨: WRITE_AUDIT_REQUIRED）
PII_POLICY: 【PROHIBIT_BODY_PII / ALLOW_REFERENCED_CUSTOMER_ID_ONLY_LATER / OTHER】（推奨: PROHIBIT_BODY_PII）
CUSTOMER_REFERENCE_POLICY: 【CUSTOMER_ID_REFERENCE_ONLY / PROHIBIT_CUSTOMER_REFERENCE_NOW / OTHER】（推奨: CUSTOMER_ID_REFERENCE_ONLY）
AI_REFERENCE_POLICY: 【PROHIBIT_AI_REFERENCE / ANONYMIZED_SUMMARY_ONLY_LATER / OTHER】（推奨: PROHIBIT_AI_REFERENCE）
PUBLIC_USE_POLICY: 【PROHIBIT_PUBLIC_USE / DESIGN_LATER / OTHER】（推奨: PROHIBIT_PUBLIC_USE）
SAFETY_GATE_POLICY: 【REQUIRED_BEFORE_IMPLEMENTATION / DESIGN_LATER / OTHER】（推奨: REQUIRED_BEFORE_IMPLEMENTATION）
TEST_POLICY: 【NEGATIVE_TESTS_REQUIRED_BEFORE_IMPLEMENTATION / DESIGN_LATER / OTHER】（推奨: NEGATIVE_TESTS_REQUIRED_BEFORE_IMPLEMENTATION）
IMPLEMENTATION_POLICY: 【DOCS_ONLY_NOW / IMPLEMENT_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DOCS_ONLY_NOW）
```

## 21. 段階案（各段個別承認）

1. **doc103 設計（今回・docs-only）** ✅ → 2. §0 人間決定（§20）→ 3. **高機密ラベル解禁の個別人間承認**（重い判断）→ 4. 高機密対応の最小実装（交差条件・writeDataAccess・ゲート・否定系テスト・実データなし）→ 5. 本番確認（利用者実測）→ 6. Customer Pain schema 設計→追加（別承認）→ 7. read-only → 8. 人間書き込み（各段本番確認）→ 9. 実顧客データ投入判断（運用整備・別承認）。

## 22. 今回やらなかったこと

- **Customer Pain 実装なし・Data Classification 実装なし・高機密ラベル実装/解禁なし**（**高機密ラベル解禁は未実施・Customer Pain 実装は未着手**）。
- **DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし**・apps/packages/scripts 変更なし・**company-brain-reference 変更なし**・writeDataAccess/writeAudit の実装なし（設計のみ）。
- **AI参照条件変更なし・AIに読ませない**維持・**CaseStudyConsent は AI 文脈へ注入しない**維持・**外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**・ApprovalRequest 接続なし。
- **PII・顧客名・担当者名・実顧客データの保存なし**・**外部送信なし・実LLMなし・AIコストなし**・本番確認なし・本番DB接続なし・本番deployなし・doc14 追記なし・push なし。

## 23〜27. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「CUSTOMER_CONFIDENTIAL の許可ロールに AI_AGENT/STAFF が含まれる」→ labels.ts 実測（本設計の中心論点の根拠）②「writeDataAccess は既存資産」→ lib/db.ts＋9箇所の使用実測 ③「Pain 未実装」→ grep 0件 ④「AI/公開の封印維持」→ 注入0・封印UI 0/0・公開系 tsx 0 ⑤「方針の親決定」→ doc102（9項目）・doc101・doc70/doc39。
**Assumption Log**: ①交差条件（3条件 AND）は既存の hasPermission/canAccessLabel/isHumanUser の組み合わせだけで実装でき、**RBAC・label 定義の変更は不要**（実装時に確定）②writeDataAccess helper は Pain にそのまま流用可能 ③FakeLLM 継続。
**Unknowns Log**: ①§0 の12決定（人間）②STRICT_SECRET 例外運用の具体基準（極端な機微の線引き）③本文 PII の機械検査の精度設計（誤検知とのバランス・実装時）④高機密ラベル解禁の承認範囲・時期（個別人間承認）。
**Risk Register**: 最大=「ラベルを付ければ守られている」という誤解（実際は許可ロールが広く AI まで含む）→ §7/§9 の交差条件必須で遮断・本書の中心論点として明文化。次点=設計と実装の乖離 → §17 の安全ゲート・§18 の否定系テストを実装の受け入れ条件（§19）に固定。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（ラベル現況・writeDataAccess 資産・Pain 未実装・封印維持）✅／分類表・既定候補の根拠・解禁しない理由・閲覧3条件・参照/書込ログ設計・PII/顧客名方針・AI/公開との関係・ゲート5種・否定系テスト7種・承認ゲート・§0 候補12項目・段階9案 ✅／doc103 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 28. 次回推奨プロンプト案

> ①**doc103 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **Data Classification / 高機密ラベル運用の §0 人間決定**（§20 の12項目・解禁ではなく解禁前提条件の決定）→ **高機密ラベル解禁の個別人間承認**（重い判断）→ 最小実装承認。③並行選択肢: CI・Test・Release Governance 等の品質基盤強化／Stage 2・3・★2・UX。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別人間承認なしに進まない。

## 29. 判定

**判定: READY / GO**（**Data Classification / 高機密ラベル運用設計は完了**。ただし**高機密ラベル解禁は未実施・Customer Pain 実装は未着手**・DB / schema / migration 変更なし・**AI参照条件変更なし**・公開活用なし）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
