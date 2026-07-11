# 176. v6.1 完全復旧監査（deployment lineage・P1/P2・AI社員統一）

- 監査日: 2026-07-11
- recovery branch: `claude/full-recovery-v61`（PR #14・head `b1cc686`）
- 固定統合 head: `7ef2d9f`（PR #12）／main: `ffd586b`
- 判定: `RECOVERY_READY_FOR_HUMAN_GO`（main/Production は人間 GO 後のみ）

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

## 5. 未解決・HOLD

- main merge・Production 反映: 人間 GO 後のみ（§17 の1画面報告で GO/NO-GO）。
- Codex Track B（delta review）: PR #14 に依頼済み・結果待ち。
- ATOMIC_LEDGER_SYNC: `SOURCE_RECHECK_VERIFIED_BY_CODEX`（人間 GO と分離・HOLD 継続）。
- 「脆弱性ゼロ」「完全無欠」とは宣言しない。確認範囲＝上記の実測とテストに限る。
