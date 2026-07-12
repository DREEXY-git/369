# 58. 完全機能台帳 v1.0 正本化＋カテゴリ番号整合（Candidate・docs-only・実装なし）

- 日付: 2026-07-10
- 種別: docs-only（コード変更なし・schema/migration/RBAC/seed 変更なし・369-vault 非編集）
- 対応 audit: `docs/audit/157_complete_function_ledger_v1_canonicalization.md`
- 出典: ユーザー提供「369 / IKEZAKI OS 最終構想の完全機能台帳 v1.0」全文（Prompt-for-Prompt Generator v3.0 Appendix A・2026-07-06 作成）

## 1. 目的

完全機能台帳 v1.0 を GitHub 正本として固定し、(1) 以降の全ミッションのカバレッジ表が参照する**唯一のカテゴリ定義**とする、(2) 過去 docs のカテゴリ番号表記と台帳正本のズレを**追記主義**で整合整理する。本書は Candidate（正式 Function Master への昇格は別承認）。**実装ではない。**

## 2. 非目標

実装しない。schema/migration/RBAC/seed/ci.yml/package/lockfile を変更しない。外部送信・実LLM・AIコスト・課金・本番 deploy なし。369-vault 非編集（本書の vault 反映は後続別承認）。過去 roadmap/audit の本文を書き換えない。台帳記載カテゴリの実装を意味しない（各 Phase 別承認）。

## 3. 台帳正本: 50カテゴリ（Code／カテゴリ／役割／事業Phase／R Stage）

| Code | カテゴリ | 役割 | Phase | R |
|---|---|---|---|---|
| C01 | Core OS / Tenant基盤 | 会社・組織・ユーザー・テナント管理 | 0 | R1 |
| C02 | Enterprise Identity / Admin | SSO・SCIM・組織階層・管理者機能 | 0, 19 | R1, R12 |
| C03 | Permission / Approval / Audit | 権限・承認・監査・証跡 | 0, 3, 4, 19 | R1, R2 |
| C04 | AI Governance / Agent Control Plane | AI社員の管理・権限・停止・評価 | 0, 4, 19, 20 | R2 |
| C05 | AI Safety / Evaluation / Red Team | AI品質保証・暴走防止 | 4, 15, 19 | R2, R12 |
| C06 | Data Governance / Semantic Layer | AIが企業データを正しく理解する意味辞書 | 1, 12, 19 | R3, R9 |
| C07 | Company Brain / Knowledge OS | 社内ナレッジ・docs・議事録・RAG | 1, 18.5-19 | R3 |
| C08 | CRM / Customer 360 | 顧客・リード・商談・LTV管理 | 2 | R4 |
| C09 | SFA / Sales OS | 営業活動・案件・パイプライン管理 | 2 | R4 |
| C10 | Quote / Pricing / Product Master | 見積・価格・商品マスタ | 2, 5 | R4 |
| C11 | Contract / Legal Ops | 契約・法務・規約・電子契約 | 5, 19 | R4, R12 |
| C12 | Invoice / Billing | 請求・請求書・売掛 | 4, 5, 18 | R5 |
| C13 | Payment / Reconciliation | 入金・消込・支払 | 4, 5 | R5 |
| C14 | Accounting / Finance | 会計・仕訳・管理会計・資金繰り | 4, 5 | R5 |
| C15 | ERP / Operations | 受発注・在庫・購買・原価 | 5, 7, 10 | R6 |
| C16 | EC / POS / Reservation | EC・店舗・POS・予約・来店 | 7 | R6 |
| C17 | Procurement / PLUG / Price Compare | 購買最適化・最安値・アフィリエイト | 6, 10, 16 | R6 |
| C18 | AD OS / Growth Engine | 広告・SNS・LINE・SEO・PR・紹介・成果分析 | **3**, 14 | R7 |
| C19 | Ads Management | 広告媒体・予算・成果・改善提案 | **3**, 14 | R7 |
| C20 | SNS / LINE / Email / DM | 配信・投稿・反応・同意・成果管理 | **3**, 14 | R7 |
| C21 | SEO / Content / PR | 記事・LP・PR・導入事例・ブランド発信 | **3**, 14 | R7 |
| C22 | Referral / Affiliate / Creator / Business Network | 紹介・アフィリエイト・クリエイター | **3**, 14, 20 | R7 |
| C23 | HR / Recruiting | 採用・応募者・面接・採用広報 | 11 | R8 |
| C24 | Labor / People Ops | 従業員・勤怠・評価・労務 | 11, 19 | R8 |
| C25 | Education / Academy | 社内教育・研修・369 Academy・認定 | 11, 20 | R8, R13 |
| C26 | Customer Support / CS | 問い合わせ・チケット・FAQ・顧客ポータル | 13 | R8 |
| C27 | Project / Task / Workflow | タスク・稟議・承認導線・業務自動化 | **3**, 4, 13 | R8 |
| C28 | BI / Dashboard / Reporting | 経営・営業・広告・財務・AI社員ダッシュボード | 12, 14 | R9 |
| C29 | Business Simulator / Digital Twin | 売上・粗利・LTV・広告・採用・在庫シミュレーション | 12, 20 | R9 |
| C30 | AI Employee Platform | AI社員そのものの運用基盤 | 5, 9, 20 | R10 |
| C31 | AI Employee Development Environment | AI社員・Plugin開発環境 | 8, 12-13, 20-22 | R10, R11 |
| C32 | AI Employee Marketplace | AI社員ストア・審査・販売・収益分配 | 9, 16, 24-26 | R10 |
| C33 | Developer Platform | API・Webhook・SDK・MCP・外部開発者 | 8, 17, 22 | R11 |
| C34 | Integration Hub / Adapter | 外部SaaS連携・CSV・Webhook | 17 | R11 |
| C35 | Browser Extension / Desktop / Mobile | PLUG型拡張・スマホ・デスクトップ | 6, 16 | R6, R13 |
| C36 | Billing / Metering / FinOps | 従量課金・AI原価・開発者報酬 | 6, 18, 20 | R5, R10 |
| C37 | Trust Center / Compliance Center | セキュリティ・AI安全性・個人情報・契約資料 | 15, 19 | R12 |
| C38 | Consent / Privacy / Data Protection | 同意・配信停止・第三者提供・個人情報制御 | **3**, 16, 19 | R12 |
| C39 | Security / Zero Trust | テナント分離・RLS・暗号化・Secrets・MFA | 0, 19 | R1, R12 |
| C40 | Observability / SRE / Incident | 障害監視・ログ・トレース・Status・SLA | 15, 19 | R12 |
| C41 | **Onboarding / Migration** | 初期設定・CSV移行・業種別セットアップ | 8-10 | R12 |
| C42 | **Vertical Template Factory** | 業界別OSテンプレート量産基盤 | 15 | R13 |
| C43 | **White-label / Embedded** | 他社SaaS・他社OSへの組み込み | 17, 20 | R13 |
| C44 | **International / Multi-region** | 多言語・多通貨・海外・リージョン管理 | 20+ | R13 |
| C45 | Physical AI / IoT / Robotics | 将来のロボット・店舗・現場・IoT連携 | Future | R14（**禁止/Future隔離**） |
| C46 | Governance Docs / GitHub / Obsidian | 正本docs・ロードマップ・監査・Claude Code連携 | All | R0 |
| C47 | Sales / Partner / Go-to-market Ops | 営業管理・導入支援・代理店なし成長導線 | 14-20 | R13 |
| C48 | Risk / Insurance / Liability | AI事故・責任分界・補償・事故報告 | 15, 19 | R12 |
| C49 | App Review / Marketplace Governance | AI社員・Pluginの審査・停止・互換性 | 9, 16, 23-24 | R2, R10 |
| C50 | Community / Ecosystem Analytics | 開発者・導入企業・AI社員経済圏の分析 | 20, 25-26 | R13 |

**事業 Phase → カテゴリ対応（台帳 §5-1 正本）**: Phase 0=C01/C02/C03/C04/C39/C46、Phase 1=C06/C07/C46、Phase 2=C08/C09/C10、**Phase 3（AI Growth Engine）= C18/C19/C20/C21/C22/C27/C38**、Phase 4=C03/C04/C05/C12/C13/C14、Phase 5=C11-C15、以降は台帳 §5-1 のとおり。

## 4. カテゴリ番号ズレの整合整理（本書の核・追記主義）

- **事実**: 本リポジトリの roadmap45 §15・roadmap49 §10・roadmap52 §12・roadmap57 §9 は「**C41-C44 = AI Growth 系（Phase 3 直接）**」と表記してきた。
- **台帳正本**: C41=Onboarding/Migration・C42=Vertical Template Factory・C43=White-label/Embedded・C44=International/Multi-region（いずれも**後続**）。**Phase 3（AI Growth Engine）の正しい対応は C18-C22＋C27＋C38**。
- **整理方針（追記主義）**: 過去 docs の「C41-C44 = AI Growth」表記は**当時の作業記録としてそのまま保存し、書き換えない**。**正は本書 §3**。以降の全ミッションのカバレッジ表は本書の番号を正とする。
- **帰属の付け替え**: Control Tower v0（P3-CT-0〜4・CI 77/0 で完全クローズ済み）の「実装済み・CI 担保つき」確定は、**C18（Growth 成長機会カード）・C27（承認導線・Workflow）・C28（ダッシュボード）・C03（監査配線）・C04/C05（AI境界・安全）・C38（同意・抑止前提）に帰属**する。C41-C44 には帰属しない（未着手のまま）。

## 5. 20大カテゴリ（台帳 §6 正本・50カテゴリとの対応）

1 AI経営OS本体(C01,C03,C46)／2 Company Brain(C06,C07)／3 CRM/SFA(C08,C09,C10)／4 ERP/基幹(C11-C15)／5 AD OS/Growth(C18-C22)／6 EC/POS/予約(C16)／7 PLUG型購買(C17,C35)／8 AI社員Platform(C04,C30)／9 AI社員開発環境(C31)／10 Marketplace(C32,C49)／11 Developer Platform(C33,C34)／12 業務自動化/Workflow(C27)／13 人事/採用/教育(C23-C25)／14 法務/契約/コンプラ(C11,C37,C38)／15 BI/経営分析(C28,C29)／16 業界特化OS(C42)／17 White-label(C43)／18 セキュリティ/権限/監査(C03,C39,C40)／19 課金/Unit Economics(C36)／20 フィジカルAI(C45・隔離)。

## 6. 追加19領域（台帳 §7 正本）

AI Governance／Data Governance・Semantic Layer／Enterprise Admin・SSO・SCIM／AI Evaluation・Red Team／Trust Center／Observability・SRE／Billing・Metering・FinOps／Marketplace Governance／MCP・Integration Platform／Onboarding・Migration・Setup Wizard／Vertical Template Factory／Procurement・ITAM・SaaS Management／369 Academy・Certification／Digital Twin・Business Simulator／Policy-as-Code・Contract-as-Code／Ecosystem Analytics／Browser Extension・Desktop・Mobile／Customer-facing Portal／Risk・Insurance・Liability。

## 7. 369独自差別化5本柱（保護対象・不変）

1. **Human Certification Gate 全社共通化** — 本リポジトリ実装: `requiresApproval`＋`ApprovalRequest`＋`decideApprovalAction`（外部送信/契約/請求/支払/削除/エクスポート/人事は承認必須）。
2. **Business Event Ledger 全社展開** — 現段階の対応: AuditLog＋DataAccessLog＋UsageEvent＋OutreachSendLog（将来の統合台帳は後続）。
3. **AI社員の免許制度** — 現段階の対応: RBAC の AI_AGENT/AI_ASSISTANT ロール制限＋`isHumanUser` 人間専用化＋`assertAiToolAllowed`。
4. **AI社員の給与明細** — 現段階の対応: UsageEvent 8種（usage_only・非課金）による稼働計測の土台。
5. **App Store ではなく「AI社員派遣所」** — 後続（C32）。世界観として台帳に固定。

## 8. Global AI Rules（台帳 §46 正本・本リポジトリでの実装状態）

- **AIができること**: 読み取り・要約・分析・下書き・候補提示・異常検知・差分表示・承認依頼作成・リスク判定・同意チェック・監査ログ記録・データ不足/信頼度表示・dry-run。→ 実装: FakeLLM タスク群・AIOutput 下書き保存・safeAiInput・saveAIOutputStandard。
- **AIが無承認でしてはいけないこと**: 請求書確定/送付・請求金額変更・入金消込確定・会計仕訳確定・税務判断確定・契約締結/変更・返金/相殺/値引き・督促・広告予算変更/停止・LINE/メール/DM 送信・SNS 投稿・PR 配信・SEO 公開・個人情報外部送信・顧客名/成果数値公開・採用合否・労務判断・権限変更・DB スキーマ変更・監査ログ削除・同意状態変更・他テナント参照。→ 実装: ROLE_PERMISSIONS で AI に send/approve/delete なし・EXTERNAL_SEND_ENABLED=false・SuppressionList 強制・tenantId 全クエリスコープ。**CI（stage3_e2e）が封印 env を毎 run ログ本文で検証（14 run 連続 green）**。

## 9. 初期MVPで作らない・営業で言ってはいけないもの（台帳 §9 正本・26項目）

外部API完全連携／広告完全自動運用／LINE完全自動配信／DM大量自動送信／SNS完全自動投稿／PR外部配信自動化／SEOページ自動公開／金銭アフィリエイト精算／請求書正式発行の自動化／請求書送付の自動化／入金消込確定の自動化／会計仕訳確定の自動化／税務判断の自動断定／契約締結の自動化／返金・相殺・値引きの自動確定／個人情報の外部共有自動化／同意なし外部送信／虚偽口コミ／なりすましレビュー／ステマ／成果保証表現／完全リアルタイム保証／法的適合の断定／クロステナント学習／フィジカルAI実装／医療・法律・税務・労務判断の自動確定。
**すべて Candidate docs 整理のみ可・実装は明示人間承認まで禁止。**

## 10. 4軸ロードマップ対応表

| 本リポジトリ系譜（基準commit） | 事業 Phase 0-20 | PDF 2.5-18 | 戦略 18.5-26 | R Stage |
|---|---|---|---|---|
| Phase 1 完了（e95f887） | Phase 0 相当 | — | — | R1 |
| Phase X 完了（70d4d06） | 品質基盤（横断） | — | — | R0/R1 |
| Phase 2-A/B/C 完了（85f1bf3/83d35bc/6d656a3） | Phase 1（Company Brain） | Phase 2.5 の一部 | — | R3 |
| CRM/LeadMap 突合＋Phase 2 完了（doc118-123） | Phase 2（CRM基盤） | Phase 2.5 | — | R4 |
| CI stage3_e2e 72→77 green（doc129-143） | 回帰ゲート（横断） | Phase 3（承認・監査基盤）相当 | — | R0 |
| **Phase 3 GO→Control Tower CT-0〜4 完了（d45491c・CI 77/0）** | **Phase 3（AI Growth Engine）進行中** | Phase 3 相当 | — | **R7** |
| 本書（台帳正本化） | 横断 | — | — | **R0** |
| P3-CT-5（承認導線 deep link・次段） | Phase 3 | Phase 3 | — | R7 |
| 未着手: 実課金/Marketplace/MCP/SSO 等 | Phase 6+ | Phase 6+ | 18.5+ | R5/R10+ |

統制 Matrix（不変）: 自律 L4 上限・Phase 8 実課金凍結・MCP 非公開・UsageEvent 8種 usage_only・高機密 runtime 統制②据え置き。

## 11. 実装状態スナップショット（台帳番号で正規化）

- **実装済み（CI 担保つき）**: C01（tenant分離）・C03（RBAC/Approval/Audit/DataAccess）・C04/C05（AI境界・safeAiInput・敵対的レビュー運用）・C07（Company Brain 4テーブル＋AI参照）・C08/C09（LeadMap/Customer/Deal）・C18（Growth Control Tower・Golden Path）・C20（OutreachDraft・承認後送信・Suppression）・C27（ApprovalRequest 導線）・C28（朝報/Executive/Control Tower）・C36（UsageEvent usage_only）・C38（ConsentRecord/SuppressionList/CaseStudyConsent）・C39（labels/maskText/safeFetch）・C46（roadmap58本＋audit157本＋vault 128ノート）。
- **後続（Candidate 登録のみ）**: C02・C06・C10-C17・C19・C21-C26・C29-C35・C37・C40-C44・C47-C50。
- **禁止/Future隔離**: C45。

## 12. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 台帳が repo に未正本化だった | grep で該当専用 doc なし（roadmap 内インライン表のみ） | 本書で解消 |
| C41-C44 ズレ | roadmap45 §15/49 §10/52 §12/57 §9 の表記 vs 台帳 §2・§5-1 | §4 で整理 |
| Phase 3 = C18-C22+C27+C38 | 台帳 §5-1 事業ロードマップ対応表 | 正本化 |
| 封印維持 | CI run 29125940482 ログ本文 env fake/log/false・77/0 | 緑 |
| 5本柱の実装対応 | rbac.ts/approvals/UsageEvent/audit 実装（各 roadmap/audit doc） | §7 に固定 |

## 13. Assumption Log

- 台帳 v1.0 は 2026-07-06 版が最新（更新版が提示されたら本書を改版）。
- 「事業 Phase」表記は台帳 §5-1 を正とし、本リポジトリ独自系譜（Phase 1/X/2-A〜C/3）とは §10 の対応表で接続する（番号の直接同一視はしない）。

## 14. Unknowns Log

- Business Event Ledger の統合テーブル化（現在は複数台帳の合成）をどの Phase で行うか — 人間判断・後続。
- 台帳の独立 doc 群（docs/02_function_master/ 形式）への再編は必要になった時点で別承認。

## 15. Risk Register

| # | リスク | 影響 | 手当て |
|---|---|---|---|
| R1 | 旧 docs の C41-C44 表記を将来誤読 | 中 | §4 で「正は本書」を明文化・以降の表は本書番号で作成 |
| R2 | 台帳の肥大化・正式昇格の混同 | 中 | Candidate 明記・実装は各 Phase 別承認 |
| R3 | 台帳と実装の乖離の再発 | 中 | 各ミッションの Coverage Matrix が本書を参照する運用を §4 に固定 |

## 16. Definition of Done

- [x] 50カテゴリ・20大・19領域・5本柱・Global AI Rules・MVP禁止26項目を1枚で正本化
- [x] C41-C44 ズレの追記主義整理と帰属付け替え（§4）
- [x] 4軸ロードマップ対応表（§10）と実装状態スナップショット（§11）
- [x] audit157 作成・検証ゲート PASS・commit-only

## 17. 判定

判定: **完全機能台帳 v1.0 正本化完了（Candidate）／カテゴリ番号整合完了（追記主義・過去 docs 非改変）／STOP 非該当**。**docs-only・実装なし・schema/migration/RBAC/seed 変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**。次は P3-CT-5 設計＋実装前 Gate（roadmap59・同一オートパイロット内で継続）。
