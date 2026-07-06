---
doc: roadmap/09
title: AI Workforce Infrastructure 定義（8層 / 4層構造）
status: Candidate
area: strategy/definition
phase: Phase 0-26 candidate
risk: low（docs-only・実装なし）
date: 2026-07-06
related:
  - docs/roadmap/00_ikezaki_os_long_term_strategy.md
  - docs/roadmap/02_feature_registry.md
  - docs/roadmap/10_roadmap_phase_0_26_connection_candidate.md
---

# 09. IKEZAKI OS / 369 の定義 — AI Workforce Infrastructure（8層 / 4層構造）Candidate

> 種別: **docs-only / roadmap design candidate**。実装・DB変更・課金・外部送信・実LLM・AIコスト・本番影響は一切含まない。
> 状態: **Candidate**（採用済み構想の整理であり、実装承認済みではない。実装は各 Phase 入口で人間承認）。
> 既存プロンプト非破壊。既存の方針・安全ルール・Phase 管理を置換しない「追加戦略ブロック」。

## 1. 目的

369 / IKEZAKI OS の定義を「多機能SaaS」から **AI Workforce Infrastructure（AI社員基盤）** へ正しく言い換え、GitHub 正本で追える状態にする。

## 2. 背景

- 前回までのロードマップ（`docs/roadmap/00`）は Company Brain / Agent Workforce / Decision & Action Gateway の3本柱を定義済み。
- 今回はそこに **AI社員経済圏・Developer Cloud・Marketplace・PLUG購買・従業員導線・知財 moat** まで含めた全体像を追加する。

## 3. 既存docsとの関係

- 上位: `docs/roadmap/00_ikezaki_os_long_term_strategy.md`（長期構想の正本・非破壊）。
- 機能分類: `docs/roadmap/02_feature_registry.md`。
- 本書は 00 を置換せず、定義レイヤーを 8層/4層へ拡張する Candidate。

## 4. 定義

- **短い定義**: AI社員を雇い、育て、働かせ、進化させる経営OS。
- **中定義**: 人間が主人公であり続けながら、AI社員が24時間365日、事業の全領域を稼働させる **AI Workforce Ecosystem**。
- **本質定義**: 会社の意思・情報・許可・行動・証跡を、AIが安全に使える形に変換する経営OS。
- **事業モデル定義**: 自社のあらゆる業務にAI社員を配置し、日々の営みがそのままプロダクト・データ・収益源に転化する自己増殖型ビジネス基盤。

## 5. 8層構造（Candidate）

1. **Core OS** — 会社 / ユーザー / 権限 / テナント / 監査ログ / 承認 / 通知 / 課金 / データ分離 / セキュリティ。
2. **Company Brain** — 会社方針 / 商品 / 営業プレイブック / 顧客事例 / FAQ / マニュアル / 契約ルール / ブランドルール。
3. **Salesforce Layer** — CRM / SFA / MA / Service / Commerce / CPQ / Partner / Customer Data / Analytics。
4. **Oracle Layer** — 会計 / 請求 / 入金 / 仕訳候補 / 調達 / 購買 / 在庫 / SCM / 人事 / 給与 / 予算 / 経営管理 / GRC。
5. **AI Employee Runtime** — AI社員 / ツール権限 / 実行ログ / 承認ゲート / Human Certification Gate / AI評価 / 失敗時補償。
6. **Developer Cloud** — SDK / CLI / テンプレート / Agent Manifest / Tool Manifest / Sandbox / テスト / 審査 / 配布 / 従量課金。
7. **Marketplace / Economy** — AI社員マーケット / 業界テンプレート / プラグイン販売 / 収益分配 / 企業導入 / 利用量課金。
8. **PLUG Commerce / Procurement Network** — ブラウザ拡張 / EC横断価格比較 / 法人購買 / 承認購買 / アフィリエイト透明化 / 社員配布。

## 6. 4層インフラ構造（Candidate）

- **第1層 Core Infrastructure**: Company Identity / Tenant / RBAC・ABAC / Approval / Audit Log / Business Event Ledger / AI Execution Ledger / Billing / Integration Hub / GitHub Evidence Repository / Obsidian Knowledge Graph / Release Governance / Data Classification / SLO・SLA / Unit Economics。
- **第2層 Business Modules**: CRM / Sales / Quote / Contract / Invoice / Payment / Accounting / HR / Inventory / Purchase / EC / CS / Marketing / ITSM / GRC / PR・SEO / Enterprise Procurement。
- **第3層 AI Agent Layer**: Sales/Accounting/HR/Legal/CS/Executive/Security/Data/PR/SEO/Growth/Docs/Audit AI ＋ Agent Registry / Memory / Logs / Human Approval / Kill Switch / Model Router / RAG Governance / Prompt Injection Safety / AI Cost Governance。
- **第4層 Ecosystem**: API / SDK / MCP / App・Skill・Workflow・Industry・Creator Marketplace / Affiliate・Advocate Network / Developer Portal / Sandbox / Trust Center / Partner Payout Candidate / Sector Deep Packs。

## 7. 反映した資料・要点

- 反映資料: 添付戦略メモ（AI Workforce Infrastructure 定義・8層・4層・中核思想・理念）。
- 要点: 人間が主人公・AIは強化・危険操作は人間承認・記録は資産・使うほど乗り換え困難な資産化。

## 8. やらないこと

- 実装 / DB変更 / migration / schema変更 / 外部送信 / 実LLM / AIコスト / 本番影響。
- 231-252 の正式昇格・Marketplace 実装・PLUG 実装・課金実行。

## 9. 承認ゲート

- 各層の実装は Phase 入口で個別人間承認。危険操作（送金/契約/外部送信/削除/採用評価/会計確定）は Human Certification Gate 必須。

## 10. リスク

- 定義拡張を実装承認と誤読するリスク → 本書は Candidate・非破壊と明記。
- 8層/4層の重複と既存 Feature Registry の不整合 → 次アクションで対応表を作る。

## 11. 次アクション / 人間判断が必要な点

- この定義（8層/4層）を Feature Registry（`docs/roadmap/02`）と突合するか（人間判断）。
- どの層から MVP を優先するか（人間判断・現行は Core OS / Company Brain / CRM 優先）。
