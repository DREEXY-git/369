# 33. CI Stage 3 E2E root-cause plan Candidate（docs-only）

> 出典＝GitHub 正本 docs。これは **docs-only の root-cause 分析＋修正計画**であり、E2E/UI/seed の修正・実装ではありません。判定 **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**。**369-vault非編集**・コード差分ゼロ・実装なし・push なし。

## 1. 目的

doc131/roadmap32 で分類した **CI Stage 3 E2E** の15失敗を spec ごとに read-only で **root-cause** 深掘りし、A/B/C/D を確定した最小修正計画を docs-only で正本化する。修正・実装はしない。

## 2. 現在地の正

- GitHub 正本モノレポ `dreexy-git/369`。現在地は git refs を正とする。事業 Phase 2 CONDITIONAL COMPLETE／**Phase 3** 進入 **HOLD**（残＝**stage3_e2e** 緑化＋最終 **人間 Phase Gate 承認**）。Ledger **R4 Commercial Core** + **R0 Governance Docs**（R12 Trust 接続）。

## 3. doc131から引き継ぐ失敗分類

- CI run 28860862696（HEAD 1e8bcd1）: **stage1 success**／**stage3_e2e failure**（基盤 migrate/seed/build/browser 全成功・**Run E2E** のみ）＝**57 passed** / **15 failed**（**PLAYWRIGHT_FAIL**）。
- 前回の暫定: A=**strict-mode** 3件確定、B/C/D=12件要精査、E=0。

## 4. read-only 深掘り方法

- 対象 spec を実読（`apps/web/tests/e2e/*.spec.ts`）。
- 各失敗の期待文言を `rg` で `apps/web/app`・`apps/web/components` に突合（文言がアプリに存在するか）。
- seed（`packages/db/prisma/seed.ts`）の作成エンティティを確認（前提データ充足）。
- 判定は read-only の証跡に基づき、確定できないものは「要ライブ確認」と明記（本書は修正しない）。

## 5. A: TEST_SELECTOR_DRIFT 3件の確定

**strict-mode** 違反＝ロケータが2要素に一致（アプリ表示は正常＝**expected text** の曖昧さ）。テスト spec のみの修正・低リスク。
- #8 operations_exec:15「棚卸」: `getByRole('heading',{name:/棚卸/})` → h1「棚卸（実地在庫照合）」＋ h3「棚卸を開始」。
- #9 operations_exec:39「人員配置」: `getByText('人員配置')` → span ＋ h3「人員配置（0）」。
- #10 operations:22「E2Eテスト案件」: `getByText('E2Eテスト案件')` → link ＋ h1。
- 修正方針: `.first()` 付与 or `getByRole('heading',{name, exact:true})` へ厳密化。**app 変更不要**。

## 6. B: TEXT_EXPECTATION_DRIFT 候補

- #12 planning_hokko:16「現在地と次の一手（Golden Path）」: **アプリに当該文言なし**（アプリは「Golden Path — 現在地と次の一手」）＝**確定 B**（テスト期待値を実文言へ更新）。**app 変更不要**。
- 参考: #5 finance_bridge:15 / #7 invoice_payment:25 は期待文言がアプリに存在するため B の可能性は低く、C（前提データ）優勢。

## 7. C: SEED_DATA_DRIFT 候補

- 残り失敗の期待文言はほぼ全て **アプリ実装に存在（FOUND）**。よって「文言が消えた」のではなく、**dashboard/詳細が前提エンティティ（案件/請求SENT/planning/是正対象/FinanceEvent 等）を必要とし、seed 状態が不足 or 一覧の先頭リンククリックが空振り**している可能性が高い（**SEED_DATA_DRIFT** 優勢）。
- 該当（C 優勢・要ライブ確認）: #1 dunning:15（INV- リンク/SENT請求）・#2 dunning:50（承認待ち/dunning_send）・#3 executive_dashboard:15（経営KPI データ）・#4 executive_dashboard:37（planning 案件→導線）・#5 finance_bridge:15（FinanceEvent）・#6 golden_path_actions:15（是正対象案件）・#7 invoice_payment:25（cashflow データ）・#11 operations:44（案件詳細 nav）・#13 planning_hokko:24（events 一覧→詳細）・#14 planning_hokko:35（案件詳細 粗利率）・#15 planning_hokko:45（案件詳細 nav）。
- 多くは「`/list` → `.first().click()` → 詳細文言」型で、seed が該当エンティティを十分/決定論的に作らないと空振りする構造。

## 8. D: TRUE_APP_BUG 候補

- **確定 D は 0**。根拠: (1) 失敗の期待文言はほぼ全て **アプリ実装に存在**、(2) 権限 redact の中核を検証する **security.spec.ts は passed**（15失敗に含まれない）＝機密ゲートは機能。
- 低確率で要確認: #11/#15（staff の「原価・粗利は財務閲覧権限が必要です」）は文言存在＋security.spec 緑のため、**案件詳細への遷移失敗（C）** が主因と推定。真の権限バグの証跡はなし。ライブ確認（screenshot/trace）で最終確定。

## 9. 15失敗の最終分類表

| # | spec:line | 期待文言のapp存在 | 確定分類 |
|---|---|---|---|
| 8 | operations_exec:15 棚卸 | FOUND(2要素) | **A**（**strict-mode**） |
| 9 | operations_exec:39 人員配置 | FOUND(2要素) | **A**（**strict-mode**） |
| 10 | operations:22 E2Eテスト案件 | 生成(2要素) | **A**（**strict-mode**） |
| 12 | planning_hokko:16 現在地と次の一手（Golden Path） | **MISSING** | **B**（**TEXT_EXPECTATION_DRIFT**） |
| 1 | dunning:15 INV-→#dunning | 条件 | **C**（**SEED_DATA_DRIFT** 優勢） |
| 2 | dunning:50 承認待ち/dunning_send | FOUND | **C**（優勢） |
| 3 | executive_dashboard:15 経営KPI | FOUND | **C**（優勢） |
| 4 | executive_dashboard:37 導線 | FOUND | **C**（優勢） |
| 5 | finance_bridge:15 FinanceEvent | FOUND | **C**（優勢） |
| 6 | golden_path_actions:15 対処: | FOUND | **C**（優勢） |
| 7 | invoice_payment:25 資金繰り | FOUND | **C**（優勢） |
| 11 | operations:44 staff redact | FOUND | **C**（優勢・D低） |
| 13 | planning_hokko:24 Golden Path カード | FOUND | **C**（優勢） |
| 14 | planning_hokko:35 粗利率 | FOUND | **C**（優勢） |
| 15 | planning_hokko:45 staff redact | FOUND | **C**（優勢・D低） |

集計: **A=3 / B=1 / C=11（要ライブ確認・D低） / D=0(確定) / E=0**。

## 10. 最小修正方針

- **F1（最小・テスト側のみ・低リスク）**: A の3件（**strict-mode** → `.first()`/exact 化）＋ B の1件（期待文言を実文言へ更新）＝計4件。**app/seed 変更なし**。
- **F2（診断補強）**: playwright reporter に html＋trace/screenshot を追加（現状 report 未生成で screenshot なし）→ 再実行で C 11件の実画面を証跡化し C/D を最終確定。※ci.yml/playwright.config 変更＝別承認。
- **F3（データ整合）**: C 確定分は「seed に決定論的な前提エンティティを追加」または「各 spec が自前で前提データを作る」で対応。seed 変更は別承認・schema 影響の事前停止条件付き。
- **F4（Dのみ）**: F2 で真の不具合が出た場合のみ app 修正（別承認）。現時点は D=0。

## 11. 修正の順序

1. **F1**（テスト spec 4件）＝即・低リスク・app非依存。→ 再CI で 4件緑化。
2. **F2**（診断補強）＝残 C11件の証跡取得。
3. **F3**（seed/データ整合）＝C11件を緑化。
4. **F4**（app）＝D が出た場合のみ。
- いずれも本書は計画のみ。各 F は承認後の別実装ミッション。

## 12. Phase 3 Gateへの影響

- Phase 3 GO 条件⑥「**回帰ゲート** 緑（**e2e** 含む）」未達＝**Phase 3** 進入 **HOLD** 継続。
- 失敗は operations/planning/finance の表示系で、**Customer一覧 / LocalBusinessLead / Contact / SuppressionList などの機密・同意・CRM閲覧統制系は緑**（安全中核ゲート HCG/Consent/Security 影響なし）。解除は F1→F2→F3（→必要なら F4）で **stage3_e2e** 緑＋最終 Phase Gate 承認。

## 13. ロードマップ上の現在地（10項目・明示見出し）

### 13-1. 現在のPhase
事業 Phase 2 CONDITIONAL COMPLETE／PDF 2.5／戦略 18.5-26 未突入／Ledger **R4 Commercial Core** + **R0 Governance Docs**。

### 13-2. 現在のPhaseで完了したこと
15失敗の **root-cause** を read-only 確定（A=3/B=1/C=11/D=0/E=0）。最小修正方針 F1-F4 を策定。

### 13-3. 現在のPhaseで未完了のこと
F1-F3 の実装（別承認）と **stage3_e2e** 緑化、最終 **人間 Phase Gate 承認**。

### 13-4. 次に進むPhase
事業 **Phase 3** AI Growth Engine。

### 13-5. 次のPhaseへ進むために必ず完了すべきこと
F1（テスト4件）→F2（診断）→F3（seed/データ）で **CI** の **stage3_e2e** 緑、＋最終 Phase Gate 承認。

### 13-6. 次のPhaseへ進んでよいかの判定（GO / HOLD）
**HOLD**（**CI_STAGE3_E2E_RED**）。

### 13-7. GO / HOLD の理由
基盤・stage1 緑・封印維持だが **e2e** が緑でなく **回帰ゲート** 未達のため。

### 13-8. 人間承認が必要な判断
F1（テスト修正）着手承認、F2（ci/config 変更）承認、F3（seed 変更・schema 影響事前停止条件）承認、または表示系 e2e を後続課題化して他5ゲート緑で Phase 3 判断するか。

### 13-9. 次Phaseに進む前にやってはいけないこと
**Phase 3** 実装／**runtime 解禁なし**／`externalAiAllowed` true 解禁／`EXTERNAL_SEND_ENABLED` true 解禁／**外部送信なし**／実LLM／AIコスト／本番確認／本番deploy／**schema変更なし**／**migrationなし**／**RBAC変更なし**／**369-vault非編集**。

### 13-10. CURRENT_STATE / PROGRESS / roadmap / audit / Obsidian Dashboard にどう反映したか
`tasks/CURRENT_STATE.md`（bullet 1件）・`tasks/PROGRESS.md`（節1件）・`docs/roadmap/33`（本書）・`docs/audit/132`（記録）・`docs/10_obsidian/OBSIDIAN_DASHBOARD_INDEX_CANDIDATE.md`（行1件）。**369-vault非編集**。

## 14. Complete Function Coverage Matrix（50カテゴリ）

| # | 区分 | # | 区分 | # | 区分 | # | 区分 | # | 区分 |
|---|---|---|---|---|---|---|---|---|---|
| **C03** | 直接 | **C06** | 直接 | **C08** | 直接 | **C37** | 直接 | **C38** | 直接 |
| **C39** | 直接 | **C46** | 直接 | C01 | 間接 | C04 | 間接 | C05 | 間接 |
| C07 | 間接 | C09 | 間接 | C10 | 間接 | C11 | 間接 | C12 | 間接 |
| C15 | 間接 | C18 | 間接 | C20 | 間接 | C26 | 間接 | C28 | 間接 |
| C30 | 間接 | C33 | 間接 | C34 | 間接 | C40 | 間接 | C48 | 間接 |
| C02 | 後続 | C13 | 後続 | C14 | 後続 | C16 | 後続 | C17 | 後続 |
| C19 | 後続 | C21 | 後続 | C22 | 後続 | C23 | 後続 | C24 | 後続 |
| C25 | 後続 | C27 | 後続 | C29 | 後続 | C31 | 後続 | C32 | 後続 |
| C35 | 後続 | C36 | 後続 | C41 | 後続 | C42 | 後続 | C43 | 後続 |
| C44 | 後続 | C47 | 後続 | C49 | 後続 | C50 | 後続 | C45 | 禁止/Future隔離 |

直接対象＝**C03**・**C06**・**C08**・**C37**・**C38**・**C39**・**C46**。

## 15. 20大カテゴリとの接続

Governance Docs/CI/回帰ゲート（C46）・Security（C39）・Permission/Approval/Audit（C03）に接続。失敗領域は operations/finance の表示系。

## 16. 追加19領域との接続

CI 品質基盤・E2E smoke（Stage 3）・診断（reporter/trace）に接続。機密・同意の e2e は緑。

## 17. 369独自差別化5本柱との接続

「安全第一」「人間承認ゲート」「正本は GitHub docs」に接続。封印（**外部送信なし**・**実LLMなし**）維持のまま品質可視化を前進。

## 18. Global AI Rules

AIは下書き・提案・要約・分析・参照まで。危険操作は Human Certification Gate。**外部送信なし**・**実LLMなし**・**AIコストなし**・**runtime 解禁なし**・同意なし外部送信なし。生成は **FakeLLM** 決定論・AI 参照は NORMAL/INTERNAL のみ・`externalAiAllowed` 既定false。

## 19. 判定案

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**。**root-cause** は A=3（テスト selector）/B=1（文言）/C=11（seed・データ前提／要ライブ確認）/D=0/E=0。最小修正は F1（テスト4件）から。**Phase 3** は **HOLD**。

## 20. Phase 3 HOLD解除への影響

- **e2e** 緑化が Phase 3 GO の残条件。F1 で4件・F2/F3 で11件を緑化すれば **stage3_e2e** 緑。機密・同意・CRM閲覧統制の e2e は既に緑。
- 解除経路: F1→F2→F3（→必要時 F4）→ **CI** で **stage3_e2e** 緑→最終 Phase Gate 承認。

## 21. 次に必要な補強

- F2 診断（html reporter＋trace）で C11件の実画面証跡を取得し C/D を最終確定。
- seed の決定論性（各 dashboard/detail が必要とする前提エンティティ）を read-only で棚卸し。
- Node20 非推奨警告の対応要否（動作影響なし）。

## 22. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| **stage1 success** | run 28860862696 job stage1 | success |
| **stage3_e2e failure** / **Run E2E** | job stage3_e2e | **57 passed** / **15 failed** |
| A 3件 **strict-mode** | operations_exec/operations spec + CIログ | 確定 |
| B 1件 文言不在 | rg「現在地と次の一手（Golden Path）」= MISSING | 確定 |
| 期待文言ほぼ存在 | rg（app/components）= FOUND 多数 | C 優勢 |
| security 緑 | 15失敗に security.spec なし | D 証跡なし |
| 封印維持 | env `EXTERNAL_SEND_ENABLED=false`/`FakeLLM` | 送信・課金なし |

## 23. Assumption Log

- 期待文言が app に存在＝機能は残存。多くの失敗は「一覧→先頭クリック→詳細」型で前提データ不足＝**SEED_DATA_DRIFT** 優勢。
- security.spec passed のため権限 redact は機能＝**TRUE_APP_BUG** の証跡なし（D=0）。
- C/D の最終確定には F2 の screenshot/trace が必要（現状 report 未生成）。

## 24. Unknowns Log

- C11件のうち seed 追加で緑化するもの vs テスト側データ setup が要るものの内訳。
- `eventProject` と `/operations/events` ルートの対応・seed 件数の十分性。
- 稀な D の有無（F2 診断で確定）。

## 25. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | **e2e** red のまま Phase 3 進入 | 中 | HOLD維持で回避 |
| R2 | C の一部が実は D（権限/表示バグ） | 中 | F2 診断で確定 |
| R3 | seed 整合が schema/seed 変更に波及 | 中 | 事前停止条件で別承認化 |

## 26. Definition of Done

- 15失敗を **root-cause** 確定（A=3/B=1/C=11/D=0/E=0）／最小修正計画 F1-F4 と順序を策定／判定 **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL / HOLD**／**369-vault非編集**／**schema変更なし**・**migrationなし**・**RBAC変更なし**・**runtime 解禁なし**／**外部送信なし**・**実LLMなし**・**AIコストなし**／実装なし・commit-only（push なし）。

## 27. 次回推奨プロンプト案

> 「F1 実装ミッション（別承認）: `apps/web/tests/e2e/` の A=strict-mode 3件（operations_exec:15/39・operations:22）を `.first()`/exact 化、B=1件（planning_hokko:16 の期待文言を『Golden Path — 現在地と次の一手』へ）に修正。app/seed/schema/ci.yml は変更しない。ローカル typecheck/lint＋push で CI 再実行し stage3_e2e の該当4件緑を確認。残 C11件は F2 診断（html reporter/trace）別ミッション。」

## 28. 判定

判定: **CI_STAGE3_E2E_RED / PLAYWRIGHT_FAIL**（**stage1 success** / **stage3_e2e failure** / **Run E2E** = **57 passed** / **15 failed**）。**root-cause**=A3/B1/C11/D0/E0。**Phase 3** 進入 **HOLD**。**実装なし**・**runtime 解禁なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・**369-vault非編集**・push なし（commit-only）。次は F1（テスト4件修正・別承認）。
