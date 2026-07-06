---
doc: roadmap/20
title: CRM Lead-only 最小設計 Candidate（実装前の最小設計・docs-only）
status: Candidate
area: roadmap/crm-lead-only-minimum-design
phase: 事業 Phase 2 Salesforce Mini / CRM基盤 / AI Workforce Infrastructure candidate
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/19_crm_minimum_vertical_slice_candidate.md
  - docs/audit/118_crm_minimum_vertical_slice_decision.md
  - docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md
  - docs/audit/114_customer_pain_schema_design.md
---

# 20. CRM Lead-only 最小設計 Candidate（docs-only）

> 種別: **docs-only / Candidate / commit-only**。**GitHubが正本**・**Obsidianは閲覧**。**369-vault は直接編集しない**。
> 状態: **Candidate**（Official ではない）。**実装・schema変更・migration・画面・Server Action・外部連携・OAuth・外部送信・実LLM・AIコスト・本番確認ではない**。
> 位置づけ: doc118（`docs/roadmap/19`）で推奨された **案A: Lead-only** を、次に本当に実装へ進めるか判断できる粒度まで最小設計する。

## 1. 目的

doc118 の推奨案A「Lead-only」を、**実装へ進む判断ができる粒度**の最小設計として docs-only で整理する。Lead テーブルの候補列・status enum・権限方針・監査/機密の扱い・停止条件を紙で固める。**今回は実装しない**。

## 2. 既存docsとの関係

- 直接の上位: `docs/roadmap/19` / `docs/audit/118`（CRM最小縦切り3案比較・推奨案A）。本書は案A の1段詳細。
- Lineage: `docs/roadmap/18`（CRM/SFA/Salesforce Mini）。PII設計継承: `docs/audit/114`（入れてはいけない列）。
- 上位概念: `docs/roadmap/09`（AI Workforce Infrastructure）。実装ルール: `CLAUDE.md`（薄い縦切り優先・全モデルに tenantId・変更系は writeAudit）。

## 3. Candidate / Official の区別

- 本書は **Candidate / docs-only**。**実装は別承認**。schema/migration/画面/Server Action は本書では決めない/作らない。
- Official 昇格・実装着手は、§31 停止条件をクリアした上での**別の重い人間承認**。

## 4. Lead-only の最小目的

- LeadMap AI 由来のリードを**最小CRUD**（作成・編集・アーカイブ）で管理する。
- **tenantId / RBAC / writeAudit の薄い縦切り**に集中し、Deal / Pipeline / Contact PII の過剰設計を避ける。
- 外部送信なしで**営業デモ**に使える最小形を目指す。

## 5. Lead 候補列（設計案・schema化はしない）

| 列候補 | 型の方向 | 意味 | 機密 |
|---|---|---|---|
| id | cuid/uuid | 主キー | — |
| tenantId | string | テナント分離（必須・スカラ） | — |
| displayName | string | リード表示名（**会社名・拠点名レベル**） | NORMAL/INTERNAL |
| source | enum/string | 取得元（demo / google / upload 等） | INTERNAL |
| placeId | string? | 地図由来ID（Google帰属管理） | INTERNAL |
| fetchedAt | datetime? | 取得日時 | INTERNAL |
| expiresAt | datetime? | 期限（Google由来の再確認） | INTERNAL |
| status | enum | リード状態（§9） | INTERNAL |
| assignedUserId | string? | 担当者（**userId 参照のみ**・個人名複製なし） | INTERNAL |
| internalNote | text? | 社内メモ（**PII非依存**・顧客個人情報を書かない） | INTERNAL |
| archivedAt | datetime? | ソフトアーカイブ（§10） | — |
| createdAt / updatedAt | datetime | 監査時刻 | — |
| createdByUserId / updatedByUserId | string | 操作者（userId 参照のみ） | INTERNAL |

> 注: これは**設計案**であり、Prisma schema 化・migration はしない（`schema変更なし`・`migrationなし`）。

## 6. 入れてよいデータ

- tenantId / 会社名・拠点名レベルの表示名 / source / placeId / fetchedAt / expiresAt / status / 担当 userId 参照 / 社内メモ（PII非依存）/ archivedAt / 監査時刻・操作者 userId。

## 7. 入れないデータ

- **Contact の氏名・電話・メール・住所などの PII**。
- 商談金額・確度・パイプライン・ステージ遷移・活動履歴本文（案B/案C の領域）。
- 生クレーム全文・失注理由生テキスト・通話録全文・外部公開フラグ・externalAiAllowed・publishStatus（`docs/audit/114` の「入れてはいけない列」継承）。
- customerId 参照（結合リスク・別承認）。

## 8. Contact PII を初期範囲に入れない理由

- **Security Gate 負荷の最小化**: PII を持たなければ CUSTOMER_CONFIDENTIAL / writeDataAccess の runtime 実装を待たずに薄い縦切りを通せる。
- **可逆性**: 後から Contact を別テーブルで足す方が、最初から PII を抱えるより安全（漏えい面が小さい）。
- **法令・同意**: PII 保存は Consent / Data Protection（C38）の要件が増える。初期は回避。
- **結論**: Contact PII が必要になった時点で**停止し別承認**（§31）。

## 9. status enum 候補

- `NEW`（新規）/ `REVIEWING`（確認中）/ `QUALIFIED`（見込み）/ `EXCLUDED`（除外）/ `ARCHIVED`（アーカイブ相当・archivedAt と併用可）。
- 遷移は一方向を基本とし、逆行は監査に残す（writeAudit）。enum 値・遷移の確定は実装着手時の別承認。

## 10. archivedAt ソフトアーカイブ方針

- **物理削除なし**。削除は `archivedAt` セットのソフトアーカイブのみ。
- 一覧は既定で `archivedAt: null` を表示。復元（restore）は別承認。

## 11. tenantId 必須方針

- 全レコードに**スカラ `tenantId`**（Tenant へのリレーションは張らない）。
- すべてのクエリは `tenantId` でスコープ（`CLAUDE.md` の実装ルール準拠）。

## 12. RBAC 方針

- 参照・作成・編集・アーカイブは `hasPermission` 判定を通す。
- **AIロールは mutation 不可**（`isHumanUser` 相当で人間専用化・rbac 定義は変更しない）。
- 具体的な action は §13 で比較。

## 13. crm:* 権限を新設するか、既存 knowledge 権限で代替するかの比較

| 観点 | 案i: 既存 `knowledge:*` で代替 | 案ii: `crm:*` を新設 |
|---|---|---|
| RBAC定義変更 | 不要（今回禁止事項に抵触しない） | 必要（別承認・今回はしない） |
| 責務の明確さ | 曖昧（knowledge と CRM が混在） | 明確（CRM 専用） |
| 実装速度 | 速い（薄い縦切り向き） | 遅い（rbac 拡張が前提） |
| 将来の分離 | 後で `crm:*` へ移行が必要 | 最初から分離 |
| 今回の推奨 | **暫定は案i（読み書き最小）を候補**。ただし本書では**確定しない** | 実装本格化時に案ii へ（別承認） |

> **本書では RBAC 定義を変更しない**。どちらにするかは実装着手時の別承認で決める（`RBAC変更` は今回禁止）。

## 14. writeAudit 対象

- Lead の**作成 / 編集 / アーカイブ / status 遷移 / 担当変更**は `writeAudit`（本文・PII をログに入れない）。

## 15. writeDataAccess が必要になる条件

- Lead-only（PII なし・INTERNAL まで）では **writeDataAccess は原則不要**。
- **Contact PII や CUSTOMER_CONFIDENTIAL を扱う段階に入った時点で writeDataAccess 必須**（＝その時点で本書の範囲を超えるので停止・別承認）。

## 16. Data Classification の扱い

- Lead-only は **NORMAL / INTERNAL** のみ（会社名・拠点名・source・status 等）。
- **CUSTOMER_CONFIDENTIAL は使わない**（顧客PIIを持たないため）。高機密ラベル runtime 解禁は `docs/audit/112` 停止条件からの別承認。

## 17. company-brain-reference に顧客PIIを入れない方針

- Lead 本文・社内メモを **company-brain-reference に注入しない**。AI が Company Brain 経由で顧客PIIに触れる経路を作らない（封印維持）。

## 18. AI参照は下書き・提案のみ

- AI はリード分析・優先度提案・次アクション提案を**下書き・提案**として生成（PII を渡さない）。
- 確定・送信・外部作用は持たない（`ROLE_PERMISSIONS` の AI ロールは外部送信/承認/削除なし）。

## 19. 外部送信なし

- Lead-only では**外部送信なし**。メール/LINE/DM/SNS/PR いずれも今回スコープ外（Human Certification Gate）。

## 20. Human Certification Gate

- 外部送信・契約・値引き・請求・送金・採用確定・会計確定は**人間承認必須**。Lead-only には該当機能を含めない（将来接続点として記録）。

## 21. Consent Gate

- 顧客メール/LINE/DM/紹介/導入事例/成果数値公開/個人情報外部送信は同意確認必須。Lead-only は外部送信なしのため**今回発動しない**。

## 22. Security Gate

- tenantId / RBAC / writeAudit / writeDataAccess / Data Classification / **PII非注入**を維持。
- **Contact PII を初期範囲に含める場合は停止条件**（§31）。

## 23. Business Event Ledger 将来接続

- リード作成 / status 遷移 / 担当変更は、将来 **Business Event Ledger**（369独自差別化の柱）へ記録する接続点。**今回は実装しない**（writeAudit を土台に将来接続）。

## 24. 3案比較との関係

- 本書は doc118 の **案A（Lead-only）** の詳細化。案B（Lead+Deal）・案C（+Pipeline）へは、Lead-only の運用実績と §31 停止条件クリア後に**別承認**で進む。

## 25. Phase対応

- **事業ロードマップ Phase 0-20**: **Phase 2 Salesforce Mini / CRM基盤**の最小起点。前提 Phase 0 Core OS / Phase 1 Company Brain。隣接 Phase 3/4/5/12/13/14/19。
- **PDF系 OS本体 Phase 2.5-18**: 案A=**Phase 2.5 初期MVP**。Brain拡充 Phase 4・AI社員テンプレ化 Phase 5 は後続。
- **戦略構想 Phase 18.5-26**: Phase 20/22/23/24/26 は将来接続（今回対象外）。
- **Complete Ledger R0-R14**: **R4 Commercial Core + R0 Governance Docs** 中心。

## 26. 50カテゴリ上の対象カテゴリ（短縮）

- **直接**: C08 CRM/Customer360、C09 SFA/Sales OS、C46 Governance Docs。
- **間接**: C01, C03, C04, C05, C06, C07, C10, C11, C12, C15, C18, C20, C26, C28, C30, C33, C34, C37, C38, C39, C48。
- **後続**: C02, C13, C14, C16, C17, C19, C21, C22, C23, C24, C25, C27, C29, C31, C32, C35, C36, C40, C41, C42, C43, C44, C47, C49, C50。
- **禁止/Future隔離**: C45 Physical AI/IoT/Robotics。**不明**: なし。

## 27. 20大カテゴリとの接続

- 直接: 3.CRM/SFA・18.セキュリティ/権限/監査・1.AI経営OS本体・2.Company Brain。
- 間接: 4.ERP/基幹・5.AD OS/Growth・11.Developer Platform・12.業務自動化/Workflow・14.法務/契約・15.BI/経営分析・19.課金/Unit Economics。
- 今回禁止: 20.フィジカルAI/ロボット連携。

## 28. 追加19領域との接続

- 確認のみ（実装しない）: AI Governance / Agent Control Plane・Data Governance / Semantic Layer・AI Evaluation / Red Team・Trust Center / Compliance Center・Observability / SRE・MCP / Integration Platform・Onboarding / Migration・Customer-facing Portal・Risk / Insurance / Liability。

## 29. 5本柱との接続

1. **Human Certification Gate 全社共通化**: CRM 外部作用の承認境界（将来接続）。
2. **Business Event Ledger 全社展開**: Lead イベントの記録（将来接続・§23）。
3. AI社員の免許制度 / 4. AI社員の給与明細 / 5. AI社員派遣所: 営業AI社員が将来接続する候補（今回対象外）。

## 30. 初期MVPで作らないもの

- 外部API完全連携・Salesforce/HubSpot/kintone 実連携・OAuth・外部メール送信・LINE送信・DM大量送信・SNS投稿・PR配信・SEO公開・契約締結・請求書発行/送付・入金消込確定・会計仕訳確定・値引き確定・採用合否確定・Contact PII 無承認保存・個人情報外部送信・実LLM API・AIコスト・本番確認・本番DB・deploy・フィジカルAI。

## 31. 実装に進むための停止条件

以下のいずれかが必要になったら**停止して別承認**：
- schema 変更 / migration が必要。
- Contact PII 保存が必要。
- RBAC 定義変更（`crm:*` 新設）が必要。
- writeDataAccess / CUSTOMER_CONFIDENTIAL runtime が必要。
- company-brain-reference 変更 / AI 参照条件変更が必要。
- 外部送信 / 外部SaaS連携 / OAuth が必要。
- 実LLM / AIコスト / 本番確認が必要。

## 32. 推奨判断

**推奨: 案A Lead-only を「PII を持たない・既存権限で暫定・writeAudit のみ・外部送信なし」の最小範囲で実装候補とする。ただし本書は docs-only であり、実装着手は §31 停止条件クリア後の別承認。**

- 最初の実装スプリントは「Lead の作成・編集・アーカイブ＋一覧＋tenantId/RBAC/writeAudit」に限定する方向。
- `crm:*` 新設は実装本格化時に別承認（暫定は既存 knowledge 権限代替を候補）。

## 33. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `54a8875244da72e099da30ea434c8355cc2ad371`・working tree clean・`origin/main..HEAD` 空・doc119/roadmap20 未存在）。
- 上位: `docs/roadmap/19` / `docs/audit/118`（実測・存在）。PII設計: `docs/audit/114`。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。
- 369-vault 非編集: `git status --short -- 369-vault` 空（実測）。

## 34. Assumption Log

- 本書は Candidate・docs-only。**実装は別承認**。
- Lead 候補列・status enum は**設計案**であり schema 化・migration はしない。
- RBAC は本書で変更しない（既存 knowledge 権限代替 vs `crm:*` 新設は実装時に別承認）。
- Contact PII は初期範囲に入れない。369-vault は未編集。

## 35. Unknowns Log

- Lead status enum の最終値と遷移規則。`crm:*` 新設 vs 既存権限代替の最終決定。
- displayName に拠点名をどこまで含めるか（PII 境界）。
- source enum の値（demo/google/upload 以外）。
- 案B へ進む「運用実績」の定義。Business Event Ledger の記録形式。

## 36. Risk Register

- 設計を実装済みと誤読 → 「今回は実装しない・別承認」を明記。
- Lead 候補列に PII が紛れ込むリスク → 「入れないデータ」「PII非注入」「停止条件」を明記。
- RBAC を先に変えてしまうリスク → 「本書で RBAC 変更しない」を明記。
- internalNote に顧客個人情報を書くリスク → 「PII非依存・社内メモ」と明記。
- 過剰設計（案B/C 先行）リスク → Lead-only 限定・段階停止条件。
- AI に PII を渡すリスク → company-brain-reference 非注入・下書きのみ。

## 37. Definition of Done

- [x] Lead-only の最小目的・Lead 候補列・入れる/入れないデータ・Contact PII 非採用理由・status enum・archivedAt・tenantId・RBAC・`crm:*` vs 既存権限比較・writeAudit・writeDataAccess 条件・Data Classification・PII非注入・AI下書き・外部送信なし・各Gate・Business Event Ledger・3案関係・Phase・50/20/19/5本柱・初期MVP非対象・停止条件・推奨判断を網羅。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認なし（docs-only）。
- [x] safety script exit 0・369-vault非編集。

## 38. 次回推奨プロンプト案

1. **doc119 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **CRM Lead-only 実装スプリント可否の最終判断**（schema 化 / migration / `crm:*` 新設の是非を決める別の重い人間承認）。
3. 次の Lineage 深掘り（Finance / Procurement / Inventory・docs-only・別承認）。

## 39. 判定

**判定: READY / GO**（案A Lead-only を実装判断できる粒度の最小設計として docs-only で整理した）。

ただし、これは実装の決定ではない。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**画面/Server Action なし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**外部SaaS連携なし**・**OAuth設定なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**Contact PII保存なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
