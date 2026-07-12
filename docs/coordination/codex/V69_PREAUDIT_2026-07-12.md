# 369 OS V69 Codex 先行監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- 対象PR: #14 / #18
- PR #14固定head: `3d808a7f9ea00214fa257f8b35013ecfa8c32744`
- PR #18固定head: `ae15c3a0ff679345a4af5c4a2518054bf58a0d9c`
- Codex Evidence PR: #19
- 状態: `PREAUDIT / CHANGES_REQUIRED / FIXED_HEAD_WAITING`
- Matrix V3: 未作成

## 1. 結論

V69のPhase 0と、Claude Codeの修正前headに対するread-only先行監査を完了した。

PR #14には秘密マスクのGrammar P1が残る。独立generatorで作った1,687件のうち、malformed 1,680件を4経路へ投入したところ、direct、FAILED保存、rethrow、Action失敗要約の各経路で318件ずつ秘密markerが残った。正常入力7件の非機密fieldは保持され、100KB入力は上限内で処理されたため、oracleの正負判定とbounded実行も確認できた。

PR #18には申請・決定処理の原子性、AI主体の明示拒否、更新件数確認、競合・途中失敗の証拠不足が残る。従って、PR #14/#18ともCI greenをrelease PASSには格上げしない。Matrix V3、vault main、Release Candidate、app main、ProductionはHOLDを維持する。

## 2. Scout現在地

| 対象 | 固定SHA | 状態 |
|---|---|---|
| app main | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | unchanged / Production HOLD |
| PR #14 | `3d808a7f9ea00214fa257f8b35013ecfa8c32744` | Draft / Grammar P1 active |
| PR #18 | `ae15c3a0ff679345a4af5c4a2518054bf58a0d9c` | Draft / transaction blockers active |
| PR #19 | `00747d250b74801492d9b10522c4eb8a521af774` | Codex Evidence Draft |
| vault PR #3 | `fb6ca051325505f781be4ea243807617256c17b6` | Draft / main未統合 |
| vault main | `0812634ec443abf966819d2cf6b10e73efb3a94a` | unchanged / PASS待ち |

- PR #14 thread snapshot: 27 total / 10 resolved / 17 unresolved / 9 active / 8 outdated-unresolved。
- PR #18 thread snapshot: 4 total / 0 resolved / 4 active。
- `CLAUDE_FIXED_V69`と`CLAUDE_P35_FIXED_V69`は未受領。
- 元のユーザーworktreeはdirtyのまま無変更。調査と文書化はclean worktreeで行った。

GitHub通知:

- PR #14 `CODEX_ACK_V69 + WORK_CLAIM`: comment `4950488101`。
- PR #18 `CODEX_ACK_P35_V69 + READ_ONLY_WORK_CLAIM`: comment `4950488067`。
- PR #14 `CODEX_PREAUDIT_V69_GRAMMAR`: comment `4950499571`。
- PR #18 `CODEX_PREAUDIT_P35_V69`: comment `4950501121`。

## 3. Grammar独立oracle

Claude Codeのtestとは別のgeneratorをscratch領域に作り、実exportとmock worker lifecycleへ投入した。Repositoryのコードやtestは変更していない。

構成:

- 総数: 1,687件。
- malformed: 1,680件。
- positive: 7件。
- 6 sensitive keys、raw/escaped quote、backslash depth 0-3。
- space、tab、LF、CRLF。
- object/array/nested container、trailing comma、keyless tail、strict number、extra/mismatched/underflow closer、array内sensitive key。
- direct、FAILED保存、rethrow、Action失敗要約の4経路。
- 100KB入力、最大長、実行時間。

結果:

| 経路 | malformed cases | Leak |
|---|---:|---:|
| direct `maskRunError` | 1,680 | **318** |
| worker FAILED保存 | 1,680 | **318** |
| worker rethrow | 1,680 | **318** |
| Action失敗要約 | 1,680 | **318** |

- positive regression: 0 / 7。
- 100KB bounded check: pass。mask出力20文字、監査環境では約0ms。
- 既存10-case oracleも4経路10 / 10 leakを再確認。

CIへ収載されていない独立入力で漏洩が再現するため、exact-head CI greenはP1を否定しない。修正後は旧84/1152/1440/1764、V68 10 mutation、本V69 generatorを同じ4経路で再実行する必要がある。

## 4. Phase 3.5 transaction先行監査

PR #18の固定headでは、申請処理と決定処理に`prisma.$transaction`相当のall-or-nothing境界がない。

release-blocking gap:

1. ContentAsset CAS後にApprovalRequest作成またはDataAccessLogが失敗すると、申請のない`pending_approval`が残り得る。
2. 人間の決定actionに`user.isAi`の明示拒否がなく、権限設定が混在したAI主体を境界で遮断できない。
3. ApprovalRequest決定後のContentAsset更新件数を確認せず、対象消失時にapprovalとassetの状態が分離し得る。
4. E2Eは単発approve/reject/AI button hiddenの3ケースで、並行申請、後段例外、並行approve/reject、cross-tenant実在asset、権限付きAIの直接actionを証明しない。

C21は`DRAFT_IMPLEMENTED / CHANGES_REQUIRED`を維持する。C19は`SCHEMA_CHANGE_APPROVAL_REQUIRED`、C22は`ROADMAP_ONLY`である。外部公開、広告変更、予算変更、外部送信、実LLM、課金の実行証拠には格上げしない。

## 5. exact-head CIとartifact

### PR #14

- workflow run: `29182878065`。
- checkout: `3d808a7f9ea00214fa257f8b35013ecfa8c32744`。
- stage1: 36 files / unit 444 passed / 0 failed。
- typecheck、lint、build、Company Brain safety: success。
- stage3 E2E: 127 passed / 0 failed。
- sealed env: `LLM_PROVIDER=fake`、`MAIL_PROVIDER=log`、`EXTERNAL_SEND_ENABLED=false`。
- artifact: `8257060233`、16 PNG、2,028,563 bytes。
- digest: `sha256:88b21f8f5b7a1ece3993bfa873f43d84c4f615f78cfa3a7724932e0cb849e456`。

### PR #18

- workflow run: `29184338987`。
- checkout: `ae15c3a0ff679345a4af5c4a2518054bf58a0d9c`。
- stage1: 37 files / unit 452 passed / 0 failed。
- typecheck、lint、build、安全検査: success。
- stage3 E2E: 130 passed / 0 failed。
- sealed env: `LLM_PROVIDER=fake`、`MAIL_PROVIDER=log`、`EXTERNAL_SEND_ENABLED=false`。
- artifact: `8257542428`、16 PNG、2,028,333 bytes。
- digest: `sha256:c15647b8359a1eb735fec870986d895b879e0dc2bbee17b15e421e69d720a2fd`。

両runとも、現在のGrammar oracleとtransaction失敗・競合条件はtest対象外である。

## 6. Vercel Preview先行監査

GitHubのVercel botが示す候補URL:

- PR #14: `https://369-web-git-claude-full-recovery-v61-dreexy-gits-projects.vercel.app`。
- PR #18: `https://369-web-git-claude-p35-approval-bridges-v1-dreexy-gits-projects.vercel.app`。

Inspector候補:

- PR #14: `https://vercel.com/dreexy-gits-projects/369-web/HfGQUFFB39LdYqUTjQRe49ZekWaU`。
- PR #18: `https://vercel.com/dreexy-gits-projects/369-web/Ek25xZ282Tom2hksugaoYZZ1NqCz`。

in-app browserで両Previewを開いたが、Vercel AuthenticationのLoginへ遷移した。Inspectorも未ログイン状態では確認できない。認証の迂回、設定変更、promotionは行っていないため、deploymentの`gitCommitSha`、固定headとのapp tree一致、build badge、NAV、AI社員、3D canvas、Marketing Content、承認一覧、console/networkは`HUMAN_PREVIEW_REQUIRED_V69`である。

- PR #14 human Preview comment: `4950491885`。
- PR #18 human Preview comment: `4950491929`。

botのReady表示だけを`PREVIEW_VERIFIED`や`Production verified`へ格上げしない。

## 7. Phase Evidence

- Phase 3: `CI_VERIFIED / Draft`。main、Production、人間Previewは未確認。
- Phase 3.5: C21は`DRAFT_IMPLEMENTED / CHANGES_REQUIRED`。C19は`SCHEMA_CHANGE_APPROVAL_REQUIRED`、C22は`ROADMAP_ONLY`。
- Phase 4: `DRAFT_IMPLEMENTED / FINAL QUALITY GATE / HOLD`。Grammar P1 active。
- Salesforce、MoneyForward、freee、HR: 段階実装対象。競合同等や完成には格上げしない。
- BullMQ実queue: `EVIDENCE_GAP`。
- Preview: `HUMAN_PREVIEW_REQUIRED_V69`。
- `PHASE_READINESS_MATRIX_V3.md`: PASS条件未達のため作成しない。

既存Function IDに追加できるPASS証拠はない。正式IDのない候補を新規IDとして作らず、Evidenceの状態を据え置く。

## 8. Obsidianリンク分類

Obsidianのbasename解決を考慮したsemantic scannerで、app鏡像199 Markdownファイルと独立vault 202 Markdownファイルを検査した。

- app鏡像: basenameで実在ノートへ解決するlink occurrence 324、説明用false-positive 2、要人間判断2、明白修復0。
- 独立vault: basenameで実在ノートへ解決するlink occurrence 324、説明用false-positive 2、要人間判断0、明白修復0。
- false-positiveはREADMEの`ノート名`とindexの`リンク`という記法例であり、リンク修復対象ではない。
- app鏡像の要人間判断2件は、`Codex指摘クローズv62.md`と`完全復旧と4軸ロードマップv61.md`から参照される同一タイトル`残存欠陥クローズと統合v59`である。該当名の正本ノートがなく、参照先を一意に決められないため変更しない。
- V69新規2ノートは両indexから解決し、正本・in-repo鏡像・独立vaultの本文はbyte一致する。
- `.obsidian/**`は変更していない。

従って、V69で自動修復できる明白なlinkは0件であり、曖昧な2参照を勝手に置換しない。全体broken link 0とは宣言しない。

## 9. 次のGate

1. Claude Codeが別SHAで`CLAUDE_FIXED_V69`を固定する。
2. 旧matrixとV69 oracleを4経路で再実行し、marker/prefix/suffix 0を確認する。
3. Claude Codeが別SHAで`CLAUDE_P35_FIXED_V69`を固定する。
4. transaction all-or-nothing、asset count=1、`user.isAi`明示拒否、競合・途中失敗・cross-tenantを独立確認する。
5. exact-head CI本文とartifactを再確認する。
6. 人間がVercelへ正規ログインし、固定head lineageとread-only画面を確認する。
7. 全PASS時だけMatrix V3、vault main同期、Draft RC監査へ進む。

## 10. 判定

- Critical: 0 observed in this audit scope。
- P1 / High: Grammar root-cause family active。4経路各318件leak。
- blocking P2: Phase 3.5 transaction / AI boundary / evidenceに4項目。
- Verdict: `CHANGES_REQUIRED / FIXED_HEAD_WAITING / HUMAN_PREVIEW_REQUIRED`。

「脆弱性ゼロ」「完全無欠」「完全同期」「全機能完成」は宣言しない。
