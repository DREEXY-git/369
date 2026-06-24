# 03 — セキュリティ監査

> 攻撃者像: Fable 5 級の自動化AIエージェント（prompt injection / RAG poisoning / tenant breakout / 自動脆弱性探索）を想定。

## 実装済み（✓）

- 自前認証: bcryptjs + jose 署名 httpOnly Cookie（`apps/web/lib/auth/session.ts`）
- RBAC: `packages/shared/rbac.ts`（10ロール×8アクション、ワイルドカード）。`hasPermission` 52箇所
- テナント分離: 全モデル `tenantId`（Tenant/Permission 除く）。クエリ 246 箇所で tenantId スコープ
- 監査ログ: `writeAudit` 25箇所（変更系の一部）
- 機密ラベル: `ConfidentialityLabel`(10種) + `labels.ts` のロール許可表
- SSRF ガード: `safeFetch`（allowlist/timeout/サイズ上限、UA明示）`packages/integrations/src/web/fetcher.ts`
- 外部送信ゲート: `EXTERNAL_SEND_ENABLED` + 承認(`/approvals`)、`SuppressionList`/`ConsentRecord`、配信停止検知
- 入力検証: 主要 action で Zod 相当の検証
- React 既定の XSS エスケープ（`dangerouslySetInnerHTML` はテーマ初期化のみ・固定文字列）

## 不足・要対応

| 重大度 | 項目 | 現状 | 対応 |
|---|---|---|---|
| 高 | **機密参照ログ** | `writeDataAccess` 3箇所のみ | 人事/財務/録音/位置/AI参照すべてに付与（**G-05**） |
| 高 | **ABAC / Policy Engine** | RBACのみ。行レベル認可ヘルパ無し | `assertCanAccess(record, user, action)` を新設し全 detail/edit に適用 |
| 高 | **位置情報・録音の同意/明示** | モデル・UI 無し | 取得前同意、取得中明示、閲覧ログ、保存期間（**G-04**） |
| 高 | **MFA / SSO / SCIM** | 設計のみ | TOTP(MFA) 設計→実装、SSO/SCIM は interface |
| 中 | **改ざん検知監査ログ** | 通常テーブル | ハッシュチェーン(prevHash)で tamper-evident 設計 |
| 中 | **レート制限** | 無し | ログイン/外部送信/AI実行にレート制限(Redis) |
| 中 | **ファイルアップロード検証** | FileObject のみ | MIME/サイズ/拡張子検証、malware scan provider interface、signed URL、private bucket |
| 中 | **Webhook 署名検証** | Webhook基盤自体が無し | 受信時 HMAC 検証 + replay 防止(nonce/timestamp) |
| 中 | **CSP / セキュリティヘッダ** | 未設定 | `next.config` で CSP/HSTS/X-Frame-Options 等 |
| 中 | **prompt injection 検出** | 無し | `PromptInjectionDetector`、RAG source trust score、tool-call許可チェック |
| 低 | **secret スキャン / .env 検査** | .env.example はサニタイズ済 | CI に secret スキャン |
| 低 | **セッション固定/失効** | 署名Cookieのみ | ログアウト時失効リスト、絶対有効期限 |

## テスト不足（→ 19 章 / 08 参照）

未認証アクセス拒否 / クロステナント拒否 / ロール拒否 / 機密ラベル拒否 / 外部送信は承認必須 / Suppression が送信阻止 / 悪意URL遮断 / 過大ファイル拒否 / 不正MIME拒否 / prompt injection 無害化 / RAG poisoning フラグ / Webhook不正署名拒否 / 機密参照で監査ログ生成 — **いずれも未整備**。

## 結論

土台（認証/RBAC/テナント分離/SSRF/外部送信承認）は**存在するが、機密参照ログ・ABAC・コンプラ同意・AI注入対策・セキュリティテストが未整備**。本番前に P0(G-04/G-05) と ABAC を最優先で固める。

## Phase 1-2 更新（2026-06-23）

実装済みに追加:
- **ABAC / Policy Engine**（`packages/shared/policy.ts` 純関数＋`apps/web/lib/security/policy.ts` 統合層）。`PolicyDecisionLog` に全判定を記録。
- **機密参照ログ拡充**: `DataAccessLog` 拡張（action/policyDecision/consent/ip/aiAgent 等）＋`LocationAccessLog`/`RecordingAccessLog`。
- **同意基盤**: `ConsentPolicy`/`ConsentGrant`＋撤回/失効を反映する評価ロジック。
- **承認ゲート**: 危険操作21種を `requiresApproval` で必須化＋承認ライフサイクル関数。
- **Webhook 署名(HMAC-SHA256)** 生成/検証＋timestampリプレイ防止。
残: MFA/SSO/SCIM、改ざん検知(ハッシュチェーン)、レート制限、CSP、prompt injection 検出、ファイル検証。

## Phase 1-3 更新（2026-06-24）

- ABAC＋機密参照ログを **invoice/finance/meeting/knowledge** に横展開（拒否は理由表示・500回避）。
- **危険操作の実経路に承認ゲート適用**（直接実行不可。承認済みのみ executeApprovedAction 経由で実行）。
- **位置情報閲覧**: 同意＋勤務時間でゲート、LocationAccessLog 記録。
- **録音閲覧**: 録音同意でゲート、RecordingAccessLog 記録。
- **worker Outbox 常時処理**（webhook 署名配送・retry・dead-letter）＋ JobRun 監査。
残: MFA/SSO、改ざん検知、レート制限、CSP、prompt injection 検出、ファイル検証、契約/人事/勤怠 detail への展開（画面本体実装と同時）。

## Phase 1-4 更新（2026-06-24）

- **prompt injection 検出**: `detectPromptInjection`（ルールベース・日英）をマーケ資産生成経路に適用。high で生成中止＋AISafetyLog。
- **PII マスキング**: `maskPii`（氏名/メール/電話/住所＋銀行口座/マイナンバー）。外部送信前マスクの関数・テスト・適用経路を整備。
- **ToolPermissionChecker**: AI は external_send/delete/permission_change/高機密参照/承認済み実行を直接実行不可（承認必須）。
- Marketing 資産の外部公開は承認ゲート経由のみ（直接送信しない）。
残: 注入対策の RAG/全AI経路への適用、外部送信時のPIIマスク自動適用、MFA/SSO、改ざん検知、レート制限、CSP。

## Phase 1-5 更新（2026-06-24）

- **prompt injection 検出を全AI経路へ横展開**（ナレッジ検索クエリ・会議文字起こし・外部受信・LeadMap返信/分析/生成）。共通ヘルパ `safeAiInput`/`saveAIOutputStandard`/`assertAiToolAllowed`/`prepareExternalPayload`。
- **間接注入（indirect injection）面を網羅**: 外部由来テキスト（口コミ・受信メール・営業返信・文字起こし）を検出境界として AISafetyLog に記録。
- **ToolPermissionChecker の多重防御**を `assertAiToolAllowed` でサーバ経路に強制（AI は外部送信/削除/承認/権限変更/高機密参照を直接実行不可）。
- **AISafetyLog 管理画面**は社長/役員/管理者のみ（スタッフ/閲覧のみは不可＝権限分離）。AIOutput は audit:read。
- セキュリティ自動テスト `apps/web/tests/e2e/security.spec.ts`（注入クエリが500を出さず無害化／スタッフは AI安全ログ不可視）を追加。
残: 外部送信実行時のPIIマスク自動適用、MFA/SSO、改ざん検知(ハッシュチェーン)、レート制限、CSP、ファイル検証。

## Phase 1-6 更新（2026-06-24）— Operations OS

- **原価・粗利・在庫評価額の機密扱い**: イベント原価/粗利の閲覧は `hasPermission('finance','read')` で制御し、閲覧時に `writeConfidentialViewLog`（CONFIDENTIAL）を記録。スタッフは案件は見えても原価/粗利は非表示（権限分離）。
- **危険操作の承認ゲート**: 在庫数量の大幅調整（`inventory_adjust`、|Δ|≥10）・予約済み在庫の強制解除（`inventory_force_release`、常時）を `requireApprovalForDangerousAction` 経由（直接適用しない）。
- **設計上Approval対象（docs明記・UI後続）**: 在庫削除/評価額変更/破損請求確定（`damage_charge_finalize`）/原価・粗利の外部共有・export/協力会社単価export。
- 全 Operations action は tenantId 分離＋RBAC＋writeAudit。在庫変化は InventoryMovement 経由で監査可能。
- AI次回提案は注入検出＋AIOutput保存。AIは外部送信を持たない（多重防御）。
残: 承認後実処理（executeApprovedAction）の Operations 経路、レート制限、CSP、MFA、改ざん検知。

## Phase 1-7 更新（2026-06-24）— Operations 実行管理

- **承認後実行の冪等化**: `executeApprovedAction` を原子的クレーム（`updateMany where executedAt=null`）で二重実行防止。`canExecuteApproval`（APPROVED/未実行/未失効）を純判定で追加。ApprovalRequest に executedAt/executedById/executionStatus。
- **危険操作の承認ゲート拡張**: 大幅棚卸差異（`stocktake_adjust`、|Δ|≥10）・高額発注（`purchase_order_issue`、≥10万円）・破損請求確定（`damage_charge_finalize`）・予約強制解除（`inventory_force_release`）。承認後のみ executeApproved* で実処理。
- **機密の権限分離**: 発注単価/発注金額/仕入先連絡先/案件原価/人件費/粗利は `hasPermission('finance','read')` ゲート。スタッフは発注金額カラム等が非表示。
- 全 Operations 実行系 action は tenantId＋RBAC＋writeAudit＋GrowthEvent/DomainEvent。
残: 強制解除/破損請求の請求書連動（次Phase）、レート制限、CSP、MFA、改ざん検知。

## Phase 1-8 更新（2026-06-24）— Finance Bridge

- **正式/候補の分離**: JournalCandidate/InvoiceCandidate を正式 JournalEntry/Invoice と分離し、承認前の下書きが正式データを汚染しない設計（docs/audit/12）。
- **機密の権限分離**: 仕訳候補/原価/粗利/請求候補/支払予定/入金予定/税額/勘定科目の閲覧は `hasPermission('finance','read')` ゲート＋`writeConfidentialViewLog`（FINANCIAL_CONFIDENTIAL）。スタッフは /finance/bridge 等が不可視。
- **危険操作の承認**: journal_finalize（仕訳確定）/ invoice_send（請求送信）は `requireApprovalForDangerousAction`（申請まで、正式化は承認後）。承認後実行は executeApprovedAction（冪等）。
- 全 Finance Bridge は tenantId＋RBAC＋writeAudit＋GrowthEvent/DomainEvent。
残: 候補→正式化の承認後実行、レート制限、CSP、MFA、改ざん検知。

## Phase 1-9 更新（2026-06-24）— 候補→正式化

- **正式/候補の境界を formalize.ts に集約**: 候補→正式変換はここだけ。candidate.status（posted/sent）＋executeApprovedAction の executedAt クレームで**二重作成を防止**（正式仕訳/請求書の重複作成を防ぐ）。
- **承認後のみ正式化**: journal_finalize/invoice_send 承認後に executeApprovedAction 経由でのみ JournalEntry/Invoice/Receivable を作成。金額≤0・勘定空は拒否。
- **外部送信しない**: 正式 Invoice は status=ISSUED（内部）。外部送信は次Phase（prepareExternalPayload＋送信ゲート）。
- 機密（仕訳候補/正式仕訳/勘定科目/税額/請求/売掛金/入金・支払予定）は finance 権限ゲート＋writeConfidentialViewLog。
残: 請求の外部送信ゲート、入金消込、レート制限、CSP、MFA、改ざん検知。

## Phase 1-10 更新（2026-06-24）— 請求送信ゲート＋入金消込

- **外部送信は承認後のみ**: Invoice送信は `invoice_send` 承認→`executeApprovedAction`（冪等）でのみ実行。送信前に `prepareExternalPayload`（PIIマスク・AISafetyLog）、`assertAiToolAllowed`（AI外部送信を構造的に禁止）。`EXTERNAL_SEND_ENABLED=false` の既定では実送信せず監査のみ。
- **二重送信防止**: Invoice.status(SENT以降は canSendInvoice=false)＋executeApprovedAction の executedAt クレーム。
- **正式化と送信の分離**: issue（ISSUED）と send（SENT）を別経路に。
- 機密（請求金額/入金履歴/売掛金/未回収/入金・支払予定/資金繰り/顧客メール/送信本文）は finance/invoice 権限ゲート＋writeConfidentialViewLog。/invoices/[id] は既存 ABAC 維持。
残: 支払実行ゲート、レート制限、CSP、MFA、改ざん検知。

## Phase 1-11 更新（2026-06-24）— Golden Path の機密分離

- 案件詳細の Golden Path カードは ABAC を維持: 原価・粗利・低粗利警告・請求/資金繰りリンクは `finance:read` 権限時のみ表示。Finance Bridge ボタンは `finance:create` 必須。スタッフは原価・粗利・金額を不可視。
- `bridgeEventToFinanceAction` は finance:create を強制し、業務ロジックは lib に集約（action は薄い）。bridge は冪等で重複台帳生成なし。
- 既知の可読性課題（残）: 「候補→正式化」承認と「正式Invoice外部送信」承認がともに ApprovalRequest.action='invoice_send'。実行は payload(candidateId/invoiceId)で識別し誤実行は findFirst 不整合で安全に弾くが、将来 `invoice_finalize` 分離が望ましい（P2）。外部送信は引き続き承認後＋prepareExternalPayload＋EXTERNAL_SEND_ENABLED ゲート。AIは送信主体不可。

## Phase 1-12 更新（2026-06-24）— 経営KPIの機密分離と planning-hokko ゲート是正

- 経営ダッシュボード（/dashboard/ceo・/planning-hokko）の Golden Path KPI は、売上/原価/粗利/未回収/延滞/入金済/入金・支払予定/低粗利を `finance:read` ゲート。**UIで隠すだけでなく `redactExecutiveFinance` で lib のデータ整形段階で null 化**し、finance 由来の attention 理由（延滞/未回収/低粗利）も除外（深層防御＝サーバから STAFF へ金額が渡らない）。
- **是正（軽微なセキュリティ修正）**: 従来 `/planning-hokko` は売上/原価/粗利を無ゲートで表示しており STAFF も金額を閲覧できた → 本Phaseで `canViewFinance` 分岐＋redact を追加し機密漏れを解消。event detail（Phase 1-11 で既にゲート済み）と整合。
- 集約クエリは全て tenantId スコープ＋バッチ取得（per-event 個別クエリ無し）。クロステナント遮断は `p1_12_executive_dashboard.itest`（tenant分離）で検証。
- 新規の外部送信・承認・削除権限は追加していない（読み取り・集計のみ）。AIロール権限は不変。
