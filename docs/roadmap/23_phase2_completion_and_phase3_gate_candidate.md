---
doc: roadmap/23
title: Phase 2 完了判定・Phase 3 移行条件整理 Candidate（docs-only）
status: Candidate
area: roadmap/phase-gate
phase: 事業 Phase 2 → Phase 3 移行判定 / PDF Phase 2.5 → Phase 3
risk: docs-only
date: 2026-07-06
related:
  - docs/roadmap/22_crm_leadmap_existing_implementation_reconciliation_candidate.md
  - docs/roadmap/18_crm_sfa_salesforce_lineage_candidate.md
  - docs/audit/48_phase2a_completion_record.md
  - docs/audit/121_crm_leadmap_existing_implementation_reconciliation.md
  - tasks/CURRENT_STATE.md
---

# 23. Phase 2 完了判定・Phase 3 移行条件整理 Candidate（docs-only）

> 種別: **docs-only / Candidate**。**GitHubが正本**・**Obsidianは閲覧**・**369-vault は直接編集しない**。
> 状態: **Candidate**。**実装・schema変更・migration・UI変更・RBAC変更ではない**（Phase 移行条件の正本化のみ）。
> **判定は人間の Phase Gate 承認事項**であり、本書は判断材料と推奨（GO / HOLD 案）を提示するに留まる。

## 1. 目的

doc117〜doc121 / roadmap18〜22 / tasks / 既存 LeadMap・CRM 実測を前提に、**Phase 2 を完了扱いにできるか / Phase 3 AI Growth Engine へ進んでよいか / 進む前に何を必ず終わらせる必要があるか**を docs-only で整理する。実装ではない。

## 2. 現在地の正（実測）

- **Phase 1: 正式完了**（doc24 GO・完了基準 `e95f887`・doc25）。
- **Phase X: 完了済み**（doc32 GO・`70d4d06`・回帰ゲート E2E smoke 11/11）。
- **Phase 2-A: 正式完了**（Phase 2-A-CLOSE・判定 GO・2026-07-04・完了基準 `85f1bf3`・doc48）。Company Brain foundation（器→read-only→人間書き込み2テーブル→AI参照＋ai_reference ログ）が本番確認 GO まで完了。
- **CRM/SFA（Salesforce Mini）: 既存実装済み**（doc121 案A・roadmap22）。`LocalBusinessLead`/`Customer`/`Contact`/`Deal`/`Account`・`/leadmap/*` UI・`leadmap/actions.ts`（requireUser/hasPermission('leadmap')/tenantId/writeAudit/OutreachApproval）・rbac `leadmap`。
- 現在 HEAD = origin/main = origin/current-feature = `af94da6db32eb644072b1623a1bf33240c4d4a4e`（実測）。

## 3. Phase 2 の構成要素と充足状況

| 構成要素 | 状況 | 根拠 |
|---|---|---|
| Company Brain foundation | **正式完了（本番GO）** | doc48 / `85f1bf3` |
| CRM/SFA/LeadMap 実装 | **既存実装あり（追認・案A）** | doc121 / roadmap22 |
| CRM/SFA の Phase 2 完了記録 | **未作成** | 本書で指摘 |
| 高機密ラベル runtime 統制 | **設計のみ・runtime 未解禁** | doc108〜114 |
| CRM 不足補強（archivedAt/internalNote） | **未着手（別承認）** | roadmap22 §15 |

## 4. Phase 2 完了扱いの判定案

- **Company Brain foundation（Phase 2-A）は正式完了済み**。
- **CRM/SFA は実装が存在するが、Phase 2 完了の正式記録（本番確認GO・回帰ゲート状態・不足補強の扱い）が未整備**。
- したがって **Phase 2 は「部分完了（2-A 完了＋CRM/SFA 実装存在）」であり、Phase 2 全体の正式完了判定はまだ出せない**。

## 5. Phase 3 AI Growth Engine の性質と危険

- Phase 3 = **AI Growth Engine**（獲得〜育成〜商談化の成長ループ・広告効果・PR・SEO・MA）。
- **外部発信・広告・口コミ・SNS・メール送信に接続しうる**ため、Human Certification Gate / Consent Gate / SuppressionList / 高機密ラベル統制が固まっていないと危険。
- **虚偽口コミ・ステマ・なりすまし・非開示アフィリエイト・同意なし外部送信・AI単独送信は恒久禁止**。

## 6. Phase 3 へ進むために必ず完了すべきこと（移行条件）

1. **Phase 2 完了の正式記録**を作る（CRM/SFA 含む本番確認GO・回帰ゲート状態・不足補強の扱いを doc 化）。
2. **高機密ラベル runtime 統制の現状監査**（Customer 既定 CUSTOMER_CONFIDENTIAL の閲覧統制・doc108〜114 ラインの接続状況）。
3. **外部送信の Human Certification Gate 運用確認**（`leadmap:external_send`＋`OutreachApproval` PENDING の実運用が閉じているか）。
4. **Consent / SuppressionList 運用確認**（同意記録・配信停止・返信 unsubscribe 検知の実装状態）。
5. **AI 境界の再確認**（AIロール mutation 禁止・外部送信なし・実LLM/AIコスト承認制の維持）。
6. **回帰ゲート（E2E smoke）green の確認**（既存 CRM/LeadMap を壊していないこと）。

## 7. 判定（GO / HOLD）

**判定案: HOLD（Phase 3 進入は保留）**。

- Phase 2-A は完了だが、**Phase 2 全体の正式完了記録が未整備**（§4）。
- Phase 3 は外部発信リスクを持ち、**§6 の移行条件（特に 1・2・3・4）が未完**。
- **これは人間の Phase Gate 承認事項**であり、本書は HOLD を推奨する判断材料に留まる。

## 8. GO / HOLD の理由

- **HOLD 理由**: (a) Phase 2 完了の正式記録が無い、(b) 高機密ラベル runtime 統制が設計のみ、(c) Phase 3 の外部発信は Consent/Human Certification Gate の実運用確認が前提、(d) 回帰ゲートの最新 green 確認が docs 上未固定。
- **GO にできる条件**: §6 の 1〜6 を満たし、人間が Phase 2 完了と Phase 3 進入を承認した時点。

## 9. 人間承認が必要な判断

- Phase 2 を「正式完了」と宣言してよいか（CRM/SFA 完了記録の作成後）。
- Phase 3 AI Growth Engine へ進入してよいか（外部発信境界の運用確認後）。
- 高機密ラベル runtime 解禁の可否（doc108〜114 の重い承認）。
- CRM 不足補強（archivedAt/internalNote）を実装するか。

## 10. Phase 3 に進む前にやってはいけないこと

- Phase 2 完了記録なしに Phase 3 実装へ入る。
- 外部送信 / 広告自動運用 / SNS投稿 / PR配信 / SEO公開 / LINE・DM送信 / 実LLM / AIコストの解禁。
- 高機密ラベル runtime 解禁を Phase Gate 承認なしに行う。
- 新規 Lead モデル・`/crm/leads`・`crm:*` 新設・schema変更・migration（既存追認方針 案A に反する）。

## 11. 次のアクション（docs-only）

- **A: Phase 2 正式完了記録の作成**（CRM/SFA 含む・本番確認GO/回帰ゲート/不足補強の扱いを doc 化・別承認）。
- **B: 高機密ラベル runtime 統制の現状監査**（doc108〜114 ライン・read-only）。
- **C: 外部送信 Human Certification Gate 運用の現状監査**（read-only）。
- いずれも docs-only・push別承認。

## 12. 完全機能台帳 50カテゴリ対応（短縮）

- 直接: C08 CRM/Customer360・C09 SFA/Sales OS・C46 Governance Docs。加えて Phase 3 予告として C18 AD OS/Growth Engine。
- 間接: C01,C03,C04,C05,C06,C07,C10,C11,C12,C15,C20,C26,C28,C30,C33,C34,C37,C38,C39,C48。
- 後続: C02,C13,C14,C16,C17,C19,C21,C22,C23,C24,C25,C27,C29,C31,C32,C35,C36,C40,C41,C42,C43,C44,C47,C49,C50。
- 禁止/Future隔離: C45。不明: なし。

## 13. Phase対応（4軸）

- **事業ロードマップ**: Phase 2（Salesforce Mini/CRM基盤）→ Phase 3（AI Growth Engine）。本書は 2→3 の Gate。
- **PDF系 OS本体**: Phase 2.5（初期MVP）→ Phase 3（承認・監査基盤）。
- **戦略構想**: Phase 20-26 は将来接続。
- **Complete Ledger**: **R4 Commercial Core + R0 Governance Docs**（現在）→ Phase 3 で R5 相当（Growth/Trust）へ拡張候補。

## 14. 369独自差別化5本柱との接続

1. Human Certification Gate（Phase 3 外部発信の必須ゲート）。
2. Business Event Ledger（成長イベントの記録・将来）。
3〜5. AI社員の免許/給与明細/派遣所（将来接続・記録のみ）。

## 15. Evidence Map

- 現在地: Scout 実測（HEAD = origin/main = origin/current-feature = `af94da6db32eb644072b1623a1bf33240c4d4a4e`・clean・`origin/main..HEAD` 空・doc122/roadmap23 未存在・max audit=121）。
- Phase 2-A 完了: `docs/audit/48_phase2a_completion_record.md`・`85f1bf3`（CURRENT_STATE 実測）。
- CRM/SFA 既存実装: doc121 / roadmap22（`LocalBusinessLead`/`Customer`/`Deal`/`/leadmap`）。
- 封印維持: `node scripts/check-company-brain-safety.mjs` exit 0（実測）。369-vault 非編集（実測）。

## 16. Assumption Log

- 本書は Candidate・docs-only の Phase 移行条件整理であり、Phase 判定の確定は人間の Phase Gate 承認。
- Phase 2-A は正式完了（doc48）。CRM/SFA は既存実装あり（案A・doc121）だが Phase 2 完了記録は未作成。
- 安全側で Phase 3 進入は **HOLD** を推奨。369-vault 未編集。

## 17. Unknowns Log

- Phase 2 完了記録に含めるべき本番確認・回帰ゲートの最新状態。
- 高機密ラベル runtime 統制の実装現状。
- 外部送信 Human Certification Gate の実運用が本番で閉じているか。
- CRM 不足補強（archivedAt/internalNote）の実装可否と時期。

## 18. Risk Register

- Phase 2 未完了のまま Phase 3 へ進むリスク → HOLD ＋ §6 移行条件で防ぐ。
- Phase 3 の外部発信でステマ/同意なし送信が起きるリスク → 恒久禁止＋Consent/Human Certification Gate 前提を明記。
- 高機密ラベル未統制で顧客機微が露出するリスク → runtime 統制監査を移行条件に。
- 既存 CRM/LeadMap を壊すリスク → 回帰ゲート green 確認を移行条件に。
- 判定を実装済みと誤読するリスク → 「HOLD・人間 Phase Gate 承認事項」を明記。

## 19. Definition of Done

- [x] Phase 2 の構成要素と充足状況を実測整理（§3）。
- [x] Phase 2 完了扱いの判定案（部分完了）を提示（§4）。
- [x] Phase 3 移行条件（§6）・GO/HOLD 判定（§7）・理由（§8）・人間承認事項（§9）・禁止事項（§10）を明記。
- [x] 実装・schema変更・migration・外部送信・実LLM・AIコスト・本番確認なし（docs-only）・safety exit 0・369-vault非編集。

## 20. 次回推奨プロンプト案

1. **doc122 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 20項目報告）。
2. **Phase 2 正式完了記録の作成 docs-only**（CRM/SFA 含む・本番確認GO/回帰ゲート/不足補強の扱い・別承認）。
3. **高機密ラベル runtime 統制の現状監査 docs-only**（doc108〜114 ライン・read-only）。

## 21. 判定

**判定: READY / GO（docs 整理として）／ Phase 3 進入は HOLD（人間 Phase Gate 承認事項）**。

本書は Phase 移行条件を docs-only で正本化したものであり、Phase 判定そのものは人間の承認による。**docs-only**・**Candidate**・**実装なし**・**schema変更なし**・**migrationなし**・**UI変更なし**・**RBAC変更なし**・**crm:* 新設なし**・**company-brain-reference変更なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**369-vault非編集**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
