# 369 OS V72 Codex 最大自律・独立再監査

- 日付: 2026-07-13 JST
- Repository: `DREEXY-git/369`
- Release Path: PR #18 `fa04e7405cf3ab6cb56f329804fc778dde6470b0`
- C19 lane: PR #22 `13793171a8439477f4d8bc08822f2875043b5475`
- Phase 4 lane: PR #20 `9080df1d4cafcee225775003700b219ac0522d64`
- RC lane: PR #29 `96172e5d2eec623a514970992ff1afef9d2613a4`
- app main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
- 判定: Release Path `HUMAN_PREVIEW_VERIFIED`、RC `CHANGES_REQUIRED / RELEASE HOLD`、C19 `CHANGES_REQUIRED / HOLD`、Phase 4 `HUMAN_PREVIEW_VERIFIED / EVIDENCE_GAP`
- app main / Production / 本番DB / 外部作用: 非接触

## 1. 非エンジニア向け結論

Phase 3.5のC21承認経路は、前回の3つの証拠不足とモバイルのテーマ切替消失が修正された。固定SHAのCI、実PostgreSQLテスト、21枚の画面証拠、独立unit、review threadを再確認し、PR #18のRelease Pathを合格とした。さらに同一SHAのVercel Previewで人間確認が完了した。次はPR #14＋#18だけのRCをCodexが再監査し、main判断はその後の人間Gateとする。

C19は原子性、rollback、監査、画面証拠が大きく改善した。一方、改善案生成の冪等性が`findFirst`の先行確認だけで、同時実行すると同じ入力から2件作成できる。実際に独立oracleで2件生成を再現したため、PR #22はP2 HOLDである。これはPR #18のRelease Path合格とは分離する。

Phase 4は、承認だけで成功扱いにせず`QUEUED`へ戻すこと、stale時の人間再確認、AI閲覧拒否、6表rollback、二重submitが実装・検証された。人間Previewで`QUEUED/再開待ち`と成果未記録も確認済みである。一方、CI上の実Redis、production worker registry、stalled recoveryは不足している。

PR #14とPR #18だけを統合したRC #29は、親SHA、tree、混入0の系譜条件を満たした。しかし、同じPR #18 treeを基点にした回帰PR #27が768pxでtopbar 75px overflowを実測し、RCにはその修正が入っていない。さらにRC exact-headのActionsログとartifactを確認できない。このためRCは`CHANGES_REQUIRED / RELEASE HOLD`であり、app main GOではない。

並行laneは最大限進んだが、そのまま昇格はしない。C22 #23は顧客名の取得段階遮断、Control Plane #25はrun-agent tenant整合と未決定receipt、Workflow #26は未知操作を`completed`にするfail-open、Fit-Gap #28は一次資料と行の対応証拠が不足する。回帰 #27の最小修正だけはコード差分として受領し、PR #18へ限定伝播を要求した。

## 2. Scoutと所有境界

- dirtyな利用者worktreeには触れず、3つの固定SHAを別々のclean detached worktreeで監査した。
- Codexによる`apps/**`、`packages/**`、workflow、roadmap、audit、tasks、Claude branchの変更は0件。
- PR #14の27 threadは全resolved。PR #18の残P2は固定SHAで独立確認後にresolved。PR #22は証拠Gap 2件をresolvedし、冪等性P2をHOLD。PR #20にはinline threadなし。
- `CODEX_ACK_V72 + READ_ONLY_WORK_CLAIM`: PR #18 comment `4951649269`。

## 3. PR #18 Release Path

### 固定証拠

- head: `fa04e7405cf3ab6cb56f329804fc778dde6470b0`
- CI run: `29194789992`
- unit: 472 passed / 0 failed
- E2E: 146 passed / 0 failed
- typecheck / lint / build / safety: success
- sealed env: Fake LLM、log mail、external send false
- artifact: `8260681537`、21 PNG
- ZIP SHA-256: `0e764c19e51c1678cdb512b59b7a38eeaf01e645b7ce14e1160f06befa35c6f6`
- Codex独立unit: C21 transaction + mobile NAV 21 / 21 green

### 確認した内容

1. mobile drawer内のテーマ切替を320pxで操作でき、light/darkとreload後の永続化をE2Eで確認。
2. 申請と決定のtransactionはasset、ApprovalRequest、AuditLog、DataAccessLogをrollback後に再取得して0件を確認。
3. decision auditとtitle/body sentinelの否定証拠を追加。
4. 外部作用カウンタをtenant単位に分離。
5. 同時申請、同時approve/reject、retry、cross-tenant、AI拒否を実PostgreSQLで確認。
6. 21枚を目視し、NAV 67導線、AI社員一覧・詳細・3D・full profile、desktop/mobileに新しい重大な欠落を認めず。
7. PR #18はPR #14の子孫で、PR #22/#20の変更を含まない。`merge-tree`でPR #14への統合競合なし。

判定は`CODEX_RELEASE_PASS_V70_R2 / HUMAN_PREVIEW_REQUIRED_V72`。PR #18 comment `4951699871`、thread reply `3566568170`に記録した。

### Human Preview受領

- `HUMAN_PREVIEW_VERIFIED_V72`: PR #18 comment `4951939581`。
- Status `Ready`、branch `claude/p35-approval-bridges-v1`、SHA `fa04e7405...`を人間確認。
- 320pxのdrawer、theme切替とreload永続化、Bell、user menu、logout、最下部NAVを確認。
- AI社員一覧・詳細・3Dで人物、profile、state一致を確認。
- この確認はPreview限定であり、C21のDB意味論はCI/Codex証拠、main/Productionは別Gate。

## 4. PR #22 C19

### 固定証拠

- head: `13793171a8439477f4d8bc08822f2875043b5475`
- CI run: `29195390186`
- unit: 481 passed / 0 failed
- E2E: 158 passed / 0 failed
- artifact: `8260854749`、25 PNG
- ZIP SHA-256: `2ea7c00fdf2ac63e9e4522fc4d574f7fee9b973c0c9b10b4aaeaea1068c523c2`
- Codex独立unit: suggestion core 4 / 4 green

### 修正済み

- suggestion作成と必須監査を単一transactionへ移動。
- 申請・決定のrollback、retry、decision audit、title sentinelを実PostgreSQLで確認。
- campaign budget / spent / metricsとtenant単位外部作用が不変。
- C19一覧、承認待ち、承認後のdesktop/mobile画像を目視。

### 未解消P2

`materializeSuggestionCore`は`auditLog.findFirst`後にsuggestionとauditを作る。DB unique、決定論的主キー、CASのいずれもなく、同一`aiOutputId`を並行投入した独立oracleで`suggestions=2 / ledgers=2`を再現した。またServer Action全体はtransaction前に新しいAIOutputを作るため、利用者retryは別`aiOutputId`となり、固定IDの順次retry試験だけでは全Actionの冪等性を証明しない。

再開条件:

1. DBで競合を一意に収束できる決定論的キー、unique制約、または同等のCASを設計する。
2. 同じ業務入力を並行実行する実PostgreSQL試験でsuggestionとledgerが各1件になること。
3. AIOutput作成後の失敗を含むServer Action全体retryで重複0を証明すること。

`CODEX_CHANGE_REQUEST_V72_C19`: comment `4951705481`。P2 threadは未解決のまま維持した。

## 5. PR #20 Phase 4

### 固定証拠

- head: `9080df1d4cafcee225775003700b219ac0522d64`
- CI run: `29196387933`
- unit: 493 passed / 0 failed
- E2E: 159 passed / 0 failed
- artifact: `8261145733`、21 PNG
- ZIP SHA-256: `99e3f80602d59381948a1c9b3effdcd6444a448b7535662ef10d8d1704c2d89a`
- Codex独立unit: lifecycle + AI gate bridge 116 / 116 green

### 確認した内容

- approveは`SUCCEEDED`を捏造せず`QUEUED`へ戻し、実行再開待ちとして区別。
- rejectは`FAILED`へ終端。
- 24時間超のstale gateは人間の再確認チェックなしではDB不変。
- AI主体は誤権限があっても一覧取得前とAction/coreの両方で拒否。
- gate/run/action/approval/audit/accessの6表rollback、retry、並行approve/reject、二重submitを確認。
- job dataはallowlistでinput/output/errorを含めない。

Evidence Gap:

- BullMQ 9 / 9はloopback Redisと専用in-memory lifecycle DBのローカル証拠。CI上の実Redis、production worker registry、stalled recoveryの証拠ではない。
- exact-head artifactにはPhase 4固有のstale/QUEUED/再確認画面がない。
- 承認済みrunを実workerへrequeueして実行完了まで追う証拠はない。

判定は`CODEX_P4_PASS_V70_R2 / EVIDENCE_GAP / HUMAN_PREVIEW_REQUIRED_V72`。PR #20 comment `4951708593`に記録した。

Human Preview comment `4951939636`で、Status `Ready`、branch `claude/p4-human-gate-resume-v1`、SHA `9080df1...`、Preview DB分離、approve後`QUEUED/再開待ち`、承認だけでは成果未記録であることを人間確認した。これはProduction queue/worker、stalled recovery、実requeueの証拠ではなく、既存`EVIDENCE_GAP`を維持する。

## 6. RCと下流V72 lane

Vercel combined statusは各固定headでsuccessを確認したが、認証付きPreviewはHuman Preview記録があるPR #18/#20だけを`HUMAN_PREVIEW_VERIFIED`とする。新laneのReady表示はCI、artifact、機能受入の代替にしない。

| PR | deployment target | 人間確認 |
|---|---|---|
| #18 | `524t4uqsjvvxvEctqHhjiDQrustv` | Human Preview完了。320px theme/NAV/AI社員を確認 |
| #22 | `HAH5shAjcQdkWbDH34Cw2kPvWnDm` | P2修正後に再確認。現headはHOLD |
| #20 | `E3G6NrQpgdvytuSsFwHwfuV4of3i` | Human Preview完了。DB分離、approve後QUEUED、成果未記録を確認 |

### RC #29

- head: `96172e5d2eec623a514970992ff1afef9d2613a4`
- parents: PR #14 `ba01244...`、PR #18 `fa04e74...`
- RC treeはPR #18 treeと一致し、PR #20/#22/#23/#25/#26/#27/#28の祖先混入0、競合0。
- Vercel: Ready。ただしVercel Authenticationを迂回せず、Codexによる画面確認は未実施。
- blocker: PR #27で実測された768px topbar overflow修正がRC treeにない。
- blocker: exact-head GitHub Actionsログとartifactを確認できない。
- `CODEX_CHANGE_REQUEST_V72_RC`: PR #29 comment `4951965231`。PR #18への限定伝播要求は`4951965691`。

必要な再開順は、PR #27のtopbar最小修正と回帰testだけをPR #18へ通常伝播、PR #18 exact-head CI/artifact、RC再構築、Codex再監査、768px Human Previewである。旧320px Preview結果を新headへ流用しない。

### 新規lane固定監査

| PR | head | Codex判定 | 主な不足 | GitHub comment |
|---|---|---|---|---:|
| #23 C22 read-only | `9209ef8565...` | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 顧客名を権限に関係なくDB取得、別tenant実在IDと一覧監査の証拠不足 | `4951991026` |
| #25 AI Control Plane | `c28b9bf5eb...` | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | run-agent tenant整合なし、PENDINGを却下扱い、payload/監査最小化不足 | `4951990981` |
| #26 Workflow Dry Run | `45bde82bc2...` | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 未知・空白分割の危険操作をskipして`completed`、GET URLへ業務文 | `4951991086` |
| #27 回帰hardening | `bc8fbef089...` | `CODE_DIFF_ACCEPTED / EVIDENCE_GAP` | PR #18未伝播、exact-head Actions/artifact、768px Human Preview待ち | `4951991149` |
| #28 Fit-Gap | `a8685afc42...` | `DOCS_CANDIDATE / EVIDENCE_GAP` | 一次資料URL・参照日・行別対応、Function ID/SHA状態接続なし | `4951991212` |

PR #23/#25/#26/#27/#28のGitHub combined statusはVercel successのみを確認した。Claudeのローカルtest件数は自己申告証拠として保持するが、exact-head Actions本文がないため`CI_VERIFIED`へ格上げしない。

C22、AI Inbox/Execution Receipt、Workflow Dry Run、回帰自動化、競合Fit-Gapには固定Draft headができた。これは進捗であるが、上表のP2/Evidence Gapが残るため完成、CI verified、Preview verifiedにはしない。

## 7. Phase判定

| Phase | 現在地 | 次のGate |
|---|---|---|
| Phase 3 | Growth Engine v0のDraft実装・安全境界・主要UIは`HUMAN_PREVIEW_VERIFIED` | 768px修正、RC R2、main人間判断 |
| Phase 3.5 C21 | Release Path `HUMAN_PREVIEW_VERIFIED`、DB意味論は`CODEX_VERIFIED` | PR #27限定伝播、exact-head CI、RC R2 |
| Phase 3.5 C19 | `CI_VERIFIED / CHANGES_REQUIRED` | 冪等性P2修正、再監査、Preview |
| Phase 3.5 C22 | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 取得段階PII、tenant、監査、exact-head CI |
| Phase 4可視化 | AI社員8名、3D、canonical profileは`HUMAN_PREVIEW_VERIFIED` | RCとは別laneで継続 |
| Phase 4実行制御 | `HUMAN_PREVIEW_VERIFIED / EVIDENCE_GAP` | 実queue/requeue/worker証拠 |
| Phase 4 Control Plane | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | tenant整合、receipt状態、payload最小化、監査、CI |
| Phase 4 Workflow Dry Run | `DRAFT_IMPLEMENTED / CHANGES_REQUIRED` | 未知操作fail-closed、URL非永続、CI |

## 8. 永続化方針

- Release Pathが合格したため、Evidenceを保守的に更新し`PHASE_READINESS_MATRIX_V3.md`を作成する。
- RC 768px回帰、C19、C22、Control Plane、Workflow、BullMQ、main、Productionは不足を維持し、Matrix作成を完成宣言に使わない。
- app/vault鏡像をDraft branchへ同期する。vault mainはC19 HOLD、RC、credential失効確認が残るため統合しない。
- `HUMAN_PREVIEW_GATES_CONFIRMED_V72`: PR #18 comment `4951939700`。RC準備とCodex read-only再監査への限定GOであり、main/Production GOではない。
- `CREDENTIAL_ROTATION_REQUIRED`は人間が失効・ローテーションを確認するまで維持する。

in-repo Obsidianは202 Markdown、wikilink 1,049件を検査し、1,040件を解決した。V72新規4ノートのorphanは0。残る9件は記法例2件、過去V68/V69ノート参照5件、参照先不明の既存2件であり、V72が新しいbroken linkを作っていないことを確認した。曖昧な履歴を推測で書き換えない。

「脆弱性ゼロ」「完全無欠」「全機能完成」「完全同期」「Production verified」は宣言しない。
