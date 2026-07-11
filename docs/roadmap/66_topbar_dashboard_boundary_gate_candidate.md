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

- [x] 承認件数の取得段階遮断（条件は §6 で approve 単独に改訂）
- [x] Topbar 入口・バッジの表示遮断（DM のバッジ維持）
- [x] /dashboard に dashboard:read（AccessDenied は取得前）
- [ ] ローカル電池 green
- [x] 敵対的レビュー → 指摘反映（§6 追補）
- [ ] CI 93/0 をログ本文で確認

## 6. 追補（敵対的レビューの結果と反映・2026-07-11）

実装 d900fda に対する独立レビュー（境界＋E2E回帰の統合視点）の検出と反映:

| # | 深刻度 | 指摘 | 反映 |
|---|---|---|---|
| 1 | High | /dashboard 本体が承認待ち件数を無条件取得・表示（クイックアクセス「承認 (N)」）— Topbar 遮断が同一画面で無効化 | count クエリと導線を canViewApprovals で遮断 |
| 2 | High | /dashboard/ceo が無ゲート（承認待ち件数・パイプライン金額へ外部/AI ロールが URL 直打ちで到達＝新設ゲートの迂回口） | dashboard:read ゲート追加＋承認 findMany/Stat を canViewApprovals で遮断（非権限者は「権限者のみ」表示） |
| 3 | Medium | /reports/morning が無ゲートで承認件数が異常検知文・AI 朝報入力に混入 | dashboard:read ゲート追加＋承認件数を取得段階から redact（財務 redact と同パターン） |
| 4 | Medium | READ_ONLY は approval:read 保持で入口が見えるが /approvals は approve 必須 → 行き止まり導線（既存の不整合が入口条件で顕在化） | **入口条件を approval:approve 単独に改訂**（/approvals ページゲート＝Phase 1-19 の判断と一致。approval:read 単独ロールの閲覧 UI は存在しない事実を記録） |
| 5 | Low | サイドバー/モバイルナビの /approvals 導線は全ロール表示のまま（件数なし・ページ側ゲート済み） | 記録のみ（ナビの権限別フィルタは Phase 4 UI 整理候補） |
| 6 | Low | admin/operations-actions（inventory:update ゲート）で STAFF が OPS 系承認の title/status を閲覧可 | 記録のみ（OPS ドメイン業務の承認可視性として弁護可能・WIP-6 HOLD リストで再判定） |
| 7 | Info | /dashboard の監査ログ8件表示が dashboard:read のみ（audit:read 非保持の STAFF に可視） | 記録のみ（既存挙動・WIP-6 で再判定） |
| 8 | Info | e2e の `header` スコープはモバイル project 追加時に脆い | 記録のみ（現構成 Desktop Chrome 固定では一意） |

レビューが「問題なし」と確認: 全10ロール机上列挙（DM バッジ維持✓・外部/AI は F/F）、login リダイレクトの無限ループ・500 なし、layout の hasPermission 追加コストなし、既存91件への回帰なし・総数93検算一致、『としてログイン中』の一意性。
