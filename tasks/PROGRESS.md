# PROGRESS — IKEZAKI OS

> 進捗・タスク・完了履歴の最小トラッカー（Claude Code / Codex 共通）。詳細仕様は `docs/`、監査は `docs/audit/`。

## 現在地
- 本番系列: `main`（Vercel Production）。Phase 1-14 まで本番反映済み。
- Phase 1-15「督促（Dunning）」: `main` にマージ済み（`9e27a21`）＋ローカル検証時の安全是正を適用。

## Phase 1-15 — 督促（Dunning）下書き＋承認ゲート＋送信記録

状態: **ローカル検証完了（GO）／ push 未実施（人間承認待ち）**

### 実装（main 9e27a21・既存）
- 純ロジック `packages/shared/src/dunning.ts`（`buildDunningDraft`/`isDunningEligible`、禁止表現13語をテストで排除）。
- orchestration `apps/web/lib/domains/finance/dunning.ts`（`getDunningContext`/`createDunningDraft`/`requestDunningSend`/`executeDunningSend`）。
- server actions（invoices/actions.ts 3本）、invoice detail #dunning、approvals ラベル、golden-path deep link。
- 承認ゲート `dunning_send`、PIIマスク、`EXTERNAL_SEND_ENABLED=false`で logged のみ、二重実行防止、Receivable 不変、監査ログ、GrowthEvent。

### 本セッションの是正（2026-06-28）
- 🔐 督促 server action 3本に `finance:read` を必須化（`invoice:update` のみ→ STAFF 直叩きを server 側で遮断）。UI 表示条件も同条件に統一。
- 🏷 特定企業名固定 `COMPANY_NAME='プランニングホッコー'` を撤去 → `Tenant.name`（未取得時「請求元」）。
- 🧪 `p1_15_dunning.itest.ts` に権限境界テスト（invoice:update かつ finance:read）追加。unit/integration の companyName を汎用化。

### ローカル検証（全 green・2026-06-28）
- db:generate ✅ / typecheck ✅(web/worker/db) / lint ✅ / unit `pnpm test` ✅ 23ファイル211 / integration ✅ 15ファイル96（`p1_15_dunning` 8 含む）/ build ✅(BUILD_ID生成)
- ※ prisma エンジンはサンドボックスのNodeダウンローダがDL不可のため curl で手動取得して検証（`tasks/BLOCKERS.md` 参照）。

### 残・次の一手
- push はユーザー承認後に実施（本番 main へ）。
- 別タスク: `recordPaymentAction`/請求書外部送信 action も `finance:read` 追加で server 側多層化（同型の直叩き耐性）。
