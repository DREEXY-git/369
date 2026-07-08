---
doc: 10_obsidian/dashboard-index
title: Obsidian 経営ダッシュボード入口（Candidate）
status: Candidate
area: governance/obsidian
risk: low（docs-only・369-vault非編集・実同期なし）
date: 2026-07-06
related:
  - docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md
  - docs/10_obsidian/OBSIDIAN_SYNC_RULES_CANDIDATE.md
---

# 10_obsidian. Obsidian 経営ダッシュボード入口（Candidate）

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧・思考整理・経営ダッシュボード**。369-vault は今回未編集。実同期・自動化は別承認。
> 状態: **Candidate**（Official ではない）。

## 1. 目的

非エンジニアが Obsidian 側で「今どこにいるか」を1目で追える入口（ダッシュボード）の構成候補を定義する（**実同期はしない**・GitHub docs の要約を見る面）。

## 2. 背景 / 既存docsとの関係

- 役割: `OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md`。同期: `OBSIDIAN_SYNC_RULES_CANDIDATE.md`。
- 各項目の**正本は GitHub docs**。Obsidian は閲覧導線であって正本ではない。

## 3. 非エンジニア向け入口の構成候補

| Obsidian 入口 | 見る内容 | GitHub 正本（出典） |
|---|---|---|
| CURRENT_STATE | 現在地の1枚サマリー | `tasks/CURRENT_STATE.md`＋git refs |
| NEXT_ACTION | 次にやること（人間が選択） | `tasks/CURRENT_STATE.md` §次にやること／`docs/roadmap/16` |
| OPEN_RISKS | 未解決リスク一覧 | `docs/roadmap/16` §OPEN_RISKS／各doc Risk Register |
| ROADMAP | Phase 0-26 三系統 | `docs/roadmap/00-01`・`09-10` |
| AUDIT | 監査記録（要約） | `docs/audit/*`（要約のみ・本文全体は同期しない） |
| PROMPT | 次回 Claude Code 指示 | `docs/roadmap/16` §CLAUDE_CODE_NEXT_PROMPT |
| STRATEGY | AI社員経済圏・Developer Cloud 等 | `docs/roadmap/09・11・12・13` |
| AI Safety | 禁止機能・安全代替・Human Certification Gate | `docs/roadmap/15`・`docs/roadmap/03-04` |
| Growth | 広告費ゼロ成長ループ | `docs/roadmap/15` |
| Candidate一覧 | Function Master 231-252 等 | `docs/roadmap/14` |
| SaaSカタログ | 組み込み予定SaaS（内包/代替/連携/Marketplace/PLUG/Employee App） | `docs/roadmap/17` |
| CRM / SFA Lineage | CRM/SFA/Salesforce Mini 深掘り（Lead〜商談〜引き継ぎ・AI営業提案・承認境界） | `docs/roadmap/18` |
| CRM最小縦切り判断 | 実装可否3案比較（Lead-only / Lead+Deal / +Pipeline・推奨=案A） | `docs/roadmap/19` |
| CRM Lead-only最小設計 | Lead候補列・status enum・権限方針・停止条件（実装前・Contact PII非採用） | `docs/roadmap/20` |
| CRM Lead-only実装Gate | 実装スプリント可否 最終判断（推奨=案X・実装着手は別承認・別承認文言） | `docs/roadmap/21` |
| 既存LeadMap追認・差分 | 既存 LocalBusinessLead/leadmap を CRM Lead 正本候補に追認（案A・新規Lead作らない） | `docs/roadmap/22` |
| Phase 2完了・Phase 3 Gate | Phase 2 部分完了／Phase 3 AI Growth Engine 進入は HOLD（移行条件6項目・人間承認事項） | `docs/roadmap/23` |
| Phase 2正式完了記録 | Phase 2 CONDITIONAL COMPLETE（人間 Phase Gate 承認事項）／Phase 3 進入 HOLD（残件6条件） | `docs/roadmap/24` |
| 高機密ラベルruntime監査 | AI参照封印は閉／人間UI閲覧の統制配線は未確認（判定B: HOLD・Phase 3残件②） | `docs/roadmap/25` |
| CRM顧客閲覧統制の追加監査 | Customer詳細は assertCanViewConfidential で閉／一覧・Contactは未確認（判定B: HOLD） | `docs/roadmap/26` |
| Phase 3前残件の設計判断メモ | 送信ゲートは Suppression 強制で閉／閲覧レイヤ行レベル統制は据え置き判断・opt-out 正式化（判定B: HOLD） | `docs/roadmap/27` |
| Phase 3 Gate 人間判断チェックリスト | Gate残件6条件＋人間判断6論点＋GO/HOLD条件を整理（判定B: HOLD・材料整備済み） | `docs/roadmap/28` |
| Phase 3 Gate 移行判断の確定 | 6論点を人間承認＋回帰ゲート実測（5緑・e2eはCI確認）／方針GO・Phase3進入は残2点までHOLD | `docs/roadmap/29` |
| CI Stage 3 E2E 追加 設計 | e2eをCIに足す設計（ephemeral DB・封印維持・事前停止条件）／判定HOLD・実装は別承認 | `docs/roadmap/30` |
| CI Stage 3 E2E 実装 | ci.ymlにstage3_e2e追加（ephemeral Postgres・封印維持）／実装完了・e2e実greenはpush→CIで確認 | `docs/roadmap/31` |
| CI Stage 3 E2E failure triage | 基盤緑・e2e本体は57passed/15failed（PLAYWRIGHT_FAIL）／strict-mode3件確定・残12件要精査・機密系は緑（判定HOLD） | `docs/roadmap/32` |
| CI Stage 3 E2E root-cause plan | 15失敗をroot-cause確定（A=3/B=1/C=11/D=0）・修正計画F1-F4／機密系は緑・真の不具合0（判定HOLD） | `docs/roadmap/33` |
| CI Stage 3 E2E F1 test fix | A3+B1をtests-only最小修正（typecheck/lint緑）／C11件残でRED継続・push後CIで4件緑確認（判定HOLD） | `docs/roadmap/34` |
| CI Stage 3 E2E F1 result and F1b | F1 push後CI=59passed/13failed（棚卸・案件名緑化／人員配置リスクstrict-mode露見・Golden PathはC化）＋F1bでリスク1件tests-only修正（判定HOLD） | `docs/roadmap/35` |
| CI Stage 3 E2E F1b result and F1c | F1bで60passed/12failed・operations_exec全緑／F1cでFinanceEvent・入金実績strict-modeをtests-only修正（残C10件・判定HOLD） | `docs/roadmap/36` |
| CI Stage 3 E2E F1c result | F1c後CI=62passed/10failed・FinanceEvent/入金実績緑化・残10件はC=SEED_DATA_DRIFTへ収束・次はF2診断（判定HOLD） | `docs/roadmap/37` |
| CI Stage 3 E2E F2 diagnostics | 失敗時のhtml report/trace/screenshotをartifact取得する診断基盤をconfig-only追加（結果不変62/10）・次はpush→C/D確定（判定HOLD） | `docs/roadmap/38` |
| CI Stage 3 E2E F2 log-based artifact-blocked analysis | artifact取得不能(proxy 403)→job logで再分類：A=4(strict-mode/tests-only可)・C暫定=6・D=0／重大訂正で「全C」を是正（判定HOLD） | `docs/roadmap/39` |
| CI Stage 3 E2E F1d test selector fix | log確定strict-mode 4件(dunning:15/50・executive_dashboard:15/37)をtests-onlyでheading/本文リンクexactに限定・62/10→66/6見込み・C暫定6件は未修正・app/seed/schema/ci.yml/playwright.config.ts非変更（判定HOLD） | `docs/roadmap/40` |
| CI Stage 3 E2E F1d result | F1dで66passed/6failed・strict-mode4件緑化・+4passed/-4failed・regressionなし・残C暫定6件・D=0・Phase3 HOLD | `docs/roadmap/41` |
| CI Stage 3 E2E C6 artifact analysis | artifact(ID 8158827253)目視で残6件を最終分類：C=0/D=0/F=0・真因はtests-only(A=selector 4件/B=text 2件)・機密漏えいなし・F3 seed不要・tests-only(F1e)で66/6→72/0見込み・重要訂正「C暫定6件」はC=0（判定HOLD） | `docs/roadmap/42` |
| CI Stage 3 E2E F1e tests-only fix | 残6件をe2e spec のみ最小修正(A=selector 4件は/new除外で実案件へ+operations:44は想定売上入力/race解消・B=text 2件は実在見出しへ)・app不変(redaction/finance文言は実在)・66/6→72/0見込み・F3 seed/schema不要・redaction2件はpush後CIで再検証（判定HOLD） | `docs/roadmap/43` |
| CI Stage 3 E2E F1e green result | F1e push後CI run 28930122157=success・stage1 success・stage3_e2e success・Run E2E 72 passed/0 failed(66/6→+6/−6・退行なし)・Upload report on failure=skipped・F1e6件+redaction2件全green・機密漏えいなし・C=0/D=0/F=0最終確定・F3 seed/schema不要・env fake/log/false封印維持・Phase3は最終Gate承認前のためHOLD(docs-only・commit-only) | `docs/roadmap/44`・`docs/audit/143` |
| Phase 3 最終 Phase Gate 判断シート | 人間がPhase3 GO/HOLDを正式判断するための材料を集約(本書はGOではない)・回帰ゲート緑=run 28930122157/28934614261の2run連続72/0(stage1/stage3_e2e success)・C=0/D=0/F=0・F3 seed/schema不要・redaction健全・封印維持(fake/log/false)・GO条件①③④⑤⑥充足/②高機密runtime統制据え置きは承認論点・まだGOでない理由=最終Gate人間承認未実施・GO/HOLD論点6件・GO初手=Phase3 GO記録(docs-only)（判定HOLD） | `docs/roadmap/45`・`docs/audit/144` |
| Phase 3 GO 記録 | 人間判断でPhase3(AI Growth Engine)進入をGO正式記録(実装開始ではない)・GO根拠=run 28937029131=success/72 passed 0 failed(stage3_e2e 3run連続72/0)・C=0/D=0/F=0・F3 seed/schema不要・redaction健全・封印維持(fake/log/false)・人間GO判断6件(高機密runtime統制②据え置き/outreach opt-out正式化/positive Consent用途別分離/回帰ゲートはCI実測で充足/外部送信・実LLM・課金・本番deployは個別承認制維持/Phase3初手=AI Growth Opportunity Control Tower v0)・外部送信/実LLM/課金/本番deployは個別承認制維持・次はControl Tower v0設計(docs-only)（判定Phase3 GO・実装未着手） | `docs/roadmap/46`・`docs/audit/145` |
| AI Growth Control Tower v0 設計 | Phase3最初の縦切りAI Growth Opportunity Control Tower v0をdocs-only設計(実装未着手)・前提CI run 28938318122=success(stage3_e2e 4run連続72/0)・目的=既存データ(LeadMap/Deal/Company Brain/Golden Path/Finance Bridge/Usage)から成長機会を/growth/control-towerに read-only集約・非目標=外部送信自動化/実LLM/課金/本番/新規schema先行追加/AI自動承認削除送信なし・カード9案・権限(tenantId/hasPermission/canViewFinance/canAccessLabel・Customer一覧/Contactは据え置き)・監査(writeAudit/writeDataAccess)・AI境界(FakeLLM・下書きのみ・重要操作はApprovalRequest)・redaction踏襲・schema影響=既存schemaのみで成立見込み/状態永続化や新規権限が要れば実装前STOP別承認・実装フェーズP3-CT-0〜7（判定設計完了・実装未着手） | `docs/roadmap/47`・`docs/audit/146` |
| Control Tower v0 実装前Gate | 実装前にv0が既存schema/RBAC/seedのみで成立するかread-only実査で最終判定・前提CI run 28939408568=success(stage3_e2e 5run連続72/0)・判定10項目すべて新規不要(既存/growthはrequireUserで成立/rbac.tsにdeal・finance・marketing・leadmapのread権限あり/redactExecutiveFinance再利用可/deal・LocalBusinessLead・CompanyPolicyはseed済み/nav1行追加可)・状態永続化(dismiss/snooze/pin等)はv0非目標(採用時STOP別承認)・Gate=PASS(STOP非該当)・v0は既存schema・RBAC・seedのみで成立・P3-CT-1最小実装計画確定(URL/追加ファイル/再利用関数/権限/redaction/監査/e2e追加案/STOP条件)（判定Gate PASS・実装未着手） | `docs/roadmap/48`・`docs/audit/147` |
| P3-CT-1 Control Tower v0 read-only画面実装 | Phase3最初の実画面/growth/control-towerをread-only実装(業務mutationなし)・前提CI run 28940565283=success(stage3_e2e 6run連続72/0)・純ロジック(packages/shared/growth-control-tower・単体6件)+データ整形層(既存getGoldenPathExecutiveDashboardData再利用+finance gating)+RSC page+nav1行+e2e・9カード(未回収リスク/低粗利はfinance gated)・redaction=canViewFinance falseでlib段階null化+担当者に金額実値なし・Customer件数のみPII非増加・AI境界FakeLLM/送信承認削除なし/LLM未呼び出し・STOP非該当(schema/RBAC/seed/migration変更なし・状態永続化なし)・単体271 passed/型lint safety緑・e2e実緑はpush後CI(74/0見込み)（判定read-only実装完了・commit-only） | `docs/roadmap/49`・`docs/audit/148` |
| P3-CT-1 E2E selector hardening | push前のtests-only品質補正・growth_control_tower.spec.tsの担当者redaction assertionをPlaywright strict mode安全化・finance-gatedカードは未回収リスク/低粗利の2枚で担当者は同一redaction文言が2要素一致→旧toBeVisible()はstrict-mode violation risk→toHaveCount(2)+first().toBeVisible()に修正/社長はtoHaveCount(0)で対比明示・実装本体(page/lib/shared/nav)変更なし・redaction方針不変(担当者に金額実値なし・むしろ2件を件数明示で担保強化)・schema/RBAC/seed変更なし・PII非増加・単体271 passed/型lint safety緑・e2e実緑はpush後CI(74/0見込み)（判定selector安定化完了・実装本体変更なし・commit-only） | `docs/roadmap/50`・`docs/audit/149` |
| P3-CT-2 Control Tower優先度ロジック精緻化 | 純ロジック中心の実装・前提CI run 28944487139=success(74/0)・旧score=baseWeight+min(count,20)→新score=重要度businessImpact×(基礎0.7+緊急度0.3×urgency)×信頼度confidence(deterministic・上限100)・urgency=min(count/urgencyCap,1)で飽和・empty score0・redacted(finance非表示)は要確認中位・scoreBreakdownで説明可能・同点は重要度で安定ソート・redaction不変(担当者に金額実値なしpure logicでもcount=null)・PII非増加・変更はshared純ロジック+単体テスト6→13のみ(page/lib/e2e不変)・STOP非該当(schema/RBAC/seed変更なし)・単体278 passed/型lint safety緑・e2e実緑はpush後CI(74/0見込み)（判定精緻化完了・業務mutationなし・commit-only） | `docs/roadmap/51`・`docs/audit/150` |

## 4. Candidate / Official

- 本入口構成は **Candidate**。実際の Obsidian ダッシュボード生成・369-vault への反映・自動同期は **別承認**。
- Candidate note は GitHub 反映後に official 扱い。

## 5. やらないこと

- 369-vault の直接編集・同期実行・自動同期スクリプト実装（別承認）。
- secrets / 個人情報 / 本番ログ生データ / 実顧客データ の同期。
- 実装・DB変更・外部送信・実LLM・AIコスト・本番影響。

## 6. 承認ゲート / リスク

- 承認: ダッシュボード生成・369-vault 反映・実同期は個別人間承認。
- リスク: Obsidian を正本と混同 → 「出典＝GitHub docs」を各項目に明記。二重管理 → 要約のみ・GitHub正本を維持。

## 7. 次アクション / 人間判断

- Obsidian ダッシュボードの実構成（フォルダ/タグ/リンク）の確定（人間判断・別承認）。
- どの docs を Obsidian へ反映するか・Obsidian Owner の任命（人間判断）。
- 現時点では **GitHub docs 側の Candidate 記録に留め、369-vault は触らない**。
