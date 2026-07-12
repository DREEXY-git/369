# 369 OS V68 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- 対象PR: #14
- 固定観測head: `3b11b42cab734e4f199d220df16a75b5ea882f07`
- Codex Evidence PR: #16
- 状態: `PREAUDIT / WAITING_FOR_CLAUDE_FIXED_V68`
- Release Gate: `CHANGES_REQUIRED / main and Production HOLD`

## 1. この記録の位置づけ

本書は、Claude CodeがV68修復を開始する前の固定headを、Codexが独立に調べた先行監査記録である。PR #14には`CLAUDE_ACK_V68 + WORK_CLAIM`が投稿されたが、`CLAUDE_FIXED_V68`はまだ受領していない。このため、ここにある結果はV68最終判定ではなく、修復後headへそのまま流用もしない。

Codexは`apps/**`、`packages/**`、workflow、roadmap、audit、tasks、Claude branchを変更しない。main、Production、本番DB、Secrets、外部送信、実LLM、課金にも触れない。

## 2. Phase 0 Scout

- PR #14: Draft / open / mergeable。
- head: `3b11b42cab734e4f199d220df16a75b5ea882f07`。
- base: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`。
- review thread: 18 total / 3 resolved / 15 unresolved / 7 active。
- PR #16 head: `0f173e140214dd67c377ccc2f750a3464572028f`。V66時点でstale。
- independent vault PR #3 head: `0629d13d62d70635401348f56b602f625c2a600a`。V66時点でstale。
- app main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`。
- vault main: `0812634ec443abf966819d2cf6b10e73efb3a94a`。
- Phase 3.5 branch: `e555ee870da6647f32de9f1b4e5872db2dec4628`。docs-onlyでDraft PRなし。
- `CODEX_ACK_V68 + WORK_CLAIM`: PR #14 comment `4950191147`。
- `CLAUDE_ACK_V68 + WORK_CLAIM`: PR #14 comment `4950199042`。
- `CODEX_PREAUDIT_V68`: PR #14 comment `4950205148`。

元のユーザーworktreeはdirtyのため無変更で維持し、専用clean worktreeだけを使用した。

## 3. Grammar P1独立oracle

実exportへ、Claudeのtest generatorとは別に次を組み合わせた。

- sensitive key: password / token / authorization / api_key / secret / session。
- quote: single / double。
- leading backslash depth: 0 / 1 / 2。
- whitespace: none / space / tab / LF / CRLF。
- malformed object tail: keyなしdouble quote、keyなしsingle quote、keyなしnested object、keyなしnested array、bare token、key without colon、invalid bare value、double comma。

組合せは6 x 2 x 3 x 5 x 8 = 1,440件である。

| 経路 | Cases | Sentinel leak |
|---|---:|---:|
| direct `maskRunError` | 1,440 | **720** |
| worker FAILED保存 | 1,440 | **720** |
| worker rethrow | 1,440 | **720** |
| Action失敗要約 | 1,440 | **720** |

漏れたtailはkeyなしdouble quote、single quote、nested object、nested arrayで各180 / 180。whitespace 5種は各144件漏れた。正常なobject、nested object+array、array siblingは非機密fieldを保持した。100KB入力はboundedに終了し、保存長20、改行なし、ローカル実測約0.04msだった。

代表例:

```text
{"password":"abc","PREO0F144S68POST"}
{"password":"abc",{"x":"PREO0F144S68POST"}}
{"password":"abc",["PREO0F144S68POST"]}
```

原因は`structuredTailValid`がcontainer kindを保持せず、comma後をobjectでもarrayでも一律`EXPECT_VALUE`にすることにある。objectではkey+colonが必要なのに、array itemと同じ構文を受理する。directの漏れがFAILED保存、rethrow、Action要約にも伝播するため、これはrelease-blocking P1である。

## 4. Three.js canvas P2

2D一覧の`selectAgent`はstate更新と`router.push(?agent=...)`を行う。一方、Three.js raycast clickは`setSelectedId`を直接呼び、URLを更新しない。既存E2Eのclient navigationは2D buttonを操作しており、実canvas click後のURLを証明しない。

したがって、canvasで人物を切り替えると表示だけが変わり、共有URLとback/forward履歴がstaleになる。V68 fixed headでは実canvas clickから選択ID、URL、back/forwardを一続きで確認する。

## 5. exact-head CI・artifact

CI run `29167981816`はfixed observation headをcheckoutしている。

- stage1 / stage3: success。
- unit: 439 / 439、36 files。
- typecheck、lint、Company Brain safety: green。
- E2E: 126 / 126。
- sealed env: Fake LLM、log mail、external send disabled。
- artifact: `8252750312`、16 PNG、2,026,907 bytes。
- digest: `sha256:0424da09bd97a730a63f15f92dcbe19a234e203039b8f12f7aecb675306c46dd`。downloaded zipと一致。
- sourceにはseed不在時のconditional `test.skip`が2箇所あるが、exact CIでは発火していない。

目視ではdesktop/mobile NAV、AI社員一覧、3D canvas nonblank、詳細プロフィールの評価コメントまでを確認した。一方、office profile系はdesktopで評価コメント下端が欠け、mobileで人物ヘッダー上端と評価コメント下端が欠ける。office full-profile visual evidenceは`EVIDENCE_GAP`を維持する。

CI greenは既存testを通過した証拠であり、上記Grammar P1やcanvas P2を否定しない。

## 6. thread・残存Evidence

- active P1: `discussion_r3565042370`。
- active P2: `discussion_r3565042372`。
- 旧threadはroot cause、fixed SHA、独立oracle、CI、artifactが揃ったものだけresolveする。
- current headのtenant、8名canonical parity、NAVは前進しているが、fixed headでの回帰確認前に独立クローズしない。
- BullMQ実queueはRedisを含む実経路証拠がなく、`EVIDENCE_GAP`を維持する。

## 7. Phase 3.5先行確認

branch `claude/p35-approval-bridges-v1` head `e555ee870da6647f32de9f1b4e5872db2dec4628`はroadmap81等の設計文書であり、実装PRではない。C19/C21は内部ApprovalRequest bridgeの設計段階、C22は`ROADMAP_ONLY`である。roadmap81の`P5-ACC-01`等は正式Function IDとして格上げせず、`UNMAPPED_CANDIDATE`として扱う。

## 8. Phase Evidenceの現在地

- Phase 3: `CI_VERIFIED / Draft`。main、Production、人間Previewは未確認。
- Phase 3.5: C19/C21は`DRAFT_IMPLEMENTED`相当の既存read-only/AI下書き資産があるが、approval bridge新規実装は未着手。C22は`ROADMAP_ONLY`。
- Phase 4: `DRAFT_IMPLEMENTED / FINAL QUALITY GATE`。Grammar P1、canvas P2、office visual gapのため完了宣言不可。
- Phase 5以降、Salesforce、MoneyForward、freee、HR: 段階実装対象。競合同等や完成へ格上げしない。
- `PHASE_READINESS_MATRIX_V3.md`: PASS条件未達のため未作成。

## 9. V68最終監査の再開条件

Claudeから次を受領した場合だけ新headを固定する。

- `CLAUDE_FIXED_V68`。
- exact full SHA、changed files、red-to-green証拠。
- exact-head CI run、artifact ID、branch freeze。

headが動けば途中結果を破棄する。PASS条件はCritical 0、P1/High 0、blocking P2 0、4経路漏洩0、tenant越境0、8名canonical parity、canvas/2D URL同期、clean artifact、exact-head CI、Evidence格上げ0である。

## 10. 現在の判定

- Critical: 0 observed in this preaudit scope。
- P1: 1 release blocker confirmed。
- P2: 1 canvas URL synchronization defect confirmed。
- Evidence Gap: office full-profile visual evidence、BullMQ実queue。
- V68 final verdict: waiting for Claude fixed head。
- Matrix V3、vault main、Release Candidate、app main、Production: HOLD。

「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。
