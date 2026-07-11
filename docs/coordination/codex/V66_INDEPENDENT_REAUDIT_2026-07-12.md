# 369 OS v6.6 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- 対象PR: #14
- 固定観測head: `52b98a5aa2e1b9f1a759085c51135a27b684c230`
- Codex Evidence PR: #16
- 状態: `PREAUDIT / WAITING_FOR_CLAUDE_FIXED_V66`
- Release Gate: `CHANGES_REQUIRED / main and Production HOLD`

## 1. この記録の位置づけ

本書はClaude CodeのV66修復と重ならないCodex先行監査である。Scout時点でPR #14に`CLAUDE_FIXED_V66`はなく、current headはV65のままである。このため、本書は途中headへV66最終PASSを付けない。

Codexは`apps/**`、`packages/**`、workflow、roadmap、audit、tasks、Claude branchを変更しない。main、Production、本番DB、Secrets、外部送信、実LLM、課金、実支払にも触れない。

## 2. Phase 0 Scout

- PR #14: Draft / open / mergeable。
- head: `52b98a5aa2e1b9f1a759085c51135a27b684c230`。
- base: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`。
- review thread: 15 total / 3 resolved / 12 unresolved / 6 active unresolved。
- PR #16 head: `8bc76d034f1c58d7f24453ee7e82b6b0bfa18d80`。
- independent vault PR #3 head: `4524c932df13fc4650acff6cb24e7387b55365ef`。
- app main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`。PR #14 headの直接祖先で、差分は107 commits。
- vault main: `0812634ec443abf966819d2cf6b10e73efb3a94a`。
- `CODEX_ACK_V66 + WORK_CLAIM`: PR #14 comment `4948580793`。
- 先行所見通知: PR #14 comment `4948601611`。

元のユーザーworktreeには未commitの台帳・Obsidian・`.codex/**`等があるため無変更で維持し、専用clean worktreeだけを使用した。

## 3. P1独立oracle

実export `maskRunError`へ、ClaudeのV65 test generatorとは別に次を組み合わせた。

- sensitive key: password / token / authorization / api_key / secret / session。
- quote: single / double。
- leading backslash depth: 0 / 1 / 2。
- separator: comma / comma-space / semicolon / space / LF / brace / bracket。
- balanced but invalid tail: raw quote pair、single quote pair、empty pair、key without colon、colon without value、複数pair、object-like tail。

| Oracle | Cases | Sentinel leak |
|---|---:|---:|
| balanced-malformed V66 matrix | 1,764 | **1,764** |
| previous V65 matrix | 1,152 | 0 |
| 100KB bounded input | 1 | 0 |
| valid benign records | 3 | secret 0 / benign fields retained |

代表例:

```text
{"password":"abc",O0F144S66"x"}
=> {"password":[masked],O0F144S66"x"}
```

原因は`tailIsStructurallyClean`がtailを「引用符の均衡」としてしか検証せず、次field、container終端、record終端として文法的に成立するかを確認しないことである。旧1,152件だけがgreenでも、この攻撃クラスを証明しない。

directで漏れる値はworkerのFAILED保存、再throw、Action要約へ渡るためrelease blockerである。V66 fixed headでは4経路を実測し、同じ実装由来のtestだけに依存しない。

## 4. tenant・data minimization先行監査

改善済み:

- detailのrun / action / memoryは子自身の`tenantId`を明示した。
- broad includeを廃止し、run `input` / `output` / `error`を取得しない。
- list/detailにmetadata-only `writeDataAccess`を追加した。

未解決:

- listのrun queryは`where: { tenantId }`だが、related agentは`agent: { select: { name: true } }`のみで、agent自身のtenant一致を要求しない。
- 現E2Eはforeign-tenant runをown agentへ関連付けるが、「own-tenant runがforeign-tenant agentを参照する」fixtureを作らない。
- schema relationは複合tenant FKではないため、run tenantだけでrelated agent tenantを保証できない。

従ってactive list threadはまだ独立クローズできない。detail child isolationはfixed headでCI fixtureとDataAccessLogを再確認する。

## 5. AI社員8名・deep-link・視覚証拠

改善済み:

- 8 canonical keys、fullName、state、実在別tenant agent 404。
- detail/officeで同じcanonical profileを参照する実装。
- mobile NAVはOWNER 67 DOM links、全高、deep click、overlay/Escape、focus/ariaをE2E化。

未解決:

- portraitはSVG存在のみ、full profileはpersonality 1項目だけをdetail/office比較している。
- appearance / skills / traits / commonMistakes / evaluationNoteの8名実値比較がない。
- A→B testは`page.goto`であり、同一client componentを保持したquery変更を直接証明しない。
- artifactの`ai-office-desktop-profile.png`と`ai-office-mobile-profile.png`は上端または下端が切れ、評価コメントまで読めるclean full-profile証拠ではない。

## 6. exact-head CI・artifact

CI run `29165794115`はexact headをcheckoutしている。

- stage1: success。unit 428 / 428、typecheck、lint、Company Brain safety green。
- stage3: success。build green、E2E 124 / 124、runtime skipped 0。
- sealed environment: Fake LLM、log mail、external send disabled。
- artifact: `8252150017`、12 PNG、1,615,117 bytes。
- artifact digest: `sha256:dadcde11b4668dfb60bbef0cf4d02c4b501623dfcb3aa73a3d28f99dcb9f493c`。downloaded zipと一致。

CIは既存testを通過した証拠であり、1,764-case oracleを含まないためrelease PASSではない。BullMQ実queueは引き続き`EVIDENCE_GAP`である。

## 7. review thread分類

- resolved 3: stale pre/post、OWNER/ADMIN build metadata、roadmap80 Evidence語彙。
- active unresolved 6: detail tenant、list tenant/data minimization、full profile parity、mobile NAV、deep-link同期、新balanced-malformed P1。
- outdated unresolved 6: 過去P1/parity thread。最新P1またはfull-profile oracleでsupersededされるが、root causeが閉じるまで一括resolveしない。

mobile NAV threadは現headで受入実装が揃っているが、新fixed headのCI/artifactを確認してからresolveする。

## 8. 非canonical branchの扱い

PR #17 / branch `claude/codex-v65-release-blockers` head `a6273838af09f88bf2ff145b0a73a00f5168f913`もread-onlyで観測した。これはPR #14 headでも`CLAUDE_FIXED_V66`でもないため最終対象にしない。

同branchはbalanced-malformed 1,764件を0 leakにする一方、valid `{"password":"secret","user":"bob"}`の`user`以降や正常なsuffixまで全消去する。秘密非残存は前進だが、V66指令の「正常な複数fieldを不必要に消さない」受入を満たす証拠ではない。

## 9. Phase Evidenceの現在地

- Phase 3: `CI_VERIFIED / Draft`。main、Production、人間Previewは未確認。
- Phase 3.5: C19/C21は`CI_VERIFIED / Draft`、C22は`ROADMAP_ONLY`。人間承認bridgeと外部接続は未完了。
- Phase 4: `DRAFT_IMPLEMENTED / FINAL QUALITY GATE`。P1とblocking P2のため完了宣言不可。
- Phase 5以降、Salesforce、MoneyForward、freee、HR: 段階実装対象。競合同等や完成へ格上げしない。
- `PHASE_READINESS_MATRIX_V3.md`: PASS条件未達のため未作成。

## 10. V66最終監査の再開条件

Claudeから次を受領した場合だけfixed headを再固定する。

- `CLAUDE_FIXED_V66`
- exact full SHA、changed files、red-to-green証拠
- exact-head CI run、artifact ID、branch freeze

headが動けば途中結果を破棄する。PASS条件はCritical 0、P1/High 0、release-blocking P2 0、4経路sentinel 0、tenant越境0、8名full parity、NAV受入、exact-head CI/artifact、Evidence格上げ0である。

## 11. 現在の判定

- Critical: 0 observed in this preaudit scope。
- P1: 1 release blocker confirmed, 1,764 / 1,764 leaks。
- P2 / Evidence Gap: related-agent tenant、full profile parity、true client navigation、clean profile artifact。
- V66 final verdict: waiting for Claude fixed head。
- PR #14 / main / Production: HOLD。

「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。
