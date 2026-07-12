# 369 OS V70 Codex 先行監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- PR #14観測head: `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425`
- PR #18観測head: `dd54ce94ee31fc1f57244d770b31fc6df5819f3c`
- Codex Evidence PR #19: `7df5899b58e2e90a96b3a663ab4cd14f962464e0`
- 独立vault PR #3: `c0a3aadaeee4209254bae6a952be71fd30553832`
- 判定: `PREAUDIT / CLAUDE_FIXED_V70_WAITING`
- Matrix V3: 未作成

## 1. 非エンジニア向け結論

V70開始時点ではClaude Codeの新しい固定headはまだ存在しない。従ってV69の固定headへ新しい最終PASSは付けず、Human Preview証拠の整合と、次の実DB監査の準備だけを先行した。

V69文書の「Human Preview pending」は現在の事実と一致しない。人間は次を確認済みである。

- PR #14はbuild badge `ba01244`と画面を確認済み。
- PR #18はfull SHA `dd54ce94ee31fc1f57244d770b31fc6df5819f3c`、branch `claude/p35-approval-bridges-v1`、deployment `Ready`を確認済み。
- PR #18のC21承認フローと、外部公開・送信が起きないことを確認済み。
- 追加の人間実測ではmobile幅のBellとユーザー操作は欠落していない。

これはProduction確認ではない。Codex自身は認証済みPreviewを観測しておらず、人間の固定SHA実測をEvidenceとして受領した。

## 2. Human Preview Evidence整合

旧artifact `8258122858`の390px画像ではBell部分切れとユーザー領域の画面外表示が見えた。一方、同じ固定headのHuman Previewでは再現しなかった。V70では次の3状態に分ける。

| Evidence | 判定 |
|---|---|
| 認証済みHuman Preview | `NOT_REPRODUCED` |
| V69 GitHub Actions artifact | `ARTIFACT_DISCREPANCY` |
| 320/360/390/430px DOM bounding-boxと新artifact | `EVIDENCE_RECONCILIATION_PENDING` |

実装修正が確認されていないため「修正済み」とは記録しない。Claude fixed headで各controlのbounding box、visibility、clickability、accessible nameとclean artifactが揃った場合だけ旧P2をEvidence上closeする。

## 3. V69から継続するrelease blocker

PR #18のコード構造、mock transaction契約、Codex状態付きoracleはgreenである。しかし実Prisma/PostgreSQLで次を再現した証拠が未収載である。

1. 同一assetへの並行2申請が1件へ収束する。
2. 並行approve/rejectが1件へ収束する。
3. ApprovalRequest、Audit、DataAccessLogの後段失敗でDB最終状態が全rollbackする。
4. retry後に孤児ApprovalRequest、stale asset、二重auditが残らない。

元P2 thread `r3565885993`はこの証拠を受領するまでHOLDを維持する。

## 4. V70本監査の固定条件

`CLAUDE_FIXED_V70`受領後に旧`dd54ce94...`から新headへの全差分を固定し、次を独立監査する。

- 実PostgreSQLの並行申請、並行決定、後段失敗rollback。
- tenant、RBAC、AI主体拒否、metadata-only監査、外部作用0。
- Grammar代表oracleと旧攻撃入力の4経路回帰。
- 8名canonical profile、一覧、詳細、3D、NAV 67導線。
- mobile 320/360/390/430pxのBellとユーザー操作。
- exact-head CIログ本文と全artifact。

headが動いた場合は旧候補結果を破棄する。Claude branchや`apps/**`、`packages/**`はCodex側で編集しない。

## 5. Phase 4別Lane

`claude/p4-human-gate-resume-v1`はScout時点で存在しない。作成された場合はPhase 3/C21 release判定と分離し、AIの判断禁止、transaction、冪等性、tenant、Inbox/detail/3D状態、実loopback Redisのretryとfailed telemetryを固定SHAで監査する。

BullMQ実queue証拠不足はPhase 4の`EVIDENCE_GAP`であり、Phase 3/C21のRCを不必要に阻害しない。

## 6. Phase現在地

- Phase 3: `CI_VERIFIED / Draft`。Human Preview固定SHA確認済み。mainとProductionはHOLD。
- Phase 3.5 C21: `DRAFT_IMPLEMENTED / CI_VERIFIED / EVIDENCE_GAP`。実PostgreSQL証拠待ち。
- Phase 3.5 C19: `SCHEMA_CHANGE_APPROVAL_REQUIRED`。
- Phase 3.5 C22: `ROADMAP_ONLY`。
- Phase 4可視化: `CI_VERIFIED / Human Preview evidence received`。
- Phase 4実行制御: schema-free実装とBullMQ実queue証拠は未受領。
- Salesforce、MoneyForward、freee、HR: 段階実装対象。完成格上げなし。

## 7. Gate

V70先行監査ではFunction Evidenceの実装ステータスを変更しない。Matrix V3、RC、vault main、app main、Productionは昇格しない。

- `CODEX_ACK_V70 + WORK_CLAIM_V70`: PR #18 comment `4950872921`。
- `CLAUDE_FIXED_V70`: 未受領。
- Phase 4 branch: 未作成。
- verdict: `PREAUDIT / FIXED_HEAD_WAITING`。

「脆弱性ゼロ」「完全無欠」「完全同期」「Production verified」は宣言しない。
