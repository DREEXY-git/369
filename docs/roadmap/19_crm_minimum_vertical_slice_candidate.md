---
doc: roadmap/19
title: CRM最小縦切り 実装可否判断 Candidate（Lead-only / Lead+Deal / Lead+Deal+Pipeline 3案比較）
status: Candidate
area: roadmap/crm-minimum-vertical-slice
phase: 事業 Phase 2 Salesforce Mini / CRM基盤 / AI Workforce Infrastructure candidate
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md
  - docs/audit/117_crm_sfa_salesforce_lineage_candidate.md
  - docs/roadmap/17_embedded_saas_catalog_candidate.md
  - docs/audit/114_customer_pain_schema_design.md
---

# 19. CRM最小縦切り 実装可否判断 Candidate（3案比較）

> 種別: **docs-only / Candidate / commit-only**。**GitHubが正本**・**Obsidianは閲覧**。**369-vault は直接編集しない**。
> 状態: **Candidate**（Official ではない）。**実装・schema変更・migration・画面・Server Action・外部連携・OAuth・外部送信・実LLM・AIコスト・本番確認ではない**。
> 位置づけ: `docs/roadmap/18`（CRM/SFA/Salesforce Mini Lineage）を受け、**Phase 2 CRM/SFA の最初の実装範囲を決める前段の判断**を docs-only で記録する。

## 1. 目的

Phase 2（Salesforce Mini / CRM基盤）で最初に薄く通す縦切りを、**案A: Lead-only / 案B: Lead + Deal / 案C: Lead + Deal + Pipeline** の3案で比較し、**次に実装へ進めるか・進めるならどの範囲か**を docs-only で判断する。**今回は実装しない**。

## 2. 前提と現在地

- CRM/SFA Lineage は `docs/roadmap/18` で正本化済み（AI営業提案は下書きのみ・外部送信は Human Certification Gate・AI単独の契約/値引き/請求/送信は禁止）。
- SaaSカタログ（`docs/roadmap/17`）区分① の CRM/SFA/Salesforce Mini の最初の実装範囲を決める前段。
- Baseline Commit は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`**。Company Brain foundation（Phase 2-A）は本番確認まで完了済み。
- PII の扱いは `docs/audit/114`（Customer Pain schema設計・PII非保存）の考え方を継承。

## 3. 判断の観点（全案共通の安全前提）

- **tenantId 必須**・**RBAC**（`hasPermission`）判定・変更系は **writeAudit**・機密参照は **writeDataAccess**・**Data Classification**（NORMAL/INTERNAL/CONFIDENTIAL/CUSTOMER_CONFIDENTIAL）。
- **Human Certification Gate**: 外部送信/契約/値引き/請求/送金/採用確定/会計確定は人間承認必須（今回いずれも実装しない）。
- **Consent Gate**: 顧客メール/LINE/DM/紹介/導入事例/成果数値公開/個人情報外部送信は同意確認必須（今回外部送信なし）。
- **Security Gate**: PII 非注入（company-brain-reference に顧客PIIを入れない）。**Contact PII を初期範囲に含める場合は停止条件**。
- 物理削除なし・**archivedAt ソフトアーカイブ**前提。AIは下書き・提案のみ。

## 4. 案A: Lead-only 最小縦切り

- **目的**: LeadMap AI 由来のリードを最小CRUDで管理し、tenantId/RBAC/writeAudit の薄い縦切りに集中する。営業デモに使える最小形。
- **入れるデータ**: tenantId / リード表示名（会社名・拠点名レベル）/ source / placeId / fetchedAt / expiresAt / status（新規・確認中・見込み・除外）/ 担当 userId 参照 / メモ（社内向け・PII非依存）/ archivedAt。
- **入れないデータ**: Contact の氏名・電話・メール・住所などの **PII**、商談金額、確度、パイプライン、生クレーム全文、外部公開フラグ、externalAiAllowed。
- **schema要否**: 最終的に Lead テーブル1つが必要になり得るが、**今回は決めない（schema変更なし・migrationなし）**。設計方向のみ。
- **migration要否**: 実装時に1本。今回は不要。
- **PIIリスク**: 最小（会社名レベルに留めれば CUSTOMER_CONFIDENTIAL を避けられる）。
- **tenantId / RBAC / writeAudit / writeDataAccess**: tenantId 必須・`crm:read`/`crm:update` 相当は既存 knowledge 権限で代替検討・create/update/archive は writeAudit・PII を持たなければ writeDataAccess は限定的。
- **Human Certification Gate**: リード段階では外部作用なし（送信は後続）。将来の外部送信接続点を記録するのみ。
- **Consent Gate**: 外部送信しないため今回発動なし。
- **Security Gate**: PII を持たない設計なら NORMAL/INTERNAL に収まり、company-brain-reference 非注入を維持しやすい。
- **Company Brain接続可否**: read-only 参照（Sales Playbook/会社方針）は可。リード本文の Brain 投入はしない。
- **AI参照可否**: リード分析・優先度提案の**下書き**は可。ただし PII を渡さない。
- **外部送信可否**: 不可（今回スコープ外・Human Certification Gate）。
- **Phase対応**: 事業 Phase 2 の最小起点。PDF系 OS本体 Phase 2.5（初期MVP）に対応。
- **収益 / moat への接続**: 基本料に含む最小CRM。LeadMap AI × 帰属管理の運用実績（moat）に接続。
- **停止条件**: Contact PII を入れる必要が出た時点で停止（別承認）。schema/migration が必要になった時点で停止。

## 5. 案B: Lead + Deal 最小縦切り

- **目的**: リードに加え商談（Deal）を持ち、金額・確度・フェーズで営業進捗を管理する。
- **入れるデータ**: 案A ＋ Deal（tenantId / 紐づく Lead参照 / 商談名 / 金額 / 確度 / フェーズ / 想定クローズ日 / 担当 userId / archivedAt）。
- **入れないデータ**: Contact PII、パイプラインのステージ遷移履歴、見積/契約/請求の本体、値引き確定。
- **schema要否**: Lead ＋ Deal の2テーブル方向。**今回は決めない**。
- **migration要否**: 実装時に1〜2本。今回は不要。
- **PIIリスク**: 中（Deal に顧客担当者名を入れたくなる誘惑 → 明示的に禁止し userId 参照に留める）。
- **tenantId / RBAC / writeAudit / writeDataAccess**: 案A同様＋Deal の金額変更は writeAudit。金額は機密扱い（INTERNAL）。
- **Human Certification Gate**: 値引き・見積提示・契約は承認必須（今回実装しない・接続点記録）。
- **Consent Gate**: 外部送信しないため今回発動なし。
- **Security Gate**: 金額は INTERNAL・PII非注入維持。
- **Company Brain接続可否**: read-only（Playbook）。Deal 本文の Brain 投入はしない。
- **AI参照可否**: 次アクション提案・確度示唆の下書きは可（PIIなし）。
- **外部送信可否**: 不可。
- **Phase対応**: 事業 Phase 2 の中核。PDF系 Phase 2.5〜4。
- **収益 / moat への接続**: 商談〜請求 handoff（CPQ/会計）へのアップセル導線。
- **停止条件**: PII保存・見積/契約/請求への実接続・値引き確定が必要になった時点で停止。

## 6. 案C: Lead + Deal + Pipeline まで

- **目的**: 商談をパイプライン（ステージ遷移）で可視化し、売上予測の土台を作る。
- **入れるデータ**: 案B ＋ Pipeline（ステージ定義 / ステージ遷移 / 活動・タスク・メモの一部）。
- **入れないデータ**: Contact PII、Customer 360 の全集約、外部連携、通話録。
- **schema要否**: Lead ＋ Deal ＋ Pipeline/Stage/Activity の複数テーブル方向。**今回は決めない**。
- **migration要否**: 実装時に複数本。今回は不要。
- **PIIリスク**: 中〜高（活動履歴に顧客担当者名・連絡先を書きたくなる → 明示禁止と設計ガードが必要）。
- **tenantId / RBAC / writeAudit / writeDataAccess**: 案B＋ステージ遷移・活動記録の writeAudit。活動に顧客情報を含める場合は writeDataAccess 必須。
- **Human Certification Gate**: 案B同様＋一括処理の承認境界。
- **Consent Gate**: 外部送信しないため今回発動なし。
- **Security Gate**: 活動履歴に PII が混入しやすく、**Security Gate の負荷が最大**。
- **Company Brain接続可否**: read-only（Playbook）。
- **AI参照可否**: パイプライン分析・失注理由の傾向示唆の下書きは可（PIIなし・生テキスト非保存）。
- **外部送信可否**: 不可。
- **Phase対応**: 事業 Phase 2 の上限。PDF系 Phase 4〜5。
- **収益 / moat への接続**: 売上予測 → 経営計画（Oracle Mini/ERP handoff）へ接続。
- **停止条件**: PII保存・活動履歴の顧客情報・schema複数テーブル・migration複数本が必要になった時点で停止（別の重い承認）。

## 7. 3案比較サマリー

| 観点 | 案A Lead-only | 案B Lead+Deal | 案C +Pipeline |
|---|---|---|---|
| 実装重量 | 最小 | 中 | 大 |
| schema規模 | 1 | 2 | 複数 |
| PIIリスク | 最小 | 中 | 中〜高 |
| Security Gate負荷 | 低 | 中 | 高 |
| 営業デモ価値 | 中 | 高 | 高 |
| 過剰設計リスク | 低 | 中 | 高 |
| 次段への停止条件設計 | 容易 | 中 | 難 |

## 8. 推奨案

**推奨: 案A（Lead-only）を次の実装可否判断の起点とする。ただし本書は docs-only 判断であり、案Aの実装も別承認。**

理由:
- Contact PII を最小化でき、Security Gate の負荷が最も低い。
- Deal / Pipeline の過剰設計を避け、tenantId / RBAC / writeAudit の薄い縦切りに集中できる。
- 外部送信なしで営業デモに使える可能性がある。
- 案B（Lead+Deal）へ進む停止条件を設計しやすい（金額・確度を足す前に Lead の運用実績を得る）。
- 「薄い縦切り優先」の実装ルール（CLAUDE.md）に最も合致。

**次段の順序（案）**: 案A（Lead-only・docs-only設計 → 実装可否は別承認）→ 停止条件クリア後に案B（Lead+Deal）→ さらに別承認で案C（Pipeline）。

## 9. Complete Function Coverage Matrix（50カテゴリ・短縮）

- **直接対象**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接対象**: C01 Core OS、C03 Permission/Approval/Audit、C04 AI Governance、C05 AI Safety、C06 Data Governance、C07 Company Brain、C10 Quote、C11 Contract、C12 Invoice、C15 ERP、C18 Growth、C20 SNS/Email、C26 CS、C28 BI、C30 AI Employee、C33 Developer Platform、C34 Integration Hub、C37 Trust Center、C38 Consent/Privacy、C39 Security、C48 Risk。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止 / Future隔離**: C45 Physical AI/IoT/Robotics。
- **不明**: なし（本判断時点）。

## 10. Phase対応（4軸）

- **事業ロードマップ Phase 0-20**: 主対象 **Phase 2 Salesforce Mini / CRM基盤**。前提 Phase 0 Core OS / Phase 1 Company Brain。隣接 Phase 3/4/5/12/13/14/19。
- **PDF系 OS本体 Phase 2.5-18**: 案A=Phase 2.5（初期MVP）、案B=Phase 2.5〜4（Brain拡充）、案C=Phase 4〜5（AI社員テンプレ化）。Phase 7 Fit-Gap Engine は外部移行時。
- **戦略構想 Phase 18.5-26**: Phase 20/22/23/24/26 は将来接続（今回対象外）。
- **Complete Ledger R0-R14**: **R4 Commercial Core + R0 Governance Docs** が中心。R1/R2/R3/R7/R8/R9/R11/R12 は間接。

## 11. 369独自差別化5本柱との接続

- **Human Certification Gate 全社共通化**: CRM の外部送信/値引き/契約は将来この Gate に接続（今回実装しない）。
- **Business Event Ledger 全社展開**: リード作成/商談更新/ステージ遷移は将来 Business Event として記録する接続点（今回実装しない・writeAudit を土台に想定）。
- AI社員の免許制度 / 給与明細 / AI社員派遣所: CRM の営業AI社員が将来接続する候補（今回対象外）。

## 12. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `f2a9a3d481ef7addb485475e72c4cf93825c0cfc`・working tree clean・`origin/main..HEAD` 空・doc118未存在）。
- 上位 Lineage: `docs/roadmap/18`・`docs/audit/117`（実測・存在）。
- PII 設計継承: `docs/audit/114`（入れてはいけない列）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` 空（実測）。

## 13. Assumption Log

- 本書は Candidate・docs-only 判断であり、**推奨案A も含め実装は別承認**。
- 安全側の初期推奨（案A）を採用。Scout・既存docs確認の結果、案A が PII/Security Gate 負荷最小で「薄い縦切り優先」に合致するため方針どおりとした。
- 金額・確度は INTERNAL、Contact PII は初期範囲に**入れない**方針。
- 369-vault は未編集。docs/10_obsidian は入口1行の最小追記のみ。

## 14. Unknowns Log

- 案A Lead テーブルの正確な列と `crm:*` 権限を新設するか既存 knowledge 権限で代替するか。
- Lead の status enum の値と遷移。
- 案B へ進む具体的な停止条件クリア基準（Lead の何をもって「運用実績」とするか）。
- Contact PII を保存する時期と CUSTOMER_CONFIDENTIAL runtime 解禁の境界（`docs/audit/112` 停止条件）。
- Business Event Ledger の記録形式（将来）。

## 15. Risk Register

- 案を実装済みと誤読するリスク → 全案に「今回は実装しない・別承認」を明記。
- 過剰設計リスク（案C 先行）→ 案A 推奨・段階的停止条件を明記。
- PII 混入リスク（特に案C 活動履歴）→ Contact PII 非保存・停止条件・Security Gate を明記。
- schema/migration を今回決めてしまうリスク → 「今回は決めない（schema変更なし・migrationなし）」を明記。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみを明記。
- 外部送信の暴発リスク → 外部送信なし・Human Certification Gate・Consent Gate を明記。

## 16. Definition of Done

- [x] 案A/B/C を目的・入れる/入れないデータ・schema要否・migration要否・PIIリスク・tenantId/RBAC/writeAudit/writeDataAccess・各Gate・Company Brain接続・AI参照・外部送信・Phase・収益/moat・停止条件で比較。
- [x] 推奨案（案A）を1つ提示し理由を記載。
- [x] 50カテゴリの扱い・4軸Phase・5本柱接続を記録。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認なし（docs-only）。
- [x] safety script exit 0・369-vault非編集。

## 17. 次回推奨プロンプト案

1. **doc118 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **案A Lead-only 実装可否の最小設計 docs-only**（Lead テーブル候補列・status enum・`crm:*` 権限要否・schema要否は決めるが migration はまだ・別の重い承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 18. 判定

**判定: READY / GO**（CRM最小縦切りの3案比較と推奨案A を docs-only で記録した）。

ただし、これは実装の決定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**画面/Server Action なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
