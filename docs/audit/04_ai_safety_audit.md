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
