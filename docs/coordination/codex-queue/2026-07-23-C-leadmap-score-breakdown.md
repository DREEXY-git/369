---
chat: C
type: audit
target: PR #122 / commit d3b7ce5 / branch claude/leadmap-score-breakdown-v1
push-to: codex/reaudit-C-leadmap
status: OPEN
---

# 【独立監査依頼｜C: LeadMap】優先度スコア内訳の表示（PR #122）

あなたは 369（IKEZAKI OS）の独立監査役です。以下の変更だけを read-only で厳しく監査してください。
main への merge・PADN dispatch は不要。結果は docs/audit の Markdown レポートとして `codex/reaudit-C-leadmap` に push（実害があれば severity 付き、無ければ PASS を明記）。

## 変更内容
1. `packages/shared/src/leads.ts` に純関数 `describeLeadScoreBreakdown(breakdown: unknown): LeadScoreFactor[]` を追加。
   - `computeLeadScore` が保存する `LeadScore.breakdown`（`Record<string, number>`）を「加点のあった理由」に変換。
   - 加点0以下・非数値は除外。影響度(points)降順・同点は key 昇順で決定論整列。
   - `null` / `undefined` / 非オブジェクト / 配列は空配列（fail-closed）。未知キーは key をそのままラベル化し `kind='opportunity'`。
   - `LEAD_SCORE_FACTOR_META`（キー→ label/hint/kind）を併設。
2. `apps/web/app/(app)/leadmap/leads/[id]/page.tsx`: 最新 `LeadScore` を include（`scores: { where:{ tenantId }, orderBy:{createdAt:'desc'}, take:1 }`）で取得し、「優先度スコアの内訳」カードを表示。

## 重点監査観点（実害のみ・理論上の指摘は除外）
- [越境参照] `scores` の nested read に `tenantId` を明示しているが、`LeadScore` は `leadId` 単独FK。別テナントの `LeadScore` が漏れる経路が本当に塞がっているか（親 lead 取得は `id`+`tenantId` スコープ済み）。
- [捏造しない] `breakdown` が null/未保存/壊れた JSON/想定外キー/負値/巨大値のとき、UI が誤った理由や合計を出さないか。合計点(`latestScore.score`)と `lead.priority` が食い違うケースの表示は誤解を生まないか。
- [情報露出] 内訳（評価・口コミ数・Web有無 等の由来）が `leadmap:read` 未満のロールに出ないか。`breakdown` 経由で機密ラベルや PII が滲まないか。
- [決定論] 同点タイブレークが入力順 non-dependent か（テスト済みだが独立確認）。
- [回帰] `computeLeadScore` の breakdown キーと `LEAD_SCORE_FACTOR_META` のキーがずれた場合の劣化（未知キー fallback で破綻しないか）。

## 制約
本番・DB・Secrets・外部送信・課金には触れない。docs-only report。旧 verdict の流用禁止（現 commit d3b7ce5 を実際に読む）。
