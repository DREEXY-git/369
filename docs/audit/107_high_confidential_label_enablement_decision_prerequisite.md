# 107. 高機密ラベル実装・解禁 可否判断 前提整理 — Customer Pain 実装前の重い人間判断に向けた整理（docs-only・判定 READY / GO）

- Audit Doc: 107
- Product Phase: Data Classification / Security Governance（Customer Pain 実装前の解禁可否判断）
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Enablement Decision Prerequisite（解禁可否判断の前提整理）
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `a0baf70b62eeed1cb45e8646db3ea73fc8ec3231`（doc106・push済み）
- Scope: 高機密ラベル実装・解禁の可否判断に必要な前提、選択肢、停止条件、Phase / Lineage の整理
- Not Included: 実装・高機密ラベル解禁・Customer Pain 実装・schema変更・migration・RBAC変更・label定義変更・AI参照条件変更・company-brain-reference変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc107 push-only（別承認）→ 高機密ラベル解禁可否の §0 人間決定
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain 実装 / schema変更 / migration / RBAC変更 / label定義変更 / AI参照条件変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- 今回は、「高機密ラベルを**使い始めてよいか（解禁してよいか）**」という重い判断に入る前に、**判断材料を並べて整理するだけ**の回です。
- **これは解禁ではありません**。**Customer Pain も作りません**。コードは1行も変わっていません。
- 決めるのは人間です。この文書は「どの選択肢があり、それぞれ何が起きるか、まだ何をしてはいけないか」を、非エンジニアにも分かる形で GitHub 正本に残します。

## 2. 結論

- 高機密ラベル（CUSTOMER_CONFIDENTIAL）の解禁は、doc105 で守り方の詳細設計が済んでいるため「判断できる状態」にはある。
- ただし**今回は解禁しない**（**解禁ではない**）。推奨は **案A（まだ解禁せず、次は最小実装設計 docs-only に進む）**。
- **高機密ラベル解禁なし**・**Customer Pain 実装なし**・**Data Classification 実装なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference 変更なし**・**PII保存なし**・**実顧客データ保存なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**。

## 3. 現在地

- HEAD = origin/main = origin/feature = `a0baf70b62eeed1cb45e8646db3ea73fc8ec3231`（doc106・push 済み・clean・未push 0）。
- read-only 監査で封印を実測: Customer Pain 実装 0件・AI 文脈への CaseStudyConsent 注入 0・`anonymized: true` 条件 2・externalAiAllowed UI 0・publishStatus UI 0・公開系 tsx 0。
- 高機密ラベル定義は既存のまま（schema 2・labels.ts 2）。**label定義変更なし**（今回も確認のみ）。
- Baseline Commit は CaseStudyConsent anonymized=false 本格扱い / `611e51e` のまま。

## 4. doc106 に基づく番号体系・Lineage上の位置

- doc106 の Phase番号体系・Lineage整理に従い、本書は以下に位置づく。
  - Audit Doc: 107（時系列証拠番号）
  - Product Phase: Data Classification / Security Governance
  - Lineage: Data Classification / High Confidential Label Lineage（doc103 設計 → doc104 §0決定 → doc105 詳細設計 → **doc107 解禁可否判断の前提整理**）
  - Stage: Enablement Decision Prerequisite
- doc106 のルールどおり、**既存docsは改名しない**・**HOLD記録削除なし**・**docs/10_obsidian と 369-vault の関係は別承認**。

## 5. doc105 に基づく解禁前提

doc105（Customer Pain 高機密ラベル運用 詳細設計）で確定済みの守り方が、解禁の前提として揃っている:

- **標準閲覧式** = `tenantId` × `knowledge:update` × label許可ロール（`canAccessLabel`）× **AIロール除外**（`isHumanUser`）× archivedAt null × writeDataAccess 記録可能 の AND 交差。
- 閲覧のたび **writeDataAccess** を記録（本文・PII を記録に入れない）。書き込みは **writeAudit** 必須。
- **安全ゲート**候補14種・**否定系テスト**候補15種・実装時の事前停止条件16項目。

→ 「守り方の設計」は揃っているが、**設計と実装は別**。解禁とは、この設計を実際に稼働させる判断であり、実装・テスト・本番確認を伴う。

## 6. 高機密ラベル解禁とは何を意味するか

「高機密ラベル解禁」は、次のいずれか（またはすべて）を実際に動かし始めることを意味する:

- CUSTOMER_CONFIDENTIAL を Customer Pain 等の実データに**実際に付与して運用する**。
- 標準閲覧式（5層 AND）を**実コードで判定**し、非許可者に本文を出さない実装を稼働させる。
- writeDataAccess / writeAudit を**実際に記録**する。
- そのための schema / 画面 / Server Action / 安全ゲート / 否定系テストを**実装する**。

いずれも本番に影響するため、**個別の重い人間承認**を要する。今回はその**前段の整理のみ**。

## 7. まだ解禁してはいけない理由

- **実装がまだ**: 標準閲覧式・記録・ゲート・テストは設計（doc105）のみで、実コードは存在しない（Customer Pain 実装 0件を実測）。
- **schema がまだ**: Customer Pain のテーブル形状は未設計（NO_SCHEMA_CHANGE のまま）。器がない状態で解禁しても運用できない。
- **否定系テストがまだ**: doc105 §18 の否定系テストが実装・green になる前に解禁すると、守りの後退を検知できない。
- **本番確認がまだ**: 解禁は本番確認まで含む重い工程。順序を飛ばすと安全性を実証できない。
- **可逆性の担保**: 一度実データに高機密を入れると後戻りが難しい。設計→実装→テスト→本番確認の順を守る。

## 8. 解禁可否の選択肢（最低3案）

### 案A: DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN（推奨）
- **まだ解禁しない**。次は高機密ラベル運用の**最小実装設計 docs-only**（doc105 §19 の事前停止条件の判定から）に進む。
- 実データも高機密ラベル運用も稼働させない。**今回も実装しない**。
- 長所: 順序を守り可逆性を保つ。判断を最小の追加リスクで前進させられる。
- 短所: 稼働までの段数が多い（ただし安全性と引き換え）。

### 案B: ENABLE_NARROW_SCOPE_AFTER_SEPARATE_APPROVAL
- 対象ラベル（CUSTOMER_CONFIDENTIAL のみ）・対象画面・対象テーブルを**限定**して、**別承認後**に最小実装へ進む。
- **ただし今回ではない**（本書での決定でもない）。別途 §0 人間決定と解禁承認が必要。
- 長所: 前進が早い。短所: 実装・テスト・本番確認の負荷が先行し、順序管理を誤ると露出リスク。

### 案C: DO_NOT_ENABLE_AND_PRIORITIZE_QUALITY_FOUNDATION
- 高機密ラベル解禁判断を**保留**し、CI / Test / Release Governance など**品質基盤を優先**する。
- 長所: 全機能の土台が固まる。短所: Customer Pain ラインの前進は止まる（保留）。

## 9. 推奨案

- **推奨: 案A（DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）**。
- doc105 で守り方が揃った直後の自然な次段は「最小実装設計 docs-only」であり、解禁・実装よりリスクが低く、可逆性を保てる。
- ただし**案Aでも今回は実装しない**（DOCS_ONLY_NOW）。案Aは「次にやること」を最小実装設計に向けるだけで、本書では解禁も実装も行わない。

## 10. §0 人間決定候補

```
HIGH_CONFIDENTIAL_ENABLEMENT_POLICY: 【DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN / ENABLE_NARROW_SCOPE_AFTER_SEPARATE_APPROVAL / DO_NOT_ENABLE_AND_PRIORITIZE_QUALITY_FOUNDATION / OTHER】（推奨: DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN）
ENABLEMENT_SCOPE_POLICY: 【NO_RUNTIME_ENABLEMENT_NOW / NARROW_CUSTOMER_PAIN_ONLY_LATER / OTHER】（推奨: NO_RUNTIME_ENABLEMENT_NOW）
LABEL_POLICY: 【CUSTOMER_CONFIDENTIAL_ONLY_LATER / STRICT_SECRET_EXCEPTION_DESIGN_LATER / OTHER】（推奨: CUSTOMER_CONFIDENTIAL_ONLY_LATER）
VIEW_POLICY: 【TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY / OTHER】（推奨: TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY）
ACCESS_LOG_POLICY: 【WRITE_DATA_ACCESS_REQUIRED_LATER / OTHER】（推奨: WRITE_DATA_ACCESS_REQUIRED_LATER）
WRITE_AUDIT_POLICY: 【WRITE_AUDIT_REQUIRED_LATER / OTHER】（推奨: WRITE_AUDIT_REQUIRED_LATER）
PII_POLICY: 【PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW / OTHER】（推奨: PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW）
AI_REFERENCE_POLICY: 【PROHIBIT_AI_REFERENCE / OTHER】（推奨: PROHIBIT_AI_REFERENCE）
PUBLIC_USE_POLICY: 【PROHIBIT_PUBLIC_USE / OTHER】（推奨: PROHIBIT_PUBLIC_USE）
IMPLEMENTATION_POLICY: 【DOCS_ONLY_NOW / MIN_IMPL_DESIGN_AFTER_SEPARATE_APPROVAL / OTHER】（推奨: DOCS_ONLY_NOW）
```

## 11. 解禁する場合の最小範囲の考え方

仮に将来 案B（解禁）を選ぶ場合でも、最小範囲は以下に限定する:

- **対象ラベル**: CUSTOMER_CONFIDENTIAL のみ（STRICT_SECRET 等の例外は別設計）。
- **対象テーブル**: Customer Pain のみ（他 Lineage には波及させない）。
- **対象画面**: Customer Pain の一覧（プレースホルダのみ）と詳細（許可者のみ）に限定。
- **閲覧式**: doc105 の標準閲覧式（tenantId × knowledge:update × label許可ロール × AIロール除外 × archivedAt null × writeDataAccess 記録可能）を必須。
- **記録**: writeDataAccess / writeAudit を最初から必須。安全ゲート・否定系テストを実装と同時に導入。
- **PII・実顧客データ**: それでも今は投入しない（架空データで検証）。

## 12. 解禁しない場合の次善策

- **案A採用時**: 高機密ラベル運用の**最小実装設計 docs-only**（doc108 候補）に進む。事前停止条件（schema / RBAC / label定義変更の要否）を最初に判定。
- **案C採用時**: CI / Test / Release Governance 等の品質基盤強化を優先し、Customer Pain ラインは保留（証拠として保持・削除しない）。
- いずれも解禁・実装なし。

## 13. 実装前の停止条件（将来の実装ミッションで該当したら停止）

- schema変更が必要 / migrationが必要 / RBAC変更が必要 / label定義変更が必要
- 高機密ラベルを実際に使い始める（解禁）
- Customer Pain の実データを保存する / PII を保存する / 顧客名・担当者名を保存する
- company-brain-reference を変更する / AI参照条件を変更する / 公開機能に触る
- externalAiAllowed / publishStatus UI を追加する
- 本番確認が必要 / 本番DBに触る / 外部送信が発生する / 実LLM・AIコストが発生する

## 14. 今回やらなかったこと

- 今回は**解禁ではない**・**高機密ラベル解禁なし**・**Customer Pain 実装なし**・**Data Classification 実装なし**
- **DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**
- **AI参照条件変更なし**・**company-brain-reference 変更なし**
- **PII保存なし**・**実顧客データ保存なし**
- **AIに読ませない**（AI参照条件変更なし）・**外部公開なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**
- **docs/10_obsidian と 369-vault の関係は別承認**（今回確定しない）・**既存docsは改名しない**・**HOLD記録削除なし**・push なし

## 15. Evidence Map

- 現在地の根拠: Scout 実測（HEAD=origin/main=origin/feature=`a0baf70b62eeed1cb45e8646db3ea73fc8ec3231`・clean・main..HEAD 空）。
- 解禁前提が揃っている根拠: doc105 の read-only 監査（標準閲覧式 7・writeDataAccess 12・安全ゲート 10・否定系テスト 6 等をカウント確認）。
- 封印維持の根拠: Customer Pain 実装 0・AI注入 0・anonymized:true 2・externalAiAllowed/publishStatus UI 0・公開系 tsx 0・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）。
- 番号体系の根拠: doc106（Audit Doc / Product Phase / Lineage / Stage の分離）。

## 16. Assumption Log

- 「守り方の設計（doc105）が揃った直後の最小リスクの次段は最小実装設計 docs-only である」と仮定し、案Aを推奨。
- §0 決定は人間が行う前提で、本書は候補提示に留める（決定はしない）。
- 案B（解禁）を選ぶ場合でも、対象は CUSTOMER_CONFIDENTIAL × Customer Pain × 限定画面に絞るのが安全と仮定。

## 17. Unknowns Log

- 高機密ラベル解禁可否の §0 人間決定の結論（人間判断待ち）。
- Customer Pain のスキーマ形状（未設計・NO_SCHEMA_CHANGE のまま）。
- 品質基盤（CI / Test / Release Governance）と Customer Pain ラインの優先順位（人間判断）。

## 18. Risk Register

- 順序を飛ばして解禁すると、否定系テスト・本番確認前に実データが露出するリスク → 案A（設計先行）と停止条件（§13）で防ぐ。
- 解禁範囲を広げすぎると他 Lineage へ波及するリスク → §11 で CUSTOMER_CONFIDENTIAL × Customer Pain × 限定画面に限定。
- 判断を先送りしすぎると Customer Pain ラインが停滞するリスク → 案A は最小実装設計へ前進する形で緩和。
- 未push commit の揮発リスク → 次の push-only（別承認）で解消。

## 19. Definition of Done

- [x] doc107 に解禁可否判断の前提・選択肢（3案）・§0候補・停止条件・Phase/Lineage/Stage を記録
- [x] 推奨案A（今回も実装しない）を明記
- [x] CURRENT_STATE / PROGRESS / vault ノート＋index の正本反映
- [x] 許可5ファイルのみで Gate 全 green
- [x] commit 1件作成・push なし・working tree clean で停止

## 20. 次回推奨プロンプト案

1. **doc107 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature→main・Gate＋17項目報告）。
2. **高機密ラベル解禁可否の §0 人間決定ミッション**（10項目の決定値を §0 に記入して送付。解禁する/しない/品質基盤優先）。
3. 決定が案A（解禁しない）なら「高機密ラベル運用 最小実装設計ミッション（docs-only・doc108 候補・事前停止条件から）」。案C なら「品質基盤強化ミッション」。

## 21. 判定

**判定: READY / GO**（解禁可否判断の前提整理は完了。ただし**今回は解禁ではない**——**高機密ラベル解禁なし**・**Customer Pain 実装なし**・**Data Classification 実装なし**・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・**AI参照条件変更なし**・**company-brain-reference 変更なし**・PII保存なし・実顧客データ保存なし・外部送信なし・実LLMなし・AIコストなし・本番確認なし・push なし）。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
