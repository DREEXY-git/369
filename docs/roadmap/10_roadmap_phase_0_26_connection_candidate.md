---
doc: roadmap/10
title: Phase 0-26 三系統ロードマップ接続
status: Candidate
area: strategy/roadmap
phase: Phase 0-26 candidate
risk: low（docs-only・実装なし）
date: 2026-07-06
related:
  - docs/roadmap/00_ikezaki_os_long_term_strategy.md
  - docs/roadmap/01_phase2_master_roadmap.md
  - docs/roadmap/09_ai_workforce_infrastructure_definition_candidate.md
---

# 10. 三系統ロードマップ接続 — OS本体 Phase 2.5-18 / 戦略構想 Phase 18.5-26 / 事業 Phase 0-20（Candidate）

> 種別: **docs-only / roadmap connection candidate**。実装・DB変更・課金・外部送信なし。
> 状態: **Candidate**。既存 `docs/roadmap/01_phase2_master_roadmap.md`（現行 Phase 2 の実運用ロードマップ）を壊さず接続する。

## 1. 目的

3種類のロードマップ（混同されがち）を、矛盾なく1枚に接続する。

## 2. 既存docsとの関係（重要）

- **現行の実運用ロードマップは `docs/roadmap/01_phase2_master_roadmap.md`（Phase 2 系）と `tasks/CURRENT_STATE.md` を正とする**。本書はそれを置換しない。
- 本書は「PDF戦略上の3系統」を接続する上位マップの Candidate。実際の着手は現行ロードマップ＋個別人間承認に従う。

## 3. 三系統の定義

- **系統A: OS本体ロードマップ（Phase 2.5-18）** — 初期MVP → 承認監査基盤 → Brain拡充 → AI社員テンプレ → 従量課金 → Fit-Gap → β外部提供 → GA → エコシステム → Studio/Builder → 自己進化 → 品質信頼 → Marketplace → 完成体。
- **系統B: 戦略構想ロードマップ（Phase 18.5-26）** — Agent Runtime標準化 → Company Brain API Public → AI Employee Studio → Block Builder → SDK/Developer Portal → Safety Review/Certification → 369 Marketplace Launch → Developer Ecosystem → Open AI Workforce Economy。
- **系統C: 事業ロードマップ（Phase 0-20）** — Core OS/安全基盤 → Company Brain → CRM → AI Growth Engine → Human Certification Gate → Oracle Mini/ERP → PLUG Commerce → EC → Developer Cloud → AI社員Marketplace → SCM → HCM → Data Cloud → Service → Marketing → Industry Cloud → 従業員配布 → External API → Billing/Revenue Share → Enterprise Governance → 369経済圏。

## 4. Phase 対応表（Candidate・粗い対応）

| 事業(C) | OS本体(A) | 戦略構想(B) | 現行実装状況 |
|---|---|---|---|
| 0 Core OS/安全基盤 | 2.5-3 | — | **進行済み**（tenantId/権限/監査/承認/機密ラベル/本番確認文化） |
| 1 Company Brain | 4 | 19(API公開は将来) | **進行済み**（read-only→人間書込→AI参照・doc36〜80） |
| 2 CRM | 2.5-5 | — | 一部（Phase 2 系で継続） |
| 3 AI Growth Engine | 5-7 | — | 設計段階 |
| 4 Human Certification Gate | 3 | 23 | 設計/一部（承認・監査は実装済み土台あり） |
| 5 Oracle Mini/ERP | 5-6 | — | Phase 1 で finance 土台あり |
| 6 PLUG Commerce | 16 | 24 | **Candidate**（未着手・docs/roadmap/12） |
| 8 Developer Cloud | 11-13 | 20-22 | **Candidate**（docs/roadmap/11） |
| 9 AI社員 Marketplace | 16 | 24 | **Candidate**（docs/roadmap/11） |
| 18 Billing/Revenue Share | 6 | 24 | **Phase 8 まで実課金凍結**（既存方針） |
| 20 369経済圏 | 18 | 26 | **Candidate** |

## 5. 反映した資料・要点

- 反映資料: PDF戦略の Phase 2.5-18 / 18.5-26 / 事業 Phase 0-20 / 時系列（Day 6-720）。
- 要点: Developer Cloud を後ろに置きすぎない／Marketplace は安全審査前提／PLUG は透明性前提／実課金は Phase 8 まで凍結。

## 6. やらないこと

- Phase の実装着手・順序の確定（人間判断）。実装・課金・外部送信・本番影響なし。

## 7. 承認ゲート

- 各 Phase 入口で個別人間承認。β外部提供・GA・Marketplace公開・実課金・Enterprise は重い承認。

## 8. リスク

- 3系統の番号衝突による混乱 → 本対応表で吸収。番号は「系統名＋Phase番号」で必ず併記する。
- 現行ロードマップとの二重管理 → 現行 `01_phase2_master_roadmap.md` を正とし、本書は上位接続に限定。

## 9. 次アクション / 人間判断

- 直近の実運用は現行 Phase 2 系＋`tasks/CURRENT_STATE.md` を継続（変更なし）。
- どの系統・どの Phase を次に前進させるかは人間選択（現行の Data Classification / Customer Pain ラインは docs/audit/105-114 が正）。
