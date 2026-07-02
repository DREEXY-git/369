# 02. Feature Registry — 追加採用済み構想 17領域（Phase X-RM-01）

> 既存プロンプト非破壊・docs-only。ここに載ることは「採用済み構想」の意味であり、**実装承認ではない**。実装は各 Phase の入口で個別の人間承認を必要とする。
> 分類基準の正本: Risk/Phase は `docs/roadmap/00_ikezaki_os_long_term_strategy.md` §6・本書下記凡例、Automation Level は `docs/roadmap/08_automation_level_taxonomy.md`、Human Boundary は `docs/roadmap/04_human_boundary_matrix.md`、課金分類は `docs/roadmap/05_monetization_matrix.md`、MCP/API は `docs/roadmap/06_mcp_api_exposure_matrix.md`。

---

## 0. 凡例（各列の意味）

- **Feature ID**: 領域プレフィックス＋連番（AIOS / BRAIN / SALES / HR / MEET / GATE / BILL / API / AUTO / FLOW / CASH / DOC / TRUST / INT / MARKET / ENSHIN / ROBOT）。
- **Phase**: 実装を検討する Phase（2 / 2設計 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / future / blocked）。「2設計」は Phase 2 で設計のみ。
- **Risk**: LOW / MEDIUM / HIGH / BLOCKED（基準: docs-only・read-only は LOW、UI/API 設計影響は MEDIUM、DB/auth/PII/外部送信/金銭/人事は HIGH、実課金・採否決定・ロボット実行等は BLOCKED）。
- **AL**: Automation Level 目標上限（L0〜L7。現時点の実装上限は L4）。
- **HB**: Human Boundary（HO: Human-only / HD: Human decision required / HA: Human approval required / AA: AI assist only / AD: AI draft only / AR: AI recommend only / AEF: Approved execution future / PB: Prohibited-blocked）。
- **承認/監査**: 実行時に ApprovalRequest（将来は Action Gateway）／監査ログが必要か。
- **UE**: UsageEvent 記録の要否（要=将来 emit 候補・現時点で emit 追加はしない）。
- **課金**: never_billable / usage_only / billable_candidate_future（実課金は Phase 8 まで凍結）。
- **API**: MCP/API Exposure（prohibited / private internal / read-only internal / sandbox only / approval required / enterprise only / future public / future MCP candidate）。
- **データ**: 主なデータ種別（社内知識 / 顧客PII / 財務 / 人事PII / 会議・音声 / 操作ログ / 物理）。
- **時期**: Implementation Timing（Phase 2-A 等のサブフェーズ、または future/blocked）。
- **今回**: 今回（Phase X-RM-01）実装するか — **全行「しない」**（本書は分類のみ）。

共通の変更許可/禁止ファイル・検証方法（全 Feature 共通・実装時に適用）:

- 変更許可: 当該 Phase の承認範囲で指定された `apps/web` / `packages` / `prisma` / docs のみ（個別承認）。
- 変更禁止: 承認外の schema/migration・`ROLE_PERMISSIONS` の AI 権限・課金/決済コード・外部送信ゲート緩和・`.env`。
- 検証方法: `pnpm test && pnpm typecheck && pnpm lint`＋該当 unit/integration＋E2E smoke green 維持（Phase X-02 基盤）＋本番確認は利用者実測 GO のみ。

---

## 1. AIOS — AI経営OS・AI社員系（AI社員OS）

**狙い**: 人間社員と AI 社員が一緒に会社を動かす前提で、AI社員の役割・権限・成果・コスト・リスク・監査ログを管理する（AI社員OS / Agent Workforce Manager）。
**扱い**: AI社員の実行機能をいきなり作らない。役割定義・権限境界・監査ログ・UsageEvent候補・課金分類・Phase 4 実装計画に留める。

個別機能（全採用・名称保持）: AI社員OS / Agent Workforce Manager・Agent Identity・AI Employee Passport・Agent Scopes・Agent Budget・Agent Performance・Agent & Robot Skill Registry・AI Literacy / Agent Training Center・CEO補佐AI・CFO AI・COO AI・Sales AI・Risk AI・CS AI・Legal / Contract AI・Executive War Room / AI経営会議室・Strategy Advisor・Business Twin / 経営シミュレーター・AI Native Inbox・Human Work Inbox

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AIOS-001 | Agent Workforce Manager（AI社員OS 中核） | AI社員の登録・役割・状態管理 | 既存 AI社員（FakeLLM タスク群）の上位管理層 | 4（設計2-D連動） | HIGH | L4 | HA | 要 | 要 | 要 | usage_only | private internal | 操作ログ | Phase 4 | しない | 権限境界の設計ミスが全AIに波及 |
| AIOS-002 | Agent Scopes / Agent Budget | AI社員の権限範囲と実行予算の上限管理 | RBAC（AI_AGENT 権限不変）を拡張せず包む | 4 | HIGH | L4 | HA | 要 | 要 | 要 | usage_only | private internal | 操作ログ | Phase 4 | しない | 予算超過時の停止設計が未定 |
| AIOS-003 | CEO補佐AI / CFO AI / COO AI 等 役員補佐群 | 経営文脈での助言・下書き（断定助言なし） | 既存 朝礼AI・AIタスクの役割特化版 | 4（プロンプトは2で試作可） | MEDIUM | L3 | AR | 下書きのみ | 要 | 要 | usage_only | prohibited | 社内知識+財務 | Phase 4 | しない | 法務/税務/財務の断定助言禁止の徹底 |
| AIOS-004 | Business Twin / 経営シミュレーター | 経営数値のwhat-ifシミュレーション | 既存 finance 集計の read-only 派生 | 6 | MEDIUM | L3 | AR | 不要(閲覧) | 要 | 要 | usage_only | prohibited | 財務 | Phase 6 | しない | 予測値を断定と誤読されるUIリスク |
| AIOS-005 | AI Native Inbox / Human Work Inbox | AIと人間のタスク受け渡し窓口 | 既存 承認一覧・タスクの発展 | 4 | MEDIUM | L2 | AD | 要(実行時) | 要 | 要 | usage_only | private internal | 操作ログ | Phase 4 | しない | Inbox経由の無承認実行を防ぐ設計 |

## 2. BRAIN — 会社知識・Company Brain系

**狙い**: 会社方針・商品・会議・議事録・顧客課題・営業ナレッジ・社内ルールをDB化し、AIが会社の文脈を理解して提案・教育・営業・戦略助言に活用（Company Brain / 会社知識DB）。
**扱い**: 設計・分類・ナレッジ種別・アクセス権限・外部AI送信可否・MCP/API公開可否の整理から。schema 変更は Phase 2-A で個別承認。

個別機能（全採用・名称保持）: Company Brain / 会社知識DB・Business Graph / Company Knowledge Graph・Company Knowledge Graph・Policy DB・Product Catalog・Case Study DB・Customer Pain DB・Sales Playbook・Meeting Intelligence（→MEET系と重複登録）・Meeting Transcript DB・Meeting Decision DB・Strategy Memory・Company Brain API / MCP（→API系と重複登録）

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BRAIN-001 | Policy DB / Product Catalog | 会社方針・商品情報の構造化DB | 既存 knowledge / pgvector 基盤を拡張 | 2 | HIGH(schema) | L2 | AD | schema承認 | 要 | 要 | usage_only | read-only internal(将来) | 社内知識 | Phase 2-A | しない | 機密ラベル・外部AI送信可否の初期設計 |
| BRAIN-002 | Case Study DB / Customer Pain DB / Sales Playbook | 事例・顧客課題・営業ナレッジのDB化 | 既存 CRM/リード/ナレッジと接続 | 2 | HIGH(schema) | L2 | AD | schema承認 | 要 | 要 | usage_only | read-only internal(将来) | 社内知識+顧客PII | Phase 2-A | しない | 顧客PIIの分類・マスキング必須 |
| BRAIN-003 | Business Graph / Company Knowledge Graph | エンティティ間関係のグラフ化 | pgvector＋リレーションの発展形 | 2設計→3以降 | MEDIUM | L2 | AA | 不要(設計) | 要 | 要 | usage_only | future MCP candidate | 社内知識 | Phase 2-A設計 | しない | グラフ設計の複雑化・過剰設計 |
| BRAIN-004 | Strategy Memory | 経営判断・戦略の記憶と参照 | 会議・決定事項DB（Phase 5）と連動 | 5 | MEDIUM | L2 | AD | 不要(閲覧) | 要 | 要 | usage_only | prohibited | 社内知識(高機密) | Phase 5 | しない | 高機密の分類・閲覧権限設計 |

## 3. SALES — 営業AI・商品提案系

**狙い**: 顧客情報・会社方針・商品DB・営業履歴・会議内容・事例をもとに、最適な提案・営業準備・提案書作成・フォロー・次アクション提案を行う（Consultative Sales AI）。
**注意**: 実メール送信・大量送信・無承認外部送信・口コミ投稿・SNS量産をしない。read-only 分析・下書き・提案・承認申請まで。

個別機能（全採用・名称保持）: Consultative Sales AI・Product Recommendation Engine・Sales Brief Generator・Proposal & Content Engine・Outreach Draft・Objection Handling・Next Best Action・Deal Risk・Renewal / Upsell AI・Sales Coach・Sales Autopilot with Approval・Lead Scoring・Account Brief・Pain Detection・Best Product Suggestion・Talk Track・Follow-up Draft・Pipeline Health・Fit Score・Product Recommendation API（→API系）・Sales Action API（→API系）・Proposal API（→API系）

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SALES-001 | Consultative Sales AI（Account Brief / Sales Brief Generator） | 商談前の顧客理解・準備資料の自動下書き | 既存 LeadMap AI 分析・OutreachDraft の発展 | 2 | MEDIUM | L2 | AD | 下書きのみ | 要 | 要 | usage_only→billable_candidate_future | read-only internal(将来) | 顧客PII+社内知識 | Phase 2-B | しない | 顧客PIIの外部LLM送信時 maskText 徹底 |
| SALES-002 | Product Recommendation Engine / Best Product Suggestion / Fit Score | 顧客課題に最適な商品の推奨 | Product Catalog（BRAIN-001）依存 | 2 | MEDIUM | L3 | AR | 不要(推奨) | 要 | 要 | usage_only→billable_candidate_future | future MCP candidate | 社内知識 | Phase 2-B | しない | 推奨根拠の透明性（根拠/信頼度表示） |
| SALES-003 | Lead Scoring / Pain Detection / Deal Risk / Pipeline Health | リード・案件の状態分析（read-only） | 既存 LeadMap スコア・relevance の発展 | 2 | LOW〜MEDIUM | L3 | AR | 不要 | 要 | 要 | usage_only | read-only internal(将来) | 顧客PII | Phase 2-B | しない | スコアの過信・バイアス |
| SALES-004 | Sales Autopilot with Approval / Next Best Action / Follow-up Draft | 次アクション提案と追客下書き（承認必須） | 既存 承認→送信フロー（decideApprovalAction）を必ず経由 | 2（送信は既存フロー） | HIGH(送信近接) | L4 | HA | **必須** | 要 | 要 | usage_only | prohibited | 顧客PII | Phase 2-B | しない | 「自動送信」と誤解されない命名・UI |
| SALES-005 | Sales Coach / Talk Track / Objection Handling / Renewal / Upsell AI | 営業教育・切り返し・更新提案の支援 | AIタスク＋Sales Playbook（BRAIN-002）依存 | 2〜4 | LOW | L2 | AD | 不要 | 要 | 要 | usage_only | prohibited | 社内知識 | Phase 2-B以降 | しない | 教育内容の品質評価方法 |

## 4. HR — 採用・教育・育成系

**狙い**: 採用から育成までを AI が補助する（Talent Graph）。
**注意**: AIは採否決定・自動不採用・社員評価確定・給与・昇給・解雇判断をしない（恒久 human-only）。補助・要約・質問案・評価基準整理・学習計画作成まで。

個別機能（全採用・名称保持）: Talent Graph・Recruiting Copilot・Role DNA / Role Profile・Interview Rubric・Candidate Summary・Bias Alert・Onboarding OS・Learning & Coaching OS・Learning Path・Roleplay Training・Team Skill Map・HR Trust Center・求人票生成・面接設計・候補者整理・構造化評価・面接メモ要約・Candidate Comparison・Offer Support・Hiring Audit・入社前学習・30/60/90日プラン・Role別研修・商品理解テスト・社内ルール確認・Manager Guide・Progress Tracking・AI Mentor・Skill Gap Analysis・Personalized Learning Path・AI Coach・1on1 Assistant・Knowledge Quiz・Micro Learning・Growth Dashboard

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HR-001 | Recruiting Copilot（求人票生成/面接設計/候補者整理/面接メモ要約） | 採用業務の下書き・整理補助 | 既存 人事モジュール＋AIタスクの拡張 | 4 | HIGH(人事PII) | L2 | AD | 下書きのみ | 要 | 要 | usage_only | prohibited | 人事PII | Phase 4 | しない | 候補者PII保護・Bias Alert 併設必須 |
| HR-002 | 採否決定・社員評価確定・給与・解雇判断 | — | — | **恒久 human-only** | BLOCKED | L0 | HO | — | 要(人間操作の監査) | 不要 | never_billable | prohibited | 人事PII | **実装しない** | しない | AIが実質的に採否を左右しない設計の担保 |
| HR-003 | Onboarding OS / Learning & Coaching OS（30/60/90日プラン・Role別研修・AI Mentor 等） | 入社後の学習・成長支援 | ナレッジ＋AIタスクの発展 | 4〜5 | MEDIUM | L2 | AD | 不要 | 要 | 要 | usage_only→billable_candidate_future | prohibited | 人事PII+社内知識 | Phase 4-5 | しない | 学習データの評価転用禁止の明文化 |
| HR-004 | Talent Graph / Team Skill Map / Skill Gap Analysis | スキルの可視化と育成計画 | 人事データの read-only 分析 | 4 | HIGH(人事PII) | L3 | AR | 不要(閲覧権限) | 要 | 要 | usage_only | prohibited | 人事PII | Phase 4 | しない | 評価目的への流用防止（HR Trust Center 前提） |

## 5. MEET — 会議・議事録・ナレッジ変換系

**狙い**: 会議を「決定・タスク・教育資産・営業知見」に変換する（Meeting Intelligence）。
**注意**: 録音・文字起こし・議事録DB・外部AI送信は、同意（ConsentRecord）・権限・個人情報・機密情報・安全ルールを必ず考慮。

個別機能（全採用・名称保持）: Meeting Intelligence・Decision Extraction・Action Item Extraction・Open Issue Tracking・Strategy Memory（→BRAIN系）・Policy Update Suggestion・Training Material Generation・Sales Insight Extraction・Knowledge Link・Meeting Import・議事録生成・決定事項抽出・未決事項管理・タスク化・社内教育資料化・営業知見抽出・顧客・案件・商品・社員・タスクへの紐づけ

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MEET-001 | Meeting Intelligence（議事録生成/決定事項抽出/タスク化） | 会議の構造化と実行への接続 | 既存 会議モジュール＋Transcription provider | 5 | HIGH(音声・同意) | L2 | AD | 録音は同意必須 | 要 | 要 | usage_only→billable_candidate_future | prohibited | 会議・音声 | Phase 5 | しない | 同意・録音法令・外部AI送信制御 |
| MEET-002 | Training Material Generation / Sales Insight Extraction / Knowledge Link | 会議から教育資料・営業知見・ナレッジリンクを生成 | Company Brain（2-A）への書き込み下書き | 5 | MEDIUM | L2 | AD | 下書きのみ | 要 | 要 | usage_only | prohibited | 社内知識 | Phase 5 | しない | 誤抽出がナレッジ汚染しないようレビュー必須 |

## 6. GATE — 安全実行・承認・監査系

**狙い**: AI・MCP・API・外部ツール・将来のロボットが会社を動かす場合でも、危険操作は必ず承認・監査・証跡・二重実行防止・停止条件を通す（Decision & Action Gateway）。

個別機能（全採用・名称保持）: Decision & Action Gateway・Decision & Action Gateway 2.0・Action Escrow・Approval Request・Risk Score・Dry Run・Execution Receipt・Duplicate Guard・Kill Switch・Two-person Approval・Rollback Plan・Audit Ledger・AuditEvent・AI Observability・External Send Gate・AI Action Limit・Emergency Stop・Approval Token・Action Request

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GATE-001 | Decision & Action Gateway 2.0（Action Escrow / Risk Score / Dry Run / Execution Receipt / Duplicate Guard） | 危険操作の単一実行門 | 既存 ApprovalRequest / requiresApproval の発展・置換ではなく包含 | 2設計→4実装 | HIGH | L4 | HA | 本体が承認機構 | 要 | 要 | usage_only | private internal | 操作ログ | Phase 2-D設計 | しない | 既存承認フローとの二重管理期間の混乱 |
| GATE-002 | Kill Switch / Emergency Stop / AI Action Limit | AI実行の即時停止と上限 | 既存 EXTERNAL_SEND_ENABLED 等のフラグ群を体系化 | 2設計→4実装 | HIGH | L4 | HA | 要 | 要 | 要 | never_billable | private internal | 操作ログ | Phase 2-D設計 | しない | 停止の誤発動・復旧手順 |
| GATE-003 | Two-person Approval / Rollback Plan / Audit Ledger / AI Observability | 高危険操作の二人承認・巻き戻し・可観測性 | 既存 writeAudit / AuditEvent の発展 | 4 | HIGH | L4 | HA | 要 | 本体が監査機構 | 要 | never_billable | enterprise only(将来) | 操作ログ | Phase 4 | しない | 監査データ自体の保護（改ざん防止） |

## 7. BILL — 収益化・課金基盤系

**狙い**: 利用量の誠実な記録から、将来（Phase 8）の課金へ安全に橋渡しする（Usage-Based Billing）。
**注意**: 実課金・実決済・Stripe live連携・runtime課金判定・billable_candidate の実課金利用をしない。詳細は `docs/roadmap/05_monetization_matrix.md`。

個別機能（全採用・名称保持）: Subscription・Usage-Based Billing・Usage Ledger・Billing Shadow Ledger・AI Action Unit・UsageEvent Taxonomy・Value Meter / ROI Meter・Metered Trust Center・Billing Preview・Plan / Entitlement・never_billable・usage_only・billable_candidate・billable_ready・reported_to_billing_provider・invoice_previewed・invoiced・disputed

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BILL-001 | UsageEvent Taxonomy / Usage Ledger | 利用量記録の分類体系と台帳 | **既存 UsageEvent 8種類（usage_only）が実装済みの土台** | 8（分類は2で拡張可） | HIGH(金銭近接) | L1 | HD | 要 | 要 | 本体 | usage_only | prohibited | 利用量 | Phase 8 | しない | 8種類の現状を壊さない拡張手順 |
| BILL-002 | Billing Shadow Ledger / Billing Preview | 実課金前の「影の請求書」検証 | UsageEvent 集計の read-only 派生 | 8 | HIGH | L1 | HD | 要 | 要 | 要 | usage_only | prohibited | 利用量+財務 | Phase 8 | しない | プレビューを実請求と誤認するUI事故 |
| BILL-003 | Subscription / Plan / Entitlement / AI Action Unit | プラン・権利・AI実行単位の管理 | 新規（既存なし） | 8 | BLOCKED(実課金) | L1 | HD | 要 | 要 | 要 | billable_candidate_future | prohibited | 財務 | Phase 8 | しない | 実課金解禁の判断基準（課金前監査） |

## 8. API — MCP / API / Developer Platform系

**狙い**: 369 の能力を安全に外部エージェント・開発者へ開く（369 MCP/API Gateway）。
**注意**: 現時点で MCP/API 公開をしない。read-only 設計・scope設計・rate limit・audit・approval・sandbox・公開可否分類に留める。詳細は `docs/roadmap/06_mcp_api_exposure_matrix.md`。

個別機能（全採用・名称保持）: 369 MCP/API Gateway・Zero-Trust Agent Gateway・Business Graph API・Company Brain API / MCP・Talent Graph API / MCP・Product Recommendation API・Sales Action API・Proposal API・Developer Platform・Webhook Subscriptions・Private MCP Gateway・API Keys・OAuth Apps・MCP Server Config・Sandbox Workspace・API Usage Dashboard・Rate Limit・App Review・Permission Review・Security Scan・Developer Billing Dashboard

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| API-001 | 369 MCP/API Gateway / Zero-Trust Agent Gateway | 全外部アクセスの単一入口（scope・rate limit・audit） | 既存 Webhook Subscriptions 基盤と接続 | 2設計→future公開 | HIGH | L4 | HA | 要 | 要 | 要 | usage_only→billable_candidate_future | 本体(現時点 prohibited) | 操作ログ | Phase 2-G設計 | しない | scope設計の穴が全データ露出に直結 |
| API-002 | Company Brain API / Business Graph API / Talent Graph API | 知識・グラフの read-only API | BRAIN 系の公開面（内部のみ） | 2設計 | HIGH | L2 | HA | 要 | 要 | 要 | usage_only | read-only internal→future MCP candidate | 社内知識(+PII遮断) | Phase 2-G設計 | しない | PII・高機密の API 面への漏出 |
| API-003 | Developer Platform（Sandbox Workspace / App Review / Permission Review / Security Scan） | 外部開発者の安全な受け入れ | 新規（既存なし） | future | HIGH | L4 | HA | 要 | 要 | 要 | billable_candidate_future | sandbox only(将来) | 操作ログ | future | しない | 審査体制なしの公開は不可 |

## 9. AUTO — 業務自動化・人間境界系

**狙い**: 「何を自動化してよく、何を人間に残すか」を台帳化する（Human Boundary / Work Automation OS）。
**注意**: L5 以上の実行系自動化は future / blocked。分類・設計・安全ルール・Human Boundary Matrix 化まで。詳細は `docs/roadmap/04_human_boundary_matrix.md`・`08_automation_level_taxonomy.md`。

個別機能（全採用・名称保持）: Human Boundary / Work Automation OS・Work Graph・Human-only Task Registry・Automation Eligibility Engine・Automation Opportunity Map・Automation Level Taxonomy・Human Decision Rights Engine・Human-front / AI-back Mode・SOP-to-Automation Compiler・Bounded Autonomy・Enterprise Automation Control Plane・Work Value / Time Saved Meter・Robot / External Tool Gateway（→ROBOT系）

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTO-001 | Human-only Task Registry / Human Decision Rights Engine | 人間専権事項の明文台帳 | 本 roadmap の Human Boundary Matrix が初版 | 2 | LOW(docs)→MEDIUM(UI) | L0 | HO | 変更は人間のみ | 要 | 不要 | never_billable | prohibited | 社内規程 | Phase 2-C | しない | 台帳の形骸化（更新運用） |
| AUTO-002 | Automation Eligibility Engine / Automation Opportunity Map | 自動化可否の判定と機会の可視化 | Work Graph（future）依存・まず手動分類 | 2分類→4 | MEDIUM | L3 | AR | 不要(推奨) | 要 | 要 | usage_only | prohibited | 操作ログ | Phase 2-C分類 | しない | 「推奨」が実行圧力にならない設計 |
| AUTO-003 | SOP-to-Automation Compiler / Bounded Autonomy / Enterprise Automation Control Plane | 手順書→自動化変換と限定自律 | Workflow Fabric（FLOW系）依存 | future | HIGH | L6目標 | AEF | 要 | 要 | 要 | billable_candidate_future | prohibited | 操作ログ | future/blocked | しない | L5以上解禁の判断基準そのもの |

## 10. FLOW — Workflow・業務実行系

**狙い**: 承認付き業務フローを設計・実行する基盤（Workflow Fabric）。
**扱い**: 実行系より設計・分類・テンプレート候補・Phase 切り分けを優先。

個別機能（全採用・名称保持）: Workflow Fabric・Prompt-to-Workflow Compiler・Trigger・Condition・Action・Human Task・Agent Task・Approval Step・Escalation・SLA / Delay・Workflow Audit・Workflow UsageEvent・Dry Run Workflow・Workflow Template・承認付きWorkflow・AI Task付きWorkflow・例外処理Workflow・放置時エスカレーション・Workflow Marketplace連携

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLOW-001 | Workflow Fabric（Trigger / Condition / Action / Approval Step / Escalation / SLA） | 業務フローの定義と承認付き実行 | 既存 BullMQ 18ジョブ・承認フローの上位抽象 | 2設計→4実装 | HIGH | L4 | HA | Approval Step 必須 | Workflow Audit 必須 | Workflow UsageEvent | usage_only→billable_candidate_future | private internal | 操作ログ | Phase 2-H設計 | しない | Action に外部送信を含める際のゲート設計 |
| FLOW-002 | Prompt-to-Workflow Compiler / Dry Run Workflow / Workflow Template | 自然言語→フロー案の生成と乾式実行 | AIタスク＋FLOW-001 依存 | 4 | MEDIUM | L2 | AD | 生成は下書き | 要 | 要 | usage_only | prohibited | 社内知識 | Phase 4 | しない | 生成フローの誤設計を Dry Run で捕捉 |

## 11. CASH — 請求・売上・キャッシュ系

**狙い**: 未回収・入金・更新リスクを AI が検知し、対応の下書きまで行う（Revenue & Cash Autopilot）。
**注意**: 請求・会計・課金・決済・契約に関わる高リスク領域。実請求・実課金・会計ロジック変更は行わない。

個別機能（全採用・名称保持）: Revenue & Cash Autopilot・Quote-to-Cash・Collection AI・Dunning Draft・Cash Forecast・Payment Risk・Margin Alert・Renewal Risk・Billing Preview（→BILL系）・Pipeline Health（→SALES系）・未回収検知・延滞検知・督促文案作成・入金予測・支払い遅延リスク・契約更新リスク・解約予兆・売上改善提案

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CASH-001 | Collection AI / 未回収検知 / 延滞検知 / Dunning Draft | 未回収の検知と督促文案の下書き | **既存 dunning（Phase 1-33 GO）の read-only+draft 拡張** | 3 | HIGH(財務) | L2 | AD→送信はHA | 送信は必須 | 要 | 要(既存 external_send.dunning) | usage_only | prohibited | 財務+顧客PII | Phase 3 | しない | 督促の誤送信・二重送信（既存ガード維持） |
| CASH-002 | Cash Forecast / Payment Risk / Renewal Risk / 解約予兆 / 売上改善提案 | 入金予測・リスク検知・改善提案（read-only） | 既存 finance / Receivable の read-only 分析 | 3 | MEDIUM | L3 | AR | 不要(閲覧権限) | 要 | 要 | usage_only→billable_candidate_future | prohibited | 財務 | Phase 3 | しない | 予測の断定表示禁止（信頼度併記） |

## 12. DOC — 文書・契約・資料AI系

**狙い**: 契約書・請求書・見積書・議事録・提案書・メールを解析し、期日・条件・リスク・要望を抽出して社内ナレッジ化する（Document Intelligence）。
**注意**: 契約・請求・個人情報・機密情報に関わるため、権限・監査・外部AI送信制御を必ず考慮。

個別機能（全採用・名称保持）: Document Intelligence・Contract Intelligence・Invoice Intelligence・Proposal Intelligence・Email Intelligence・Knowledge Extraction・Compliance Check・契約書解析・請求書解析・見積書解析・議事録解析・提案書解析・メール解析・契約更新日抽出・支払条件抽出・リスク条項抽出・顧客要望抽出・クレーム抽出・文書から社内ナレッジ化

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DOC-001 | Contract Intelligence（契約書解析/更新日・支払条件・リスク条項抽出） | 契約の構造化と期日管理 | 既存 契約・MinIO 保存・AIタスクの拡張 | 3 | HIGH(契約・PII) | L2 | AD | 抽出結果は下書き | 要+writeDataAccess | 要 | usage_only→billable_candidate_future | prohibited | 契約(高機密) | Phase 3 | しない | 断定助言禁止（リスク・確認観点まで） |
| DOC-002 | Knowledge Extraction / 文書から社内ナレッジ化 / Compliance Check | 文書→Company Brain への変換と規程チェック | BRAIN-001/002 への書き込み下書き | 3〜5 | MEDIUM | L2 | AD | 下書きのみ | 要 | 要 | usage_only | prohibited | 社内知識 | Phase 3-5 | しない | 誤抽出のナレッジ汚染防止（レビュー必須） |

## 13. TRUST — Trust Center・セキュリティ・コンプライアンス系

**狙い**: データ分類・アクセスレビュー・同意・監査・外部送信履歴を一元管理する（Global Trust Center）。

個別機能（全採用・名称保持）: Global Trust Center・Data Classification・Access Review・Approval Policy・External Send Register・AI Risk Register・Consent Management・Audit Export・Retention Policy・Incident Mode・Security Checklist・DLP / PII Scanner・Legal Hold・Admin Access Review・SSO / SAML・SCIM・Audit retention・Data residency・Compliance reports・Custom approval policy・Risk policy engine・AI安全管理・外部送信履歴・個人情報分類・高機密データ分類

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TRUST-001 | Data Classification（個人情報分類/高機密データ分類） | 全データの機密度分類体系 | **既存 labels.ts（機密ラベル）の発展** | 2 | MEDIUM | L1 | HD | 分類変更は承認 | 要 | 不要 | never_billable | prohibited | メタ情報 | Phase 2-E | しない | 分類と実データの乖離（自動検査は将来） |
| TRUST-002 | External Send Register / AI Risk Register / 外部送信履歴 | 外部送信と AI リスクの台帳 | 既存 OutreachSendLog / UsageEvent(external_send) の集約ビュー | 2設計→3 | MEDIUM | L1 | HD | 不要(閲覧) | 要 | 既存流用 | never_billable | enterprise only(将来) | 操作ログ | Phase 2-E設計 | しない | 台帳の網羅性（漏れの検知手段） |
| TRUST-003 | SSO / SAML / SCIM / Data residency / Compliance reports / Legal Hold | エンタープライズ統制 | 新規（自前認証からの拡張） | 9 | HIGH(認証) | L1 | HD | 要 | 要 | 不要 | billable_candidate_future(enterprise) | enterprise only | 認証・PII | Phase 9 | しない | 自前認証との併存設計 |

## 14. INT — 外部連携・Integration系

**狙い**: 外部サービスと承認付きで安全につながる（Integration Hub）。
**注意**: 外部送信・個人情報・機密情報・本番環境に関わるため、現時点では設計・分類中心。

個別機能（全採用・名称保持）: Integration Hub・Google Calendar連携・Gmail連携・Google Drive連携・Google Docs連携・Slack連携・Teams連携・会計ソフト連携・電子契約連携・銀行 / 入金データ連携・決済サービス連携・LINE連携・WhatsApp連携・CRM / ERP連携・Webhook / API連携・Connector Sync・承認付き外部連携・送信前リスクスキャン

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| INT-001 | Integration Hub / Connector Sync / 承認付き外部連携 / 送信前リスクスキャン | 連携の一元管理と送信前検査 | 既存 connectors/mock・safeFetch・Webhook 基盤の発展 | 2分類→4以降 | HIGH(外部送信) | L4 | HA | **必須** | 要 | 要 | usage_only | prohibited | 顧客PII+社内知識 | Phase 2-H分類 | しない | 連携先ごとの送信可否ポリシー設計 |
| INT-002 | 銀行 / 入金データ連携・決済サービス連携・会計ソフト連携・電子契約連携 | 金銭・契約データの外部接続 | Phase 3（CASH系）の入力源候補 | future(高リスク) | HIGH〜BLOCKED | L4 | HA | 必須 | 要 | 要 | usage_only | prohibited | 財務・契約 | future | しない | 資金移動には絶対に踏み込まない境界 |

## 15. MARKET — Marketplace・業種展開系

**狙い**: テンプレート・スキル・コンプライアンスパックの流通で業種展開を加速する（Marketplace / Skill Store）。

個別機能（全採用・名称保持）: Marketplace / Skill Store・Agent App Store・Workflow Template Store・Industry Templates・Compliance Packs・Learning Marketplace・Certified Skill・Private Marketplace・AI Agent販売・Workflow販売・Integration Connector販売・Dashboard Template販売・Compliance Pack販売・Industry Pack販売・建設・工事テンプレート・不動産テンプレート・士業テンプレート・医療・美容テンプレート・営業会社テンプレート・制作会社テンプレート・コンサルテンプレート・フィールドサービステンプレート

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MARKET-001 | Industry Templates（建設/不動産/士業/医療・美容/営業/制作/コンサル/フィールドサービス） | 業種別の初期設定・デモデータ・フロー | 既存 seed / デモデータ機構の発展 | 7 | MEDIUM | L1 | HD | テンプレ適用は承認 | 要 | 要 | usage_only→billable_candidate_future | prohibited | 社内知識 | Phase 7 | しない | 業種固有法令の確認（士業・医療） |
| MARKET-002 | Marketplace / Skill Store / Agent App Store / Workflow Template Store / 各種販売 | テンプレート・スキルの流通と販売 | FLOW / AIOS 系の成果物流通・課金は Phase 8 依存 | 7〜8 | HIGH(課金絡み) | L2 | HA | 出品審査必須 | 要 | 要 | billable_candidate_future | approval required(将来) | 商品情報 | Phase 7-8 | しない | 審査なし出品の品質・安全リスク |

## 16. ENSHIN — Enshin OS統合系

**狙い**: Enshin OS の機能資産を 369 に安全に吸収する（Enshin OS Feature Assimilation Program）。
**注意**: 無条件に実装しない。Feature Inventory・統合先分類・リスク分類・Phase 分類から始める。**リポジトリ内に Enshin OS の詳細仕様は未確認のため、個別機能は「詳細未確認（証拠不足）」として扱い、推測で断定しない**。詳細は `docs/roadmap/07_enshin_os_feature_inventory.md`。

個別機能（全採用・名称保持）: Enshin OS Feature Assimilation Program・Enshin OS Feature Inventory・Enshin → 369 Mapping・Enshin Risk Classification・Enshin Automation Level分類・Enshin UsageEvent分類・Enshin Phase分類・Enshin機能の全採用方針・Enshin機能の369統合先分類・Enshin機能のリスク分類・Enshin機能のPhase 2以降実装・Enshin由来機能のMCP/API分類・Enshin由来機能の課金分類

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ENSHIN-001 | Enshin OS Feature Inventory / Enshin → 369 Mapping | Enshin 機能の棚卸しと統合先の対応表 | doc07 が初版（詳細未確認のため枠組みのみ） | 2-F | LOW(docs) | L1 | HD | 不要(docs) | 要 | 不要 | never_billable | prohibited | メタ情報 | Phase 2-F | しない | **Enshin 詳細仕様が未提供＝証拠不足** |
| ENSHIN-002 | Enshin Risk / Automation Level / UsageEvent / Phase / MCP/API / 課金 分類 | Enshin 由来機能への本 Registry 基準の適用 | 本書の分類体系をそのまま適用 | 2-F | LOW(docs) | L1 | HD | 不要(docs) | 要 | 不要 | never_billable | prohibited | メタ情報 | Phase 2-F | しない | 分類前の実装着手を防ぐ運用 |

## 17. ROBOT — ロボット・物理世界連携系

**狙い**: 将来のロボット・物理世界連携に備えた安全境界の定義（Robot / External Tool Gateway）。
**注意**: **ロボット実行指示・物理世界に影響する操作は絶対に行わない（blocked）**。分類・安全境界・将来構想のみ。

個別機能（全採用・名称保持）: Robot / External Tool Gateway・Robot Skill Registry・Physical Action Approval・Safety Check・Human Override・Execution Boundary・ロボット操作承認・物理世界操作の安全確認・人間による緊急停止・将来的なロボット連携・物理操作の監査ログ・ロボット実行指示の禁止・承認制

| Feature ID | 機能名 | 狙い | 既存機能との関係 | Phase | Risk | AL | HB | 承認 | 監査 | UE | 課金 | API | データ | 時期 | 今回 | 残リスク |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ROBOT-001 | Robot / External Tool Gateway / Robot Skill Registry | 物理系ツールの登録と境界定義 | GATE 系（Action Gateway）の物理拡張（将来） | future/**blocked** | BLOCKED | L0(現状)/L4(将来目標) | PB→将来HA | 必須(将来) | 必須 | 要(将来) | never_billable | prohibited | 物理 | **実行は blocked・境界定義のみ** | しない | 物理事故は取り返しがつかない（最後まで最厳格） |
| ROBOT-002 | Physical Action Approval / Safety Check / Human Override / 人間による緊急停止 | 物理操作の承認・安全確認・人間優先 | GATE-002（Kill Switch）の物理版 | future/**blocked** | BLOCKED | L0 | PB | 必須(将来) | 必須 | 要(将来) | never_billable | prohibited | 物理 | blocked | しない | Human Override の応答時間保証 |

---

## 18. 検証用サマリー

- 領域数: **17**（AIOS / BRAIN / SALES / HR / MEET / GATE / BILL / API / AUTO / FLOW / CASH / DOC / TRUST / INT / MARKET / ENSHIN / ROBOT）。
- 代表 Feature 行: 各領域 2件以上登録済み。個別機能名は各領域の「個別機能」行にすべて保持。
- 全行「今回実装しない」。実装は各 Phase 入口の個別人間承認による。
- blocked（恒久または当面実装禁止）: HR-002（採否・評価・給与・解雇）、ROBOT 全件（物理実行）、BILL-003 の実課金部分、L5 以上の実行系自動化、MCP/API 公開。
