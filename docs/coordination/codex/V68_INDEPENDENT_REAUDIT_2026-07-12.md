# 369 OS V68 Codex 独立再監査

- 日付: 2026-07-12 JST
- Repository: `DREEXY-git/369`
- 対象PR: #14
- 固定監査head: `3d808a7f9ea00214fa257f8b35013ecfa8c32744`
- Codex後継branch: `codex/v68-independent-reaudit`
- 状態: `CHANGES_REQUIRED / HOLD`
- Matrix V3: 未作成

## 1. 結論

Claude Codeが`CLAUDE_FIXED_V68`として固定したheadを独立再監査した。CIはgreenだが、秘密マスクのgrammar mutation 10件が、direct、FAILED保存、rethrow、Action失敗要約の全4経路で10 / 10漏洩した。

従ってV68はPASSではない。PR #14はDraft、Matrix V3、vault main、Release Candidate、Human Preview、app main、ProductionはHOLDを維持する。

## 2. Scoutと引き継ぎ

- V68開始head: `3b11b42cab734e4f199d220df16a75b5ea882f07`。
- V68固定head: `3d808a7f9ea00214fa257f8b35013ecfa8c32744`。
- base: `7ef2d9f444a21273ce1070fa7a16ef6801c39e4c`。
- `CODEX_ACK_V68 + WORK_CLAIM`: PR #14 comment `4950191147`。
- `CLAUDE_ACK_V68 + WORK_CLAIM`: PR #14 comment `4950199042`。
- `CODEX_PREAUDIT_V68`: PR #14 comment `4950205148`。
- `CLAUDE_FIXED_V68`: PR #14 comment `4950269164`。
- `CODEX_CHANGE_REQUEST_V68`: PR #14 comment `4950356964`。
- final thread snapshot: 27 total / 3 resolved / 24 unresolved / 15 active / 9 outdated-unresolved。

元のユーザーworktreeはdirtyのため無変更で維持した。監査はdetached clean worktree、Evidenceは固定headから作った後継`codex/**` branchで行った。

## 3. 先行oracle

旧headでは次の1,440件を独立generatorで作った。

- 6 sensitive keys。
- 2 quote types。
- 3 backslash depths。
- 5 whitespace種。
- 8 malformed object tails。

keyなしquoted double/single、nested object、nested arrayの720件が、4経路すべてで漏洩した。これを受け、Claudeはobject/arrayを区別するcontainer stack parserとcanvas URL同期を実装した。

## 4. 固定headの新規P1

固定headに対し、Claudeのtestと別のgrammar mutation oracleを実exportとmock worker lifecycleへ投入した。

秘密marker:

- sensitive value: `INNERSECRET68`。
- suffix split marker: `PREV68` / `MIDV68` / `POSTV68`。

| 経路 | Cases | Leak |
|---|---:|---:|
| direct `maskRunError` | 10 | **10** |
| worker FAILED保存 | 10 | **10** |
| worker rethrow | 10 | **10** |
| Action失敗要約 | 10 | **10** |

invalid grammar 10件:

1. object trailing comma。
2. nested object trailing comma。
3. array trailing comma。
4. array trailing comma後に正常field。
5. JSON不正数値`01`。
6. JSON不正数値`-01`。
7. extra object closer。
8. extra array closer。
9. mismatched prefix stack pop。
10. array内object-key構文。

代表:

```text
input:  {"password":"INNERSECRET68",} PREV68MIDV68POST
direct: {"password":[masked],} PREV68MIDV68POST
saved:  {"password":[masked],} PREV68MIDV68POST
throw:  agent lifecycle job failed ... PREV68MIDV68POST
action: Codex監査（失敗: ... PREV68MIDV68POST）
```

valid JSON numberの`0`と`-10.5e+2`は非機密suffixを保持したため、positive oracle自体は動作している。

## 5. 根本原因

1. `OBJ_KEY`が「空object開始」と「comma直後」を兼ね、comma後の`}`を許可する。
2. `VALUE`が「空array開始」と「comma直後」を兼ね、comma後の`]`を許可する。
3. JSON number regexがleading zeroを許可する。
4. `buildContainerStack`がcloserの種類とunderflowを確認せずpopする。
5. sensitive key/valueがobject key contextにあるか、prefix grammarを検証しない。
6. `afterContainerExit`が余分な`}`/`]`をprose開始として許可する。

GitHubの自動Codexレビューも同じ固定headに対し、`["password":"abc","O0F144S68"]`をarray itemとして受理する別のP1を独立検出した。

## 6. 必須修正

- `OBJ_KEY_OR_END`と`OBJ_KEY_REQUIRED`を分離する。
- `VALUE_OR_END`と`VALUE_REQUIRED`を分離する。
- JSON numberをstrict grammarにする。
- stack closer kind、underflow、prefix contextを検証する。
- sensitive key/valueがobject fieldとして成立することを確認する。
- container exit後のextra closerを拒否する。
- 上記10件とGitHub指摘を4経路でmarker 0にする。
- valid empty object/array、valid number、nested record、container後の通常proseを保持する。

## 7. Canvas URL同期

Three.js raycast clickは`selectAgentRef`経由で2Dと同じ`selectAgent`へ統一された。E2Eは明示deep-link Aから実canvas clickでBを選択し、detail ID、URL、back A、forward Bを検証する。これは`CI_VERIFIED / Draft`の前進である。

ただしP1が残るためthreadをresolveせず、最終PASSにも使わない。

## 8. exact-head CI

run `29182878065`をjob log本文まで確認した。

- checkout: `3d808a7f9ea00214fa257f8b35013ecfa8c32744`。
- stage1: success。
- unit: 36 files / 444 passed / 0 failed。
- typecheck、lint、Company Brain safety: success。
- stage3 build: success。
- E2E: 127 passed / 0 failed。
- sealed env: `LLM_PROVIDER=fake`、`MAIL_PROVIDER=log`、`EXTERNAL_SEND_ENABLED=false`。
- failure report uploadだけが条件どおりskipped。

CIは収載されたtestを通過した証拠であり、独立10-case oracleのP1を否定しない。

## 9. Artifact目視

- artifact ID: `8257060233`。
- name: `e2e-screenshots-29182878065`。
- files: 16 PNG。
- bytes: 2,028,563。
- digest: `sha256:88b21f8f5b7a1ece3993bfa873f43d84c4f615f78cfa3a7724932e0cb849e456`。
- downloaded zip hashはGitHub digestと一致。

確認できたもの:

- desktop 3D canvasはnonblankで8名を表示。
- AI社員一覧はdesktop/mobileで8名を識別可能。
- detail profileは評価コメントまで表示。
- mobile NAV drawerはviewport全高で表示。

残るEvidence Gap:

- office profile画像はdesktop/mobileとも評価コメント下端が欠ける。
- mobile office profileは人物ヘッダー上端も欠ける。
- `nav-owner-*-full.png`は名称に反し67導線の全体を1画像で視覚証明しない。
- canvas clickによるURL履歴はE2Eログ証拠で、artifactに操作前後のURL証拠はない。

## 10. tenant・AI社員・NAV

V68差分はscanner、canvas selection、関連test、tasksに限定され、V67で入ったtenant逆参照、8名canonical parity、NAV受入実装を削除していない。ただしactive threadが残り、P1でrelease Gateが停止したため、V68で全項目を独立クローズしたとは記録しない。

## 11. Phase 3.5

Draft PR #18 `claude/p35-approval-bridges-v1`を固定head `ae15c3a0ff679345a4af5c4a2518054bf58a0d9c`でread-only監査した。

確認できた前進:

- C21は`ContentAsset`から内部`ApprovalRequest(content_review)`を作るreview-only bridgeである。
- 公開、CMS投稿、広告変更、予算変更、外部送信、実LLM、課金の呼び出しは追加していない。
- C19は既存schemaで競合安全性を保証できないため`SCHEMA_CHANGE_APPROVAL_REQUIRED`で停止しており、この停止判断は妥当である。

release-blocking gap:

1. assetのCAS後にApprovalRequest作成またはDataAccessLogが失敗すると、申請のない`pending_approval`が残り再試行不能になる。
2. 人間の決定actionに`user.isAi`の明示拒否がなく、権限設定が混在したAIを境界で遮断できない。
3. ApprovalRequest決定後のContentAsset更新件数を確認せず、対象更新失敗時に二者の状態が分離する。
4. E2Eは単発clickを確認するだけで、並行申請、並行approve/reject、後段例外、cross-tenant実在asset、権限付きAIの直接actionを証明しない。

`CODEX_CHANGE_REQUEST_P35_V68`をPR #18 comment `4950392835`、固定SHAインラインreview `4679634147`として通知した。従ってC21は`DRAFT_IMPLEMENTED / CHANGES_REQUIRED`であり、Function Evidenceを格上げしない。

exact-head CI run `29184338987`はunit 452 / E2E 130 / failed 0、typecheck、lint、build、安全検査green、sealed envを確認した。artifact `8257542428`は16 PNG、2,028,333 bytes、digest `sha256:c15647b8359a1eb735fec870986d895b879e0dc2bbee17b15e421e69d720a2fd`で、downloaded zip hashも一致した。ただし上記の並行実行・途中失敗・AI権限混在を検査するtestはなく、C21承認画面の視覚証拠もartifactに含まれない。既存のoffice profile上下切れとNAV 67導線の画像証拠不足も継続する。

roadmap81の`P5-ACC-01`等は正式Function IDではなく`UNMAPPED_CANDIDATE`として扱う。C22とPhase 5は`ROADMAP_ONLY`を維持する。

## 12. Phase Evidence

- Phase 3: `CI_VERIFIED / Draft`。main、Production、人間Previewは未確認。
- Phase 3.5: C21 bridgeは`DRAFT_IMPLEMENTED / CHANGES_REQUIRED`。C19は`SCHEMA_CHANGE_APPROVAL_REQUIRED`、C22は`ROADMAP_ONLY`。
- Phase 4: `DRAFT_IMPLEMENTED / FINAL QUALITY GATE / HOLD`。P1 active。
- Salesforce、MoneyForward、freee、HR: 段階実装対象。競合同等や完成に格上げしない。
- BullMQ実queue: `EVIDENCE_GAP`。
- `PHASE_READINESS_MATRIX_V3.md`: PASS条件未達のため作成しない。

## 13. 最終判定

- Critical: 0 observed in this audit scope。
- P1 / High: 1 root-cause family active、4経路10 / 10 leak。
- blocking P2: active threadあり。canvas修正は前進したが最終close前。
- Phase 3.5: PR #18に承認状態の原子性、AI決定禁止、競合証拠のblocking gapあり。
- Review threads: 24 unresolved、15 active。
- Verdict: `CHANGES_REQUIRED / HOLD`。

「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。
