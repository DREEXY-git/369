# 80. マスターロードマップ（4軸）＋競合機能台帳（v6.1・Candidate）

- 日付: 2026-07-11
- 対応指令: v6.1 完全復旧・AI社員開発環境・競合製品機能台帳・全体ロードマップ統合（Codex PR #13）
- 対応 recovery: `claude/full-recovery-v61`（PR #14・head `b1cc686`）／固定統合 head `7ef2d9f`（PR #12）
- 位置づけ: 曖昧な「Phase 3」表記をやめ、**固有 workstream ＋証拠段階**で現在地を表す。完成率は主観で出さず、分母と証拠段階を併記する。
- 正本境界: 完全機能台帳の生成物（`docs/function-master/` 生成 JSON/MD）は Codex 所有・**本書は手編集しない**。本書は台帳の Stable ID を**参照**する分析ドキュメント。存在しない ID は新規作成しない（未対応は `UNMAPPED_CANDIDATE`）。

## 1. North Star（不変）

完成形 = **人間社員と AI 社員が一緒に会社を動かす、自己進化型エージェント経営 OS**。3本柱を維持:
- Company Brain（会社の頭脳）
- Agent Workforce（AI 社員）
- Decision & Action Gateway（安全な実行門）

Human Boundary と Trust Center が全体を包む。人間を労働から解放する度合いは、架空の削減時間ではなく**証拠付き Outcome / Human Time Ledger**（区分×単位で分離・二重計上なし）で測る。

## 2. Phase 表記の4軸併記ルール（v6.1 の恒久ルール）

単一の「Phase 3」で異なるロードマップを混在させない。以後の全報告は次の4軸を併記する。

| 軸 | 用途 | 例 |
|---|---|---|
| Repository lineage Phase | 実装ブランチ/PR の系譜 | feature `24782cc` → integration `7ef2d9f`(PR#12) → recovery `b1cc686`(PR#14) |
| Business Phase 0-20 | 事業能力ロードマップ | 下表 workstream |
| Strategy/PDF Phase | 長期構想・資料上の段階 | roadmap00 §6 の Phase 1〜9/Y |
| R Stage | Readiness/Release 段階 | 下記「証拠段階」 |

各 workstream には固有名を付ける: `P3-GROWTH` / `P3-Q2C` / `P35-CHANNELS` / `P4-WORKFORCE` 等。「Phase 3」単独で報告しない。

## 3. 証拠段階（Evidence Stage・v6.2 厳密化）

各 Epic/Function を主観の完成率でなく、この段階で表す（分母を併記）。**schema/model の存在だけで `PRODUCTION_VERIFIED` にしない**（Codex P2 指摘）。Draft/CI/main/Preview/Production を混同しない。

| 段階 | 意味 |
|---|---|
| `PRODUCTION_VERIFIED` | main 統合済み＋Production で Function 単位の実証あり（本番として別記録） |
| `CI_VERIFIED` | 固定 SHA の CI で受入条件を検証（Preview/main/本番は未証明） |
| `DRAFT_IMPLEMENTED` | Draft branch に実装あり（未 CI 検証 or 未 main） |
| `SCHEMA_ONLY` | schema/model のみ（画面・実装・証拠なし） |
| `IMPLEMENTATION_UNVERIFIED` | 実装または証拠を独立確認していない |
| `EVIDENCE_GAP` | 実装主張に必要な証拠が不足（完了へ格上げしない） |
| `DEFERRED` | 実装予定だが後続 Wave |
| `ROADMAP_ONLY` | 将来目標として台帳化済み（要求はあるが実装 Evidence 行なし） |
| `NOT_PLANNED` | **人間が明示的に「実装しない」と決めた場合だけ** |

注: `CI_VERIFIED` の Function-ID 実証は `FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md`（Codex 正本）を参照し、未記載 ID は `IMPLEMENTATION_UNVERIFIED`。カテゴリ一部の証拠を全体完成にしない。Vercel Preview は本番ではない。

## 4. 基準ロードマップ（workstream × 証拠段階）

| Workstream | 内容 | Strategy Phase | 現状（証拠段階・分母つき） | HOLD / 再開条件 | 次の1件 |
|---|---|---|---|---|---|
| Foundation | 統合OS・CRM・LeadMap・会計/在庫等 MVP | 1 | `PRODUCTION_VERIFIED`（Phase 1 完了・基準 `e95f887`・doc25） | — | 個別機能の ASSISTIVE 化 |
| Quality | CI 4段・E2E・静的安全ゲート | X | `PRODUCTION_VERIFIED`（Phase X 完了・恒久資産） | — | E2E カバレッジ拡張 |
| P2-BRAIN | Company Brain・Playbook・Case Study・Consent | 2 | `PRODUCTION_VERIFIED`（Phase 2-A/B/C 完了） | — | Customer Pain / 公開活用（別承認） |
| P3-GROWTH | Growth Control Tower・成果台帳・承認導線 | 3 | `CI_GREEN`（PR#12/#14・Draft・HOLD） | 人間 GO＋ATOMIC_LEDGER | Preview 目視 |
| P3-Q2C | 見積・契約・請求・入金・会計入口・督促下書き | 3 | 会計 schema=`SCHEMA_ONLY`／請求UI=`IMPLEMENTATION_UNVERIFIED`／AI 高度化=`REQUIREMENT_ONLY` | 高リスク・実請求/実送金は不可 | CASH-001 read-only+draft の Gate |
| P35-CHANNELS | 広告(C19)・SEO(C21)・紹介(C22) | 3.5 | C19/C21=`CI_GREEN`(Draft)／C22=`REQUIREMENT_ONLY`(Gate) | 人間承認 bridge・外部封印 | 1チャネルの人間承認接続 |
| P4-WORKFORCE | AI社員・Control Plane・3D Office・Outcome | 4 | `CI_GREEN`（PR#14・recovery 最優先）／Preview 未監査 | Exit Gate（§5）・人間 GO | Preview 目視＋Codex Track B |
| P5-MEETING-INTEL | 高度会議知能・知識変換 | 5 | 基本会議=Foundation／高度化=`REQUIREMENT_ONLY` | 設計 Gate | Meeting Decision DB 設計 |
| P6-BUSINESS-TWIN | 経営ダッシュボード/Business Twin(AIOS-004) | 6 | `REQUIREMENT_ONLY` | 未着手 | finance 集計の read-only 派生設計 |
| P7-TEMPLATES-MARKETPLACE | 業種テンプレ・審査済み Marketplace(MARKET) | 7 | `REQUIREMENT_ONLY` | 課金依存(P8) | 分類のみ |
| P8-BILLING | 369 自体の課金・credit・SaaS化 | 8 | 凍結（`REQUIREMENT_ONLY`・実課金なし） | 明示解禁承認 | UsageEvent 台帳維持 |
| P9-ENTERPRISE | SSO/SCIM/Trust Center 本格化(TRUST-003) | 9 | `REQUIREMENT_ONLY` | 未着手 | 自前認証との併存設計 |
| Phase Y / GTM | 導入・販売・サポート・事業運営 | Y | `REQUIREMENT_ONLY` | 未着手 | — |

## 5. P4-WORKFORCE Exit Gate（完了条件・すべて必須）

1. AI社員基盤＋3D Office が read-only 運用可視化として **Production で確認済み**。
2. Ads/SEO/紹介のうち**最低1チャネルが read-only分析→AI下書き→人間承認まで接続**（外部公開・広告費・送信は封印）。
3. 既知 Critical 0 / High 0（`EVIDENCE_GAP` は完了へ格上げしない）。
4. 完全機能台帳の GitHub 正本と Obsidian 鏡像が一致し `ATOMIC_LEDGER_SYNC` の HOLD 解除条件を満たす。
5. 外部送信・実LLM・実課金・実送金・MCP 外部公開の封印維持。
6. Codex review・main 系譜・Production 証拠を**分離して記録**。

## 6. AI社員開発環境ロードマップ（§13）

「AI社員開発環境」を一語で扱わず Epic へ分解し、台帳候補 ID へ接続する（ID は Feature Registry 実読・不在は `UNMAPPED_CANDIDATE`）。

| Epic | 必須能力 | 台帳候補ID | workstream | 証拠段階 | 次の薄い縦切り |
|---|---|---|---|---|---|
| Agent Registry | ID・役割・所属・状態・owner・version | AIOS-001 | P4-WORKFORCE | `CI_GREEN`（AIAgent＋read model・PR#14） | 状態算出の統一（完了） |
| Persona/Profile | 正本プロフィール・portrait・役割 | USR-003 系 | P4-WORKFORCE | `CI_GREEN`（getAiCharacter 単一正本・PR#14 統一） | 評価/スキルの根拠注記 |
| Skill Registry | skill 定義・version・依存・権限・評価 | AIOS-001 | P4-WORKFORCE | `REQUIREMENT_ONLY` | read-only skill 一覧 |
| Tool Registry | tool manifest・scope・risk・approval | GATE-002 | P4/Gateway | `REQUIREMENT_ONLY` | tool 台帳（read-only） |
| Prompt Registry | template・version・rollback・review | `UNMAPPED_CANDIDATE` | P4-WORKFORCE | `SCHEMA_ONLY`（PROMPT_TEMPLATES 既存） | prompt version 表示 |
| Sandbox | fake data・隔離実行・fixture・no external send | AIOS-002 | P4-WORKFORCE | `IMPLEMENTED_ON_DRAFT`（FakeLLM/封印 env） | sandbox 実行ログ可視化 |
| Evaluation Center | golden set・否定系・安全・品質・回帰 | C05 | P4-WORKFORCE | `SCHEMA_ONLY`（AISafetyLog 既存） | 評価結果 read-only |
| Run Lifecycle | queue・retry・idempotency・pause/resume | AIOS-001 | P4-WORKFORCE | `CI_GREEN`（lifecycle CAS＋stale 修正・PR#14） | — |
| Memory/Knowledge | Company Brain 参照・memory 境界・出典 | BRAIN-001/002 | P4/Brain | `PRODUCTION_VERIFIED`（AI参照＋ai_reference ログ） | office 連携 |
| Budget/Cost | budget・usage・上限・警告・実課金なし | AIOS-002 | P4-WORKFORCE | `REQUIREMENT_ONLY` | usage 表示（非課金） |
| Human Inbox | 承認・差戻し・説明・resume | AIOS-005 | P4/Gateway | `CI_GREEN`（Human Work Inbox・deep link のみ） | 承認 bridge 設計(roadmap78) |
| Observability | logs・trace・outcome・human time・failure | USR-004 | P4-WORKFORCE | `CI_GREEN`（Outcome 台帳・区分×単位） | — |
| Release Stages | draft・sandbox・pilot・production・rollback | `UNMAPPED_CANDIDATE` | P4-WORKFORCE | `REQUIREMENT_ONLY` | 段階表示 |
| 3D Office | evidence-derived state・task・profile・deep link | USR-003 | P4-WORKFORCE | `CI_GREEN`（PR#14・双方向 deep link・状態統一） | Preview 目視 |
| Agent Studio | 人間が役割/skill/guardrail を設定する UI | `UNMAPPED_CANDIDATE` | P4次段 | `REQUIREMENT_ONLY` | **次の薄い縦切り候補=Agent Development Console v0（read-only・既存 schema・別 Gate）** |
| External Developer Platform | SDK・MCP/API・審査・Marketplace | API-001/002/003 | future/P7-P9 | `REQUIREMENT_ONLY`（公開は future・封印） | 内部 scope 設計のみ |

**次の薄い縦切り = `Agent Development Console v0`**（recovery 完了後に Gate 作成・既存 schema で成立する read-only から・新 schema/外部 SDK/MCP 公開は別の人間承認）。

## 7. Salesforce 相当 競合機能台帳（§14）

「Salesforce と同じ」と断言しない。capability 単位の**方式**を付ける: `NATIVE`（自前実装）/`ASSISTIVE`（AI 下書き・可視化）/`CONNECTOR`（外部接続・封印/future）/`DEFERRED`（後続 Wave 実装予定）/`HUMAN_ONLY`。競合のコード・UI・文章・商標はコピーせず、公開仕様と業務要件から独自実装する。**証拠段階は Function-ID 単位**（module 単位の Phase 1 本番 GO は §4 Foundation 行を参照。Function-ID 実証は Codex Evidence 正本の未記載＝`IMPLEMENTATION_UNVERIFIED`）。「同等」「超えた」は受入証拠が揃うまで宣言しない。

| Capability | 現行実装 | 方式 | 証拠段階 | 主な Gap / 次の縦切り |
|---|---|---|---|---|
| Account / Customer | `Customer` model・/customers | NATIVE | `IMPLEMENTATION_UNVERIFIED` | 閲覧境界は完了 |
| Contact | `Contact` model | NATIVE | `IMPLEMENTATION_UNVERIFIED` | — |
| Lead | LeadMap AI・`Lead` | NATIVE | `IMPLEMENTATION_UNVERIFIED` | 抽出は Demo/公式 API のみ |
| Opportunity / Deal | `Deal`・/deals | NATIVE | `IMPLEMENTATION_UNVERIFIED` | — |
| Pipeline / Kanban | /deals/kanban・`DealStageHistory` | NATIVE | `IMPLEMENTATION_UNVERIFIED` | — |
| Activity / Task / Meeting / Calendar | `CustomerInteraction`・meeting・horenso | NATIVE(部分) | `IMPLEMENTATION_UNVERIFIED`(基本) | Calendar 連携=CONNECTOR future(INT) |
| Campaign / Attribution / Growth | `MarketingCampaign`＋Growth Ledger＋C19 Ads | ASSISTIVE | `CI_GREEN`(Draft) | 実広告 API=CONNECTOR 封印 |
| Quote / Contract / Order | `Quote`/`QuoteLineItem`・見積 | NATIVE(quote)/部分(contract) | `IMPLEMENTATION_UNVERIFIED`(quote) | 契約=DOC-001 future |
| Forecast / Territory / Lead Scoring | CASH-002 予測(設計)・—・— | ASSISTIVE/DEFERRED | `REQUIREMENT_ONLY` | Lead Scoring=DEFERRED |
| Customer Service / Case / SLA | `CustomerComplaint` | NATIVE(部分) | `SCHEMA_ONLY` | SLA=DEFERRED |
| Omnichannel Communication | Email/DM 基盤(OutreachDraft) | ASSISTIVE | `CI_GREEN` | 実送信=封印(EXTERNAL_SEND) |
| Reports / Dashboard / Analytics | 各ダッシュボード・管制塔 | NATIVE | `IMPLEMENTATION_UNVERIFIED` | Business Twin=P6 |
| Workflow / Approval / Automation | `ApprovalRequest`／FLOW(将来) | NATIVE(承認)/future(flow) | `IMPLEMENTATION_UNVERIFIED`(承認) | Workflow Fabric=P4 以降 |
| RBAC / Field Security / Audit / Consent | rbac.ts・labels.ts・writeAudit・ConsentRecord | NATIVE | `IMPLEMENTATION_UNVERIFIED` | Field Security=部分 |
| Import / Export / Dedup / Data Quality | export(部分) | NATIVE(部分)/DEFERRED | `SCHEMA_ONLY` | Dedup=DEFERRED |
| Custom Object / Metadata / API | — | future | `REQUIREMENT_ONLY` | API-001 Gate |
| App Marketplace / Integration | MARKET(P7)・INT(future) | CONNECTOR future | `REQUIREMENT_ONLY` | 分類のみ |
| Mobile / Offline | レスポンシブ UI | NATIVE(部分)/DEFERRED | `IMPLEMENTATION_UNVERIFIED`(responsive) | Offline=DEFERRED |
| AI Sales Assistant / Copilot | AIOS-003＋SALES-002 | ASSISTIVE | `REQUIREMENT_ONLY`〜draft | 商品推奨の縦切り |

## 8. マネーフォワード / freee 相当 競合機能台帳（§15）

方式タグは §7 と同一。**369 は「検知・予測・下書き・可視化・承認要求」まで。実送金/実支払/実課金/税務断定/仕訳の無承認確定はしない。公式会計/銀行/決済 connector は future Gate・資金移動は人間承認と外部システム境界を必須。**

| Capability | 現行実装 | 方式 | 証拠段階 | 主な Gap / 境界 |
|---|---|---|---|---|
| Chart of Accounts | `Account` model | NATIVE | `IMPLEMENTATION_UNVERIFIED`(schema) | — |
| General Ledger / Journal Entry | `JournalEntry`/`JournalEntryLine` | NATIVE | `IMPLEMENTATION_UNVERIFIED`(schema) | 仕訳確定は人間 |
| AR / Invoice / Collection | `Invoice`＋dunning＋CASH-001 | NATIVE(請求)/ASSISTIVE(督促) | `IMPLEMENTATION_UNVERIFIED`(invoice)/`REQUIREMENT_ONLY`(督促AI) | 実送信=封印 |
| AP / Bills / Payment Request | `InvoiceCandidate`/`Expense` | NATIVE(部分)/HUMAN_ONLY(支払) | `SCHEMA_ONLY` | 実支払=HUMAN_ONLY |
| Expense / Receipt / OCR | `Expense` model | NATIVE/DEFERRED(OCR) | `IMPLEMENTATION_UNVERIFIED`(expense) | OCR=DOC future |
| Bank / Card Feed | INT-002 | CONNECTOR future | `REQUIREMENT_ONLY` | 資金移動非踏込 |
| Reconciliation | `JournalCandidate` | ASSISTIVE | `SCHEMA_ONLY` | 確定は人間 |
| Cash Flow / Forecast / Budget | /finance/cashflow＋CASH-002 | ASSISTIVE | `CI_GREEN`(read-only)/`REQUIREMENT_ONLY`(予測) | 断定表示禁止(信頼度併記) |
| Closing / Financial Statements | finance 集計 | NATIVE(部分) | `SCHEMA_ONLY` | 決算確定=HUMAN_ONLY |
| Fixed Asset / Depreciation | — | DEFERRED | `REQUIREMENT_ONLY` | — |
| Tax / 電子帳簿 / インボイス制度 | — | HUMAN_ONLY/DEFERRED | `REQUIREMENT_ONLY` | 税務断定しない |
| Payroll / Attendance / HR | HR モジュール | NATIVE(部分)/HUMAN_ONLY(給与) | `SCHEMA_ONLY` | 給与/評価確定=HUMAN_ONLY |
| Approval / Segregation of Duties | `ApprovalRequest`・RBAC | NATIVE | `IMPLEMENTATION_UNVERIFIED` | — |
| Audit Trail / External Accountant | writeAudit/writeDataAccess | NATIVE/DEFERRED(会計士連携) | `IMPLEMENTATION_UNVERIFIED`(audit) | 会計士連携=future |
| API / Connector / Import Export | — | future | `REQUIREMENT_ONLY` | API-001/INT Gate |
| Anomaly / Dunning Draft / Prediction | anomaly.ts＋CASH-001/002 | ASSISTIVE | `SCHEMA_ONLY`〜draft | 実送信/断定=禁止 |

**総括**: 369 は会計ソフトを「置き換え済み」とは言わない。会計 schema は自前で持ちつつ、**AI は未回収検知・督促下書き・入金予測まで**。実際の会計処理・送金は既存会計ソフト＋人間承認へ委ねる（CONNECTOR は future Gate）。

## 9. 段階的完全実装 方針とロードマップ Wave（v6.2・人間方針）

正式方針（人間決定・2026-07-12）:
1. **まず安全で一貫した MVP をリリース**する（Release Gate）。
2. リリース後、**全機能の完全実装を段階的**に目指す。
3. 最初の拡張は各業務カテゴリで **AI を活用した DX と Marketing**。
4. Salesforce/MoneyForward/freee 等の主要 capability も**将来実装対象から削除しない**（`NOT_PLANNED` を廃し `DEFERRED`/`ROADMAP_ONLY` へ）。
5. 競合のコード・UI・文章・商標をコピーせず、公開仕様と業務要件から独自実装する。
6. 「同等」「超えた」は受入証拠が揃うまで宣言しない。

### Wave 定義

| Wave | スコープ | 主対象 |
|---|---|---|
| Release Gate | v6.2 復旧・安全性・機能復元・AI社員連動 | High 0・NAV 67・8名 parity・build 識別 |
| Wave 1 | 各カテゴリの **AI DX＋Marketing** | 下記共通縦切りで全カテゴリ |
| Wave 2 | CRM/SFA/Service の主要 Salesforce 系 | Lead Scoring/Routing/Dedup/SLA/Forecast/Workflow/Service・Case/Knowledge/Analytics/Integration/Offline |
| Wave 3 | 会計・財務・請求・経費の主要 MoneyForward/freee 系 | OCR/銀行・カード連携/仕訳/総勘定元帳/債権債務/経費/請求/入金消込/固定資産・減価償却/税務/電子帳簿/インボイス制度/外部会計士連携 |
| Wave 4 | 人事・労務・給与・電子帳簿・税務・固定資産 | 従業員台帳/勤怠/給与/年末調整/社会保険/労務手続/評価/採用/電子契約・証憑保管 |
| Wave 5 | 外部連携・Marketplace・Enterprise・Global | INT/MARKET/TRUST-003/多言語 |

**Wave 1 の各カテゴリ共通縦切り**: `read-only分析 → AI下書き → 人間承認 → 統制された実行 → 成果台帳`。
外部送信・実LLM・課金・実支払・法務/税務/労務の断定は、**個別 Gate まで封印を維持**。

### 上記方針による `NOT_PLANNED` → `DEFERRED`/`ROADMAP_ONLY` の格上げ（target wave/依存/受入条件付き）

| 機能群 | 旧 | 新 | target wave | 依存 | 受入条件（証拠段階） | 責任領域 |
|---|---|---|---|---|---|---|
| Salesforce系（Lead Scoring/Routing/Dedup/SLA/Forecast/Workflow/Service・Case/Knowledge/Offline/Analytics/Integration） | NOT_PLANNED | `DEFERRED` | Wave 2 | CRM Foundation・API-001 | 各 capability に Function ID＋`CI_VERIFIED` 以上・独自実装 | Claude 実装／Codex Evidence |
| MoneyForward/freee系（OCR/銀行・カード連携/仕訳/総勘定元帳/債権債務/経費/請求/入金消込/固定資産・減価償却/税務/電子帳簿/インボイス制度/外部会計士連携） | NOT_PLANNED | `DEFERRED`（実送金/税務断定は `HUMAN_ONLY` 維持） | Wave 3 | 会計 schema・INT-002・DOC-001 | read-only→下書き→人間承認までの縦切り・実送金なし | Claude 実装／人間承認 |
| 人事労務系（従業員台帳/勤怠/給与/年末調整/社会保険/労務手続/評価/採用/電子契約・証憑保管） | NOT_PLANNED | `DEFERRED`（給与確定/評価確定/採否は `HUMAN_ONLY`） | Wave 4 | HR schema・電子契約 CONNECTOR | 補助・要約・下書きまで・確定は人間 | Claude 実装／人間承認 |

正式 Function ID がない機能は創作せず `UNMAPPED_CANDIDATE` として Codex へ `CODEX_EVIDENCE_UPDATE_REQUEST` で通知する。

## 10. 完全機能台帳との接続（§16）

- 既存 Stable ID を優先参照。新 ID を安易に作らない。対応 ID 不在は `UNMAPPED_CANDIDATE`。
- Draft / main / Production の Evidence を分離（本書の証拠段階列がそれ）。
- 生成ファイル（`docs/function-master/` 生成物）は Codex 所有・**本書は手編集せず参照のみ**。ID 追加・件数変更が要る場合は `CODEX_CHANGE_REQUEST` で通知する。
- GitHub 正本と Obsidian 鏡像の同期・broken link / secret scan は Codex Track A/B と連携。
