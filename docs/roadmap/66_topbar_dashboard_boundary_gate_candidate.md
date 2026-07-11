# 66. Topbar 承認バッジと /dashboard のページ基礎権限（WIP-5）— 設計＋Gate（Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/165_topbar_dashboard_boundary_gate.md`
- 前提: WIP-4 は commit 3662828＋レビュー反映 4a99935 まで push 済み（CI 結果は audit164 追補に記録）
- 背景: control-tower のページ基礎権限は WIP-3 レビュー反映（96eec33）で先行適用済み。本 WIP は
  v5.4 の WIP-5 残件 = Topbar と、roadmap64 §6 追補で記録した /dashboard の規約不整合を解消する。

## 1. read-only 実査結果（実装前）

| 経路 | 実査時の状態 | 判定 |
|---|---|---|
| `apps/web/app/(app)/layout.tsx` | 全認証ユーザーに対し `approvalRequest.count({status:'PENDING'})` を無条件実行し Topbar に件数バッジ表示 | **存在シグナル漏れ**（承認案件はテナント全体の金額・人事・外部送信等の業務量シグナル。STAFF/外部/AI にも件数が見えていた） |
| `apps/web/components/shell/topbar.tsx` | /approvals 入口リンク＋件数バッジを常時表示 | 同上 |
| `apps/web/app/(app)/dashboard/page.tsx` | `requireUser` のみ。商談パイプライン金額（dealSum・ステージ別）・監査ログ8件を全認証ロールに表示 | ページ基礎権限欠落（/growth 系との規約不整合） |
| サイドバー（nav.ts 72行） | '承認待ち' /approvals リンクを全ロールに表示（件数なし・ページ側は approval ゲート済み） | 導線のみで件数シグナルなし → **scope 外（記録）** |

- RBAC 事実: approval:read = OWNER/EXECUTIVE/ADMIN/READ_ONLY（RESOURCES 全 read）。approval:approve = OWNER/EXECUTIVE/ADMIN/DEPARTMENT_MANAGER。**DM は approve のみ**保持（read なし）→ 条件は `read ∨ approve`（DM のバッジ維持が要件）。STAFF・EXTERNAL_*・AI は両方なし。

## 2. 設計

1. layout.tsx: `canViewApprovals = approval:read ∨ approval:approve`。false のとき承認件数クエリを**実行しない**（取得段階遮断）・Topbar に `showApprovals` を渡す。
2. topbar.tsx: `showApprovals=false` なら /approvals 入口とバッジごと非表示（後方互換 default true）。
3. dashboard/page.tsx: `dashboard:read` をデータ取得前に適用（AccessDenied）。/growth（roadmap64）と同一規約。деal 金額は dashboard:read 閲覧者に表示のまま（deal:read ドメインの集計・READ_ONLY は設計どおり全 read）。
4. 通知件数（自分宛て notification）は本人のデータのため無条件のまま。

## 3. テスト

- e2e 追加 `topbar_dashboard_boundary.spec.ts` 2件: 社長=header 内 /approvals 入口が見える / 担当者=dashboard は見えるが header 内 /approvals 入口は 0（`header` スコープでサイドバーのナビリンクと区別）。
- 既存回帰の机上確認: 全 e2e の login は `**/dashboard` 到達を待つ → ceo/sales とも dashboard:read 保持で不変。/approvals リンクを数える既存テストは testid スコープ（growth_control_tower）で Topbar 変更の影響なし。smoke '承認待ちが表示される' は ceo。
- 期待 CI: `Running 93 tests`（91+2）→ `93 passed / 0 failed`。

## 4. 記録のみ（scope 外）

- サイドバーの '承認待ち' 導線は全ロール表示のまま（件数なし・ページ側ゲート済み）。ナビの権限別フィルタは Phase 4 UI 整理候補。
- /dashboard/ceo（社長コックピット）は canViewFinance の redaction 実装済み・ページ基礎権限は WIP-6 の機械監査で一括再判定。

## 5. Gate 判定

- [x] 承認件数の取得段階遮断（approval:read ∨ approve のみクエリ）
- [x] Topbar 入口・バッジの表示遮断（DM のバッジ維持）
- [x] /dashboard に dashboard:read（AccessDenied は取得前）
- [ ] ローカル電池 green
- [ ] 敵対的レビュー → 指摘反映
- [ ] CI 93/0 をログ本文で確認
