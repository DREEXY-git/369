# 59. P3-CT-5 Control Tower 承認導線 deep link 強化 — 設計＋実装前 Gate 統合（Candidate・docs-only）

- 日付: 2026-07-10
- 種別: docs-only（本書時点ではコード変更なし）。実装は同一オートパイロット内の次フェーズ（Gate PASS を条件に続行）。
- 対応 audit: `docs/audit/158_p3_ct5_approval_deep_link_design_and_gate.md`
- 前提: roadmap47 §11（CT-5 定義=「承認導線: 既存 /approvals・OutreachDraft への deep link 接続・新規送信は作らない」）／roadmap57 §19／roadmap58（台帳正本: 本段は C27＋C03 に帰属・C18 間接）
- 前提 CI: run 29125940482（77 passed / 0 failed・ログ本文確認済み）

## 1. 目的

Control Tower（見るだけ画面）から「人間の判断待ち」への導線を強化する。**リンクのみ**を追加し、承認・送信・実行は一切 Control Tower に置かない（実行は既存 `/approvals` の人間承認のみ）。

## 2. read-only 実査結果

- `/approvals`（`apps/web/app/(app)/approvals/page.tsx`）: `approval:approve` 権限で全体ゲート（AccessDenied）。PENDING 一覧＋`decideApprovalAction` フォーム。searchParams なし・**プレーンリンクで到達可能**。承認一覧は請求金額等 finance 機密を含むため、**承認権限のない閲覧者にはカウントすら見せない**方針が既存設計（Phase 1-19）と整合。
- OutreachDraft: `OutreachStatus = DRAFT / PENDING_APPROVAL / APPROVED / REJECTED / SENT / FAILED`。UI 導線は `/leadmap/leads`（一覧）→ `/leadmap/leads/[id]`（最新下書き表示）。seed に PENDING の `ApprovalRequest(type=outreach_send)` と下書きが存在（e2e で件数≥1 が期待できる）。
- Control Tower カード href: 既存は `/planning-hokko`・`/deals`・`/leadmap` の基本 deep link のみ（P3-CT-1）。承認・下書きへの導線は**未接続**＝本段の対象。
- RBAC: `approval:approve` = OWNER/EXECUTIVE/ADMIN/DEPARTMENT_MANAGER のみ。STAFF（担当者）は不可・`leadmap:read` は可。AI ロールは approve なし（不変）。

## 3. 設計（不変条件つき）

`page.tsx` に read-only セクション**「人間の判断待ち（承認導線）」**を追加する。

| 導線 | 表示条件 | 内容 | リンク先 |
|---|---|---|---|
| 承認待ち | `hasPermission(user,'approval','approve')` | PENDING の ApprovalRequest **件数のみ**＋「承認待ちを開く」 | `/approvals`（`data-testid="ct-link-approvals"`） |
| 営業メール下書き | `hasPermission(user,'leadmap','read')` | status ∈ {DRAFT, PENDING_APPROVAL} の OutreachDraft **件数のみ**＋「下書き一覧を開く」 | `/leadmap/leads`（`data-testid="ct-link-outreach"`） |

- 固定文言: 「送信・承認・実行はこの画面からは行いません。実行は承認画面での人間の判断のみです。」
- **不変条件**: フォーム・Server Action・承認/却下/送信ボタンを Control Tower に置かない。件数は count のみ（金額・PII・件名・本文を取得しない）。承認件数は承認権限者にのみ取得・表示（権限がない場合はクエリ自体を発行しない）。searchParams・状態永続化を追加しない。既存カード・redaction 文言・メモ表示は不変。

## 4. 実装前 Gate（A〜I）

| # | 判定項目 | 結果 | 根拠 |
|---|---|---|---|
| A | 既存 schema のみで成立 | **PASS** | ApprovalRequest / OutreachDraft の count のみ・新テーブル/列/migration 不要 |
| B | 既存 RBAC のみで成立 | **PASS** | approval:approve / leadmap:read を流用・新権限なし |
| C | 既存 seed のみで成立 | **PASS** | seed に PENDING approval＋下書きが存在（実査 §2） |
| D | 状態永続化 不要 | **PASS** | リンクと count のみ |
| E | 新 DataAccessAction / UsageEvent 不要 | **PASS** | 閲覧ログは P3-CT-3 の既存配線のまま（metadata allowlist 不変） |
| F | redaction 不変 | **PASS** | 金額・finance 実値・finance 件数を新規に表示しない。承認件数は承認権限ゲート内のみ |
| G | PII 非増加 | **PASS** | count のみ・件名/本文/宛先を取得しない |
| H | 外部送信・実LLM・課金・本番 非接触 | **PASS** | リンクのみ・AI 呼び出しなし |
| I | 既存 e2e 77 件を壊さない | **PASS** | 新規文言は既存アサーション文字列（redaction 文言・「AI 下書きメモ」等）と非重複。追加は testid ベース3件 |

**総合判定: Gate PASS・STOP 非該当**（状態永続化・新 schema・新権限・seed 変更のいずれも不要）。

## 5. 実装計画（最小差分・変更2ファイルのみ）

1. `apps/web/app/(app)/growth/control-tower/page.tsx` — `canApprove` 判定＋条件付き count 2件＋セクション追加（Link のみ）。
2. `apps/web/tests/e2e/growth_control_tower.spec.ts` — 3件追加（77→80 見込み）:
   - 社長: `ct-link-approvals`（href=/approvals）と `ct-link-outreach`（href=/leadmap/leads）が可視・Control Tower 上に「承認」「却下」の実行ボタンが存在しない
   - 担当者: `ct-link-approvals` は `toHaveCount(0)`・`ct-link-outreach` は可視（leadmap:read）
   - 固定文言「送信・承認・実行はこの画面からは行いません」が両ロールで可視（安全宣言の恒久監視）

**触らない**: control-tower.ts（P3-CT-3 監査配線）・actions.ts（P3-CT-4 生成）・shared/growth-control-tower.ts・approvals/leadmap 配下・schema/migrations/seed/rbac/labels/ci.yml/playwright.config/package/lockfile/369-vault。

## 6. Evidence Map / Assumption / Unknowns / Risk

- Evidence: 実査 §2 の各ファイル実読・RBAC 実読（rbac.ts:72-112）・seed 実読（seed.ts:536-545）・CI 77/0（run 29125940482）。
- Assumption: e2e の社長=OWNER 相当（approve 可）・担当者=STAFF（approve 不可）— rbac 実読と既存 spec のログイン実績に基づく。
- Unknowns: なし（本段の範囲では未確定事項なし）。
- Risk: R1 承認件数の露出=承認権限ゲート内のみで解消／R2 文言衝突=既存アサーション文字列と非重複を選定＋testid 使用／R3 リンク先の AccessDenied=表示条件を到達可能権限と一致させ解消。

## 7. 判定

判定: **P3-CT-5 設計完了＋実装前 Gate PASS（A〜I 全 PASS）・STOP 非該当**。実装は本オートパイロットの次フェーズで続行（コード2ファイル・最小差分）。**新規送信なし・実行ボタンなし・状態永続化なし・schema/RBAC/seed 変更なし・redaction 不変・PII 非増加・369-vault非編集**。
