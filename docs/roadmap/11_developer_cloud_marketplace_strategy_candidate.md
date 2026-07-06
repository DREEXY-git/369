---
doc: roadmap/11
title: Developer Cloud / Marketplace / Safety Review / Revenue Share 戦略
status: Candidate
area: strategy/ecosystem
phase: 事業Phase 8-9 / OS本体Phase 11-16 / 戦略構想Phase 20-24 candidate
risk: medium（将来 外部開発者・課金・審査を伴う。今回は docs-only）
date: 2026-07-06
related:
  - docs/roadmap/09_ai_workforce_infrastructure_definition_candidate.md
  - docs/roadmap/13_ip_moat_strategy_candidate.md
---

# 11. Developer Cloud / AI社員 Marketplace 戦略（Candidate）

> 種別: **docs-only / strategy candidate**。実装・API公開・課金・外部送信・実LLM・AIコストなし。
> 状態: **Candidate**。正式 Function Master 昇格・DB化・画面/API 実装は別承認。

## 1. 目的

「開発者が 369 上で作る方が儲かり・速く・安全で・顧客に届く」状態を設計候補として固定する。

## 2. 背景 / 既存docsとの関係

- 既存 `docs/roadmap/06_mcp_api_exposure_matrix.md`（MCP/API公開の内部scope設計）と接続。公開は将来・別承認。
- 収益化は既存方針どおり **Phase 8 まで実課金凍結**（`docs/roadmap/00`）。

## 3. Developer Cloud（3タイプ）

- **テンプレート型**（非エンジニア/業務担当/経営者）: 質問に答えるだけで AI社員を調整。
- **ブロックビルダー型**（ノーコード制作者/コンサル/情シス）: 12ブロックを組合せ。
- **コード/SDK型**（AI会社/上級開発者/SIer/研究機関）: Agent SDK / API で自由設計。

## 4. AI社員パッケージ標準構造（14要素・Candidate）

Agent Manifest / Role Definition / Tool Permissions / Company Brain Scope / Prompt Policy / Workflow / Approval Rules / KPI / Evaluation Rule / Billing Rule / Audit Rule / Version / Template Metadata / Marketplace Metadata。

- **Agent Manifest 候補項目**: name / version / role / runtime / tools / company_brain_scope / permissions / approval_required / kpi / billing / audit / forbidden_actions / developer / marketplace。
- **権限は三値**: `ai_only` / `human_approval` / `forbidden`。

## 5. Safety Review / Certification（10審査 + バッジ）

- 審査: Manifest整合 / ツール権限妥当性 / Company Brainスコープ / Prompt Policy / エッジケース / 監査ログ完全性 / PIIリーク耐性 / 悪意入力耐性 / コスト暴走防止 / 業界規制遵守。
- バッジ候補: Safety Verified / Privacy Ready / SOC2 Ready / Finance Certified / Legal Approved / Enterprise Ready / Top Performer / 369 Official。

## 6. Marketplace

- 販売カテゴリ: AI社員 / AI補助社員 / 業務ツール / テンプレート / ブロック / ワークフロー / Company Brain拡張 / 業界特化。
- 必須: 審査済みのみ流通・権限表示・データ利用範囲表示・外部送信有無表示・企業管理者承認導入・返金ルール・レビュー。

## 7. 課金 / Revenue Share（Candidate）

- 開発時課金（テンプレ/ブロック/SDK API/Brain参照/Sandbox/推論トークン/審査費/登録費）＋稼働時課金（タスク/ツール呼出/Brain参照/承認/トークン/ストレージ/監査保存）。
- 369収益源: 基本料 / 従量手数料 / Runtime稼働費 / 販売手数料 / 開発環境サブスク / 審査認定料。開発者収益: 販売収益 / 稼働ロイヤリティ / テンプレ販売 / 保守契約。

## 8. やらないこと

- 実 API 公開 / 実課金 / 実 Marketplace 出品 / 外部開発者受入 / 実 LLM。
- Partner Payout の無承認開始・審査を無承認で外す機能。

## 9. 承認ゲート / リスク

- 承認: 外部公開・課金・審査基盤・Revenue Share は重い個別承認。
- リスク: 審査なし流通で信頼毀損／コスト暴走／権限過剰。→ 審査必須・三値権限・AI Cost Governance で緩和。

## 10. 次アクション / 人間判断

- 内部 scope 設計（`docs/roadmap/06`）の範囲で Agent Manifest の項目定義を docs 化するか（人間判断）。
- Developer Cloud を事業Phase 8 として着手するか、CRM/Growth を先行するか（人間判断）。
