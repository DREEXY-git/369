# 369 OS v6.5 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- 対象PR: #14
- 現在のClaude head: `9e72958df31c8ee7f9a2636d1c817013c78ab882`
- 現在のCodex Evidence PR: #16
- 現在のCodex remote head: `8add2422e70ea03984e084db738144932ade731c`
- 状態: `PREAUDIT / WAITING_FOR_CLAUDE_FIXED_V65`
- Release Gate: `CHANGES_REQUIRED / main and Production HOLD`

## 1. この記録の意味

この文書は、Claude CodeのV65実装と重ならないCodex先行監査です。2026-07-12のScout時点では、PR #14に`CLAUDE_ACK_V65`、`CLAUDE_FIXED_V65`、`CLAUDE_RC_READY_V65`はありません。そのため、V64 headへV65の最終PASS/HOLDを付けません。

Codexは`apps/**`、`packages/**`、workflow、roadmap80、audit176、tasks、`AGENTS.md`、`.codex/**`を変更しません。main merge、Production、本番DB、migration、seed、reset、Secrets、外部送信、実LLM、課金、実支払にも触れません。

## 2. Phase 0 Scout

- PR #14はDraft、open、mergeableです。
- PR #14 headは`9e72958df31c8ee7f9a2636d1c817013c78ab882`、baseは`7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`です。
- 最新の正式判定はreview `4678563117`とcomment `4948356332`の`CHANGES_REQUIRED / HOLD`です。
- review threadは14件、resolved 3件、unresolved 11件です。
- `CODEX_ACK_V65 + WORK_CLAIM`はcomment `4948421696`へ固定しました。
- PR #3〜#6、#9、#12〜#16はDraft/openです。PR #7/#8/#10/#11は統合済みです。
- PR #15は古いV2 snapshotであり、現在のPhase readiness正本へ昇格できません。

## 3. P1 scanner先行再現

現headの実export `maskRunError`へ、opening quote depth `0..4`、偽closer depthをopeningと同一、terminal quote depthをopeningと異なる`0..4`かつ差分2以内、delimiterをcomma/space/semicolon/LF/brace/bracketとする生成matrixを直接入力しました。

| 項目 | 結果 |
|---|---:|
| 生成ケース | 84 |
| sentinel残存 | 84 |
| sentinel非残存 | 0 |
| 100KB入力 | bounded、sentinel 0 |
| benign日本語文 | 意味を維持 |

代表例:

```text
{"password":"abc",O0F144S65\"}
=> {"password":[masked],O0F144S65\"}
```

これは性能問題ではなく、「同depth quoteが1個なら一意closer」として早く値を閉じる規則の問題です。曖昧・壊れたquote depth列を構造検証できない場合に末尾までmaskするfail-closed条件が未達です。

Claudeの次headでは、同じ生成matrixを以下の4経路で独立確認します。

- direct `maskRunError`
- FAILED保存値
- worker rethrow値
- Action失敗要約

## 4. tenant・PII・参照ログ先行監査

現headでは次が未解決です。

1. AI社員詳細は親`AIAgent`をtenant scopeしますが、nested `runs`、`actions`、`memory`を子自身の`tenantId`で絞っていません。
2. AI社員一覧は`AIAgentRun.tenantId`を絞りますが、relation `agent`のtenant一致とnested `actions`のtenant一致を保証しません。
3. Prisma relationは`agentId`または`runId`だけであり、複合tenant FKによるDB保証がありません。
4. broad `include`により、画面で使わないrun `input`、`output`、`error`等も取得します。
5. memory valueとaction summaryを表示する経路に`writeDataAccess`または同等の機密参照ログがありません。

V65ではephemeral CI fixtureでtenant Aの親へtenant Bのrun/action/memoryを関連付け、DOM・response・件数にsentinel 0、同tenant正常データ表示、metadata-only DataAccessLogを確認する必要があります。本番DB、seed、resetは不要です。

## 5. 人物・NAV・deep-link先行監査

現headの改善済み事項:

- mobile drawerはartifact上`288 x 844`へ復旧しています。
- AI社員カードの横overflowは解消しています。
- desktop 3D canvasは非blankです。
- stale RUNNING/QUEUED、OWNER/ADMIN build情報、Evidence語彙の3threadは独立確認済みです。

未解決:

- 8名parityはkey/fullName/stateまでで、portrait identity、appearance、personality、skills、traits、commonMistakes、evaluationNoteを3画面で値比較していません。
- mobile NAVは全高、deep click、Escapeまでで、OWNER描画link 67件とoverlay-click closureをassertしていません。
- `AiOffice`は`initialAgentId`を初回`useState`にだけ使うため、client navigationまたはback/forwardでURLと表示人物がずれる可能性があります。
- artifact 12 PNGは、8名全員の完全プロフィールparityを証明しません。

## 6. CI・Evidenceの現在地

現headのCI run `29163593089`はunit `423/423`、E2E `121/121`、typecheck、lint、build、safetyがgreenです。artifact `8251557866`は12 PNGです。ただし、上記の独立oracleを収載していないため、CI greenはrelease PASSではありません。

BullMQ実queue retry/failed telemetryは`EVIDENCE_GAP`のままです。Human Preview、main、Productionも未確認です。roadmap80のEvidence語彙修正はV64で確認済みですが、V65で回帰監査します。

## 7. Git履歴と同期の先行監査

- GitHub app mainは`ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`です。
- PR #16 remote headは`8add2422e70ea03984e084db738144932ade731c`です。
- 旧Codex local headは`7c54901a7fc17479f9e9196e7eb64f5c0078e5d7`で、remoteと`ba4a696`以降のcommit履歴が分岐しています。
- V64監査2ファイルのGit blob SHAはlocal/remoteで完全一致しています。content一致と履歴一致は分離して記録します。
- 旧local headは`codex/archive-v64-local-7c54901`として非破壊保存しました。
- V65 clean worktreeはremote正本`8add2422`から作成しました。force、rebase、hard resetは使用していません。

## 8. 独立Obsidianの現在地

- GitHub `DREEXY-git/369-vault` mainは`0812634ec443abf966819d2cf6b10e73efb3a94a`です。
- local vault mainも同じSHAです。
- `.DS_Store`、`.obsidian/`、未追跡canvasはユーザー所有として保持し、変更・削除していません。
- remoteは値を表示せずcredential-free HTTPS URLへ差し替えました。
- V64/V65監査ノート、Matrix V3、Sync Manifestは独立vault mainに未統合です。
- 過去の埋め込みcredentialは人間による失効・ローテーション確認が必要です。値は記録しません。

## 9. V65最終監査の再開条件

Claudeから次を受領した場合だけV65 final auditへ進みます。

- `CLAUDE_FIXED_V65`
- exact full SHA
- changed files
- red-to-green証拠
- exact-head CI run
- artifact ID
- branch freeze

headが動いた場合は途中結果を破棄します。PASS条件はCritical 0、P1/High 0、release-blocking P2 0、84-case x 4経路 sentinel 0、cross-tenant漏洩0、DataAccessLog欠落0、8名profile/portrait parity、NAV 67/overlay、deep-link同期、exact-head CI/artifact、Evidence格上げ0です。

## 10. 現在の判定

- Critical: 0 observed in current review scope
- P1/High: 2 release blockers remain on the current V64 head
- P2: data minimization/access logging、profile parity、NAV evidence、deep-link synchronization
- `PHASE_READINESS_MATRIX_V3.md`: not created
- PR #14: Draft/HOLD
- main/Production: HOLD
- Codex final V65 verdict: waiting for Claude fixed head
