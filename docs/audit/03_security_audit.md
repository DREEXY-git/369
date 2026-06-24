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
