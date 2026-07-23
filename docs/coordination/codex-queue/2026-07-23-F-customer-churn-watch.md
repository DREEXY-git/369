---
chat: F
type: audit
target: 顧客離反予兆ボード / branch claude/customer-churn-watch-v1（PR は本文参照）
push-to: codex/reaudit-F-tenant-rbac
status: DONE
resolved: Codex F 監査（reaudit-F-tenant-rbac a4ba86a）で tenant/RBAC/PII は PASS、Medium 2件（F-CHURN-01 範囲外clampの捏造 / F-CHURN-02 dormant取りこぼし）を同 PR #127 で反映（純関数で0-100外は無視・updateCustomerActionでも0-100強制・status を active+dormant に）。

# 【独立監査依頼｜F: テナント分離/RBAC】顧客離反予兆（churn watch）ボード

read-only で厳しく監査してください。main merge / PADN dispatch 不要。結果は docs/audit の Markdown で
`codex/reaudit-F-tenant-rbac` に push（実害は severity 付き、無ければ PASS）。本番・DB・Secrets・外部送信・課金には触れない。
docs-only・旧 verdict 流用禁止・現ブランチ head を実際に読む。

## 実装
1. `packages/shared/src/customer-health.ts`: `classifyCustomerChurn`（churnRisk/満足度/最終接触経過/未対応クレームを
   加点合算→tier+根拠+推奨）と `daysSinceContact` 純関数。単体テスト12件。
2. `apps/web/app/(app)/customers/churn/page.tsx`: read-only ボード。
   - `customer:read` をデータ取得前に適用。
   - `visibleCustomerLabels(user.roles)` で閲覧不可ラベルの顧客を DB クエリ段階で除外。
   - `status: 'active'` の顧客のみ。未対応クレームは nested read に `where: { tenantId, status: 'open' }` を明示。
   - stable 以外をリスク降順→id で決定論表示。
3. `customers/page.tsx` ヘッダに導線追加。

## 重点監査観点（実害のみ）
- [越境] customer / 子(complaints) の全取得が tenantId スコープか。complaints は customerId 単独FKだが nested where に tenantId を併記。別テナント混入経路はないか。
- [機密/PII] 顧客一覧と同じ `visibleCustomerLabels` + `customer:read` gating で、閲覧不可ラベルの顧客名・満足度・離反リスク・クレーム件数が漏れないか。churn の reasons 文言に機密が滲まないか。所有者例外を一覧に出さない既存規約と整合するか。
- [status フィルタ] `status: 'active'` 固定で、離反予兆を出すべき他ステータス（例: 休眠）を取りこぼす/または不適切に含める懸念があるか（status 語彙を schema/seed で確認）。
- [決定論] score 同点の tie-break（id）で順序が入力非依存か。
- [捏造しない] 全シグナル null/範囲外で tier=stable・reasons 空になり、根拠のない離反警告を出さないか。
