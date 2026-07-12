# Sync Manifest V72

## 固定refs

- app main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
- PR #18: `fa04e7405cf3ab6cb56f329804fc778dde6470b0`
- PR #22: `13793171a8439477f4d8bc08822f2875043b5475`
- PR #20: `9080df1d4cafcee225775003700b219ac0522d64`
- RC #29: `96172e5d2eec623a514970992ff1afef9d2613a4`
- PR #23: `9209ef856523ae2e10a303849dc13a088e1f426c`
- PR #25: `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d`
- PR #26: `45bde82bc24b61ddcc76de74d2a4c8400468f6c0`
- vault main: `0812634ec443abf966819d2cf6b10e73efb3a94a`
- `SYNC_COMPLETE=false`

## 判定

- Release Path: `HUMAN_PREVIEW_VERIFIED` / RC `CHANGES_REQUIRED`
- C19: `CHANGES_REQUIRED / HOLD`
- Phase 4: `HUMAN_PREVIEW_VERIFIED / EVIDENCE_GAP`

## 同期対象

1. appのCodex監査記録、Function Evidence、Matrix V3。
2. in-repo Obsidianの[[CodexV72最大自律再監査]]、[[PhaseReadinessMatrixV3]]、[[競合FitGapV72]]、本ノート。
3. 独立`369-vault`の同名4ノートとindex。

## mainを止める条件

- C19並行冪等性P2。
- RCの768px回帰、exact-head CI/artifact、R2 Preview未確認。
- C22、Control Plane、WorkflowのP2未解消。
- CI実Redis、production worker、stalled recovery未確認。
- credential失効・ローテーションの人間確認待ち。

従ってDraft鏡像が一致しても、vault main、app main、Productionへは進めない。

in-repo鏡像のV72新規4ノートはindexから解決し、新規orphan 0。in-repoは202 Markdown、wikilink 1,049件、解決1,040件。既存の未解決9件は記法例、過去Codexノート、参照先不明の履歴であり、推測修復しない。

独立vault Draftは210 Markdown、wikilink 1,047件、解決1,045件。未解決2件はREADME/indexの記法例で、V72新規orphan 0。
