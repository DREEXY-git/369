# 369 OS Phase Readiness Matrix V3

- 基準日: 2026-07-13 JST
- Release Path固定head: RC PR #32 `8d3ae36f9f036b4125d029c5b7a55cbbc3d04685`
- 最新app main: `7efb22b43b781e485a4759fab4145792eeabe92e`
- 最新独立判定: `POST_RELEASE_CHANGES_REQUIRED`（P2 3件）
- Matrixの意味: 実装、CI、独立監査、Preview、main、Productionを分離した現在地
- 完成宣言: しない

## 1. Evidence段階

| 状態 | 意味 |
|---|---|
| `ROADMAP_ONLY` | 計画のみ。実装証拠なし |
| `DRAFT_IMPLEMENTED` | Draft branchに限定実装あり |
| `CI_VERIFIED` | 固定SHAのCI本文で対象試験を確認 |
| `CODEX_VERIFIED` | Codexが固定SHAを独立監査 |
| `HUMAN_PREVIEW_VERIFIED` | 人間が同一SHAのPreviewを実操作確認 |
| `MAIN_MERGED` | GitHub mainへ履歴付きで統合済み |
| `PRODUCTION_VERIFIED` | Productionで受入条件を実測 |
| `EVIDENCE_GAP` | 実装候補はあるが必要証拠が不足 |

上位段階は自動的に継承しない。特にCI greenはPreview、main、Productionの証拠ではない。

## 2. Repository lineage

| 系譜 | 現在地 | 判定 |
|---|---|---|
| app main | `7efb22b43b781e485a4759fab4145792eeabe92e` | PR #32 Phase 3/C21とPR #33 C22を履歴付きで統合済み。P2修正待ち |
| Phase 3 base | PR #14 `ba01244...` | RC #32を経てmainのancestor |
| Release Path / C21 | PR #18 `d209d5d...` -> RC #32 `8d3ae36...` -> main `71e0b426...` | CI/Human Preview/main統合済み。Control Tower監査label P2でcompletion HOLD |
| C19 | PR #22 `e3c410c...` | `CI_VERIFIED / CHANGES_REQUIRED`。V74独立監査でblocking P2 3件 |
| Phase 4 | PR #20 `9080df1...` | `HUMAN_PREVIEW_VERIFIED / EVIDENCE_GAP` |
| RC #29 | `96172e5...` | RC #32にsupersedeされた履歴 |
| RC #32 | `8d3ae36...` | CI 472/151、artifact 25 PNG、Human Preview、main統合済み。post-release P2でHOLD |
| C22 | PR #23 `2884949...` -> PR #33 -> main `7efb22b...` | source CI/Human Preview/main統合済み。追加P2 2件で`CHANGES_REQUIRED` |
| Phase 4 Control Plane | PR #25 `c28b9bf...` | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` |
| Workflow Dry Run | PR #26 `45bde82...` | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` |
| Regression hardening | PR #27 `bc8fbef...` | `CODE_DIFF_ACCEPTED / EVIDENCE_GAP` |
| Codex Evidence | `codex/v74-phase-completion-gate` | V74 WIP監査・Matrix・Evidence同期branch |
| vault main | `0517997b386ffdb82034c7d3bbc57e5a0062a30f` | P3-R01まで同期済み。post-release再監査同期を次commitで追補 |

PR #14/#18はRC #32を経てmainへ統合済みで、C22もPR #33経由でmainへ入った。今後はP2 3件を専用fix-forward laneで閉じ、C19とPhase 4は各Gateを満たすまで別laneを維持する。

## 3. Phase 3 / 3.5 / 4

| Phase / 機能群 | 実装 | CI | Codex | Preview | main / Production | 現在の意味 |
|---|---|---|---|---|---|---|
| Phase 3 Growth Engine v0 | `MAIN_MERGED` | 472 unit / 151 E2E | `POST_RELEASE_CHANGES_REQUIRED` | `HUMAN_PREVIEW_VERIFIED` | main統合、Vercel success | 768px回帰は解消。Control Towerの財務機密閲覧label P2をfix-forwardするまでcompletion HOLD |
| Phase 3.5 C21 SEO/Content | `MAIN_MERGED` | 472 unit / 151 E2E | `CODEX_VERIFIED`（限定範囲） | `HUMAN_PREVIEW_VERIFIED` | main統合、owner Production Ready申告 | 内部下書き・承認まで。CMS公開・外部送信なし。Phase 3全体のP2とは分離して記録 |
| Phase 3.5 C19 Ads | `DRAFT_IMPLEMENTED` | 484 unit / 161 E2E | `CHANGES_REQUIRED` | 旧DB Gateのみ | HOLD | read-only、AI下書き、内部承認。P2002誤判定、業務意図key、生成全体監査のblocking P2が残る |
| Phase 3.5 C22 Referral | `MAIN_MERGED` | source head 483 unit / 155 E2E | `CHANGES_REQUIRED` | `HUMAN_PREVIEW_VERIFIED` | main統合、Vercel success | 旧P2 3件は修正。候補外direct previewとAI actorType誤分類の追加P2 2件、merge head exact CI不足 |
| Phase 4 AI社員可視化 | `MAIN_MERGED` | 472 unit / 151 E2E | `CODEX_VERIFIED` | `HUMAN_PREVIEW_VERIFIED` | main統合、Vercel success | 8名、一覧、詳細、3D、canonical profile/state。Production機能受入は未実測 |
| Phase 4 Human Gate | `DRAFT_IMPLEMENTED` | 493 unit / 159 E2E | `CODEX_VERIFIED` | `HUMAN_PREVIEW_VERIFIED` | HOLD | approve後QUEUED/再開待ちと成果未記録をPreview確認。stale/AI拒否/6表rollbackはCI/Codex証拠 |
| Phase 4 実行再開 | `DRAFT_IMPLEMENTED` | ローカルBullMQ 9/9 | `EVIDENCE_GAP` | なし | HOLD | CI実Redis、production worker、stalled recovery、実requeueが未証明 |
| AI Inbox / Execution Receipt | `DRAFT_IMPLEMENTED` | exact-head Actions未確認 | `CHANGES_REQUIRED` | なし | HOLD | tenant逆参照、未決定receipt、payload/DataAccess最小化が不足 |
| Workflow Dry Run | `DRAFT_IMPLEMENTED` | exact-head Actions未確認 | `CHANGES_REQUIRED` | なし | HOLD | 未知危険操作をcompletedにするfail-openとGET URL残存が未解消 |

## 4. 4軸ロードマップ対応

| 軸 | 現在地 | 次段 |
|---|---|---|
| Repository lineage | Phase 3/C21/C22とAI社員可視化はmain。C19/Phase 4制御系は並行Draft | P2 fix-forward -> Codex再監査 -> 人間main/Production Gate |
| Business Phase 0-20 | Phase 3 Growth v0とPhase 3.5一部をmainへ統合、Phase 4 AI Workforceの入口 | Growthの監査補修、主要channel接続、Phase 4実行証拠 |
| PDF Phase 2.5-18 | Phase 3承認・監査基盤相当をmain/並行Draftで強化中 | 実運用Gate、会計/労務/電子帳簿を段階拡張 |
| Strategy 18.5-26 | 未到達。Marketplace、MCP、課金、広域外部連携は封印 | 人間承認後の後続Phase |

この表は異なる番号体系を無理に同じ進捗率へ換算しない。各軸の証拠段階を正とする。

## 4.1 V74 workstream別完了ゲート

| Workstream | Repository lineage | Business Phase 0-20 | PDF / Strategy | R Stage | Evidence Stage | 主なFunction ID | Git SHA / CI | Codex | Human Preview | main | Production | Obsidian SHA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `P3-GROWTH` | PR #14 -> #18 `d209d5d` -> RC #32 `8d3ae36` -> main `71e0b426` | Phase 3 Growth v0 | PDF Phase 3相当 | R7 | `MAIN_MERGED / POST_RELEASE_CHANGES_REQUIRED` | C18-C22の限定範囲、`C28-017` | RC CI `29205251769` 472/151、artifact `8263616002` | ancestry/tree/CI/25 PNG確認、監査label P2 | `8d3ae36` Human Preview済み | `71e0b426` | owner Ready/env安全申告、機能実測は限定 | post-release同期manifestで追補 |
| `P3-Q2C` | PR #18 code tree -> RC #32 -> main `71e0b426` | Phase 3横断業務基盤 | PDF Phase 3以降の内部縦切り | R4-R7横断 | `MAIN_MERGED / EVIDENCE_GAP` | `C10-040/041/044`、`C11-004/022`、`C12-002/028/030/031/032`、`C13-002/011/023`、`C14-001/002/003` | RC `8d3ae36`、finance unit 32/32、全体CI 472/151 | `CHANGES_REQUIRED` | Q2C受入として未実施 | `71e0b426` | deployment successのみ、Q2C機能未実測 | post-release同期manifestで追補 |
| `P35-CHANNELS` | C21はRC #32、C22はPR #33でmain統合。C19は独立lane | Phase 3.5 | Growth Channels | R7 | `MAIN_MERGED部分 / CHANGES_REQUIRED` | C19/C21、C22 read-onlyは保守的にUNMAPPED | C22 source CI `29204903544` 483/155、merge head Actionsなし | C22追加P2 2件、C19 HOLD | C21/C22固定SHAで実施 | `7efb22b` | Vercel status success、C22本番機能実測は未確認 | post-release同期manifestで追補 |
| `P4-WORKFORCE` | AI社員可視化はmain。#20 Human Gate、#25 CP、#26 Workflowは独立lane | Phase 4 | AI Workforce / Human Certification | R7-R10入口 | `MAIN_MERGED部分 / HUMAN_PREVIEW_VERIFIED限定 + EVIDENCE_GAP` | `C28-017`、`C30-041/052`、CP/WorkflowはUNMAPPED | RC CI 472/151、#20 CI `29196387933`、#25/#26 CIなし | 可視化PASS、CP/Workflow HOLD | AI UIと#20限定 | AI UIのみ`71e0b426` | AI UI deployment success、Human Gate/queue未統合 | post-release同期manifestで追補 |

### Wave分離

| Wave | 対象 | 現在地 |
|---|---|---|
| Wave 1 | AI DX + Marketing | Phase 3/C21/C22/AI社員可視化は一部main、残りはDraft/HOLD。machine completeではない |
| Wave 2 | Salesforce型CRM/SFA | 既存CRM/SFA限定実装 + Fit-Gap。`PARTIAL / ROADMAP_ONLY` |
| Wave 3 | Money Forward/freee型会計 | Q2C限定縦切りを初回独立監査。原子性・権限のblocking P2、`EVIDENCE_GAP` |
| Wave 4 | 人事労務・電子帳簿 | `ROADMAP_ONLY`中心。法務・専門家Gateが必要 |
| Wave 5 | 外部連携・Enterprise | 外部connector、実LLM、MCP、課金、SSO等は封印・人間Gate |

将来Waveは現Phaseの完成率へ加算しない。

## 5. 競合カテゴリの段階実装

| 分野 | 369 OSの現状 | 公式ベースライン例 | 判定 |
|---|---|---|---|
| Salesforce型CRM/SFA | CRM、案件、pipeline、承認、監査の限定実装あり | Sales Cloudのlead/opportunity/pipeline等 | `PARTIAL / FIT_GAP_REQUIRED` |
| Money Forward型会計 | 見積、契約、請求、財務summary、仕訳候補の限定実装あり | 自動仕訳、帳票、決算、経営レポート、周辺連携 | `PARTIAL / ROADMAP_ONLY` |
| freee型会計 | 会計・請求の限定縦切りあり | 取引、帳簿、決算、証憑、電子保存 | `PARTIAL / ROADMAP_ONLY` |
| 人事・労務 | ユーザー、権限、AI社員はあるが給与・勤怠・社保は未完成 | 従業員情報、勤怠、給与、入退社、年末調整、社会保険 | `ROADMAP_ONLY`中心 |
| 電子帳簿保存 | 一般文書・監査ログはあるが法的保存要件の総合証拠なし | 帳簿、決算書、スキャナ保存、電子取引保存 | `ROADMAP_ONLY / LEGAL_REVIEW_REQUIRED` |

公式調査の起点:

- [Salesforce Sales Cloud公式資料](https://www.salesforce.com/content/dam/web/ja_jp/www/cloud-services/documents/Sales_Getting_Started_WithSalesCloud.pdf)
- [Money Forward クラウド会計の機能](https://biz.moneyforward.com/accounting/smb/function/)
- [Money Forward クラウド人事管理の機能](https://biz.moneyforward.com/employee/function/)
- [Money Forward クラウド給与の機能](https://biz.moneyforward.com/payroll/function/)
- [freee人事労務 機能帳票一覧](https://www.freee.co.jp/hr/features/list/)
- [freee 電子帳簿保存法の概要](https://support.freee.co.jp/hc/ja/articles/4410254921497)
- [国税庁 電子帳簿等保存制度特設サイト](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/tokusetsu/index.htm)

これは公開情報を起点にした高水準分類であり、機能単位の完全fit-gapはClaudeの専用lane固定head受領後にEvidenceへ接続する。

Function ID単位のV72詳細分類は`COMPETITOR_FIT_GAP_V72.md`を正とする。専用Claude実装headがない範囲は、そこで`ROADMAP_ONLY`または`EVIDENCE_GAP`に留めた。

## 6. 次の3 WIP

1. **P3-GROWTH / P3-Q2C**: Control Tower財務閲覧labelをfix-forwardし、契約RBAC、請求/入金/正式化transaction、並行採番を独立WIPで閉じる。
2. **P35-CHANNELS**: C22の候補外previewとAI actorTypeをfix-forwardし、C19のP2002/key/生成監査を固定headで再監査する。
3. **P4-WORKFORCE**: Control Plane tenant/receipt、Workflow fail-closed/URL、CI実Redis、approved run requeue、worker restart/stalled recoveryを閉じる。

AI Inbox、Workflow Dry Run、競合fit-gapは、上記を妨げない別branchで外部作用なしのDraftまで並行可能。C22は既にmainのため、追加拡張より先にP2修正を優先する。

## 7. 人間Gate

人間だけが行うもの:

- 認証付きVercel Previewの実操作とBuild Logs確認。
- app main merge、Production deploy、schema/migrationの本番適用。
- 実Redis/worker運用構成、外部connector、実LLM、課金、実支払の解禁。
- credential失効・ローテーション完了の確認。
- 会計、税務、労務、電子帳簿の法務・専門家レビュー。

それ以外のread-only監査、CI/artifact確認、Evidence更新、Draft同期はCodex/Claudeが継続できる。

## 8. 残存リスク

- RC 768px topbar回帰は解消しmain統合済み。ただしControl Tower財務閲覧label P2が現行mainに残る。
- P3-Q2Cの契約RBAC、請求/入金/正式化の非原子的更新、並行採番。
- C19のP2002誤判定、業務意図key、生成全体監査のP2。
- C22の旧PII/tenant/一覧監査は修正済みだが、候補外direct previewとAI actorTypeのP2が現行mainに残る。Control Planeのtenant/receipt、Workflowのfail-openも未解消。
- BullMQ/workerの本番相当証拠不足。
- PR #14＋PR #18限定RCとC22はmainへ統合済み。Codex独立PASS前の統合で、fix-forwardが必要。
- Vercel status/owner Ready申告はあるが、P2修正後のProduction受入は未実施。
- 完全fit-gap未作成。
- credential失効確認待ち。

Matrix V3の作成はRelease Pathの限定合格を可視化するものであり、全Phase、競合機能、セキュリティ、Productionの完成を意味しない。
