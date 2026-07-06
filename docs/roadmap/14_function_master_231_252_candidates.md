---
doc: roadmap/14
title: Function Master 231-252 Candidates
status: Candidate
area: strategy/function-master
phase: 横断 candidate
risk: low（docs-only・Candidate扱い）
date: 2026-07-06
related:
  - docs/roadmap/02_feature_registry.md
---

# 14. Function Master 231-252 Candidates（正式昇格前）

> 種別: **docs-only / candidate catalog**。**231-252 は正式 Function Master ではなく Candidate**。
> **DB化・画面実装・API実装・正式 Function Master 昇格は別承認**。既存 `docs/roadmap/02_feature_registry.md` は正・非破壊。

## 1. 目的

チャットで追加された 231-252 の候補領域を、正式昇格せず Candidate として GitHub 正本に整理する。

## 2. 既存docsとの関係

- 正式な機能分類の正本は `docs/roadmap/02_feature_registry.md`。本書はそこへ昇格する**前段の候補リスト**。
- 各 Candidate は「目的・機能候補・承認ゲート・禁止事項・既存領域との重複」を持つ（下記は要約。詳細昇格時に個別 doc 化）。

## 3. Candidate 一覧（231-252）

- **231 Terms / Policy / Consent Governance** — 各種規約・同意履歴/バージョン/撤回・法務確認フロー。重複: 既存 Consent/Suppression。
- **232 Incident / BCP / Recovery** — インシデント/障害/AI誤実行検知・rollback・RPO/RTO・postmortem。
- **233 API / Event / Ledger Version Governance** — API/Event/Ledger versioning・deprecation・contract tests・idempotency・outbox。
- **234 Data Migration / Portability / Exit** — 取込/名寄せ/移行リハーサル・エクスポート・解約時返却/削除・Legal Hold。
- **235 Customer Success / Support / Education** — オンボーディング/ヘルプ/教材/定着スコア/Time to Value。
- **236 Accessibility / Mobile / Field UX** — モバイル/現場モード/音声・写真入力/やさしい日本語/ロール別UI。
- **237 Marketplace / Creator / Affiliate Quality** — 審査/誇大表現/権利侵害/不正紹介検知/開示義務/公開停止。
- **238 AI Agent / RAG / Prompt Injection Safety** — injection検知/RAG権限フィルタ/PII検知/Kill Switch/evals/red team。
- **239 Growth / Adoption / Referral KPI** — 導入/継続/紹介 KPI（Activation・Retention・Viral Coefficient 等）。
- **240 Environment / Release / Deployment Governance** — env/Feature Flag/Canary/Rollback/Release承認/後検証/HOLD。
- **241 Supply Chain / Dependency / License Security** — dependency承認/lockfile policy/license/SAST/SBOM/typosquatting。
- **242 Test Matrix / QA Automation** — unit/integration/server action/API/contract/E2E/negative/tenant isolation/injection。
- **243 SLO / SLA / Observability** — SLO/SLA/error budget/alert/runbook/traces・logs・metrics/status page。
- **244 Data Classification / Residency / Protection** — public/internal/confidential/restricted・PII・retention・encryption・key management。※ 既存 `docs/audit/103-114` の Data Classification ラインと接続。
- **245 Enterprise Procurement / Security Review / Sales Ops** — procurement package/security・legal review/DPA・MSA・SLA/PoC criteria。
- **246 Unit Economics / Pricing / AI Gross Margin** — gross margin/AI COGS/cost cap/LTV・CAC・NRR/margin alert/model routing。
- **247 Global Localization / Tax / E-invoicing** — 国別invoicing/VAT・GST/PEPPOL候補/インボイス制度/電帳法（すべて要専門家確認・Candidate）。
- **248 Abuse / Spam / Rate Limit / Invite Governance** — invite rate limit/fraud detection/bot/trust & safety queue/appeal。
- **249 Partner Payout / Revenue Share / Tax** — payout/revenue share/withholding tax/dispute/payout audit。
- **250 Legal Evidence / eDiscovery / Litigation Support** — eDiscovery/litigation hold/immutable log候補/chain of custody/redaction。
- **251 Sector-Specific Deep Templates** — 建設/医療/美容/飲食/物流/製造/EC/SaaS/士業/教育/公共/規制/FC の業界テンプレ・KPI・AI。
- **252 Human Organization / RACI / Ownership** — RACI/各 owner（security/data/AI safety/billing/legal/growth/docs/prompt/Obsidian/GitHub）/escalation。

## 4. やらないこと

- 正式 Function Master 昇格・DB化・画面/API 実装・外部公開。

## 5. 承認ゲート / リスク

- 承認: 各 Candidate の昇格は個別人間承認＋既存 Feature Registry との重複整理。
- リスク: Candidate を実装済みと誤読／重複による二重実装。→ Candidate 明記・重複欄で緩和。

## 6. 次アクション / 人間判断

- どの Candidate を優先昇格するか（人間判断・現行は 244 Data Classification が進行中＝doc105-114）。
- 昇格時は個別 doc 化し `docs/roadmap/02_feature_registry.md` へ反映（別承認）。
