# 04 — AI 安全性監査

## 実装済み

- Provider 抽象: `getLLMProvider/getEmbeddingProvider/getTranscriptionProvider`、env 未設定で **自動 Fake フォールバック**
- FakeLLM: 入力に基づく「それらしい日本語」を返す（`packages/ai/src/providers/fake-llm.ts`）
- 構造化出力: Zod スキーマ検証（`packages/ai/src/schemas.ts`）、失敗時 fake フォールバック
- ログ: `LLMCallLog` / `AIOutput` モデル存在
- AI 権限制約: `AI_AGENT/AI_ASSISTANT` は外部送信・承認・削除を持たない方針（rbac）
- ガード文言: システムプロンプトで断定的な法務/税務/労務/財務助言を避ける指示

## 不足・要対応

| 重大度 | 項目 | 対応 |
|---|---|---|
| 高 | **prompt injection / indirect injection 対策** | `PromptInjectionDetector`、外部テキスト(web/RAG/メール)を信頼境界として分離 |
| 高 | **RAG の RBAC/機密ラベルフィルタ** | retrieval 時に user 権限 × `confidentialityLabel` × tenantId でフィルタ。`RetrievalLog` に参照根拠 |
| 高 | **RAG poisoning 対策** | `SourceTrustScore`、取込元の検疫、引用必須(`AnswerCitation`) |
| 高 | **HumanApprovalGate の実装** | 外部送信/契約/請求/削除/高機密AI送信は AIから直接実行不可・承認必須(実コードで強制) |
| 中 | **PII マスキング(外部LLM送信前)** | `PiiMasker`。`LLM_MASK_PII` を実際に経路へ適用 |
| 中 | **ToolPermissionChecker** | AIエージェントの tool 実行を権限表で検査（escalation 防止） |
| 中 | **コスト/トークン追跡** | `CostTracker`、`AIUsage`/`AIPointLedger` |
| 中 | **出力の根拠/信頼度/リスクフラグ** | AIOutput に citations/confidence/riskFlags を必須化 |
| 低 | Gemini Provider | interface 準拠で追加 |

## AI 機能ごとの保存項目(要件) 充足度

要件: prompt/model/input/output/structured/referenced/citations/confidence/riskFlags/cost/tokens/latency/actor/tenant/approval。
現状: prompt/model/input/output/structured は概ね有。**citations/confidence/riskFlags/cost/tokens/latency/approval は未保存が多い** → `LLMCallLog`/`AIOutput` 拡張で対応。

## 結論

「Fake でも Real でも動く」基盤は良好。**注入対策・RAG権限フィルタ・承認ゲートの実コード強制・参照ログ**が AI 安全性の最重要欠落。

## Phase 1-3 更新（2026-06-24）

- ナレッジ検索の **AI 参照を DataAccessLog に記録**（機密ラベルでの retrieval フィルタは既存）。
- **高機密データのAI送信**を承認ゲート必須化（`ai_high_confidential_send`）。
残: PromptInjectionDetector、PiiMasker の経路適用、AIOutput への citations/confidence/cost 保存、ToolPermissionChecker。

## Phase 1-4 更新（2026-06-24）

- **PromptInjectionDetector** 実装（`detectPromptInjection` / `runSafetyChecks`）。
- **PiiMasker** 実装（`maskPii` / `containsPii`、masking.ts 拡張）。
- **ToolPermissionChecker** 実装（`checkToolPermission`、AI禁止ツール）。
- **AIOutput 拡張**: inputHash/outputText/citations/confidence/costEstimate/model/safetyFlags を保存。生成ごとに AIOutput＋AISafetyLog＋DataAccessLog。
残: 注入検出を RAG/外部送信の全経路へ、PIIマスクを外部送信実行時に自動適用、AIOutput への引用根拠（citations）充実、コスト実測。

## Phase 1-5 更新（2026-06-24）— AI安全の全経路適用

- **共通安全ヘルパ**を新設し全AI経路で標準化（`apps/web/lib/ai-safety-server.ts` / `safe-external-send.ts` / `safe-ai-run.ts`）:
  - `safeAiInput`（入力の命令注入検出＋AISafetyLog記録。high で生成中止）
  - `saveAIOutputStandard`（AIOutput を task/purpose/entity/inputHash/output/confidence/cost/model/safetyFlags/citations の統一形式で保存。PII フラグ自動付与）
  - `assertAiToolAllowed`（AI が外部送信/削除/承認/権限変更/高機密参照/承認済み実行を直接実行不可。違反は AISafetyLog 記録＋例外）
  - `prepareExternalPayload`（外部送信前 PII マスク済プレビュー＋AISafetyLog(pii_mask)。送信は承認後のみ）
- **全AI経路へ適用**:
  - LeadMap: `analyzeLead`（口コミ＝外部）/`generateOutreachForLead`（外向き生成は high で中止）/`classifyReply`（外部返信＝間接注入面）/ bulk。
  - 会議議事録: 文字起こし（外部由来）に注入検出、AIOutput を標準保存。
  - コミュニケーション: 外部受信本文に注入検出。
  - ナレッジ検索: クエリの注入検出（high は回答せず安全注意を表示）。
- **管理画面**: `/admin/ai-safety`（AISafetyLog、社長/役員/管理者のみ）・`/admin/ai-outputs`（AIOutput、audit:read）。
- **Provider 準備**: `TextAIProvider`/`OCRProvider`（請求書抽出）/`VoiceProvider`（通話要約）の interface＋Fake を追加（差し替え口）。
- 方針: 生成（外向き）は high で中止、外部コンテンツの分析/分類は検出＋記録のうえ継続（FakeLLM は決定論で安全）。誤検知で正常業務を止めない。
- テスト: unit 125 / integration 28（AISafetyLog 各チェック記録・AIOutput 標準保存・テナント分離）。e2e `security.spec.ts`（注入無害化・権限分離）を追加。
残: PIIマスクの送信実行時自動適用（実送信経路実装と同時）、citations 実データ充実、コスト実測、MFA/改ざん検知/レート制限/CSP。

## Phase 1-7 更新（2026-06-24）

- Operations 実行管理（棚卸/発注/物流/人員/リスク）は決定論ロジック中心で AI 生成は限定的。Phase 1-6 の `createEventNextProposalAction`（safeAiInput→saveAIOutputStandard）を踏襲。
- AI 拡張余地（棚卸差異要約/発注理由文/リスク対策案）は安全基盤（safeAiInput/saveAIOutputStandard）前提で次フェーズ。外部送信は引き続き持たない（AI は外部送信ツール不可）。
