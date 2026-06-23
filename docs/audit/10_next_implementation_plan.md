# 10 — 次の実装計画（具体）

## 本セッションで着手する増分（Phase 1-1）

**G-17 名称統一: 369 → IKEZAKI OS（全層）**
- 理由: 要件 §1 の明示的最優先、低リスク、検証容易、残存76箇所を一掃。
- 範囲: worker(キュー名/ログ)、AIシステムプロンプト、seed ログ、web fetcher UA、コード/スキーマのコメント、デモメール `@369.local`→`@ikezaki.local`（seed と login を整合）、Cookie名 `369_session`→`ikezaki_session`、`.env.example` のサンプルDB名、CLAUDE.md ヘッダ。
- 非対象（別Phaseの大改修）: §21 のフルseed拡張（多テナント8社/9ユーザー）は Phase 1-7 で実施。
- 検証: `pnpm lint && typecheck && test && build` green。`grep 369` 残存ゼロ（インフラ識別子を除く）。

## 次セッションの推奨着手（Phase 1-2 以降）

1. **ABAC ヘルパ + 機密参照ログ拡充**（G-05/G-11）
   - `apps/web/lib/auth/abac.ts`: `assertCanAccess(user, record, action)`（tenantId × confidentialityLabel × role）
   - 人事/財務/録音/位置/AI参照の detail/edit に `writeDataAccess` を必須化
   - test: クロステナント拒否 / 機密ラベル拒否
2. **コンプラ同意基盤**（G-04）
   - models: EmployeeLocationConsent, EmployeeLocationLog, Geofence, LocationAccessLog, 録音 ConsentRecord 連携
   - 取得前同意 / 取得中明示 / 閲覧ログ / 保存期間 / 本人開示
3. **連動基盤**（G-01）
   - models: EventLog, OutboxMessage, DomainEvent, WebhookSubscription, WebhookDelivery
   - `emitEvent()` ヘルパ + Outbox→Worker dispatch + Webhook 署名検証
4. **JobRun 基盤** + 未実装ジョブの骨格

## 各増分の Definition of Done（再掲・必須）
DB(relation/index/tenantId) → Action(Zod/RBAC/audit) → UI(一覧/詳細/作成/編集/削除/検索/empty/error/loading) → seed → unit+integration test → docs 反映。AI機能は PromptTemplate/Fake/Real/構造化/検証/ログ/承認ゲート/マスキング/注入対策まで。

## 進め方
最も致命的な P0 から、**1領域=1縦スライス**で「動く実装＋テスト」を積む。巨大な未完成より、CRUD+権限+監査+デモデータ+テストの一気通貫を優先（CLAUDE.md 方針）。

## Phase 1-2 完了 → Phase 1-3 計画（2026-06-23）

完了: ABAC Policy Engine、機密参照ログ拡充、同意基盤、承認ゲート関数、Event/Outbox/Webhook 基盤、顧客スライス組込み、管理UI4画面、unit+integration テスト。

Phase 1-3（次）:
1. `assertCanViewConfidential`/機密参照ログを 契約/請求/会計/人事/勤怠/議事録/ナレッジ の detail へ横展開。
2. 承認ゲート（`requireApprovalForDangerousAction`/`executeApprovedAction`）を 外部送信/エクスポート/削除/権限変更 の実行経路に適用。
3. worker に `OUTBOX_DISPATCH_JOB` を追加し Outbox→Webhook を常時処理＋汎用 `JobRun`（retry/idempotency/audit）。
4. 位置/録音の「取得・明示・閲覧」機能本体（同意前提）。
5. e2e/セキュリティ自動テスト拡充。
