# 176. v6.1 完全復旧監査（deployment lineage・P1/P2・AI社員統一）

- 監査日: 2026-07-11
- recovery branch: `claude/full-recovery-v61`（PR #14）
- 固定統合 head: `7ef2d9f`（PR #12）／main: `ffd586b`
- 判定（v6.2 訂正）: **`CHANGES_REQUIRED / CODEX_REVIEW_PENDING`**。v6.1 の `RECOVERY_READY_FOR_HUMAN_GO` は撤回する。
  Codex Track B（review `4678311330`）が **High 1 / P2 2 / Evidence Gap** を指摘（escaped-value mask 漏れ・stale QUEUED 規則不一致・build badge role・8名 parity 未証明・doc 証拠格上げ）。
  v6.2 で各指摘を red→green で修正済みだが、**修正 CI と Codex 再監査が完了するまで human GO は提案しない**。

## 1. 根本原因: deployment lineage（コード欠落ではない）

利用者の 5 枚スクリーンショットの NAV=63 は **main `ffd586b`** と完全一致。欠落4機能（`/growth/control-tower`・`/marketing/ads`・`/marketing/content`・`/ai-office`）は integration `7ef2d9f`（NAV=67）に**コードとして存在**する。

DEPLOYMENT_PROVENANCE（GitHub Deployments API・read-only 固定）:

| URL(alias) | Environment | Deployment ID | Source ref | Source SHA | 状態 | Evidence |
|---|---|---|---|---|---|---|
| 369-hkxfii64q-…vercel.app | Production | `5353709567` | main | `ffd586b` | success(07-08) | 利用者の 63 NAV 画面と整合 |
| 369-k44p1bpry-…vercel.app | Preview | `5404300707` | claude/integration-v59 | `7ef2d9f` | success(07-11) | 67 NAV・Preview alias のみ |

- 対象ファイル削除は main→integration で 0（page 123→127・NAV 63→67・追加のみ）。
- canonical production alias（独自ドメイン等）への割当は GitHub API から `UNDETERMINED`。Vercel 設定は非変更。
- 結論: PR #12 が Draft・main 未統合のため、実装済み4機能が本番相当画面へ未反映。**人間 GO で main へ入れれば Production が 67 NAV になる**。

## 2. P1/P2 再監査（red テスト先行→修正）

Codex 再監査が「reopen」した項目を、現 `7ef2d9f` に対する敵対的入力で実測再現し、`b1cc686` で修正:

| 項目 | 再現(実測) | 修正 | 否定テスト |
|---|---|---|---|
| escaped-quote 値の mask 漏れ | `{\"password\":\"P@ssEscaped9\"}` が残存 | `\"`/`\'` を unescape してからキー redact | ✅ v6.1 A |
| 改行直後値の mask 漏れ | `Cookie:\nsession=NOSPACESECRET` が残存 | `:`/`=` 直後改行を join＋裸 `session` キー追加 | ✅ v6.1 B-1/B-2 |
| 裸 session の mask 漏れ | `session=BARESESSIONVAL` が残存 | キー一覧へ `session` 追加（散文は非過剰マスク） | ✅ v6.1 C |
| stale run を rival に含める | 3h 前 RUNNING 残骸が新規 run を FAILED(重複) で恒久的に潰す | `isStaleRunningRun` を作成後 rival 判定にも適用 | ✅ worker 回帰 |
| Marketing/Ads/SEO の NAV gate 欠落 | 行き止まり導線化の可能性 | NAV_PAGE_GATES へ `marketing:read` 追加（seed 全ロールは marketing:read 保持のため可視挙動は不変・整合性修正） | NAV 契約 |
| BullMQ 実 queue 証拠 | CI 基盤に Redis なし | **EVIDENCE_GAP 維持**（unit green のみで解消と記録しない） | — |

mask は 17 敵対ケース全マスク・maxLen 遵守・散文非過剰マスクを確認。境界（tenantId/RBAC/writeAudit/AI 権限）は不変。

## 3. AI社員 ⇔ 3D Office 統一

- 人物・外見・静的プロフィールの唯一の正本 = `getAiCharacter(key)`（DB 重複保存なし）。
- 稼働状態 = 3D Office と同じ read model（`deriveAgentState`）。生 DB status は表示に使わない。
- `/ai-agents`（ポートレート＋状態）→ `/ai-agents/[id]`（AiProfileCard＋状態＋deep link）→ `/ai-office?agent=<id>`（初期選択）→ 逆 deep link の往復で同一 agent 保持（e2e）。
- 別テナント/不在 id は 404・deep link は存在を漏らさずフォールバック。

## 4. 検証（recovery head `b1cc686`）

- ローカル: unit 365/0・typecheck 0・lint 0・build 0・safety 0。
- CI: PR #14 チェック欄（stage1 unit＋stage3_e2e・新規 e2e: AI社員 parity/NAV 復旧導線）。
- Preview 目視: 人間確認要（`HUMAN_VISUAL_CHECK_REQUIRED`・SSO 配下）。

## 5. v6.2 Codex Track B 指摘への対応（red→green）

Codex review `4678311330`（CHANGES REQUIRED）の各指摘を、赤テスト先行で修正:

| 指摘 | severity | 修正 | 否定/網羅テスト |
|---|---|---|---|
| 値内部 escaped quote で秘密 suffix 残存（`{"password":"abc\"SECRET"}`） | High | global unescape を廃止し **quote/escape 状態を理解する bounded scanner**へ全面再設計 | mask v6.2 describe（受入例＋escaped/nested/array/suffix/single-quote/巨大入力・秘密一文字列非残存を直接 assert） |
| pre/post の stale 規則不一致（QUEUED/null） | P2 | `isStaleActiveRun` を単一正本化（RUNNING/QUEUED・null=stale・同一 threshold/now）。`shouldCreateRun` と worker rival が同一 helper を使用 | 表形式（RUNNING/QUEUED × fresh/stale/null＋terminal）＋worker stale rival 回帰 |
| build badge が admin:read（EXECUTIVE/READ_ONLY も成立）で広すぎ | P2 | role key 本体（OWNER/ADMIN）に限定し他 role へは server から未送出 | `canViewBuildInfo` 肯定(OWNER/ADMIN)・否定(EXECUTIVE/READ_ONLY/STAFF/空)＋E2E STAFF 非表示/ADMIN 表示 |
| 8名 parity 未証明・`.first()`・架空 cross-tenant | P2/EvidenceGap | 8名全員の list→detail→office 往復＋実在別 tenant fixture で 404 | ai_agents_parity（8名列挙＋実クリック往復＋隔離 fixture cross-tenant 404） |
| schema 存在を `PRODUCTION_VERIFIED` と誤格上げ | P2 | 証拠段階語彙を厳密化（roadmap80）・schema のみは `SCHEMA_ONLY` 等へ格下げ | roadmap80 §3 の段階定義 |

BullMQ 実 queue retry/failed telemetry は CI 基盤に Redis なしのため **`EVIDENCE_GAP` 維持**（unit green のみで実 queue 検証済みにしない）。

## 6. 未解決・HOLD

- main merge・Production 反映: **Codex 再監査完了＋人間 GO 後のみ**。現時点で GO は提案しない。
- Codex Track B 再監査（v6.2 head）: 依頼予定・結果待ち。
- ATOMIC_LEDGER_SYNC: `SOURCE_RECHECK_VERIFIED_BY_CODEX`（人間 GO と分離・HOLD 継続）。
- 「脆弱性ゼロ」「完全無欠」「競合と同等・超過」とは宣言しない。確認範囲＝上記の実測とテストに限る。
