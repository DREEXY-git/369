# roadmap88 — Phase 3–4 Completion Program v1（v7.4）

**目的**: Business Phase の 4 workstream（`P3-GROWTH` / `P3-Q2C` / `P35-CHANNELS` / `P4-WORKFORCE`）を、**人間だけが実施できる Gate の直前**まで完了させるための WIP 正本。Repository lineage 上の作業ではなく Business Phase の完了度で管理する。

**表記規約**:
- 「Phase 3」等の単独表記は禁止。必ず **workstream 名 + Evidence Stage** を併記する。
- 存在しない Function ID は創作せず `UNMAPPED_CANDIDATE` と明記する。
- Evidence Stage: `DRAFT_IMPLEMENTED` → `CI_VERIFIED` → `CODEX_VERIFIED` → `HUMAN_PREVIEW_VERIFIED` → `MAIN_MERGED` → `PRODUCTION_VERIFIED`。
- Claude が独自に宣言できるのは `DRAFT_IMPLEMENTED` と `CI_VERIFIED` まで。`CODEX_VERIFIED` は Codex 判定、`HUMAN_PREVIEW_VERIFIED` 以降は人間実証。

**正本の役割分担**: 実装・CI の正本は GitHub の commit / Draft PR / PR Conversation。完全機能台帳・Phase Evidence・Obsidian（`369-vault`）は **Codex が正本管理**し、Claude は GitHub 経由で read-only 確認する（v7.4 でヴォルトは Claude 編集禁止に変更）。

---

## 0. 現在地スナップショット（GitHub 実態・2026-07-12）

| 対象 | 固定 SHA | 状態 |
| --- | --- | --- |
| PR #14（Phase 3 基盤） | `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425` | CODEX_VERIFIED（過去）・RC 土台 |
| PR #18（C21/C19 承認ブリッジ） | `fa04e7405cf3ab6cb56f329804fc778dde6470b0` | CODEX_RELEASE_PASS_V70_R2・**P3-R01 で限定 unfreeze** |
| PR #20（P4 承認 resume Bridge） | `9080df1d4cafcee225775003700b219ac0522d64` | CODEX_P4_PASS_V70_R2 |
| PR #22（C19 決定的 PK） | `e3c410cdbc3fae7f43fac978ef9ff037ba8cd505` | CLAUDE_C19_FIXED_V72・Codex 再監査待ち（HOLD 維持） |
| PR #23（C22 read-only） | `9209ef856523ae2e10a303849dc13a088e1f426c` | CODEX_CHANGE_REQUEST_V72_C22 |
| PR #24（Codex Evidence） | `8ef66885cc864c4b635516c1900561302b48fa8e` | Codex 所有・cherry-pick 禁止 |
| PR #25（Control Plane） | `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d` | CODEX_CHANGE_REQUEST_V72_P4_CONTROL |
| PR #26（Workflow Dry Run） | `45bde82bc24b61ddcc76de74d2a4c8400468f6c0` | CODEX_CHANGE_REQUEST_V72_WORKFLOW |
| PR #27（Regression hardening） | `bc8fbef0899485c79e4fcd4e98c3e528e8d07f98` | CODE FIX ACCEPTED / EVIDENCE HOLD |
| PR #28（Fit-Gap） | `a8685afc420ef7570abecafee4941efd564b998c` | EVIDENCE_GAP / CANONICAL HOLD（docs-only） |
| 旧 RC PR #29 | `96172e5d2eec623a514970992ff1afef9d2613a4` | **CHANGES_REQUIRED / RELEASE HOLD**（superseded 予定） |
| app main | `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978` | HOLD（Claude merge 禁止） |
| vault main（Codex 所有） | `0812634ec443abf966819d2cf6b10e73efb3a94a` | read-only |

---

## 1. P3-GROWTH（Release 完了キュー）

| WIP | 内容 | branch / PR | 依存 | Evidence Stage | Codex 判定 | Human Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **P3-R01** | PR #27 の topbar 修正 + 回帰 test を **PR #18 へ通常伝播**。768px overflow 修正。C21 reject 画面のタイミング揺れを red 再現→根本修正（timeout/retry/再実行だけで閉じない）。対象 E2E ≥20 反復 | `claude/p35-approval-bridges-v1`（PR #18） | PR #27 差分 | 実装→CI | 未 | 768px Preview |
| **P3-R02** | 全機能消失防止: OWNER 67 導線 + ADMIN/EXECUTIVE/READ_ONLY 許可導線・全 route 200/正認証拒否・Bell/avatar/logout/テーマ・320/375/768/1024/1280/1440px・deep link/back/forward・空画面/overflow/文字切れ/重なり 0 | `claude/p3-r02-regression-matrix-v1`（新規） | P3-R01（topbar 前提） | 計画 | 未 | 目視 |
| **P3-R03** | AI 社員 8 名 canonical 統一（key/fullName/kana/codeName/epithet/portrait/appearance/personality/skills/traits/commonMistakes/evaluationNote/state を一覧・詳細・3D で一致）・canvas nonblank・WebGL fallback・cleanup・URL 同期 | `claude/p3-r03-ai-parity-v1`（新規） | なし | 計画 | 未 | 目視 |
| **P3-R04** | Security Matrix: tenantId・RBAC・PII 取得段階遮断・DataAccessLog・writeAudit・secret mask・AI approve/delete/external_send 禁止・stale run/gate・idempotency・二重 submit・reverse relation tenant・cross-tenant 実在 fixture | `claude/p3-r04-security-matrix-v1`（新規） | なし | 計画 | 未 | — |
| **P3-R05** | 後継 RC: PR #14 固定 head から新 RC branch、更新 PR #18 だけ通常 merge。PR #20/#22/#23/#25/#26/#28 混入禁止。ancestry/tree/重複 commit/競合/exact-head CI/artifact/Vercel SHA 確認。旧 #29 は superseded | `claude/rc-phase3-p35-v70-r2-r2`（新規） | **P3-R01 CI green** | 計画 | 未 | 768px Human Preview / app main merge |
| **P3-R06** | Release Package: release note・rollback 手順・DB 変更一覧・外部作用一覧・sealed 機能一覧・Human Preview 手順・main 統合前チェックリスト・Production 確認手順・known limitations | `docs/roadmap/**`, `docs/audit/**` | P3-R05 | 計画 | 未 | Production |

## 2. P3-Q2C（Quote-to-Cash 完了キュー）

既存 schema/実装を調査し、安全な v1 を薄い縦切りで完成させる。最小縦切り = `read-only 一覧 → 詳細 → 決定論的 Fake 下書き → 人間承認 → 内部状態 → Outcome Ledger`。

| WIP | 内容 | 状態 |
| --- | --- | --- |
| **P3-Q01** | 既存 Quote/Contract/Invoice/Payment/JournalCandidate/督促/会計入口/cash leakage の実装調査と縦切りギャップ分析（正本 docs） | 計画 |
| **P3-Q02** | 不足する承認・監査・DataAccessLog・Outcome Ledger の薄い縦切り実装（schema 不要範囲） | 計画・P3-Q01 依存 |
| **P3-Q03**（`SCHEMA_CHANGE_APPROVAL_REQUIRED` 候補） | schema が必要な場合は差分/migration/rollback/backfill/テスト計画を作り人間 Gate で停止 | Gate |

禁止: 実請求送信・実契約締結・実送金・実支払・税務断定・自動仕訳確定。

## 3. P35-CHANNELS（C19/C21/C22 + 統合）

共通完成形 = `read-only 分析 → 決定論的 Fake 下書き → 内部 ApprovalRequest → 人間 approve/reject → deep link → 実測 Outcome Ledger`。外部公開・広告変更・予算変更・メール送信・報酬・支払・実 LLM は含めない。

| WIP | 内容 | branch / PR | Evidence Stage | Codex 判定 |
| --- | --- | --- | --- | --- |
| **P35-C19-01** | PR #22 `e3c410c` を Codex 再監査まで freeze。決定的 PK 並行冪等の完了確認 | `claude/c19-approval-bridge-v1`（PR #22） | CI_VERIFIED | 再監査待ち |
| **P35-C21-01** | approve/reject/再申請・二重 submit・2 タブ・本文/PII 非複製・公開/CMS/送信 0・deep link 往復・mobile/a11y・C19/C22 と状態語彙統一 | PR #18 lineage（P3-R01 に含む reject flake 根本修正） | 実装→CI | 未 |
| **P35-C22-01** | PR #23 の P2 修正: customer:read なし name fetch 0・顧客詳細 link 0・別 tenant 実在 ID・不可視 label・候補一覧 metadata-only 監査・DOM/response/log sentinel 0 | `claude/c22-readonly-analysis-v1`（PR #23） | 実装→CI | CHANGES_REQUIRED |
| **P35-UNIFIED-01** | C19/C21/C22 横断の Growth Channel 画面（channel 状態・分析済/下書き/承認待ち/承認済/却下・外部作用封印・実測 Outcome・未計測・Evidence Stage）。推測 ROI/架空成果/設定値実績値混同禁止 | `claude/p35-unified-channels-v1`（新規） | 計画 | 未 |
| **P35-C22-SCHEMA**（`SCHEMA_CHANGE_APPROVAL_REQUIRED` 候補） | 紹介台帳/ConsentRecord/二重紹介防止/報酬候補に schema が必要な場合の Gate 文書 | Gate | — | — |

## 4. P4-WORKFORCE（Phase 4 完了キュー）

| WIP | 内容 | branch / PR | Evidence Stage | Codex 判定 |
| --- | --- | --- | --- | --- |
| **P4-CP-01** | Control Plane 修復: own-run→foreign-agent 遮断（own-agent allowlist）・PENDING/CANCELLED 誤表示修正・payload 全文非取得・metadata-only DataAccessLog・Outcome 捏造 0 | `claude/p4-control-plane-readonly-v1`（PR #25） | 実装→CI | CHANGES_REQUIRED |
| **P4-WF-01** | Workflow Dry Run 修復: 未知操作 fail-closed（REQUIRES_HUMAN_REVIEW）・NFKC/空白/英語/否定/複合・URL に入力を残さない・BLOCKED/承認後 NOT_REACHED・DB/queue/Server Action/外部作用 0 | `claude/workflow-dry-run-v1`（PR #26） | 実装→CI | CHANGES_REQUIRED |
| **P4-03** | Human Gate Resume: approve 後 `QUEUED / 再開待ち`・承認だけで SUCCEEDED にしない・stale 再確認・AI 誤権限遮断・gate/run/approval/action/audit/access の transaction 整合 | PR #20 lineage（CODEX_P4_PASS 済・Evidence Gap 継続） | CODEX_VERIFIED | Evidence Gap |
| **P4-04** | Queue/Worker（loopback 使い捨て Redis のみ）: worker registry・handler 整合・retry・attempts 上限・stop/restart・stalled recovery・duplicate jobId・tenant 分離・job data allowlist・secret mask・failed telemetry | PR #20 lineage | 部分 CI | Evidence Gap |
| **P4-05** | Agent Development Console v0（既存データ read-only: Registry/role/owner/state/version/profile/skills/tools/guardrails/last run/approval 待ち/Evidence Stage） | `claude/p4-05-agent-console-v1`（新規） | 計画 | 未 |
| **P4-06** | Skill/Tool/Prompt Registry（既存データ範囲・risk/required approval/version/dependency/rollback 表示）。schema 必要なら Gate | 新規 | 計画 | 未 |
| **P4-07** | Evaluation Center（golden set/safety/negative/tenant/PII/approval boundary・Fake のみ・実 LLM 不使用） | 新規 | 計画 | 未 |
| **P4-08** | Sandbox/Release Stage 表示（draft/sandbox/pilot/production/rollback/sealed/human approval required）。Production 切替操作は実装しない | 新規 | 計画 | 未 |
| **P4-09** | Usage/Budget（実測 usage/task count/processing time/failure count/未計測/configured limit）。料金・課金・推測コスト非表示 | 新規 | 計画 | 未 |
| **P4-10** | Observability（Execution Receipt/run/gate/approval/action/audit/failure/retry/stale/human decision）。raw input/output/error・Secrets・PII 非取得 | 新規 | 計画 | 未 |
| **P4-11** | 3D Office 統合（誰が働いているか/状態/タスク/承認待ち/失敗/再開待ち/完了/最新 Evidence/プロフィール/Control Plane deep link・canonical 一致） | 新規 | 計画 | 未 |
| **P4-12** | Phase 4 Exit Candidate（AI 社員 + 3D 可視化・最低 1 Growth Channel が分析→下書き→人間承認まで接続・Critical 0/High 0/blocking P2 0・台帳/Obsidian 同期・外部作用封印・exact-head CI/artifact・Codex PASS） | 新規 | 計画 | Gate |

## 5. 補助（docs-only・release blocker ではない）

| WIP | 内容 | branch / PR | Codex 判定 |
| --- | --- | --- | --- |
| **P3-FG-01** | Fit-Gap 正本の Evidence 補強（公式一次資料レジストリ URL/参照日/対象行・Function ID/固定 SHA/状態語彙・UNMAPPED_CANDIDATE 表記・Codex 出典付き文書との重複解消） | `claude/competitive-fit-gap-roadmap-v1`（PR #28） | EVIDENCE_GAP |

---

## 6. 依存グラフ（クリティカルパス）

```
P3-R01 (topbar 伝播 + C21 flake 根本修正 → PR #18)
   └─→ P3-R05 (後継 RC: PR #14 + 更新 PR #18)
          └─→ [Human Gate] 768px Preview → app main merge → Production

P4-CP-01 / P4-WF-01 / P35-C22-01  … 独立 lane（相互に共有ファイルなし・並行可）
P35-C19-01                         … PR #22 freeze（Codex 再監査待ち・Claude 作業なし）
P3-R02 / P3-R03 / P3-R04           … 回帰/parity/security（P3-R01 後）
P3-Q01..Q03 / P4-05..P4-12         … 新規縦切り（schema 必要時は Gate）
```

同時進行は最大 3 WIP。共有ファイルを触る WIP は同時実行しない（P3-R01 と P3-R05 は逐次）。

## 7. Human Gate（Claude は直前で停止）

app main merge / Production deploy / 本番 DB migration / C22 schema 適用 / Production queue・worker / Secrets・OAuth / 実 LLM / 外部 connector / 広告・SNS・メール送信 / 課金・支払 / credential 失効確認。

## 8. 未解決リスク

- 旧 RC #29 は 768px overflow を含んだまま HOLD（P3-R05 で supersede）。
- PR #22 C19 は AIOutput が生成試行ごとに残る（設計どおり・並行冪等は同一キーの PK unique 範囲のみ主張）。Codex 再監査待ち。
- PR #20 P4 の Evidence Gap（CI 上 Redis・本番 worker 登録・stalled 復旧・P4 Preview）は未解消。
- C22/Control Plane/Workflow の P2 は exact-head CI 未取得（各 lane の CI_VERIFIED 待ち）。
- Q2C・P4-05〜P4-12 は多くが新規縦切りで、schema 要否の判定を各 WIP 冒頭で行う。

## 9. 次の実行可能 WIP

1. **P3-R01**（クリティカルパス先頭・RC HOLD を解除する前提）
2. **P4-CP-01 / P4-WF-01 / P35-C22-01**（独立 lane・P3-R01 と共有ファイルなし）
3. **P3-R05**（P3-R01 の exact-head CI green 後）
