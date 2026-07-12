# 369 OS V69 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- PR #14固定head: `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425`
- PR #18固定head: `dd54ce94ee31fc1f57244d770b31fc6df5819f3c`
- Codex Evidence PR: #19
- 独立vault PR: #3
- 判定: `CHANGES_REQUIRED / HOLD`
- Matrix V3: 未作成

## 1. 非エンジニア向け結論

Claude CodeのV69修正を固定SHAで再監査した。秘密マスクのP1は、Codex独自の大量入力と旧指摘の再現入力を含めて4経路すべて漏洩0となり、PR #14の27 threadは全件を根拠付きでcloseできた。

Phase 3.5のコンテンツ承認ブリッジも、申請・決定のtransaction原子性、AI主体の拒否、対象更新件数の確認をコード・CI・状態付き独立oracleで確認し、P1 3件をcloseした。

ただしrelease PASSではない。次の2件が残る。

1. Phase 3.5の並行申請・並行決定・途中失敗を実Prisma/PostgreSQLで再現する証拠がない。
2. 390px幅のmobile topbarで通知Bellが半分に切れ、avatar・role・logoutが画面外へ消える。

Vercel PreviewはVercel Authenticationで保護され、Codexは正規ログイン状態を持たないためHuman Previewも未完了である。従ってMatrix V3、vault main、Release Candidate、app main、ProductionはHOLDを維持する。

## 2. 固定headと系譜

| 対象 | SHA | 状態 |
|---|---|---|
| app main | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | unchanged / Production HOLD |
| PR #14 | `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425` | Grammar P1 closed / mobile P2 active |
| PR #18 | `dd54ce94ee31fc1f57244d770b31fc6df5819f3c` | P1 closed / DB Evidence Gap active |
| Codex PR #19 | V69本監査head `91f391e21ca6155008f84da005919b89580b57f9` | Evidence Draft / PR #18へretarget |
| vault PR #3 | V69更新前 `7589980925ddc130446787328b5a51f969f387b4` | Evidence Draft |
| vault main | `0812634ec443abf966819d2cf6b10e73efb3a94a` | unchanged / PASS待ち |

`git merge-base --is-ancestor ba01244 dd54ce9`はtrue。PR #18はmerge commit `0672ccd`でPR #14の固定headを通常mergeし、その上に原子性修復`dd54ce9`を積んでいる。

## 3. Grammar P1本監査

### 独立generator

Claude Codeとは別のscratch oracleを固定headへ投入した。

- total: 1,687。
- malformed: 1,680。
- positive: 7。
- object / array / nested container。
- trailing comma、keyなしtail、strict number、extra/mismatched/underflow closer、array内key構文。
- raw/escaped/mixed depth、space/tab/LF/CRLF、multiple keys、unclosed、maxLen、100KB。
- direct、FAILED保存、rethrow、Action失敗要約の4経路。

| 経路 | Leak |
|---|---:|
| direct `maskRunError` | 0 / 1,680 |
| FAILED保存 | 0 / 1,680 |
| rethrow | 0 / 1,680 |
| Action失敗要約 | 0 / 1,680 |

- positive regression: 0 / 7。
- 100KB: bounded、出力20文字、監査環境で1ms未満。

旧threadのescaped quote、escaped JSON、LF/CRLF、same-depth false closer、whitespace-broken tail、trailing comma、strict number、mismatched/extra closer、multiple sensitive keys、unclosedを別に再構成した25 malformedも4経路marker 0。positive 5 / 5を保持した。

収載testの関連2ファイルは110 / 110 passed。exact-head CIはunit 452 / E2E 127 / failed 0である。

### thread結果

- PR #14: 27 total / 27 resolved / 0 unresolved。
- 旧17 unresolvedには固定SHA、独立1,687件、旧thread 25件、CIを個別返信してresolveした。
- Grammar P1 root familyは本監査範囲でclose。

これは未知入力を含む「脆弱性ゼロ」の証明ではない。

## 4. Phase 3.5 transaction本監査

固定head `dd54ce9`では次を確認した。

- 申請: ContentAsset CAS、ApprovalRequest、AuditLog、DataAccessLogが単一`$transaction`。
- 決定: ApprovalRequest CAS、ContentAsset `count===1`、AuditLogが単一`$transaction`。
- `user.isAi`: actionとcoreの両方で拒否。coreはtransaction接触前に`forbidden`。
- tenant: asset / approvalの全CASが`tenantId`を条件に含む。
- data minimization: Approval payloadは`type/campaignId/generatedByAi`、DataAccessLogはmetadata-only。
- 外部公開、CMS投稿、広告変更、予算変更、外部送信、実LLM、課金の作用は追加していない。

Codex独自の状態付きtransaction oracle 11 / 11:

- 正常申請。
- ApprovalRequest/Audit/DataAccessの各失敗で全rollbackし、再試行成功。
- 並行2申請は勝者1件。
- foreign tenant申請は無変更。
- AI申請・決定はtransaction接触0。
- 正常決定。
- missing / foreign assetでapprovalもrollback。
- 決定Audit失敗でapproval / assetともrollback。
- 並行approve/rejectは決定1件・audit1件。

収載transaction契約test 12 / 12、exact-head CI unit 472 / E2E 131 / failed 0。AI+OWNER誤設定fixtureの直接決定拒否もE2Eで確認した。

### 残るEvidence Gap

mock transaction契約と状態付きoracleはコード構造を証明するが、実Prisma/PostgreSQLのロック・分離レベルで並行2申請、並行approve/reject、後段失敗rollbackを再現していない。元P2 thread `r3565885993`は未解決を維持する。

- PR #18: 4 total / 3 resolved / 1 unresolved active。
- C21: `DRAFT_IMPLEMENTED / CI_VERIFIED / EVIDENCE_GAP / HOLD`。
- C19: `SCHEMA_CHANGE_APPROVAL_REQUIRED`。
- C22: `ROADMAP_ONLY`。

## 5. exact-head CI

### PR #14

- run: `29185927436`。
- checkout: `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425`。
- stage1: 36 files / unit 452 / 0。
- typecheck、lint、build、Company Brain safety: success。
- E2E: 127 / 0。
- sealed env: `LLM_PROVIDER=fake`、`MAIL_PROVIDER=log`、`EXTERNAL_SEND_ENABLED=false`。
- skip/only/fixme: source scan 0。failure artifact stepのみ条件どおりskipped。

### PR #18

- run: `29186179985`。
- checkout: `dd54ce94ee31fc1f57244d770b31fc6df5819f3c`。
- stage1: 38 files / unit 472 / 0。
- typecheck、lint、build、Company Brain safety: success。
- E2E: 131 / 0。
- sealed env: `LLM_PROVIDER=fake`、`MAIL_PROVIDER=log`、`EXTERNAL_SEND_ENABLED=false`。
- failure artifact stepのみ条件どおりskipped。

## 6. Artifact目視

### PR #14 artifact

- ID: `8258046874`。
- 16 PNG / 2,312,739 bytes。
- digest: `sha256:c1e84b006a06c67ffd888cfe8f0efd4ba05caa5aaad7baf72b114e70f2dcdf04`。
- downloaded zip hash一致。

`ai-office-selected-desktop.png`はsidebar、header、mainの大部分が黒い未描画領域になった。後続PR #18の同画像では再現しないため、コード欠落ではなく撮影flakyのEvidence Gapと判定する。

### PR #18 artifact

- ID: `8258122858`。
- 16 PNG / 2,312,840 bytes。
- digest: `sha256:ed0e42dddcacb419cd467f8d5a21edd974df21c6a6acde5c3da75e23a4d47156`。
- downloaded zip hash一致。

確認できたもの:

- 3D canvas nonblank、8名、同一人物のportrait/profile/state。
- detail / office profileは評価コメントと下端まで単一要素画像へ収載。
- NAV desktop/mobileは67導線を1枚に収載。
- PR #14の黒い未描画領域は後続artifactで非再現。

新規P2:

- 390px幅の`ai-agents-list-mobile.png`、`ai-office-mobile.png`、`ai-agent-detail-mobile.png`で通知Bellが右端に部分表示。
- avatar、role、logoutは画面外へ消えている。
- document全体のhorizontal overflow検査は、header内部のclipを検出していない。
- PR #14 comment `4950700665`へ固定SHA、画像、必要E2Eを通知した。

## 7. Vercel Preview

候補:

- PR #14 Preview: `https://369-web-git-claude-full-recovery-v61-dreexy-gits-projects.vercel.app`。
- PR #14 Inspector: `https://vercel.com/dreexy-gits-projects/369-web/4i7ZMnAvsv5MBroYdqZW2fjVAcsi`。
- PR #18 Preview: `https://369-web-git-claude-p35-approval-bridges-v1-dreexy-gits-projects.vercel.app`。
- PR #18 Inspector: `https://vercel.com/dreexy-gits-projects/369-web/2eaqtBPxaZfXUx5DuDg3uB2dLHGK`。

Vercel botはReadyを表示し、更新時刻は各固定head push後と整合する。しかしCodexのbrowserはVercel Loginへ遷移し、Inspector metadataの`gitCommitSha`を確認できない。認証迂回・設定変更・redeploy・promotionは行っていない。

判定は`HUMAN_PREVIEW_REQUIRED_V69`。`PREVIEW_VERIFIED`やProduction evidenceには格上げしない。

## 8. Evidence更新

`FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md`を次の範囲だけ更新した。

- 新規既存Function ID接続: 9件（C03 8件、C39 1件）。
- 既存Evidence更新: 4件（C28-017、C30-052、USR-003、USR-007）。
- `UNMAPPED_CANDIDATE`: 1件（C21 content_review bridge）。
- 新規正式ID: 0。
- main / Preview / Productionへの格上げ: 0。

## 9. 統合dry-run

推奨順は`PR #14 fixed → PR #18 fixed → Codex Evidence`。

- `ba01244`は`dd54ce9`のancestor。PR #18が通常merge済みのため、PR #14を再度重ねない。
- PR #19のbaseをPR #18 `claude/p35-approval-bridges-v1`へretargetした。
- PR #18 `dd54ce9`とCodex Evidence `91f391e`のmerge-baseは`3d808a7`。
- left/right commits: 9 / 4。
- Codex 4 commitsは固有で重複patch 0。
- `git merge-tree --write-tree dd54ce9 91f391e`: exit 0、競合0、候補tree `e249c2acf794b6df644e7f632aab01d557858908`。

ただしEvidenceは本書追加前のheadであり、release blockerが残るため実mergeやRC作成は行わない。

## 10. Phase現在地

- Phase 3: `CI_VERIFIED / Draft`。main・Human Preview・Production未確認。
- Phase 3.5: C21 `DRAFT_IMPLEMENTED / CI_VERIFIED / EVIDENCE_GAP / HOLD`。C19 schema Gate、C22 roadmap。
- Phase 4: Grammar P1はclose。AI社員・3D・NAVは`CI_VERIFIED / Draft`だがmobile topbar P2により最終品質Gate HOLD。
- Salesforce、MoneyForward、freee、HR: 段階実装対象。今回の限定証拠で完成へ格上げしない。
- BullMQ実queue: `EVIDENCE_GAP`。
- Matrix V3: PASS条件未達のため未作成。

## 11. 人間だけが行う確認

1. 上記Inspectorへ正規Vercelログインする。
2. PR #14は`gitCommitSha=ba01244...`、PR #18は`gitCommitSha=dd54ce9...`、branchとReadyを確認する。
3. PreviewへCEOでログインし、build badgeのshort SHA一致を確認する。
4. desktop/mobileでNAV、AI社員一覧・詳細、3D Office、`/marketing/content`、`/approvals`をread-only確認する。
5. mobile topbarのBell、avatar、role、logoutが欠ける現象を確認する。
6. 申請・承認・却下・外部送信はこのread-only確認では実行しない。

app main merge、Production、schema/migration、外部connector、実LLM、課金、credential失効確認も人間Gateに残す。

## 12. 最終判定

- Critical: 0 observed in this audit scope。
- P1 / High: 0 active after fixed-head independent audit。
- blocking P2 / Evidence Gap: 2。
- Human Preview: pending。
- Verdict: `CHANGES_REQUIRED / HOLD`。

「脆弱性ゼロ」「完全無欠」「完全同期」「競合同等以上」は宣言しない。
