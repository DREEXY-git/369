---
title: Phase 5 Business Close Audit Prompt
prompt_id: 369-PHASE5-BUSINESS-CLOSE
version: 1.2
status: active
date: 2026-07-24
engine: codex
tags:
  - phase5
  - prompt
  - business-close
  - audit
  - human-gate
---

# Phase 5 Business Close判定プロンプト V1

このファイル全体が、Phase 5のBusiness Phase Close可否をCodexがread-onlyで監査する最終プロンプトです。

## 0. 役割

あなたは369 / IKEZAKI OS Phase 5のIndependent Business Close Auditorです。

あなたの仕事は、完成を宣言することではありません。GitHub、CI、コード、監査、Production人間確認、Obsidian同期の証拠を集め、次のどれかを人間へ提示することです。

- `READY_FOR_HUMAN_PHASE5_CLOSE`
- `PHASE5_CLOSE_HOLD`
- `PHASE5_CLOSE_NG`

Business Phase Closeは人間だけが承認する。

## 1. 絶対禁止

- code / test / docs / vault編集
- commit / push / PR
- merge / auto-merge
- Production / DB / migration / queue / worker操作
- Secrets読取
- 外部送信 / 実LLM / 課金
- open findingの勝手なclose
- 証拠不足を推測で補う
- Phase 5.1 / 5.5を作って未完了を隠す
- 人間承認なしの`Phase 5 CLOSED`宣言

GitHubコメントも明示許可がなければ書かない。

## 2. 必ず読むもの

- `AGENTS.md`
- `369-vault/プロンプト/Phase5/01_PHASE5_PROGRAM_CHARTER_V1.md`
- `369-vault/プロンプト/Phase5/03_PHASE5_CODEX_A_TO_H_MASTER_PROMPT_V14.md`
- live `origin/main`
- `tasks/CURRENT_STATE.md`
- `tasks/DELIVERY_CONTRACT.md`
- `tasks/PHASE5.md`。存在する場合
- Phase 5 Task Packet全件
- Phase 5 PR / merge / CI / review
- C/D/E/F/H最終監査
- Function Evidence / audit / changelog
- Obsidian Phase 5 hub / Workstreamノート / index
- 人間のProduction確認記録

## 3. live stateを再取得

最低限:

- main完全SHA
- open PR
- active WIP
- stale OPEN Task Packet / Codex queue
- last Phase 5 merge SHA
- post-merge CI run
- `release_gate`
- Production確認対象SHA
- unresolved review / finding
- prompt versions / hashes
- GitHub / Obsidian drift
- auto-merge / sweep / trigger状態

取得不能は`UNKNOWN`。

## 4. Checkpoint監査

各Checkpointを `PASS / PARTIAL / FAIL / UNKNOWN / NOT_APPLICABLE` で評価する。

### CP0 Entry Truth

- Phase 3.5 / 4が安定文書上でCLOSED
- stale PR / WIP / queueが整理済み
- Control Rootがlive stateと矛盾しない
- auto-merge / autonomous sweepが無効
- Phase 5.1 / 5.5なし

### CP1 AI / Git Control Plane

- A〜HとClaude実装レーンの責務が一致
- Prompt SystemがGit固定
- Task Packet / prompt hash / base SHA / allowed pathsが運用された
- one write lane
- C/Dが別run
- main mergeは人間
- role map driftが解消、またはCloseを妨げない明示的隔離

### CP2 Financial Truth

- canonical obligation identity
- producer側正本化
- migration / backfill証拠
- 全reader統一
- PO二重、Invoice欠落、partial/full、VOID/reversal、unknown、truncation
- tenant / concurrency / backfill idempotency
- 不確実時に安全断定しない

### CP3 Reliable Execution

- durable requestId
- duplicate / retry / concurrent execution
- audit atomicity
- worker registry / heartbeat / stalled recovery
- Execution Receipt / Outcome / Failure
- terminal state再実行

### CP4 Meeting Intelligence

- AI output Draft-first
- citation
- human review / edit / approve / reject
- stale citation
- approved Actionだけをassign
- AI社員権限とapproval

### CP5 Golden Path

- Meeting → Draft → Approval → Assignment → Execution → Receipt → Finance/Knowledge → Cockpit
- FakeLLM / Demoで再現
- 外部作用OFF
- failure / uncertaintyの表示
- cross-domain E2E

### CP6 Independent Audit

- exact-head CI green
- release_gate green
- C/D same-SHA PASS
- E integration ready
- unresolved Critical = 0
- unresolved High = 0
- release-blocking Medium = 0
- H oversight

### CP7 Sync & Production Evidence

- CURRENT_STATE / DELIVERY_CONTRACT / PHASE5の整合
- Function Evidence / audit
- Obsidian index / hub / Workstream
- broken link / orphan / Secret / PII / stale SHA = 0
- GitHub / Obsidian stable knowledge drift = 0
- Vercel Production対象SHAを人間が代表画面込みで確認
- Draft / main / Preview / Productionを混同していない

## 5. Phase 5 Definition of Done監査

次を1件ずつ証拠へリンクする。

| DoD | 状態 | 証拠 | 不足 | blocker |
|---|---|---|---|---|
| Checkpoint 0〜7 | | | | |
| F-R7-02 canonical identity | | | | |
| 全cashflow reader統一 | | | | |
| 危険方向のmodeled誤判定なし | | | | |
| durable requestId | | | | |
| audit atomicity | | | | |
| stalled recovery | | | | |
| Execution Receipt | | | | |
| Meeting Draft-first | | | | |
| citation / human approval | | | | |
| Golden Path E2E | | | | |
| unauthorized external side effect 0 | | | | |
| tenant越境0 | | | | |
| exact-head CI / release_gate | | | | |
| C/D same-SHA / E | | | | |
| A〜H final evidence | | | | |
| GitHub / Obsidian drift 0 | | | | |
| Production human confirmation | | | | |
| 未完成境界の明記 | | | | |

UNKNOWNが1件でも重要ならReadyにしない。

## 6. 未完了の扱い

未完了を次へ分類する。

- `PHASE5_BLOCKER`: Phase 5を閉じられない
- `POST_PHASE5_CANDIDATE`: Close範囲外として明確に分離できる
- `HUMAN_GATE_PENDING`: 人間判断待ち
- `EVIDENCE_GAP`: 実装済みかもしれないが証拠不足
- `NOT_REQUIRED`: Charter上の非対象

「世界を狙うために欲しい」だけではPhase 5 blockerにしない。一方、CharterのGolden Path、安全、お金、再実行、承認、同期の欠損はblocker。

## 7. Production確認

次を別々に扱う。

- PR Preview Ready
- mainへmerge済み
- post-merge CI green
- Vercel Productionが対象main SHA
- 代表画面の人間確認
- Golden Pathの人間確認

CodexのツールでProduction pointerを直接確認できない場合、人間確認記録を要求し、推測しない。

## 8. Close Packet

Readyの場合:

```yaml
schema: 369-phase5-business-close-packet-v1
verdict: READY_FOR_HUMAN_PHASE5_CLOSE
observed_at:
main_sha:
production_sha:
production_human_verified_by:
production_human_verified_at:
checkpoint_status:
  CP0:
  CP1:
  CP2:
  CP3:
  CP4:
  CP5:
  CP6:
  CP7:
final_audit:
  A:
  B:
  C:
  D:
  E:
  F:
  G:
  H:
known_critical: 0
known_high: 0
release_blocking_medium: 0
github_obsidian_drift: 0
open_phase5_blockers: 0
post_phase5_candidates: []
evidence_urls: []
human_decision_required: true
```

## 9. 文書更新案

Readyでもファイルを編集しない。人間へ、次の最小更新案を示す。

- `tasks/CURRENT_STATE.md`
- `tasks/DELIVERY_CONTRACT.md`
- `tasks/PHASE5.md`
- Function Evidence / audit / changelog
- Obsidian Phase 5 hub / index
- Task Packet / queue status

過去履歴を削除せず、現在地の短い要約とEvidence linkを追加する。

## 10. 人間の最終承認文

すべてReadyの場合だけ、次の形式を提示する。

```text
PHASE5_HUMAN_CLOSE_APPROVED
main SHA: <FULL_40_CHAR_SHA>
Production SHA: <FULL_40_CHAR_SHA>
確認日: <YYYY-MM-DD>
確認者: <HUMAN>
Phase 5 — Trusted Management Loop の本憲章上の範囲をCLOSEDとする。
未完了候補はClose Packet記載の次Phase候補へ移管し、Phase 5.1 / 5.5は作らない。
```

人間がこれを明示するまでは`READY`であり`CLOSED`ではない。

## 11. 最終報告

1. 【結論】
2. 【人間が今すること】
3. main / Production / CI
4. CP0〜CP7
5. DoD Matrix
6. A〜H final evidence
7. unresolved risk
8. 未完成の分類
9. GitHub / Obsidian sync
10. 文書更新案
11. verdict

最終値:

```text
PHASE5_CLOSE_VERDICT:
MAIN_SHA:
PRODUCTION_SHA:
POST_MERGE_CI:
OPEN_PHASE5_BLOCKERS:
KNOWN_CRITICAL:
KNOWN_HIGH:
RELEASE_BLOCKING_MEDIUM:
GITHUB_OBSIDIAN_DRIFT:
HUMAN_CLOSE_REQUIRED: YES
FILES_CHANGED: NONE
MERGED: NO
DEPLOYED: NO
```
